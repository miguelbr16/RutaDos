# RutaDos — Punto de situación

**Fecha:** 23 jul 2026  
**Repo:** https://github.com/miguelbr16/RutaDos (`main`)  
**Live:** https://ruta-dos-miguelbr16s-projects.vercel.app  
**Bot:** [@RutaDosGuia_bot](https://t.me/RutaDosGuia_bot)  
**Supabase:** `odecdpzcnsmvafvbuiby` · https://odecdpzcnsmvafvbuiby.supabase.co

---

## Qué es RutaDos

PWA mobile-first (también usable en PC) para **planificar un viaje día a día**: destino, fechas, gustos → itinerario con mapa, transporte oficial, hoteles/restaurantes (OSM + links), offline del día y copiloto Telegram.

**Para cualquier viajero** (solo o acompañado). Sync en pareja es opcional (Supabase).

Guía de pantallas: **`docs/GUIA_APP.md`** · Diseño: **`docs/DISENO_BEHANCE.md`**

---

## Commits recientes

| Commit | Qué |
|--------|-----|
| Light UI plan | `redesign.css` + `skin.css`, Home/Wizard/Trip/Day light limpio |
| Mapa siempre visible en trip/day | Tabs Mapa·Días·Hotel·Comer |
| Destinos visibles | Cards `rd-dest-*` |
| OpenTripMap | Cliente listo; activar con `VITE_OPENTRIPMAP_KEY` |

Ver `git log --oneline -10` para SHAs actuales.

---

## Estado funcional

| Área | Estado |
|------|--------|
| Wizard 3 pasos (destino → estilo → confirmar) | OK |
| Mini mapa preview al elegir ciudad | OK |
| Generar plan (OSM + Wikipedia + OTM opcional) | OK |
| Trip: mapa siempre, tabs, presupuesto, días | OK |
| Day: mapa YOGO, timeline cards, barra inferior | OK |
| VenueFinder (OSM + OTM) | OK |
| Share / Sync / Bot Telegram | OK |
| Afiliado Booking | Preparado, **no activar** |

---

## Estado diseño (light limpio — jul 2026)

| Pantalla | Estado |
|----------|--------|
| **Home** | Hero full-bleed móvil + split PC, destinos foto, viajes cards |
| **Wizard** | 3 pasos, presets, mini mapa destino, boarding pass |
| **Trip** | Map-first, tabs Mapa/Días/Hotel/Comer, días numerados |
| **Day** | Mapa sticky + place cards + barra Maps/Metro/Comer/En ruta |
| **Settings/Share** | Legacy tokens (pulido Fase C) |

Preview estático: **`docs/preview-light-ui.html`**

---

## Mapa del producto

```
Home → Wizard (3 pasos) → Trip → Day → OnRoute
                ↓              ↓
            Settings       VenueFinder / Guides / Copilot / Share
```

---

## Stack y datos

- **Front:** Vite + React 19 + TypeScript + Zustand + PWA
- **Mapa:** Leaflet + OSM tiles (atribución ODbL en mapa)
- **Plan:** OSM/Overpass, Nominatim, Wikipedia, OSRM, landmarks
- **Opcional:** OpenTripMap (`VITE_OPENTRIPMAP_KEY`), Supabase sync
- **Deploy:** Vercel + Supabase Edge (bot)

---

## Variables de entorno

Ver `.env.example` y `docs/OPENTRIPMAP.md`.

| Variable | Uso |
|----------|-----|
| `VITE_OPENTRIPMAP_KEY` | POIs y fotos venues (free) |
| `VITE_SUPABASE_*` | Sync pareja / share |
| `VITE_TELEGRAM_BOT` | Username bot |
| `VITE_BOOKING_AID` | **No activar** hasta afiliado |

---

## Documentación

| Archivo | Contenido |
|---------|-----------|
| `docs/PUNTO_SITUACION.md` | Este archivo |
| `docs/GUIA_APP.md` | Pantallas y flujos |
| `docs/DISENO_BEHANCE.md` | Light UI + refs + fases |
| `docs/REFERENCIAS_IDEAS.md` | Inventario Behance/Dribbble |
| `docs/OPENTRIPMAP.md` | API key + ODbL |
| `docs/COPILOTO_TELEGRAM.md` | Bot |

---

## Archivos clave UI

| Ruta | Rol |
|------|-----|
| `src/redesign.css` | Tokens `--rd-*`, motion, timeline |
| `src/skin.css` | Pantallas Home/Wizard/Trip/Day |
| `src/pages/HomePage.tsx` | Portada |
| `src/pages/WizardPage.tsx` | Wizard |
| `src/pages/TripPage.tsx` | Trip |
| `src/pages/DayPage.tsx` | Day |
| `src/components/TripMap.tsx` | Mapa + popups |
| `src/components/DayTimeline.tsx` | Timeline día |

---

## Backups git

```bash
git tag -l 'backup*'
git branch -a | grep backup
```

| Tag / rama | Momento |
|------------|---------|
| `backup/pre-light-ui` | Antes light UI plan |
| `backup/pre-full-redesign` | Antes skin v3 |
| `backup/after-skin-v3` | Tras skin v3 |

---

## Problemas conocidos

1. **PWA cache** — hard refresh tras deploy.
2. **Settings/Share** — estilos legacy pendientes Fase C.
3. **Atribución ODbL** — OSM en mapa; falta sección legal completa en Ajustes.

---

## Notas para el asistente

- No commitear `.env`, `_tg_*`.
- `npm run build` antes de push.
- Bot Supabase: `verify_jwt: false`.
