# RutaDos

PWA para planificar un viaje **día a día** (solo o acompañado): destino, fechas y gustos → itinerario con mapa, transporte oficial, hoteles/restaurantes, offline del día y copiloto Telegram.

**Live:** https://ruta-dos-miguelbr16s-projects.vercel.app  
**Repo:** https://github.com/miguelbr16/RutaDos

---

## Arrancar en local

```bash
npm install
cp .env.example .env   # Supabase y bot opcionales
npm run dev
```

Abre `http://localhost:5173`. En móvil (misma Wi‑Fi): URL Network de Vite.

```bash
npm run build   # verificar antes de push
```

---

## Qué hace la app

1. **Home** — Destinos populares, viajes guardados, crear viaje
2. **Wizard** (3 pasos) — Destino y fechas → Estilo → Confirmar y generar
3. **Trip** — Mapa del viaje, presupuesto, días, hotel/restaurantes
4. **Day** — Timeline del día, mapa, caos, offline, meteo
5. **Telegram** — [@RutaDosGuia_bot](https://t.me/RutaDosGuia_bot) en destino

Glosario y flujos: **[`docs/GUIA_APP.md`](docs/GUIA_APP.md)**

---

## Documentación

| Doc | Contenido |
|-----|-----------|
| [`docs/PUNTO_SITUACION.md`](docs/PUNTO_SITUACION.md) | Estado del proyecto, commits, handoff Cursor |
| [`docs/GUIA_APP.md`](docs/GUIA_APP.md) | Pantallas, wizard, navegación, archivos |
| [`docs/DISENO_BEHANCE.md`](docs/DISENO_BEHANCE.md) | Roadmap visual e inspiración UI |
| [`docs/IMAGENES.md`](docs/IMAGENES.md) | Unsplash, Wikipedia, map popups |
| [`docs/OPENTRIPMAP.md`](docs/OPENTRIPMAP.md) | API key free para más POIs |
| [`docs/BOOKING_AFILIADO.md`](docs/BOOKING_AFILIADO.md) | Afiliado (futuro, no activar aún) |
| [`docs/COPILOTO_TELEGRAM.md`](docs/COPILOTO_TELEGRAM.md) | Setup del bot |

---

## Variables de entorno (`.env`)

| Variable | Uso |
|----------|-----|
| `VITE_SUPABASE_URL` | Sync opcional |
| `VITE_SUPABASE_ANON_KEY` | Sync opcional |
| `VITE_TELEGRAM_BOT` | Username del bot (sin @) |
| `VITE_OPENTRIPMAP_KEY` | Más sitios y fotos (opcional) |
| `VITE_BOOKING_AID` | **No activar** hasta afiliado |

Sin Supabase: todo en local + export/import JSON.

---

## Stack

- Vite + React 19 + TypeScript + Zustand + PWA
- Leaflet + OpenStreetMap · Overpass · Nominatim · OSRM · Wikipedia · Open-Meteo
- Supabase (opcional) · Vercel · Telegram Bot API

---

## Deploy

**Vercel:** conectar repo, env vars, auto-deploy en push.  
Si la UI no cambia: Redeploy + borrar caché PWA.  
Si pide login Vercel: desactivar Deployment Protection.

**Bot:** Edge Function `telegram-bot` en Supabase, `verify_jwt: false`, token solo en Secrets.

---

## PWA — añadir a pantalla de inicio

1. Abrir URL HTTPS en el móvil  
2. **iPhone:** Compartir → Añadir a pantalla de inicio  
3. **Android:** Instalar aplicación  

---

## Estado diseño (jul 2026)

Rediseño visual **en progreso** (`src/redesign.css`). Funcionalidad estable; UI iterándose (layout ancho PC, iconos SVG, popups mapa con fotos). Ver `docs/DISENO_BEHANCE.md`.
