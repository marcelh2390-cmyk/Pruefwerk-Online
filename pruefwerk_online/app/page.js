'use client'
import { useMemo, useState } from 'react'

const seedCustomers = [
  { id: 1, name: 'Muster GmbH', contact: 'Max Mustermann', city: 'Berlin' },
  { id: 2, name: 'Nordlogistik AG', contact: 'Anna Becker', city: 'Hamburg' }
]
const seedEmployees = [
  { id: 1, name: 'Marco Stein', role: 'Prüfer', status: 'Aktiv', weeklyHours: 40 },
  { id: 2, name: 'Lena Koch', role: 'Prüferin', status: 'Aktiv', weeklyHours: 40 }
]
const seedAssets = [
  { id: 1, customerId: 1, name: 'Gabelstapler', internal: 'ST-001', location: 'Halle 1' },
  { id: 2, customerId: 2, name: 'Hubwagen', internal: 'HW-004', location: 'Lager Nord' }
]
const seedTimes = [
  { id: 1, employeeId: 1, date: '2026-08-21', start: '07:30', end: '16:00', breakMinutes: 30, type: 'Arbeitszeit', customerId: 1, note: 'UVV-Prüfungen vor Ort' },
  { id: 2, employeeId: 2, date: '2026-08-21', start: '08:00', end: '16:30', breakMinutes: 30, type: 'Arbeitszeit', customerId: 2, note: 'Prüfung und Dokumentation' }
]

