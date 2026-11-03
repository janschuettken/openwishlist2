# Open Wishlist 2

Neues Frontend für [openwishlist.de](https://openwishlist.de): Angular 22, Tailwind CSS v4, installierbar als PWA.
Das Backend ist unverändert `api.jan-schuettken.de/wishlist/rest-api.php` (siehe `src/environments/environment.ts`).

## Entwicklung

```bash
npm install
npm start            # ng serve, http://localhost:4200
npm run build        # Produktions-Build nach dist/openwishlist2/browser
```

Der Service Worker ist nur im Produktions-Build aktiv.

## Aufbau

- `src/app/core`: API-Client, Auth-Store, Guards, Modelle, i18n, Toasts/Dialoge/Theme
- `src/app/shared`: wiederverwendbare UI (Icons, Karten, Avatar, Nutzersuche)
- `src/app/layout`: App-Rahmen (Desktop-Sidebar, mobile Tab-Leiste) und Overlays
- `src/app/features`: eine Datei pro Seite, lazy geladen
- `src/app/i18n`: Texte Deutsch/Englisch

Routing nutzt Hash-URLs (`#/…`), weil die Passwort-Mail auf `#/reset-password/<code>` verlinkt.
Mehr Hintergrund: `docs/PLAN.md`.
