# OpenTripMap en RutaDos

Enriquece recomendaciones de **sitios turísticos** (wizard / replan) y **restaurantes / cafés** (VenueFinder) sin coste de API si usáis el plan free.

## Activar (2 minutos)

1. Registro en [opentripmap.io](https://opentripmap.io/product) → plan **Free**.
2. Copiad la API key del dashboard.
3. En `.env` local:

   ```env
   VITE_OPENTRIPMAP_KEY=tu_clave_aqui
   ```

4. En **Vercel** → Project → Settings → Environment Variables → misma variable.
5. Redeploy.

Sin key, la app sigue con OpenStreetMap solamente.

## Qué mejora con la key

| Zona | Sin key | Con key |
|------|---------|---------|
| Generar plan (discover) | OSM + Wikipedia | + POIs valorados OpenTripMap |
| VenueFinder restaurantes | Solo OSM | OSM + OTM (prioriza `rate` ≥ 2) |
| VenueFinder hoteles | OSM | OSM (OTM tiene pocos hoteles) |

## Límites del plan free

- Cuota diaria de requests (suficiente para uso personal / beta).
- No usar para scraping masivo ni reventa de datos.
- Atribución: datos © OpenTripMap / OSM según su licencia.

## Archivos relevantes

- `src/lib/opentripmap.ts` — cliente y preview de imagen
- `src/lib/discover.ts` — mezcla OTM al crear el plan
- `src/lib/nearbyVenues.ts` — mezcla OTM en restaurantes/cafés

## Probar que funciona

1. Poné la key en `.env`.
2. `npm run dev`
3. Creá un viaje a Londres o Roma → el plan debería incluir sitios con nota “OpenTripMap” en metadata.
4. En un viaje → Restaurantes → cards con badge **OpenTripMap** si vienen de ahí.