export default function Home() {
  const [tab, setTab] = useState('dashboard')
  const [customers, setCustomers] = useState(seedCustomers)
  const [employees, setEmployees] = useState(seedEmployees)
  const [assets] = useState(seedAssets)
  const [planning, setPlanning] = useState([
    { id: 1, date: '2026-08-24', time: '08:00', employeeId: 1, customerId: 1, assetId: 1, status: 'Geplant' },
    { id: 2, date: '2026-08-25', time: '10:30', employeeId: 2, customerId: 2, assetId: 2, status: 'Bestätigt' }
  ])
  const [protocols, setProtocols] = useState([])
  const [timeEntries, setTimeEntries] = useState(seedTimes)
  const [timer, setTimer] = useState(null)
  const [timeEmployee, setTimeEmployee] = useState(1)

  const customerName = id => customers.find(x => x.id === id)?.name || '—'
  const employeeName = id => employees.find(x => x.id === id)?.name || '—'
  const assetName = id => assets.find(x => x.id === id)?.name || '—'

  function addCustomer(e){
    e.preventDefault(); const f = new FormData(e.currentTarget)
    setCustomers(v => [...v,{id:Date.now(),name:f.get('name'),contact:f.get('contact'),city:f.get('city')}]); e.currentTarget.reset()
  }
  function addEmployee(e){
    e.preventDefault(); const f = new FormData(e.currentTarget)
    setEmployees(v => [...v,{id:Date.now(),name:f.get('name'),role:f.get('role'),status:'Aktiv',weeklyHours:+f.get('weeklyHours')||40}]); e.currentTarget.reset()
  }
  function addPlanning(e){
    e.preventDefault(); const f = new FormData(e.currentTarget)
    setPlanning(v => [...v,{id:Date.now(),date:f.get('date'),time:f.get('time'),employeeId:+f.get('employeeId'),customerId:+f.get('customerId'),assetId:+f.get('assetId'),status:'Geplant'}]); e.currentTarget.reset()
  }
  function addProtocol(){
    setProtocols(v => [{id:Date.now(),nr:`UVV-${new Date().getFullYear()}-${String(v.length+1).padStart(4,'0')}`,date:new Date().toISOString().slice(0,10),result:'Bestanden'},...v])
  }
  function addManualTime(e){
    e.preventDefault(); const f = new FormData(e.currentTarget)
    setTimeEntries(v => [{
      id:Date.now(), employeeId:+f.get('employeeId'), date:f.get('date'), start:f.get('start'), end:f.get('end'),
      breakMinutes:+f.get('breakMinutes')||0, type:f.get('type'), customerId:+f.get('customerId')||null, note:f.get('note')
    },...v]); e.currentTarget.reset()
  }
  function startWork(){
    if(timer) return
    const now = new Date()
    setTimer({employeeId:+timeEmployee, startedAt:now, pausedAt:null, pausedMinutes:0})
  }
  function togglePause(){
    if(!timer) return
    const now = new Date()
    if(timer.pausedAt){
      const extra = Math.round((now - timer.pausedAt)/60000)
      setTimer({...timer, pausedAt:null, pausedMinutes:timer.pausedMinutes+extra})
    } else {
      setTimer({...timer, pausedAt:now})
    }
  }
  function endWork(){
    if(!timer) return
    const now = new Date()
    let pause = timer.pausedMinutes
    if(timer.pausedAt) pause += Math.round((now-timer.pausedAt)/60000)
    setTimeEntries(v => [{
      id:Date.now(), employeeId:timer.employeeId, date:localDate(timer.startedAt), start:localTime(timer.startedAt), end:localTime(now),
      breakMinutes:pause, type:'Arbeitszeit', customerId:null, note:'Per Stempeluhr erfasst'
    },...v])
    setTimer(null)
  }

  const tabs = ['dashboard','customers','assets','employees','planning','time','inspection','protocols']
  const labels = {dashboard:'Dashboard',customers:'Kunden',assets:'Prüfobjekte',employees:'Mitarbeiter',planning:'Planung',time:'Arbeitszeit',inspection:'Neue Prüfung',protocols:'Protokolle'}
  const nextJobs = useMemo(() => [...planning].sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time)).slice(0,5),[planning])
  const totalHours = useMemo(() => timeEntries.reduce((sum,x)=>sum+durationHours(x),0),[timeEntries])

  return <>
    <header>
      <div className="brand"><span>Prüf<span className="orange">werk</span></span><b>✓</b></div>
      <nav>{tabs.map(t=><button className={tab===t?'active':''} onClick={()=>setTab(t)} key={t}>{labels[t]}</button>)}</nav>
    </header>
    <main>
      {tab==='dashboard' && <section>
        <h1>Dashboard</h1>
        <div className="grid4">
          <Kpi label="Kunden" value={customers.length}/><Kpi label="Mitarbeiter" value={employees.length}/><Kpi label="Prüfobjekte" value={assets.length}/><Kpi label="Arbeitsstunden erfasst" value={formatHours(totalHours)}/>
        </div>
        <div className="two">
          <Card title="Nächste Einsätze">{nextJobs.map(j=><div className="row" key={j.id}><b>{j.date} · {j.time}</b><span>{customerName(j.customerId)} · {employeeName(j.employeeId)}</span></div>)}</Card>
          <Card title="Prüfwerk Online"><p>Planung, UVV-Prüfung und Arbeitszeit greifen hier ineinander. Im Produktivbetrieb werden Login, Datenbank und Benutzerrechte zentral angebunden.</p><div className="buttonRow"><button className="primary" onClick={()=>setTab('planning')}>Planung öffnen</button><button className="secondary" onClick={()=>setTab('time')}>Arbeitszeit</button></div></Card>
        </div>
      </section>}

      {tab==='customers' && <section><h1>Kunden</h1><div className="two"><Card title="Neuen Kunden anlegen"><form onSubmit={addCustomer}><input name="name" placeholder="Firma / Kunde" required/><input name="contact" placeholder="Ansprechpartner"/><input name="city" placeholder="Ort"/><button className="primary">Speichern</button></form></Card><Card title="Kundenliste">{customers.map(c=><div className="row" key={c.id}><b>{c.name}</b><span>{c.contact} · {c.city}</span></div>)}</Card></div></section>}

      {tab==='assets' && <section><h1>Prüfobjekte</h1><Card title="Geräte & Fahrzeuge">{assets.map(a=><div className="row" key={a.id}><b>{a.name} · {a.internal}</b><span>{customerName(a.customerId)} · {a.location}</span></div>)}</Card></section>}

      {tab==='employees' && <section><h1>Mitarbeiter</h1><div className="two"><Card title="Mitarbeiter anlegen"><form onSubmit={addEmployee}><input name="name" placeholder="Name" required/><input name="role" placeholder="Funktion"/><input name="weeklyHours" type="number" min="1" max="60" defaultValue="40" placeholder="Sollstunden / Woche"/><button className="primary">Speichern</button></form></Card><Card title="Team">{employees.map(e=><div className="row" key={e.id}><b>{e.name}</b><span>{e.role} · {e.status} · {e.weeklyHours} Std./Woche</span></div>)}</Card></div></section>}

      {tab==='planning' && <section><h1>Einsatzplanung</h1><div className="two"><Card title="Termin planen"><form onSubmit={addPlanning}><select name="employeeId" required><option value="">Mitarbeiter</option>{employees.map(e=><option value={e.id} key={e.id}>{e.name}</option>)}</select><select name="customerId" required><option value="">Kunde</option>{customers.map(c=><option value={c.id} key={c.id}>{c.name}</option>)}</select><select name="assetId" required><option value="">Prüfobjekt</option>{assets.map(a=><option value={a.id} key={a.id}>{a.name} · {a.internal}</option>)}</select><input name="date" type="date" required/><input name="time" type="time" required/><button className="primary">Termin speichern</button></form></Card><Card title="Geplante Einsätze">{planning.map(j=><div className="row" key={j.id}><b>{j.date} · {j.time} · {customerName(j.customerId)}</b><span>{employeeName(j.employeeId)} · {assetName(j.assetId)} · {j.status}</span></div>)}</Card></div></section>}

      {tab==='time' && <TimeTracking
        employees={employees} customers={customers} entries={timeEntries} employeeName={employeeName} customerName={customerName}
        timer={timer} timeEmployee={timeEmployee} setTimeEmployee={setTimeEmployee} startWork={startWork} togglePause={togglePause} endWork={endWork} addManualTime={addManualTime}
      />}

      {tab==='inspection' && <section><h1>Neue UVV-Prüfung</h1><Card title="Prüfung starten"><p>Hier kommen später die gerätespezifischen Prüflisten, Mängelfotos, Unterschriften und die automatische PDF-Erstellung hinein.</p><button className="primary" onClick={addProtocol}>Demo-Prüfung als bestanden speichern</button></Card></section>}

      {tab==='protocols' && <section><h1>Protokolle</h1><Card title="Prüfprotokolle">{protocols.length?protocols.map(p=><div className="row" key={p.id}><b>{p.nr}</b><span>{p.date} · {p.result}</span></div>):<p>Noch keine Protokolle.</p>}</Card></section>}
    </main>
  </>
}

