# Imágenes en RutaDos

Las fotos de destinos y el hero usan **[Unsplash](https://unsplash.com)** (licencia gratuita para uso en apps y webs; atribución recomendada pero no obligatoria en producto embebido).

## Hero

- Paisaje viaje: `photo-1476514525535` (Unsplash)

## Destinos (cards home / wizard / trip)

| Destino | Fuente Unsplash |
|---------|-----------------|
| Londres | `photo-1513635269975` |
| Núremberg | `photo-1578662996442` |
| Japón | `photo-1493976040374` |
| Madrid | `photo-1539037116277` |
| Roma | `photo-1552832230` |
| Dolomitas | `photo-1506905925346` |
| Suiza | `photo-1530122037265` |
| Boston | `photo-1501594907352` |
| San Diego | `photo-1507525428034` |

Definidas en `src/lib/quickDestinations.ts` (`HERO_PHOTO`, `photo` por destino).

## Sustituir por fotos propias

1. Añadí archivos en `public/hero/` o `public/dest/`
2. Cambiá las URLs en `quickDestinations.ts`
3. Redeploy Vercel

## Caché / PWA

Tras cambiar imágenes: hard refresh o borrar caché PWA. `main.tsx` limpia service worker al arrancar en dev.
