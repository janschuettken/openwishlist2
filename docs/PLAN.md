# Open Wishlist 2: Plan für den Neuaufbau

Stand: 03.11.2026. Grundlage: altes Frontend `D:\Projekte\Angular\openwishlist` (Angular 18, Black-Dashboard-Template) und Backend `D:\Projekte\web\api\wishlist\rest-api.php` (bleibt unverändert).

## 1. Was die alte App wirklich kann

Viele Seiten im alten Projekt sind Reste aus dem Template (dashboard, icons, maps, tables, typography, rtl, notifications, test) und werden **nicht** übernommen. Echte Funktionen:

| Bereich | Funktionen | API-Actions |
|---|---|---|
| Auth | Login (E-Mail/Passwort), Auto-Login per `loginToken`, Registrierung, Passwort vergessen, Passwort zurücksetzen (`#/reset-password/:code`), Logout | `login`, `register`, `forgotPasswordMail`, `resetPassword` |
| Home | Begrüßung, Liste eigener Listen/Events | `getEvents` |
| Meine Wünsche | Wünsche anlegen/bearbeiten/löschen/archivieren, Bild-URL, Link-Vorschau (linkpreview.net) | `addWish`, `editWish`, `deleteWish`, `getWishes` |
| Listen (Events) | Typen: privat (0), Wichteln (1), öffentlich (2), geteilt (3). Anlegen, bearbeiten, löschen, archivieren (archiviert auch reservierte Wünsche), Deadline, Beschreibung | `addEvent`, `editEvent`, `deleteEvent`, `getEvents` |
| Liste: Wünsche | Wünsche zur Liste hinzufügen/entfernen, neuen Wunsch direkt in Liste anlegen | `addEventWish`, `deleteEventWish`, `getWishes(eventId)` |
| Liste: Mitglieder | Nutzer suchen und hinzufügen/entfernen, Rechte (power 0 = Follower, 50 = Mitglied, 100 = Besitzer), Benachrichtigung an/aus | `addEventUser`, `deleteEventUser`, `getEventUsers`, `updateEventUserPower`, `updateEventUserNotify` |
| Reservieren | Fremde Wünsche reservieren/freigeben, Fortschritt (teilweise/voll reserviert) | `claimWish`, `editClaim`, `getWishesClaimed` |
| Wichteln | Zuordnung auslosen/zurücksetzen, „Dein Wichtel" anzeigen mit dessen Wünschen | `generateSecretSanta`, `resetSecretSanta`, `getYourSecretSanta` |
| Folgen | Personen suchen und folgen/entfolgen, gefolgte Listen anzeigen, einzelner Liste folgen | `followUser`, `unfollowUser`, `getFollowers`, `getEventFollowed` |
| Nutzerprofil (fremd) | Öffentliche/geteilte Listen einer Person | `getUser`, `getEventUsers(userId)` |
| Eigenes Profil | Name/E-Mail ändern, Profilbild zuschneiden und hochladen | `editUser`, `setUserImage` (multipart) |
| Admin (power ≥ 100) | Nutzersuche, „Einloggen als", zurück zum Admin | `getUser(search, adminMode)` |
| Allgemein | Deutsch/Englisch, Hell/Dunkel-Modus, Seitentitel mit Badge | – |

## 2. Wichtige Eigenheiten der API (Frontend muss sich anpassen)

- Ein Endpunkt, alles per `POST` mit JSON `{ action, session, ... }`.
- Fehler kommen als HTTP 200 mit `{ result: 'not ok', message }`. Bei `session: 'error'` einmal neu per `loginToken` einloggen und die Anfrage wiederholen (wie bisher).
- Zahlen kommen teils als Strings aus MySQL (`"1"`), daher beim Einlesen in Modelle sauber umwandeln.
- `getPreviewImage` ist im Backend aktuell nicht eingebunden (require auskommentiert), daher bleibt die Link-Vorschau bei linkpreview.net.
- Der Link in der Passwort-Mail ist `https://openwishlist.de/#/reset-password/<code>`, daher **muss Hash-Routing bleiben**.

## 3. Technische Basis (Vorschlag)