function TimeTracking({employees,customers,entries,employeeName,customerName,timer,timeEmployee,setTimeEmployee,startWork,togglePause,endWork,addManualTime}){
  const employeeStats = employees.map(e=>({
    ...e,
    hours: entries.filter(x=>x.employeeId===e.id).reduce((s,x)=>s+durationHours(x),0)
  }))
  return <section>
    <h1>Arbeitszeiterfassung</h1>
    <div className="grid4">
      {employeeStats.map(e=><div className="card kpi" key={e.id}><span>{e.name}</span><b>{formatHours(e.hours)}</b><small>erfasst</small></div>)}
    </div>
    <div className="two">
      <Card title="Stempeluhr">
        <label className="fieldLabel">Mitarbeiter</label>
        <select value={timeEmployee} onChange={e=>setTimeEmployee(e.target.value)} disabled={!!timer}>{employees.map(e=><option key={e.id} value={e.id}>{e.name}</option>)}</select>
        <div className="clockBox">
          <strong>{timer ? (timer.pausedAt ? 'Pause läuft' : 'Arbeitszeit läuft') : 'Nicht eingestempelt'}</strong>
          <span>{timer ? `Beginn ${localTime(timer.startedAt)} · ${employeeName(timer.employeeId)}` : 'Arbeitszeit mit einem Klick starten.'}</span>
        </div>
        <div className="buttonRow">
          {!timer && <button className="primary" onClick={startWork}>Arbeitszeit starten</button>}
          {timer && <button className="secondary" onClick={togglePause}>{timer.pausedAt?'Pause beenden':'Pause starten'}</button>}
          {timer && <button className="danger" onClick={endWork}>Feierabend</button>}
        </div>
      </Card>
      <Card title="Zeit manuell erfassen">
        <form onSubmit={addManualTime}>
          <select name="employeeId" required><option value="">Mitarbeiter</option>{employees.map(e=><option key={e.id} value={e.id}>{e.name}</option>)}</select>
          <input name="date" type="date" required/>
          <div className="split"><input name="start" type="time" required/><input name="end" type="time" required/></div>
          <input name="breakMinutes" type="number" min="0" defaultValue="30" placeholder="Pause in Minuten"/>
          <select name="type"><option>Arbeitszeit</option><option>Fahrzeit</option><option>Prüfzeit</option><option>Bürozeit</option></select>
          <select name="customerId"><option value="">Kein Kunde</option>{customers.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select>
          <input name="note" placeholder="Notiz / Auftrag"/>
          <button className="primary">Zeit speichern</button>
        </form>
      </Card>
    </div>
    <div className="two">
      <Card title="Letzte Buchungen">
        {entries.length ? entries.slice(0,12).map(x=><div className="row" key={x.id}><b>{x.date} · {employeeName(x.employeeId)} · {formatHours(durationHours(x))}</b><span>{x.start}–{x.end} · {x.breakMinutes} Min. Pause · {x.type}{x.customerId?` · ${customerName(x.customerId)}`:''}</span><small>{x.note}</small></div>) : <p>Noch keine Zeiten erfasst.</p>}
      </Card>
      <Card title="Admin-Auswertung">
        <table><thead><tr><th>Mitarbeiter</th><th>Ist</th><th>Soll/Woche</th></tr></thead><tbody>{employeeStats.map(e=><tr key={e.id}><td>{e.name}</td><td>{formatHours(e.hours)}</td><td>{e.weeklyHours} Std.</td></tr>)}</tbody></table>
        <p className="hint">In der Datenbank-Version kommen Monatsfilter, Überstunden, Urlaub/Krankheit, Änderungsprotokoll und PDF-/Excel-Nachweise hinzu.</p>
      </Card>
    </div>
  </section>
}

function durationHours(x){
  if(!x.start || !x.end) return 0
  const [sh,sm]=x.start.split(':').map(Number), [eh,em]=x.end.split(':').map(Number)
  let mins=(eh*60+em)-(sh*60+sm)-(x.breakMinutes||0)
  if(mins<0) mins+=24*60
  return Math.max(0,mins/60)
}
function formatHours(v){return `${v.toFixed(2).replace('.',',')} Std.`}
function localDate(d){const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),day=String(d.getDate()).padStart(2,'0');return `${y}-${m}-${day}`}
function localTime(d){return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`}
function Kpi({label,value}){return <div className="card kpi"><span>{label}</span><b>{value}</b></div>}
function Card({title,children}){return <div className="card"><h2>{title}</h2>{children}</div>}
