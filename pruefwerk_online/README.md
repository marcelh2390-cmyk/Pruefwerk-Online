# Prüfwerk Online

Mehrbenutzerfähige UVV-Prüfapp mit Supabase-Login und dauerhafter Mitarbeiterverwaltung.

## Jetzt angeschlossen
- Prüfwerk Branding in Orange mit einem Haken
- Supabase E-Mail/Passwort-Login
- Mitarbeiter werden aus `public.employees` geladen
- Mitarbeiter anlegen, bearbeiten und deaktivieren wird dauerhaft in Supabase gespeichert
- RLS ist für die Tabelle `employees` vorgesehen
- Dashboard, Kunden, Prüfobjekte, Planung, Arbeitszeit, Prüfung und Protokolle als weitere App-Bereiche

## Vercel Environment Variables
Diese beiden Variablen müssen in Vercel gesetzt sein:

```text
NEXT_PUBLIC_SUPABASE_URL=https://DEIN-PROJEKT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

Nach Änderungen an Environment Variables immer neu deployen.

## Supabase Tabelle `employees`
Erwartete Spalten:
- `id` int8, Primary Key
- `created_at` timestamptz, Default `now()`
- `name` text
- `role` text
- `weekly_hours` int8
- `status` text

## RLS Policy
RLS bleibt aktiviert. Für den aktuellen Stand kann eine Policy für `authenticated` mit `ALL`, `USING (true)` und `WITH CHECK (true)` verwendet werden. Dadurch dürfen nur angemeldete Supabase-Benutzer die Mitarbeiterdaten über die App verwalten.

## Noch nicht dauerhaft gespeichert
Kunden, Prüfobjekte, Planung, Arbeitszeiten und Prüfprotokolle sind in dieser Ausbaustufe noch nicht mit Supabase verbunden. Diese Tabellen werden als Nächstes zentral angebunden.

## Lokal starten
```bash
npm install
npm run dev
```

## Kunden und Protokolle dauerhaft speichern

1. In Supabase den **SQL Editor** öffnen.
2. Den Inhalt von `supabase_setup_customers_protocols.sql` einfügen und **Run** ausführen.
3. Danach die aktualisierte App über GitHub/Vercel deployen.
4. Unter **Kunden** können Kunden angelegt und bearbeitet werden.
5. Unter **Neue Prüfung** kann ein UVV-Protokoll erstellt werden. Es wird in Supabase gespeichert und unter **Protokolle** wieder geladen.

Die RLS-Regeln erlauben den Zugriff nur für angemeldete Supabase-Benutzer (`authenticated`).


## Dark-Design
Die Oberfläche verwendet das Prüfwerk-Branding in Schwarz/Orange mit linker Navigation und eingebundenem Logo.
