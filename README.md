# RutaDos

PWA mobile-first para planificar un viaje **solo o con alguien**: destino + gustos + ritmo → plan por días, mapa, transporte, offline del día y copiloto in situ (app + Telegram).

**Repo:** https://github.com/miguelbr16/RutaDos

## Arrancar en local

```bash
npm install
npm run dev
```

Abre `http://localhost:5173`. En el móvil (misma Wi‑Fi): la URL Network que muestre Vite.

Copia `.env.example` → `.env` (Supabase + username del bot Telegram, sin token).

## Funciones

1. **Wizard** — destino, fechas, hotel; gustos con presets/categorías; ritmo en packs visuales
2. **Descubrimiento** — OpenStreetMap/Overpass (+ OpenTripMap opcional)
3. **Días** — fichas con mini timeline; editar paradas; Maps / En ruta
4. **Cansados** — acorta el día y sugiere cafés cerca
5. **Restaurantes / Hoteles** — listados OSM con Web, Reservar o Booking
6. **Offline** — pack del día activo (paradas, transporte, Maps)
7. **Meteo** — Open-Meteo del día + adaptar a lluvia
8. **Import Google Maps** — KML / GeoJSON / enlaces
9. **Sync opcional** — Supabase (auth + RLS) o Exportar/Importar JSON
10. **Telegram** — [@RutaDosGuia_bot](https://t.me/RutaDosGuia_bot); ver [`docs/COPILOTO_TELEGRAM.md`](docs/COPILOTO_TELEGRAM.md)

## Documentación

| Doc | Contenido |
|-----|-----------|
| [`docs/PUNTO_SITUACION.md`](docs/PUNTO_SITUACION.md) | Estado del producto, backlog, backups, entorno |
| [`docs/COPILOTO_TELEGRAM.md`](docs/COPILOTO_TELEGRAM.md) | Setup del bot |

## Supabase (sync opcional)

1. Proyecto en [supabase.com](https://supabase.com)
2. SQL: migraciones en `supabase/migrations/`
3. Auth email; variables `VITE_SUPABASE_*` en `.env`
4. En la app: Settings → sync (opcional)

Sin Supabase la app funciona en un solo dispositivo; usad Exportar/Importar para pasar viajes.

## Deploy

### Vercel

Conectar repo `miguelbr16/RutaDos`. Env: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_TELEGRAM_BOT`.  
Si la UI no cambia tras un push: **Redeploy** en el dashboard (caché / PWA).

### Bot Telegram

Edge Function en Supabase (`telegram-bot`), siempre con **`verify_jwt: false`**. Token solo en Secrets, nunca en el front.

## Añadir a pantalla de inicio (PWA)

1. URL HTTPS en el móvil  
2. **iPhone:** Compartir → Añadir a pantalla de inicio  
3. **Android:** menú → Instalar aplicación  

## Stack

- Vite + React + TypeScript + PWA  
- Leaflet + OpenStreetMap · Overpass · OSRM · Nominatim/Photon · Wikipedia · Open-Meteo  
- Supabase free (opcional) · Vercel  
- Telegram Bot API (gratis)
