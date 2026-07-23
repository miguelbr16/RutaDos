# Datos y licencias — RutaDos

**Fecha:** 23 jul 2026  
**UI:** Ajustes → sección «Datos y licencias» (`DataLicensesSection.tsx`)

RutaDos usa datos abiertos y APIs gratuitas. Este documento resume **qué usamos**, **cómo atribuir** y **qué no hacemos** (para cumplir ODbL y condiciones de proveedores).

---

## OpenStreetMap — ODbL 1.0

**Uso en la app**

| Fuente OSM | Para qué |
|------------|----------|
| Tiles Leaflet (`tile.openstreetmap.org`) | Mapa base en Trip / Day / Wizard |
| Overpass API | POIs al generar el plan |
| Nominatim | Búsqueda de ciudad y lugares turísticos |
| Tags OSM en VenueFinder | Hoteles y restaurantes cercanos |

**Licencia:** [Open Database License (ODbL) 1.0](https://opendatacommons.org/licenses/odbl/1-0/)  
**Resumen legible:** [ODbL Summary](https://opendatacommons.org/licenses/odbl/summary/index.html)  
**Atribución:** [© OpenStreetMap contributors](https://www.openstreetmap.org/copyright)

### Qué exige ODbL (resumen)

1. **Atribuir** — En cualquier uso público del mapa o de obras derivadas, indicar © OpenStreetMap contributors y mantener avisos de licencia cuando corresponda.
2. **Share-Alike** — Si **redistribuís** una base de datos adaptada derivada de OSM (p. ej. un dump descargable con todos los POIs de una ciudad), esa base debe ofrecerse también bajo ODbL.
3. **Keep open** — Si redistribuís la base, no podéis usar DRM que impida el acceso; debéis ofrecer también una versión sin restricciones técnicas.

### Cómo lo cumple RutaDos hoy

| Acción | ¿Share-alike? |
|--------|----------------|
| Mostrar mapa con atribución OSM en Leaflet | Atribución ✓ |
| Consultar Overpass/Nominatim en vivo y mostrar en UI | Uso normal; no redistribuimos la BD |
| Exportar **itinerario del usuario** (JSON/KML) | Contenido del usuario + referencias; no es un extracto masivo de OSM |
| Publicar un dataset «todos los POIs de París» descargable | **No permitido** sin ODbL — no lo hacemos |

**En el código:** `TripMap.tsx` incluye `attribution='© OSM'` en el control Leaflet. Ajustes amplía la explicación legal.

---

## OpenTripMap

**Uso:** POIs turísticos extra al crear el plan (`discover.ts`); restaurantes/cafés en `nearbyVenues.ts`; miniaturas vía `otmPreviewUrl`.

**Activación:** variable `VITE_OPENTRIPMAP_KEY` — ver `docs/OPENTRIPMAP.md`.

**Condiciones:** plan Free en [opentripmap.io/product](https://opentripmap.io/product); cuota diaria; no scraping masivo ni reventa. Los datos incorporan OSM/Wikidata — **mantener atribución OSM** además de mencionar OpenTripMap donde se muestren datos OTM (badge en VenueFinder).

**Estado:** sin key, la app funciona solo con OSM.

---

## Otros proveedores

| Proveedor | Uso | Licencia / notas |
|-----------|-----|------------------|
| **Wikipedia** | Textos breves en monumentos | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/) |
| **Unsplash** | Fotos destinos (home, wizard) | [Unsplash License](https://unsplash.com/license) |
| **Open-Meteo** | Clima por día | API gratuita; [open-meteo.com](https://open-meteo.com/) |
| **OSRM** | Rutas a pie | BSD 2-Clause |
| **Supabase** | Sync opcional | Términos Supabase |
| **Telegram** | Bot copiloto | Términos Telegram |

---

## Checklist compliance

- [x] Atribución OSM en mapa Leaflet
- [x] Sección «Datos y licencias» en Ajustes
- [x] Badge «OpenTripMap» en VenueFinder cuando aplica
- [ ] Revisar textos legales si se añade export masivo de POIs
- [ ] Página «Créditos» en web marketing (opcional)

---

## Archivos relevantes

| Archivo | Rol |
|---------|-----|
| `src/components/DataLicensesSection.tsx` | UI Ajustes |
| `src/components/TripMap.tsx` | Atribución mapa |
| `src/lib/opentripmap.ts` | Cliente OTM |
| `src/lib/discover.ts` | Mezcla OSM + OTM + Wikipedia |
| `src/lib/nearbyVenues.ts` | OSM + OTM venues |
| `docs/OPENTRIPMAP.md` | Configurar API key |
