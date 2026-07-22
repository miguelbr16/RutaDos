# Imágenes en RutaDos

## Fuentes por tipo

| Uso | Fuente | Archivo |
|-----|--------|---------|
| Hero home | Unsplash | `quickDestinations.ts` → `HERO_PHOTO` |
| Cards destino (home/wizard) | Unsplash | `quickDestinations.ts` → `photo` por destino |
| Popup mapa (paradas) | Wikipedia/Wikimedia | `placePhotos.ts` → al abrir trip |
| VenueFinder | OpenTripMap preview / OSM | `nearbyVenues.ts` |

Licencia Unsplash: uso gratuito en apps; atribución recomendada pero no obligatoria en producto.

---

## Hero (portada)

```
photo-1488646953014-85cb44e25828
```

URL completa en `HERO_PHOTO` (`src/lib/quickDestinations.ts`).  
Fallback: gradiente teal si la imagen no carga (`onError` en `HomePage.tsx`).

---

## Destinos (cards)

| Destino | ID Unsplash (aprox.) |
|---------|----------------------|
| Londres | `photo-1513635269975` |
| Núremberg | `photo-1578662996442` |
| Japón | `photo-1493976040374` |
| Madrid | `photo-1539037116277` |
| Roma | `photo-1552832230` |
| Dolomitas | `photo-1506905925346` |
| Suiza | `photo-1530122037265` |
| Boston | `photo-1501594907352` |
| San Diego | `photo-1507525428034` |

Editar en `QUICK_DESTINATIONS` / `FEATURED_DESTINATIONS`.

---

## Mapa — fotos al clicar pin

- **No** van en el pin (solo número + color).
- Al abrir popup: hasta 3 thumbnails Wikipedia (`fetchPlacePhotoUrls` en `TripPage`).
- Estilos: `.map-stop-popup` en `redesign.css`.

---

## Sustituir por fotos propias

1. Guardar en `public/hero/` o `public/dest/`
2. Cambiar URLs en `quickDestinations.ts`
3. `npm run build` + redeploy Vercel

---

## Caché PWA

El service worker precachea CSS e assets. Tras cambios visuales:

- Hard refresh (Ctrl+Shift+R)
- O borrar datos del sitio / desinstalar PWA
- O Redeploy Vercel