- Angular 22, nur Standalone-Komponenten, Signals, zoneless, neue Control-Flow-Syntax (`@if`, `@for`).
- **Kein Vererbungsbaum** mehr wie `BasicPageComponent`. Stattdessen:
  - `AuthStore` (Signal-Store): aktueller Nutzer, Session, Auto-Login, Logout, Admin-Impersonation.
  - `authGuard` / `guestGuard` / `adminGuard` statt manueller Checks in jeder Seite.
  - `ApiClient` (HttpClient + Interceptor-artige Fehlerbehandlung, Session-Retry) und je Bereich ein schlanker Service: `WishApi`, `EventApi`, `UserApi`, `FollowApi`, `SantaApi`.
  - `ToastService` und `ConfirmDialog` als eigene kleine Komponenten.
- Typisierte Modelle (`Wish`, `WishList`/`Event`, `User`, `EventMember`) mit Mapper-Funktionen statt Klassen mit Gettern.
- i18n mit **ngx-translate**, vorhandene `de.json`/`en.json` werden übernommen und bereinigt.
- Lazy geladene Routen pro Bereich.

## 4. Ordnerstruktur

```
src/app/
  core/            api-client, auth-store, guards, storage, toast, theme, i18n setup
  models/          wish.ts, event.ts, user.ts (+ Mapper)
  shared/ui/       button, card, avatar, user-card, user-search, progress, confirm-dialog, image-cropper-wrapper, loading
  layout/          shell (Sidebar/Topbar, mobil als Drawer), auth-layout
  features/
    auth/          login, register, forgot-password, reset-password
    home/
    wishes/        wish-list, wish-edit, wish-card
    events/        event-list, event-detail, event-edit, event-card, members, secret-santa
    following/
    users/         user-profile (fremd)
    profile/       eigenes Profil + Bild
    admin/
```

## 5. Routen (kompatibel zu alten Links)

`/home`, `/login`, `/register`, `/forgot-password`, `/reset-password/:resetCode`, `/wishes`, `/wish-edit`, `/wish-edit/:id`, `/wish-edit/:id/:eventId`, `/events`, `/event/:id`, `/event-edit`, `/event-edit/:id`, `/following`, `/user/:id`, `/profile`, `/admin`, `**` → Not Found. Alle mit `#/`.

## 6. Reihenfolge der Umsetzung

1. Grundgerüst: Dependencies, Theme (hell/dunkel), i18n, Layout-Shell, ApiClient, AuthStore, Guards.
2. Auth-Seiten (Login, Registrierung, Passwort vergessen/zurücksetzen).
3. Meine Wünsche (Liste, Anlegen/Bearbeiten, Archivieren, Link-Vorschau).
4. Listen: Übersicht, Anlegen/Bearbeiten, Detail mit Wünschen und Reservieren.
5. Mitglieder-Verwaltung und Wichteln.
6. Folgen, fremdes Profil, eigenes Profil mit Bild-Upload.
7. Admin.
8. Feinschliff: mobile Ansicht, Ladezustände, leere Zustände, Build für Produktion.

Nach jedem Schritt läuft `ng build` sauber durch und ich teste gegen die echte API.

## 7. Entscheidungen (03.11.2026)

1. **Design**: Tailwind CSS v4, eigenes neues Design. Desktop mit fester Sidebar, mobil mit Kopfzeile, Tab-Leiste unten und schwebendem Plus-Button.
2. **PWA**: Manifest, Service Worker (`ngsw-config.json`), Icons aus dem alten Logo.
3. **i18n**: eigene kleine Signal-Lösung statt ngx-translate (`src/app/i18n/de.ts`, `en.ts`); fehlende englische Texte fallen beim Build auf.
4. **Git**: Repo `janschuettken/openwishlist2`, gearbeitet wird auf `dev`.
5. **Rollen in Listen**: Besitzer (100), „Mitwünschend“ (50, darf eigene Wünsche hinzufügen), „Sieht & schenkt“ (0). Neue Teilnehmer bekommen wie bisher beim Wichteln 50, sonst 0; der Besitzer kann die Rolle ändern.
6. **Sichtbarkeit**: Eigene Wünsche immer ohne Reservierungsstand (keine Spoiler), Wünsche anderer mit Stand und Verschenken-Button. Private Listen zeigt das Frontend nur Mitgliedern.
