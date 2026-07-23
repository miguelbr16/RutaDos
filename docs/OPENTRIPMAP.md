# OpenTripMap en RutaDos

Enriquece recomendaciones de **sitios turísticos** (wizard / replan) y **restaurantes / cafés** (VenueFinder) sin coste de API si usáis el plan free.

**Licencias:** OpenTripMap usa datos de OSM/Wikidata. Mantened atribución OSM en el mapa y leed `docs/DATOS_LICENCIAS.md`.

---

## Activar (2 minutos)

### 1. Obtener la key

1. Registro en [opentripmap.io/product](https://opentripmap.io/product) → plan **Free**.
2. Copiad la API key del dashboard.

### 2. Local (`.env`)

El archivo `.env` **no** se sube a GitHub. Partid de `.env.example`:

```bash
cp .env.example .env   # si aún no tenéis .env
```

Añadid o descomentad:

```env
VITE_OPENTRIPMAP_KEY=tu_clave_aqui
```

Reiniciad el dev server (`npm run dev`). Vite solo lee `.env` al arrancar.

**Comprobar:** Ajustes → Datos y licencias → debe decir **OpenTripMap: Activo**.

### 3. Vercel (producción)

1. [vercel.com](https://vercel.com) → proyecto **RutaDos** (o el nombre que tengáis).
2. **Settings** → **Environment Variables**.
3. Añadir:
   - **Name:** `VITE_OPENTRIPMAP_KEY`
   - **Value:** la misma key (sin comillas)
   - **Environments:** Production (+ Preview si queréis probar en PRs)
4. **Save** → **Deployments** → **Redeploy** el último deploy (o push a `main`).

Sin redeploy, la variable no llega al build de Vite.

### 4. CLI alternativa (opcional)

Con [Vercel CLI](https://vercel.com/docs/cli) enlazado al proyecto:

```bash
vercel env add VITE_OPENTRIPMAP_KEY production
# pegar la key cuando lo pida
vercel --prod
```

---

## Qué mejora con la key

| Zona | Sin key | Con key |
|------|---------|---------|
| Generar plan (discover) | OSM + Wikipedia | + POIs valorados OpenTripMap |
| VenueFinder restaurantes | Solo OSM | OSM + OTM (prioriza `rate` ≥ 2) |
| VenueFinder hoteles | OSM | OSM (OTM tiene pocos hoteles) |
| Miniaturas en cards | Sin foto OTM | Preview `opentripmap.io/img/...` |

Sin key, la app sigue con OpenStreetMap solamente.

---

## Límites del plan free

- Cuota diaria de requests (suficiente para uso personal / beta).
- No usar para scraping masivo ni reventa de datos.
- Atribución: datos © OpenTripMap / OSM según su licencia (ver `docs/DATOS_LICENCIAS.md`).

---

## Archivos relevantes

| Archivo | Rol |
|---------|-----|
| `src/lib/opentripmap.ts` | Cliente y preview de imagen |
| `src/lib/discover.ts` | Mezcla OTM al crear el plan |
| `src/lib/nearbyVenues.ts` | Mezcla OTM en restaurantes/cafés |
| `src/components/DataLicensesSection.tsx` | Estado Activo/No configurado en Ajustes |

---

## Probar que funciona

1. Poné la key en `.env` y reiniciad `npm run dev`.
2. Ajustes → **OpenTripMap: Activo**.
3. Creá un viaje a Londres o Roma → el plan puede incluir sitios con nota “OpenTripMap” en metadata.
4. En un viaje → Restaurantes → cards con badge **OpenTripMap** si vienen de ahí.

---

## ODbL (OpenStreetMap) — resumen

RutaDos también usa OSM directamente (mapa, Overpass, Nominatim). Obligaciones principales:

- **Atribuir** © OpenStreetMap contributors (ya en el mapa Leaflet).
- **Share-Alike** solo si redistribuís una base de datos derivada de OSM como producto descargable masivo — no aplica al uso normal de la app.

Detalle completo: [ODbL Summary](https://opendatacommons.org/licenses/odbl/summary/index.html) y `docs/DATOS_LICENCIAS.md`.
