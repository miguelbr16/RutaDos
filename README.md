# RutaDos

PWA gratuita tipo Itinio para planificar viajes en pareja: destino + preferencias + estilo de exploración → plan automático, rutas editables, sitios manuales, import Google Maps, sync opcional con Supabase ($0).

## Arrancar en local

```bash
npm install
npm run dev
```

Abre `http://localhost:5173`. En el móvil (misma Wi‑Fi): la URL Network que muestre Vite.

## Funciones

1. **Wizard** — destino, fechas, preferencias (comida, museos, monumentos, miradores, noche, joyas ocultas, parques), ritmo, exploración, movilidad, detours
2. **Descubrimiento** — OpenStreetMap/Overpass (+ OpenTripMap si configuras API key gratis)
3. **Días y rutas** — orden optimizable, transporte estimado, editar/quitar/añadir
4. **Sitios manuales** y **recomendaciones de camino**
5. **En ruta** + abrir en Google Maps
6. **Import Google Maps** — KML / GeoJSON / pegar enlaces o nombres
7. **Sync pareja** — Supabase free (auth + RLS + realtime) o Exportar/Importar JSON

## Supabase (sync entre los dos móviles, gratis)

1. Crea un proyecto en [supabase.com](https://supabase.com) (free)
2. SQL Editor → pega y ejecuta [`supabase/migrations/001_init.sql`](supabase/migrations/001_init.sql)
3. Authentication → Providers → Email (activado)
4. Copia `.env.example` → `.env` con URL y `anon` key
5. `npm run dev` de nuevo
6. En la app: **Pareja / sync** → registraros → uno crea el espacio y comparte el código

Sin Supabase la app funciona igual en un solo dispositivo; usad Exportar/Importar para pasar viajes.

## Deploy gratis

### Vercel

```bash
npm i -g vercel
vercel
```

En el dashboard de Vercel añade las env `VITE_SUPABASE_*` (y opcional OpenTripMap) y redespliega.

### Cloudflare Pages

```bash
npm run build
npx wrangler pages deploy dist --project-name=rutados
```

O conecta el repo en Cloudflare Pages: build `npm run build`, output `dist`.

## Añadir a pantalla de inicio (PWA)

1. Abre la URL desplegada (HTTPS) en el móvil
2. **iPhone / Safari:** Compartir → Añadir a pantalla de inicio  
3. **Android / Chrome:** menú ⋮ → Instalar aplicación / Añadir a pantalla de inicio

## Stack $0

- Vite + React + TypeScript + PWA
- Leaflet + OpenStreetMap
- Overpass + OSRM + Nominatim
- Supabase free (opcional)
- Hosting Vercel / Cloudflare Pages free
