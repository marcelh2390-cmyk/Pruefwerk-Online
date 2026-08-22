# Prüfwerk Online

Grundgerüst für eine mehrbenutzerfähige UVV-Prüfapp mit Einsatzplanung und Arbeitszeiterfassung.

## Enthalten
- Prüfwerk Branding in Orange mit einem Haken
- Dashboard
- Kunden
- Prüfobjekte
- Mitarbeiter inkl. Wochen-Sollstunden
- Einsatzplanung
- Arbeitszeiterfassung mit Start, Pause und Feierabend
- Manuelle Zeitbuchungen
- Zuordnung von Zeit zu Kunde und Zeitart (Arbeits-, Fahr-, Prüf- oder Bürozeit)
- Einfache Admin-Auswertung der erfassten Stunden
- Prüfungsbereich
- Protokollübersicht

## Wichtig
Die aktuelle Version ist ein Frontend-Prototyp. Daten leben nur während der laufenden Browsersitzung und sind noch nicht zentral gespeichert. Für den echten Mehrbenutzerbetrieb müssen Login und Datenbank angeschlossen werden.

## Für den echten Online-Betrieb noch zu verbinden
1. Supabase-Projekt für Login und zentrale Datenbank anlegen.
2. `.env.example` nach `.env.local` kopieren und Supabase-Zugangsdaten eintragen.
3. Datenmodelle für `customers`, `employees`, `assets`, `planning`, `inspections`, `protocols` und `time_entries` anlegen.
4. Rollen und Rechte ergänzen: Admin / Prüfer. Mitarbeiter dürfen eigene Zeiten buchen; Admins dürfen alle Zeiten auswerten und korrigieren.
5. Änderungen an Zeitbuchungen in einem Audit-Log protokollieren.
6. Hosting z. B. über Vercel und Domain `app.pruefwerk.de` verbinden.
7. Danach Mängelfotos, digitale Unterschrift, automatische PDF-Protokolle sowie PDF-/Excel-Arbeitszeitnachweise ergänzen.

## Empfohlenes Datenmodell für Arbeitszeit
`time_entries`: id, employee_id, work_date, start_time, end_time, break_minutes, time_type, customer_id, planning_id, note, created_at, updated_at, created_by, updated_by.

## Lokal starten
```bash
npm install
npm run dev
```
Dann `http://localhost:3000` öffnen.
