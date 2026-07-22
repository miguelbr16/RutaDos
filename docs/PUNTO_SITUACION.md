# RutaDos — Punto de situación

**Fecha:** 22 jul 2026 (noche)  
**Repo:** https://github.com/miguelbr16/RutaDos (`main`)  
**App:** PWA mobile-first — Vite + React + TypeScript + Supabase  
**UI:** español · rediseño visual en curso (Behance-inspired)  
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

## Fase actual: **Rediseño visual (Fase A hecha → Fase B pendiente)**

La **funcionalidad** está bien; el foco es **dejar de parecer encuesta** y acercarse a apps tipo Touri/YOGO.

| Capa | Estado |
|------|--------|
| Wizard 3 pasos + logística colapsada | Hecho |
| Home nueva (hero + destinos grid + viajes) | **Hecho (22 jul noche)** |
| Wizard visual (progress segmentos, dest cards, presets) | **Hecho (22 jul noche)** |
| VenueFinder cards + OpenTripMap opcional | **Hecho (22 jul noche)** |
| Fix aeropuerto wizard (selección) | **Hecho** |
| Trip stats + map panel | Parcial |
| Day / OnRoute estilo YOGO | **Pendiente (Fase B)** |
| Wizard mapa preview + paso 3 boarding pass | **Pendiente (Fase B)** |
| Presupuesto visible en trip (no solo Opciones) | **Pendiente (Fase B)** |
| Afiliado Booking | Preparado, **no activar** — `docs/BOOKING_AFILIADO.md` |
| OpenTripMap en prod | Código listo; falta key en Vercel — `docs/OPENTRIPMAP.md` |

**Roadmap diseño completo:** `docs/DISENO_BEHANCE.md`

---

## Último commit (esperado tras push)

Rediseño home/wizard, OpenTripMap, VenueFinder, limpieza CSS, docs Behance/OTM/Booking.

---

## Backups git (revertir)

| Qué | Ref |
|-----|-----|
| Antes rediseño home/wizard jul 2026 | tag `backup-pre-visual-redesign` (si se crea) |
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
- Wizard **3 pasos:** Destino/fechas → Estilo (presets + movilidad/comida) → Listo
- Home: hero compacto, **DestinationGrid**, lista viajes, export/import
- Trip: mapa arriba, días compactos, transporte → links oficiales, VenueFinder hotel/restaurante
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

## Archivos clave (rediseño)

| Ruta | Para qué |
|------|----------|
| `src/pages/HomePage.tsx` | Home nueva |
| `src/pages/WizardPage.tsx` | Wizard visual |
| `src/pages/TripPage.tsx` | Overview viaje |
| `src/pages/DayPage.tsx` | Día + timeline (**siguiente rediseño**) |
| `src/components/DestinationGrid.tsx` | Cards destino home/wizard |
| `src/components/VenueFinder.tsx` | Hoteles/restaurantes |
| `src/lib/quickDestinations.ts` | Destinos curados + gradientes |
| `src/lib/opentripmap.ts` | Cliente OpenTripMap |
| `src/index.css` | Estilos globales (~3.5k líneas) |

---

## Nota para el asistente (Cursor)

- Repo: **miguelbr16/RutaDos**, branch `main`.
- **No** commitear `.env`, tokens Telegram, `_tg_*`.
- **No** activar `VITE_BOOKING_AID` hasta afiliado aprobado.
- Bot Supabase: `verify_jwt: false` siempre.
- Si UI vieja en móvil: Redeploy Vercel + hard refresh / borrar caché PWA.
- **Siguiente trabajo:** Fase B en `docs/DISENO_BEHANCE.md` (Trip/Day YOGO + wizard mapa preview).
- Build debe pasar: `npm run build`.

---

## Prompt handoff (copiar mañana en el otro PC)

```
Continúo RutaDos en main (github.com/miguelbr16/RutaDos). Leé docs/PUNTO_SITUACION.md y docs/DISENO_BEHANCE.md.

Hecho: rediseño home + wizard (menos encuesta), DestinationGrid, VenueFinder, OpenTripMap opcional, fix aeropuerto wizard, limpieza CSS.

Siguiente Fase B (prioridad):
1. Wizard: mini mapa Leaflet al elegir destino + paso 3 estilo "boarding pass" (Touri)
2. Trip: presupuesto siempre visible; días con color D1/D2 (YOGO + Travelscape)
3. Day: mapa fijo + barra inferior sticky Maps/Metro/Comer/En ruta (YOGO)
4. Iconos en presets Clásico/Local/Foodie

No romper botones existentes. No activar Booking afiliado. Build npm run build al terminar.
```
