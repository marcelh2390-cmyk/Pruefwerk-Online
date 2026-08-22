'use client'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

const inspectionPoints = [
  'Allgemeiner Zustand',
  'Kennzeichnungen / Typenschild',
  'Schutz- und Sicherheitseinrichtungen',
  'Bedien- und Funktionseinrichtungen',
  'Elektrik / Leitungen',
  'Mechanische Bauteile',
  'Bremsen / Halteeinrichtungen',
  'Hydraulik / Dichtheit',
  'Warn- und Signaleinrichtungen',
  'Funktionsprüfung'
]

const seedAssets = []

export default function Home() {
  const [tab, setTab] = useState('dashboard')
  const [customers, setCustomers] = useState([])
  const [employees, setEmployees] = useState([])
  const [session, setSession] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [dataLoading, setDataLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [assets] = useState(seedAssets)
  const [planning, setPlanning] = useState([])
  const [protocols, setProtocols] = useState([])
  const [timeEntries, setTimeEntries] = useState([])
  const [timer, setTimer] = useState(null)
  const [timeEmployee, setTimeEmployee] = useState('')
  const [editingEmployeeId, setEditingEmployeeId] = useState(null)
  const [editingCustomerId, setEditingCustomerId] = useState(null)
  const [selectedProtocol, setSelectedProtocol] = useState(null)

  useEffect(() => {
    if (!supabase) {
      setAuthLoading(false)
      return
    }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setAuthLoading(false)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession))
    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (session) loadCoreData()
    else {
      setEmployees([])
      setCustomers([])
      setProtocols([])
    }
  }, [session])

  useEffect(() => {
    if (employees.length && !timeEmployee) setTimeEmployee(String(employees.find(e => e.status !== 'Inaktiv')?.id || ''))
  }, [employees, timeEmployee])

  async function loadCoreData(){
    setDataLoading(true)
    setMessage('')
    await Promise.all([loadEmployees(), loadCustomers(), loadProtocols()])
    setDataLoading(false)
  }

  async function loadEmployees(){
    if (!supabase) return
    const { data, error } = await supabase.from('employees').select('id, created_at, name, role, weekly_hours, status').order('name')
    if (error) setMessage(prev => prev || `Mitarbeiter konnten nicht geladen werden: ${error.message}`)
    else setEmployees((data || []).map(row => ({
      id: row.id, name: row.name || '', role: row.role || '', status: row.status || 'Aktiv', weeklyHours: Number(row.weekly_hours ?? 40)
    })))
  }

  async function loadCustomers(){
    if (!supabase) return
    const { data, error } = await supabase.from('customers').select('*').order('name')
    if (error) setMessage(prev => prev || `Kunden konnten nicht geladen werden: ${error.message}. Prüfe, ob die Tabelle customers angelegt wurde.`)
    else setCustomers((data || []).map(mapCustomer))
  }

  async function loadProtocols(){
    if (!supabase) return
    const { data, error } = await supabase.from('protocols').select('*').order('inspection_date', { ascending:false }).order('created_at', { ascending:false })
    if (error) setMessage(prev => prev || `Protokolle konnten nicht geladen werden: ${error.message}. Prüfe, ob die Tabelle protocols angelegt wurde.`)
    else setProtocols((data || []).map(mapProtocol))
  }

  async function login(e){
    e.preventDefault()
    if (!supabase) return setMessage('Supabase ist noch nicht konfiguriert.')
    const f = new FormData(e.currentTarget)
    setMessage('Anmeldung läuft …')
    const { error } = await supabase.auth.signInWithPassword({ email:String(f.get('email') || '').trim(), password:String(f.get('password') || '') })
    setMessage(error ? `Anmeldung fehlgeschlagen: ${error.message}` : '')
  }

  async function logout(){
    if (supabase) await supabase.auth.signOut()
    setSession(null)
  }

  const customerName = id => customers.find(x => String(x.id) === String(id))?.name || '—'
  const employeeName = id => employees.find(x => String(x.id) === String(id))?.name || '—'
  const assetName = id => assets.find(x => String(x.id) === String(id))?.name || '—'

  async function addCustomer(e){
    e.preventDefault()
    if (!supabase || !session) return
    const f = new FormData(e.currentTarget)
    setMessage('Kunde wird gespeichert …')
    const { error } = await supabase.from('customers').insert(customerPayload(f))
    if (error) return setMessage(`Kunde konnte nicht gespeichert werden: ${error.message}`)
    e.currentTarget.reset()
    setMessage('Kunde gespeichert.')
    await loadCustomers()
  }

  async function saveCustomer(e, id){
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    setMessage('Kundendaten werden gespeichert …')
    const { error } = await supabase.from('customers').update(customerPayload(f)).eq('id', id)
    if (error) return setMessage(`Kunde konnte nicht geändert werden: ${error.message}`)
    setEditingCustomerId(null)
    setMessage('Kunde aktualisiert.')
    await loadCustomers()
  }

  async function addEmployee(e){
    e.preventDefault(); const f = new FormData(e.currentTarget)
    if (!supabase || !session) return
    setMessage('Mitarbeiter wird gespeichert …')
    const { error } = await supabase.from('employees').insert({
      name:String(f.get('name') || '').trim(), role:String(f.get('role') || '').trim(), status:'Aktiv', weekly_hours:Number(f.get('weeklyHours')) || 40
    })
    if (error) return setMessage(`Speichern fehlgeschlagen: ${error.message}`)
    e.currentTarget.reset(); setMessage('Mitarbeiter gespeichert.'); await loadEmployees()
  }

  async function saveEmployee(e, id){
    e.preventDefault(); const f = new FormData(e.currentTarget)
    const { error } = await supabase.from('employees').update({
      name:String(f.get('name') || '').trim(), role:String(f.get('role') || '').trim(), status:String(f.get('status') || 'Aktiv'), weekly_hours:Number(f.get('weeklyHours')) || 40
    }).eq('id', id)
    if (error) return setMessage(`Änderung fehlgeschlagen: ${error.message}`)
    setEditingEmployeeId(null); setMessage('Mitarbeiter aktualisiert.'); await loadEmployees()
  }

  async function deactivateEmployee(id){
    const { error } = await supabase.from('employees').update({ status:'Inaktiv' }).eq('id', id)
    if (error) return setMessage(`Deaktivieren fehlgeschlagen: ${error.message}`)
    setEditingEmployeeId(null); setMessage('Mitarbeiter deaktiviert.'); await loadEmployees()
  }

  function addPlanning(e){
    e.preventDefault(); const f = new FormData(e.currentTarget)
    setPlanning(v => [...v,{id:Date.now(),date:f.get('date'),time:f.get('time'),employeeId:+f.get('employeeId'),customerId:+f.get('customerId'),assetId:+f.get('assetId'),status:'Geplant'}]); e.currentTarget.reset()
  }

  async function addProtocol(e){
    e.preventDefault()
    if (!supabase || !session) return
    const f = new FormData(e.currentTarget)
    const checkResults = inspectionPoints.map((name, i) => ({
      name,
      status:String(f.get(`check_${i}`) || 'i. O.'),
      note:String(f.get(`note_${i}`) || '').trim()
    }))
    const protocolNumber = `UVV-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`
    const payload = {
      protocol_number:protocolNumber,
      customer_id:Number(f.get('customerId')),
      inspection_date:String(f.get('inspectionDate')),
      inspector:String(f.get('inspector') || '').trim(),
      object_name:String(f.get('objectName') || '').trim(),
      object_number:String(f.get('objectNumber') || '').trim(),
      result:String(f.get('result') || 'Bestanden'),
      notes:String(f.get('notes') || '').trim(),
      next_inspection:String(f.get('nextInspection') || '') || null,
      checks:checkResults
    }
    setMessage('Prüfprotokoll wird gespeichert …')
    const { data, error } = await supabase.from('protocols').insert(payload).select().single()
    if (error) return setMessage(`Protokoll konnte nicht gespeichert werden: ${error.message}`)
    e.currentTarget.reset()
    setMessage(`Protokoll ${protocolNumber} gespeichert.`)
    await loadProtocols()
    setSelectedProtocol(mapProtocol(data))
    setTab('protocols')
  }

  function addManualTime(e){
    e.preventDefault(); const f = new FormData(e.currentTarget)
    setTimeEntries(v => [{id:Date.now(),employeeId:+f.get('employeeId'),date:f.get('date'),start:f.get('start'),end:f.get('end'),breakMinutes:+f.get('breakMinutes')||0,type:f.get('type'),customerId:+f.get('customerId')||null,note:f.get('note')},...v]); e.currentTarget.reset()
  }
  function startWork(){ if(!timer) setTimer({employeeId:+timeEmployee,startedAt:new Date(),pausedAt:null,pausedMinutes:0}) }
  function togglePause(){
    if(!timer) return
    const now=new Date()
    if(timer.pausedAt) setTimer({...timer,pausedAt:null,pausedMinutes:timer.pausedMinutes+Math.round((now-timer.pausedAt)/60000)})
    else setTimer({...timer,pausedAt:now})
  }
  function endWork(){
    if(!timer) return
    const now=new Date(); let pause=timer.pausedMinutes
    if(timer.pausedAt) pause+=Math.round((now-timer.pausedAt)/60000)
    setTimeEntries(v=>[{id:Date.now(),employeeId:timer.employeeId,date:localDate(timer.startedAt),start:localTime(timer.startedAt),end:localTime(now),breakMinutes:pause,type:'Arbeitszeit',customerId:null,note:'Per Stempeluhr erfasst'},...v]); setTimer(null)
  }

  const tabs=['dashboard','customers','assets','employees','planning','time','inspection','protocols']
  const labels={dashboard:'Dashboard',customers:'Kunden',assets:'Prüfobjekte',employees:'Mitarbeiter',planning:'Planung',time:'Arbeitszeit',inspection:'Neue Prüfung',protocols:'Protokolle'}
  const nextJobs=useMemo(()=>[...planning].sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time)).slice(0,5),[planning])
  const totalHours=useMemo(()=>timeEntries.reduce((sum,x)=>sum+durationHours(x),0),[timeEntries])

  if(authLoading) return <main className="loginShell"><div className="card loginCard"><h1>Prüfwerk</h1><p>Verbindung wird aufgebaut …</p></div></main>
  if(!supabase) return <main className="loginShell"><div className="card loginCard"><h1>Supabase-Konfiguration fehlt</h1><p>Prüfe in Vercel <code>NEXT_PUBLIC_SUPABASE_URL</code> und <code>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code>.</p></div></main>
  if(!session) return <main className="loginShell"><div className="card loginCard"><div className="loginBrand"><img src="/pruefwerk-logo.png" alt="Prüfwerk"/></div><h1>Anmelden</h1><form onSubmit={login}><input name="email" type="email" placeholder="E-Mail" required/><input name="password" type="password" placeholder="Passwort" required/><button className="primary">Anmelden</button></form>{message&&<p className="statusMessage">{message}</p>}</div></main>

  return <div className="appShell">
    <aside className="sidebar">
      <div className="sidebarBrand"><img src="/pruefwerk-logo.png" alt="Prüfwerk"/></div>
      <nav className="sideNav">
        <button className={tab==='dashboard'?'active':''} onClick={()=>setTab('dashboard')}><span className="navIcon">⌂</span>Dashboard</button>
        <div className="navGroupTitle">VERWALTUNG</div>
        <button className={tab==='employees'?'active':''} onClick={()=>setTab('employees')}><span className="navIcon">◉</span>Mitarbeiter</button>
        <button className={tab==='customers'?'active':''} onClick={()=>setTab('customers')}><span className="navIcon">▥</span>Kunden</button>
        <button className={tab==='time'?'active':''} onClick={()=>setTab('time')}><span className="navIcon">◷</span>Arbeitszeiten</button>
        <button className={tab==='planning'?'active':''} onClick={()=>setTab('planning')}><span className="navIcon">▦</span>Planung</button>
        <div className="navGroupTitle">PRÜFUNGEN</div>
        <button className={tab==='inspection'?'active':''} onClick={()=>setTab('inspection')}><span className="navIcon">✚</span>Neue Prüfung</button>
        <button className={tab==='protocols'?'active':''} onClick={()=>setTab('protocols')}><span className="navIcon">▤</span>Prüfprotokolle</button>
        <button className={tab==='assets'?'active':''} onClick={()=>setTab('assets')}><span className="navIcon">⚒</span>Prüfobjekte</button>
      </nav>
      <div className="sidebarFooter">
        <div className="miniBrand"><span className="miniCheck">✓</span><div><b>Prüfwerk</b><small>UVV Prüfmanagement</small></div></div>
        <div className="sidebarUser">{session.user.email}</div>
        <button className="logoutButton" onClick={logout}>Abmelden</button>
      </div>
    </aside>
    <div className="workspace">
      <header className="topbar">
        <div className="topbarTitle"><span className="menuGlyph">☰</span>{labels[tab]}</div>
        <div className="topbarRight">
          <button className="quickButton" onClick={()=>setTab('inspection')}>＋ Schnellzugriff</button>
          <div className="accountChip"><span className="accountAvatar">●</span><div><small>Angemeldet als</small><b>{session.user.email}</b></div></div>
        </div>
      </header>
      <main className="content">
      {message&&<div className="appMessage">{message}</div>}
      {dataLoading&&<div className="appMessage">Daten werden geladen …</div>}

      {tab==='dashboard'&&<section>
        <div className="heroPanel">
          <div><h1>Willkommen bei Prüfwerk!</h1><p>Dein System für digitale UVV Prüfungen, Protokolle und Verwaltung. Alles im Blick. Alles an einem Ort.</p></div>
          <div className="heroCheck">✓</div>
        </div>
        <div className="grid4 dashboardStats">
          <Kpi label="Mitarbeiter" value={employees.length}/>
          <Kpi label="Kunden" value={customers.length}/>
          <Kpi label="Prüfprotokolle" value={protocols.length}/>
          <Kpi label="Arbeitsstunden" value={formatHours(totalHours)}/>
        </div>
        <div className="two dashboardColumns">
          <Card title="Nächste fällige Prüfungen">
            {protocols.filter(p=>p.nextInspection).sort((a,b)=>String(a.nextInspection).localeCompare(String(b.nextInspection))).slice(0,5).map(p=><div className="row dashboardRow" key={p.id}><b>{p.objectName || 'Prüfobjekt'}<span className="orangeText">{customerName(p.customerId)}</span></b><span>{displayDate(p.nextInspection)}</span></div>)}
            {!protocols.some(p=>p.nextInspection)&&<p>Noch keine fälligen Prüfungen hinterlegt.</p>}
            <button className="outlineOrange" onClick={()=>setTab('planning')}>Zur Planung</button>
          </Card>
          <Card title="Letzte Prüfprotokolle">
            {protocols.slice(0,5).map(p=><div className="protocolRow dashboardProtocol" key={p.id}><div><b>{p.protocolNumber}</b><span className="orangeText">{p.objectName} · {customerName(p.customerId)}</span></div><div className="buttonRow compact"><span>{displayDate(p.inspectionDate)}</span><span className={`badge ${resultClass(p.result)}`}>{p.result}</span></div></div>)}
            {!protocols.length&&<p>Noch keine Protokolle vorhanden.</p>}
            <button className="outlineOrange" onClick={()=>setTab('protocols')}>Zu den Protokollen</button>
          </Card>
        </div>
        <div className="quickGrid">
          <button className="quickCard" onClick={()=>setTab('employees')}><span>◉＋</span><div><b>Mitarbeiter hinzufügen</b><small>Neuen Mitarbeiter anlegen</small></div></button>
          <button className="quickCard" onClick={()=>setTab('customers')}><span>▥＋</span><div><b>Kunden hinzufügen</b><small>Neuen Kunden anlegen</small></div></button>
          <button className="quickCard" onClick={()=>setTab('inspection')}><span>✚</span><div><b>Neue Prüfung</b><small>Prüfung erstellen</small></div></button>
          <button className="quickCard" onClick={()=>setTab('planning')}><span>▦</span><div><b>Terminplanung</b><small>Prüfungen planen</small></div></button>
        </div>
      </section>}

      {tab==='customers'&&<section><h1>Kunden</h1><div className="two"><Card title="Neuen Kunden anlegen"><CustomerForm onSubmit={addCustomer}/></Card><Card title="Kundenliste">{customers.length?customers.map(c=>editingCustomerId===c.id?<CustomerForm key={c.id} customer={c} submitLabel="Änderungen speichern" onSubmit={e=>saveCustomer(e,c.id)} onCancel={()=>setEditingCustomerId(null)}/>:<div className="row customerRow" key={c.id}><div><b>{c.name}</b><span>{c.customerNumber?`Kundennr. ${c.customerNumber} · `:''}{c.contact||'Kein Ansprechpartner'} · {[c.postalCode,c.city].filter(Boolean).join(' ')}</span><small>{[c.phone,c.email].filter(Boolean).join(' · ')}</small></div><button className="secondary" onClick={()=>setEditingCustomerId(c.id)}>Bearbeiten</button></div>):<p>Noch keine Kunden angelegt.</p>}</Card></div></section>}

      {tab==='assets'&&<section><h1>Prüfobjekte</h1><Card title="Geräte & Fahrzeuge"><p>Als nächster Schritt können Prüfobjekte dauerhaft je Kunde gespeichert werden. Für Protokolle kannst du das Prüfobjekt bereits frei eintragen.</p></Card></section>}

      {tab==='employees'&&<section><h1>Mitarbeiter</h1><div className="two"><Card title="Mitarbeiter anlegen"><form onSubmit={addEmployee}><input name="name" placeholder="Name" required/><input name="role" placeholder="Funktion"/><input name="weeklyHours" type="number" min="1" max="60" defaultValue="40"/><button className="primary">Speichern</button></form></Card><Card title="Team">{employees.map(e=>editingEmployeeId===e.id?<form className="employeeEdit" key={e.id} onSubmit={event=>saveEmployee(event,e.id)}><input name="name" defaultValue={e.name} required/><input name="role" defaultValue={e.role}/><input name="weeklyHours" type="number" min="1" max="60" defaultValue={e.weeklyHours}/><select name="status" defaultValue={e.status}><option>Aktiv</option><option>Urlaub</option><option>Krank</option><option>Inaktiv</option></select><div className="buttonRow"><button className="primary">Änderungen speichern</button><button type="button" className="secondary" onClick={()=>setEditingEmployeeId(null)}>Abbrechen</button>{e.status!=='Inaktiv'&&<button type="button" className="danger" onClick={()=>deactivateEmployee(e.id)}>Deaktivieren</button>}</div></form>:<div className="row employeeRow" key={e.id}><div><b>{e.name}</b><span>{e.role} · {e.status} · {e.weeklyHours} Std./Woche</span></div><button className="secondary" onClick={()=>setEditingEmployeeId(e.id)}>Bearbeiten</button></div>)}</Card></div></section>}

      {tab==='planning'&&<section><h1>Einsatzplanung</h1><div className="two"><Card title="Termin planen"><form onSubmit={addPlanning}><select name="employeeId" required><option value="">Mitarbeiter</option>{employees.filter(e=>e.status!=='Inaktiv').map(e=><option value={e.id} key={e.id}>{e.name}</option>)}</select><select name="customerId" required><option value="">Kunde</option>{customers.map(c=><option value={c.id} key={c.id}>{c.name}</option>)}</select><input name="date" type="date" required/><input name="time" type="time" required/><button className="primary">Termin speichern</button></form></Card><Card title="Geplante Einsätze">{planning.map(j=><div className="row" key={j.id}><b>{j.date} · {j.time} · {customerName(j.customerId)}</b><span>{employeeName(j.employeeId)} · {j.status}</span></div>)}</Card></div></section>}

      {tab==='time'&&<TimeTracking employees={employees} customers={customers} entries={timeEntries} employeeName={employeeName} customerName={customerName} timer={timer} timeEmployee={timeEmployee} setTimeEmployee={setTimeEmployee} startWork={startWork} togglePause={togglePause} endWork={endWork} addManualTime={addManualTime}/>} 

      {tab==='inspection'&&<section><h1>Neue UVV-Prüfung</h1>{customers.length?<Card title="Prüfprotokoll erstellen"><form className="inspectionForm" onSubmit={addProtocol}><div className="formGrid"><label>Kunde<select name="customerId" required><option value="">Bitte wählen</option>{customers.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label>Prüfdatum<input name="inspectionDate" type="date" defaultValue={localDate(new Date())} required/></label><label>Prüfobjekt<input name="objectName" placeholder="z. B. Gabelstapler" required/></label><label>Geräte-/Seriennummer<input name="objectNumber" placeholder="z. B. ST-001"/></label><label>Prüfer<input name="inspector" placeholder="Name des Prüfers" defaultValue={employees.find(e=>e.status==='Aktiv')?.name||''} required/></label><label>Gesamtergebnis<select name="result"><option>Bestanden</option><option>Bestanden mit Mängeln</option><option>Nicht bestanden</option></select></label><label>Nächste Prüfung<input name="nextInspection" type="date"/></label></div><h3>Prüfpunkte</h3><div className="checkList">{inspectionPoints.map((point,i)=><div className="checkRow" key={point}><b>{point}</b><select name={`check_${i}`} defaultValue="i. O."><option>i. O.</option><option>Mangel</option><option>n. z.</option></select><input name={`note_${i}`} placeholder="Bemerkung / Mangelbeschreibung"/></div>)}</div><label>Allgemeine Bemerkungen<textarea name="notes" placeholder="Zusätzliche Hinweise, Mängel, Maßnahmen …"/></label><button className="primary">Protokoll dauerhaft speichern</button></form></Card>:<Card title="Zuerst Kunden anlegen"><p>Für ein Prüfprotokoll brauchst du zuerst mindestens einen Kunden.</p><button className="primary" onClick={()=>setTab('customers')}>Kunde anlegen</button></Card>}</section>}

      {tab==='protocols'&&<section><div className="sectionHead"><h1>Protokolle</h1>{selectedProtocol&&<button className="secondary noPrint" onClick={()=>setSelectedProtocol(null)}>Übersicht</button>}</div>{selectedProtocol?<ProtocolView protocol={selectedProtocol} customer={customers.find(c=>String(c.id)===String(selectedProtocol.customerId))}/>:<Card title="Prüfprotokolle">{protocols.length?protocols.map(p=><div className="protocolRow" key={p.id}><div><b>{p.protocolNumber}</b><span>{displayDate(p.inspectionDate)} · {customerName(p.customerId)} · {p.objectName}</span></div><div className="buttonRow compact"><span className={`badge ${resultClass(p.result)}`}>{p.result}</span><button className="secondary" onClick={()=>setSelectedProtocol(p)}>Öffnen</button></div></div>):<p>Noch keine Protokolle.</p>}</Card>}</section>}

      </main>
    </div>
  </div>
}

