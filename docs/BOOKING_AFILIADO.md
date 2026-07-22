# Afiliado Booking.com (cuando lancéis)

RutaDos **no usa la API de Booking**. Los botones abren búsquedas en booking.com con parámetros (`ss`, fechas, coordenadas). Eso es gratis y legal hoy.

Cuando queráis monetizar reservas, el camino habitual es el **programa de afiliados**, no una API de catálogo.

## 1. Requisitos antes de solicitar

- Web o app accesible en URL pública (Vercel vale).
- Contenido de viajes real (no solo un formulario vacío).
- Política de privacidad básica (aunque sea una página simple).
- Explicar en la solicitud qué hace RutaDos: planificador de viajes con enlaces a reserva externa.

## 2. Registro (paso a paso)

1. Entrad en [Booking.com Affiliate Partner](https://www.booking.com/affiliate-program/v2/index.html) (o el portal regional de afiliados).
2. Creá cuenta de partner (tipo **Content / Website**).
3. Añadid la URL de producción, por ejemplo `https://ruta-dos-miguelbr16s-projects.vercel.app`.
4. Completad el formulario: categoría *Travel*, descripción del producto, tráfico estimado (podéis poner “beta privada / pruebas”).
5. Esperad aprobación (días o semanas). Revisan calidad del sitio.

## 3. Qué os dan al aprobar

- **AID** (affiliate ID) numérico.
- Acceso al panel de afiliados y, a veces, **deep links** documentados.
- Comisión por reserva completada (varía por mercado).

No recibiréis JSON con hoteles para pintar cards dentro de la app.

## 4. Cómo enlazarlo en RutaDos (ya preparado)

Cuando tengáis el AID:

1. En `.env` (y en Vercel → Environment Variables):

   ```env
   VITE_BOOKING_AID=1234567
   ```

2. Los helpers en `src/lib/bookingLinks.ts` añaden `aid` a las URLs de búsqueda automáticamente.

3. Redeploy en Vercel.

**No activéis el AID hasta tener aprobación.** Sin AID, los links siguen funcionando como ahora (sin comisión).

## 5. Buenas prácticas

- Etiquetad los botones como “Buscar en Booking” / “Ver en Booking”, no como si fuera inventario propio.
- No guardéis precios ni disponibilidad en caché (cambian en tiempo real).
- En la política de privacidad, mencionad enlaces de terceros y cookies de Booking si el usuario hace clic.
- Probad un enlace con `aid` en modo incógnito y verificad en el panel de afiliados que registra clics.

## 6. Alternativas

- **Google Hotels** (solo enlace, como ahora con `hotelMapsSearchUrl`).
- **Skyscanner / Expedia** afiliados — mismo modelo: links, no catálogo embebido.
- **Datos en app:** seguir con OpenStreetMap + OpenTripMap (gratis) y reservar fuera.

## 7. Checklist pre-lanzamiento

- [ ] Home y trip con diseño pulido
- [ ] Botones Booking/Maps claros
- [ ] Política de privacidad publicada
- [ ] Solicitud afiliado enviada
- [ ] `VITE_BOOKING_AID` solo tras aprobación
- [ ] Probar enlace con fechas del viaje (`checkin` / `checkout`)
