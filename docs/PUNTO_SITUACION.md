# RutaDos — Punto de situación

**Fecha:** 22 jul 2026 (noche, rediseño v2)  
**Repo:** https://github.com/miguelbr16/RutaDos (`main`)  
**App:** PWA mobile-first — Vite + React + TypeScript + Supabase  
**UI:** español · rediseño visual v2 (Behance-inspired, fotos Unsplash)  
**Bot:** [@RutaDosGuia_bot](https://t.me/RutaDosGuia_bot)  
**Supabase:** `odecdpzcnsmvafvbuiby` · https://odecdpzcnsmvafvbuiby.supabase.co  
**Vercel:** https://ruta-dos-miguelbr16s-projects.vercel.app  
(proyecto **ruta-dos** · auto-deploy en push; a veces Redeploy manual)  
Nota: `ruta-dos.vercel.app` ya no responde (404). Si al abrir la app pide login de Vercel, desactivá **Deployment Protection** en Settings → Deployment Protection.

---

## Posicionamiento

App para **cualquier viajero** (solo o acompañado). Sync/pareja es opcional.

Propuesta: plan día a día con mapa, transporte oficial, hoteles/restaurantes (OSM + links), offline del día, Telegram en destino.

---

## Fase actual: **Rediseño visual v2 (Fase A completa → Fase B pendiente)**

La **funcionalidad** está bien; el foco es **dejar de parecer encuesta** y acercarse a apps tipo Touri/YOGO.

| Capa | Estado |
|------|--------|
| Home v2: hero editorial + fotos destino + features + viajes numerados | **Hecho (v2)** |
| Wizard v2: dots progreso, banner ciudad, search pill, presets iconos, boarding pass | **Hecho (v2)** |
| Trip v2: presupuesto visible, mapa con overlay, días con color | **Hecho (v2)** |
| CSS v2 separado (`src/redesign.css`) + fotos Unsplash | **Hecho (v2)** |
| VenueFinder cards + OpenTripMap opcional | Hecho |
| Fix aeropuerto wizard (selección) | Hecho |
| Day / OnRoute estilo YOGO | **Pendiente (Fase B)** |
| Wizard mapa preview Leaflet | **Pendiente (Fase B)** |
| Trip tabs Mapa/Días/Hotel/Comer | **Pendiente (Fase C)** |
| Afiliado Booking | Preparado, **no activar** — `docs/BOOKING_AFILIADO.md` |
| OpenTripMap en prod | Código listo; falta key en Vercel — `docs/OPENTRIPMAP.md` |

**Roadmap diseño completo:** `docs/DISENO_BEHANCE.md`  
**Fotos legales:** `docs/IMAGENES.md`

---

## Último commit (esperado tras push)

Rediseño visual v2: home/wizard/trip con fotos Unsplash, `redesign.css`, docs actualizados.

---

## Backups git (revertir)

| Qué | Ref |
|-----|-----|
| Antes rediseño v2 jul 2026 | tag `backup-pre-visual-redesign` |
| Antes wizard 3 pasos | `backup/pre-wizard-3steps` · `backup-pre-wizard-3steps` |
| Antes landing hero | `backup/pre-landing-hero` · `backup-pre-landing-hero` |
| Antes transit cleanup | `backup/pre-transit-cleanup` · `backup-pre-transit-cleanup` |

```bash
git log --oneline -10
git tag -l 'backup*'
```

---

## Qué está implementado

### App
- Wizard **3 pasos:** Destino/fechas → Estilo (presets + movilidad/comida) → Listo (boarding pass)
- Home v2: hero editorial, scroll destinos con foto, viajes numerados, export/import
- Trip v2: presupuesto siempre visible, mapa con foto ciudad, días con borde color
- Day: timeline, caos, offline, Telegram
- Share por token (Supabase)
- Copiloto in-app + FAB Telegram

### Datos (gratis)
- OSM/Overpass · Nominatim · Wikipedia · OSRM · Open-Meteo
- **OpenTripMap** (opcional, mejora discover + VenueFinder)
- Links: Booking search, Google Maps, reservar mesa (sin APIs de pago)

### Telegram (`telegram-bot` v6)
- Menú: ubicación · Restaurantes · Hoteles · Recomiéndame · etc.
- Setup: `docs/COPILOTO_TELEGRAM.md`

---

## Documentación

| Doc | Contenido |
|-----|-----------|
| `docs/PUNTO_SITUACION.md` | Este archivo |
| `docs/DISENO_BEHANCE.md` | Ideas Behance + fases diseño |
| `docs/IMAGENES.md` | Fotos Unsplash por destino |
| `docs/OPENTRIPMAP.md` | Activar API key free |
| `docs/BOOKING_AFILIADO.md` | Guía afiliado (futuro) |
| `docs/COPILOTO_TELEGRAM.md` | Bot Telegram |

---

## Entorno local

```bash
git clone https://github.com/miguelbr16/RutaDos.git
cd RutaDos
npm install
cp .env.example .env
# Rellenar VITE_SUPABASE_* y opcional VITE_OPENTRIPMAP_KEY
npm run dev
```

```bash
npm run build   # verificar antes de push
```

---

## Archivos clave (rediseño v2)

| Ruta | Para qué |
|------|----------|
| `src/pages/HomePage.tsx` | Home v2 |
| `src/pages/WizardPage.tsx` | Wizard v2 |
| `src/pages/TripPage.tsx` | Trip v2 |
| `src/pages/DayPage.tsx` | Día + timeline (**siguiente rediseño**) |
| `src/components/DestinationGrid.tsx` | Cards destino con foto |
| `src/components/VenueFinder.tsx` | Hoteles/restaurantes |
| `src/lib/quickDestinations.ts` | Destinos + URLs Unsplash |
| `src/lib/opentripmap.ts` | Cliente OpenTripMap |
| `src/redesign.css` | Estilos v2 (home/wizard/trip) |
| `src/index.css` | Estilos globales legacy |

---

## Nota para el asistente (Cursor)

- Repo: **miguelbr16/RutaDos**, branch `main`.
- **No** commitear `.env`, tokens Telegram, `_tg_*`.
- **No** activar `VITE_BOOKING_AID` hasta afiliado aprobado.
- Bot Supabase: `verify_jwt: false` siempre.
- Si UI vieja en móvil: Redeploy Vercel + hard refresh / borrar caché PWA (service worker precachea CSS).
- **Siguiente trabajo:** Fase B en `docs/DISENO_BEHANCE.md` (Day YOGO + wizard mapa preview).
- Build debe pasar: `npm run build`.

---

## Prompt handoff (copiar en el otro PC)

```
Continúo RutaDos en main (github.com/miguelbr16/RutaDos). Leé docs/PUNTO_SITUACION.md y docs/DISENO_BEHANCE.md.

Hecho (v2): rediseño home/wizard/trip con fotos Unsplash, src/redesign.css, presupuesto visible en trip, wizard boarding pass, destinos con foto. Build OK.

Siguiente Fase B (prioridad):
1. Wizard: mini mapa Leaflet al elegir destino (Touri)
2. Day: mapa fijo + barra inferior sticky Maps/Metro/Comer/En ruta (YOGO)
3. Trip tabs: Mapa · Días · Alojamiento · Comer (Travel Booking)

No romper botones existentes. No activar Booking afiliado. Fotos en quickDestinations.ts (Unsplash). Si UI vieja: borrar caché PWA.
```