function CustomerForm({onSubmit,customer,submitLabel='Speichern',onCancel}){
  return <form onSubmit={onSubmit} className={customer?'customerEdit':''}><div className="formGrid"><input name="name" defaultValue={customer?.name||''} placeholder="Firma / Kundenname" required/><input name="customerNumber" defaultValue={customer?.customerNumber||''} placeholder="Kundennummer"/><input name="contact" defaultValue={customer?.contact||''} placeholder="Ansprechpartner"/><input name="phone" defaultValue={customer?.phone||''} placeholder="Telefon"/><input name="email" defaultValue={customer?.email||''} type="email" placeholder="E-Mail"/><input name="street" defaultValue={customer?.street||''} placeholder="Straße / Hausnummer"/><input name="postalCode" defaultValue={customer?.postalCode||''} placeholder="PLZ"/><input name="city" defaultValue={customer?.city||''} placeholder="Ort"/></div><textarea name="notes" defaultValue={customer?.notes||''} placeholder="Bemerkungen"/><div className="buttonRow"><button className="primary">{submitLabel}</button>{onCancel&&<button type="button" className="secondary" onClick={onCancel}>Abbrechen</button>}</div></form>
}

function ProtocolView({protocol,customer}){
  return <div className="card protocolPaper"><div className="protocolTop"><div><div className="printBrand"><img src="/pruefwerk-logo.png" alt="Prüfwerk"/></div><h1>UVV-Prüfprotokoll</h1><p>Protokollnummer: <strong>{protocol.protocolNumber}</strong></p></div><div className="noPrint"><button className="primary" onClick={()=>window.print()}>Drucken / als PDF</button></div></div><div className="protocolGrid"><div><h3>Kunde</h3><b>{customer?.name||'—'}</b><p>{customer?.contact}<br/>{customer?.street}<br/>{[customer?.postalCode,customer?.city].filter(Boolean).join(' ')}<br/>{customer?.phone}<br/>{customer?.email}</p></div><div><h3>Prüfung</h3><p><b>Datum:</b> {displayDate(protocol.inspectionDate)}<br/><b>Prüfer:</b> {protocol.inspector}<br/><b>Prüfobjekt:</b> {protocol.objectName}<br/><b>Gerätenummer:</b> {protocol.objectNumber||'—'}<br/><b>Nächste Prüfung:</b> {displayDate(protocol.nextInspection)}</p></div></div><h3>Prüfergebnisse</h3><table><thead><tr><th>Prüfpunkt</th><th>Status</th><th>Bemerkung</th></tr></thead><tbody>{protocol.checks.map((c,i)=><tr key={i}><td>{c.name}</td><td>{c.status}</td><td>{c.note||'—'}</td></tr>)}</tbody></table><div className="protocolGrid"><div><h3>Bemerkungen</h3><p className="prewrap">{protocol.notes||'Keine zusätzlichen Bemerkungen.'}</p></div><div><h3>Gesamtergebnis</h3><span className={`badge big ${resultClass(protocol.result)}`}>{protocol.result}</span></div></div><div className="signatures"><div>Unterschrift Prüfer</div><div>Unterschrift Kunde</div></div></div>
}

