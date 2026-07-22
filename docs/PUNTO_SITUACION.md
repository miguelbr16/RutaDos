# RutaDos — Punto de situación

**Fecha:** 22 jul 2026 (noche, tras sesión diseño)  
**Repo:** https://github.com/miguelbr16/RutaDos (`main`)  
**Live:** https://ruta-dos-miguelbr16s-projects.vercel.app  
**Bot:** [@RutaDosGuia_bot](https://t.me/RutaDosGuia_bot)  
**Supabase:** `odecdpzcnsmvafvbuiby` · https://odecdpzcnsmvafvbuiby.supabase.co

---

## Qué es RutaDos

PWA mobile-first (también usable en PC) para **planificar un viaje día a día**: destino, fechas, gustos → itinerario con mapa, transporte oficial, hoteles/restaurantes (OSM + links), offline del día y copiloto Telegram.

**Para cualquier viajero** (solo o acompañado). Sync en pareja es opcional (Supabase).

Guía de pantallas y términos: **`docs/GUIA_APP.md`**

---

## Commits recientes (orden cronológico)

| Commit | Qué |
|--------|-----|
| `a4ea5b1` | Fotos en **popup del mapa** al clicar pin (no en el pin); trip map limpio |
| `3c2f7d5` | Wizard: sin hueco vacío, sitios típicos, panel lateral paso Estilo |
| `37aafd7` | Layout ancho PC, iconos SVG, trip mapa + panel lateral |
| `9c045af` | Rediseño v2 home/wizard/trip + `redesign.css` + Unsplash |
| `f03d6f5` | OpenTripMap, VenueFinder, docs Behance, fix aeropuerto wizard |

---

## Estado funcional

| Área | Estado |
|------|--------|
| Wizard 3 pasos (destino → estilo → confirmar) | OK |
| Generar plan (OSM + Wikipedia + OTM opcional) | OK |
| Trip: mapa, presupuesto, días, hotel/restaurantes | OK |
| Day: timeline, caos, offline, meteo | OK |
| VenueFinder (OSM + OTM) | OK |
| Share por token | OK |
| Sync Supabase / export JSON | OK |
| Bot Telegram v6 | OK |
| Afiliado Booking | Preparado, **no activar** |
| OpenTripMap en prod | Código listo; falta key en Vercel |

---

## Estado diseño (jul 2026 — en progreso)

| Pantalla | Hecho | Pendiente / feedback usuario |
|----------|-------|------------------------------|
| **Home** | Hero full-bleed, destinos con foto, layout ancho PC | Pulir copy y densidad |
| **Wizard** | Panel compacto, destinos siempre visibles, sitios típicos | Mapa preview; menos “encuesta” |
| **Trip** | Mapa + panel lateral PC, popup con fotos, presupuesto | Tabs Mapa/Días/Hotel; diseño general |
| **Day** | Funcional | Rediseño YOGO (mapa fijo + barra abajo) |
| **Iconos** | SVG stroke (`Icons.tsx`), sin emojis en UI principal | — |

Roadmap visual: **`docs/DISENO_BEHANCE.md`**

---

## Mapa del producto (pantallas)

```
Home → Wizard (3 pasos) → Trip → Day → OnRoute
                ↓              ↓
            Settings       VenueFinder / Guides / Copilot / Share
```

Detalle: **`docs/GUIA_APP.md`**

---

## Stack y datos

- **Front:** Vite + React 19 + TypeScript + Zustand + PWA
- **Mapa:** Leaflet + OSM tiles
- **Plan:** OSM/Overpass, Nominatim, Wikipedia, OSRM, landmarks curados (Londres/París)
- **Opcional:** OpenTripMap (`VITE_OPENTRIPMAP_KEY`), Supabase sync
- **Deploy:** Vercel (front) + Supabase Edge (bot)

---

## Variables de entorno

Ver `.env.example`. Resumen:

| Variable | Obligatoria | Uso |
|----------|-------------|-----|
| `VITE_SUPABASE_URL` | No* | Sync + share |
| `VITE_SUPABASE_ANON_KEY` | No* | Sync + share |
| `VITE_TELEGRAM_BOT` | No | Username del bot (sin @) |
| `VITE_OPENTRIPMAP_KEY` | No | Más POIs y fotos en venues |
| `VITE_BOOKING_AID` | No | **No activar** hasta afiliado |

\*Sin Supabase: app local + export/import JSON.

---

## Documentación

| Archivo | Contenido |
|---------|-----------|
| `docs/PUNTO_SITUACION.md` | Este archivo — estado y handoff |
| `docs/GUIA_APP.md` | Pantallas, wizard, flujo, archivos clave |
| `docs/DISENO_BEHANCE.md` | Inspiración UI + fases A–D |
| `docs/IMAGENES.md` | Fotos Unsplash por destino |
| `docs/OPENTRIPMAP.md` | Activar API key free |
| `docs/BOOKING_AFILIADO.md` | Guía afiliado (futuro) |
| `docs/COPILOTO_TELEGRAM.md` | Setup bot |

---

## Entorno local

```bash
git clone https://github.com/miguelbr16/RutaDos.git
cd RutaDos
npm install
cp .env.example .env
npm run dev
```

```bash
npm run build   # obligatorio antes de push
```

---

## Archivos clave (jul 2026)

| Ruta | Para qué |
|------|----------|
| `src/pages/HomePage.tsx` | Portada |
| `src/pages/WizardPage.tsx` | Asistente crear viaje (3 pasos) |
| `src/pages/TripPage.tsx` | Resumen viaje + mapa |
| `src/pages/DayPage.tsx` | Día detallado |
| `src/components/TripMap.tsx` | Mapa Leaflet + popups con fotos |
| `src/components/Icons.tsx` | Iconos SVG |
| `src/components/VenueFinder.tsx` | Hoteles/restaurantes cerca |
| `src/components/DestinationGrid.tsx` | Cards destino |
| `src/lib/discover.ts` | Generar sitios del plan |
| `src/lib/landmarks.ts` | Iconos Londres/París + sitios típicos wizard |
| `src/lib/quickDestinations.ts` | Destinos curados + URLs Unsplash |
| `src/lib/opentripmap.ts` | Cliente OpenTripMap |
| `src/redesign.css` | Estilos v2 (home, wizard, trip) |
| `src/index.css` | Estilos base + componentes legacy |
| `src/store.ts` | Estado global (viajes, wizard, navegación) |

---

## Backups git

```bash
git tag -l 'backup*'
git log --oneline -15
```

| Tag / rama | Momento |
|------------|---------|
| `backup-pre-visual-redesign` | Antes rediseño jul 2026 |
| `backup-pre-wizard-3steps` | Antes wizard 3 pasos |

---

## Problemas conocidos

1. **PWA cachea CSS viejo** — hard refresh, borrar datos del sitio, o Redeploy Vercel sin caché.
2. **Diseño aún no convence al usuario** — funcionalidad OK; iteración visual pendiente (Fase B/C).
3. **Fotos en mapa** — solo en **popup al clicar pin** (Wikipedia); tarda ~1–2 s en cargar al abrir trip.
4. **`ruta-dos.vercel.app`** — 404; usar URL del proyecto `ruta-dos-miguelbr16s-projects`.

---

## Notas para el asistente (Cursor)

- Repo: **miguelbr16/RutaDos**, branch `main`.
- **No** commitear `.env`, tokens Telegram, `_tg_*`.
- **No** activar `VITE_BOOKING_AID` hasta afiliado aprobado.
- Bot Supabase: `verify_jwt: false` siempre.
- Build: `npm run build` antes de push.
- Leer **`docs/GUIA_APP.md`** para entender wizard y navegación.

---

## Prompt handoff (copiar en otro PC / mañana)

```
Continúo RutaDos en main (github.com/miguelbr16/RutaDos).
Leé docs/PUNTO_SITUACION.md, docs/GUIA_APP.md y docs/DISENO_BEHANCE.md.

Estado jul 2026 noche:
- Rediseño v2 parcial: home/wizard/trip con redesign.css, layout ancho PC (--layout-max 72rem), iconos SVG.
- Wizard: 3 pasos compactos, destinos populares siempre visibles, chips "sitios típicos" (landmarks.ts + cityGuides).
- Trip: mapa + panel lateral en desktop, presupuesto visible, popup con galería foto al clicar pin (NO foto en pin).
- Pendiente diseño: usuario no satisfecho con estética general — retomar mañana Fase B/C.

Prioridad diseño:
1. Day YOGO: mapa fijo + barra inferior sticky
2. Trip tabs: Mapa · Días · Hotel · Comer
3. Wizard: mini mapa preview al elegir destino
4. Pulir trip/home para sensación app profesional (no encuesta, no huecos)

Funcional sin tocar salvo bugs:
- OpenTripMap opcional (VITE_OPENTRIPMAP_KEY en Vercel)
- No activar VITE_BOOKING_AID
- npm run build al terminar
```