function TimeTracking({employees,customers,entries,employeeName,customerName,timer,timeEmployee,setTimeEmployee,startWork,togglePause,endWork,addManualTime}){
  const employeeStats=employees.map(e=>({...e,hours:entries.filter(x=>x.employeeId===e.id).reduce((s,x)=>s+durationHours(x),0)}))
  return <section><h1>Arbeitszeiterfassung</h1><div className="grid4">{employeeStats.map(e=><div className="card kpi" key={e.id}><span>{e.name}</span><b>{formatHours(e.hours)}</b><small>erfasst</small></div>)}</div><div className="two"><Card title="Stempeluhr"><label className="fieldLabel">Mitarbeiter</label><select value={timeEmployee} onChange={e=>setTimeEmployee(e.target.value)} disabled={!!timer}>{employees.filter(e=>e.status!=='Inaktiv').map(e=><option key={e.id} value={e.id}>{e.name}</option>)}</select><div className="clockBox"><strong>{timer?(timer.pausedAt?'Pause läuft':'Arbeitszeit läuft'):'Nicht eingestempelt'}</strong><span>{timer?`Beginn ${localTime(timer.startedAt)} · ${employeeName(timer.employeeId)}`:'Arbeitszeit mit einem Klick starten.'}</span></div><div className="buttonRow">{!timer&&<button className="primary" onClick={startWork}>Arbeitszeit starten</button>}{timer&&<button className="secondary" onClick={togglePause}>{timer.pausedAt?'Pause beenden':'Pause starten'}</button>}{timer&&<button className="danger" onClick={endWork}>Feierabend</button>}</div></Card><Card title="Zeit manuell erfassen"><form onSubmit={addManualTime}><select name="employeeId" required><option value="">Mitarbeiter</option>{employees.filter(e=>e.status!=='Inaktiv').map(e=><option key={e.id} value={e.id}>{e.name}</option>)}</select><input name="date" type="date" required/><div className="split"><input name="start" type="time" required/><input name="end" type="time" required/></div><input name="breakMinutes" type="number" min="0" defaultValue="30"/><select name="type"><option>Arbeitszeit</option><option>Fahrzeit</option><option>Prüfzeit</option><option>Bürozeit</option></select><select name="customerId"><option value="">Kein Kunde</option>{customers.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select><input name="note" placeholder="Notiz / Auftrag"/><button className="primary">Zeit speichern</button></form></Card></div><div className="two"><Card title="Letzte Buchungen">{entries.length?entries.slice(0,12).map(x=><div className="row" key={x.id}><b>{x.date} · {employeeName(x.employeeId)} · {formatHours(durationHours(x))}</b><span>{x.start}–{x.end} · {x.breakMinutes} Min. Pause · {x.type}{x.customerId?` · ${customerName(x.customerId)}`:''}</span></div>):<p>Noch keine Zeiten erfasst.</p>}</Card><Card title="Admin-Auswertung"><table><thead><tr><th>Mitarbeiter</th><th>Ist</th><th>Soll/Woche</th></tr></thead><tbody>{employeeStats.map(e=><tr key={e.id}><td>{e.name}</td><td>{formatHours(e.hours)}</td><td>{e.weeklyHours} Std.</td></tr>)}</tbody></table></Card></div></section>
}

function customerPayload(f){return {name:String(f.get('name')||'').trim(),customer_number:String(f.get('customerNumber')||'').trim(),contact:String(f.get('contact')||'').trim(),phone:String(f.get('phone')||'').trim(),email:String(f.get('email')||'').trim(),street:String(f.get('street')||'').trim(),postal_code:String(f.get('postalCode')||'').trim(),city:String(f.get('city')||'').trim(),notes:String(f.get('notes')||'').trim(),status:'Aktiv'}}
function mapCustomer(r){return {id:r.id,name:r.name||'',customerNumber:r.customer_number||'',contact:r.contact||'',phone:r.phone||'',email:r.email||'',street:r.street||'',postalCode:r.postal_code||'',city:r.city||'',notes:r.notes||'',status:r.status||'Aktiv'}}
function mapProtocol(r){return {id:r.id,protocolNumber:r.protocol_number||'',customerId:r.customer_id,inspectionDate:r.inspection_date||'',inspector:r.inspector||'',objectName:r.object_name||'',objectNumber:r.object_number||'',result:r.result||'',notes:r.notes||'',nextInspection:r.next_inspection||'',checks:Array.isArray(r.checks)?r.checks:[]}}
function durationHours(x){if(!x.start||!x.end)return 0;const[sh,sm]=x.start.split(':').map(Number),[eh,em]=x.end.split(':').map(Number);let mins=(eh*60+em)-(sh*60+sm)-(x.breakMinutes||0);if(mins<0)mins+=1440;return Math.max(0,mins/60)}
function formatHours(v){return `${v.toFixed(2).replace('.',',')} Std.`}
function localDate(d){const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),day=String(d.getDate()).padStart(2,'0');return `${y}-${m}-${day}`}
function localTime(d){return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`}
function displayDate(v){if(!v)return '—';const[y,m,d]=String(v).split('-');return d&&m&&y?`${d}.${m}.${y}`:v}
function resultClass(v){return v==='Bestanden'?'good':v==='Nicht bestanden'?'bad':'warning'}
function Kpi({label,value}){return <div className="card kpi"><span>{label}</span><b>{value}</b></div>}
function Card({title,children}){return <div className="card"><h2>{title}</h2>{children}</div>}
