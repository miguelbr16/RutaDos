# RutaDos — Futuro: monetización (diseño, no implementado)

**Fecha:** 23 jul 2026. Este documento **no autoriza ni implementa ningún cobro**. Es la referencia de diseño para que la UI de P0 no tenga que rehacerse cuando se decida comercializar. Ver decisiones de producto en `docs/VISION_APP_V2.md` (§9.2: "no paywall en P0, pero diseñar escalable").

**Regla P0:** nada de esto se activa hoy. `VITE_BOOKING_AID` sigue sin usarse. No hay checks de "es Pro" en el código.

---

## Free forever (core, nunca detrás de paywall)

Lo que hace que RutaDos sea útil de verdad no se cobra — es la razón por la que alguien vuelve:

- Crear un viaje (wizard 2 pasos) y generar el plan por días.
- Ver el plan: mapa, timeline, transporte oficial, horarios.
- Hub **Hoy**: día activo, "En ruta", replan básico (cansados / lluvia / tarde).
- **Offline del día** (pack local, sin red).
- Copiloto (in-app y Telegram) para el día en curso.
- Compartir un viaje por link (lectura) y guardar una copia.
- Exportar/importar JSON del propio viaje (no depender de nosotros para no perder datos).

Motivo: si esto se cobrara, el producto deja de resolver el problema que promete ("planificar y usar el viaje", VISION_APP_V2 §1) y pierde la boca a boca que necesita para crecer sin presupuesto de marketing.

## Candidatos a Pro / suscripción (más adelante)

Cosas que **añaden** valor pero no son necesarias para el uso básico — se podrían activar tras un límite de uso o como plan de pago:

| Feature | Por qué es Pro y no free | Extension point ya preparado |
|---|---|---|
| **Viajes ilimitados** (free: p. ej. 1–2 viajes activos guardados a la vez) | Coste marginal bajo pero valor claro para quien viaja seguido | `trips` en Zustand no tiene límite hoy; el corte iría en `addTrip`/`generateTrip` del store, con un chequeo de plan antes de crear el N+1 |
| **Historial / viajes pasados con fotos y notas** | Nostalgia/diario de viaje, no imprescindible para planificar el siguiente | Los datos ya existen (`Trip` completo se guarda); solo falta una vista de archivo y el gate |
| **Multi-destino / multi-ciudad en un mismo viaje** | Caso de uso avanzado (interrail, roadtrip) | El modelo `Trip` es de una sola `city`; requeriría cambios de dominio, no solo UI — evaluar cuando se priorice |
| **Exportar a PDF / itinerario imprimible bonito** | Souvenir / compartir fuera de la app | `exportGmaps.ts` ya genera KML; un exportador PDF sería un módulo nuevo, sin tocar el dominio |
| **Widgets de clima extendido / alertas proactivas** | Comodidad, no bloqueante | `lib/weather.ts` ya trae el pronóstico del día; extender a push notifications es un módulo aparte |
| **Copiloto con más contexto / historial de conversación largo** | Coste de LLM si en el futuro se usa uno real (hoy `lib/copilot.ts` es reglas, no LLM) | Aislado en `lib/copilot.ts` — cambiar el motor no toca UI (`CopilotSheet`, bot Telegram) |
| **Colaboración multi-pareja / grupos grandes** | Sync ya existe para 2 (Supabase `couple_id`); grupos de N personas es otro modelo de datos | `authStore.ts` + `lib/sync.ts` — el gate iría en el tamaño del grupo, no en la sync misma |
| **Sin publicidad / sin banners de afiliado** | Si en algún momento se muestran banners de Booking/Skyscanner al free, Pro los quita | Ningún banner existe hoy; cuando se añadan, nacen ya con un `if (!isPro)` |

## Afiliados (candidato más cercano a activarse, sin ser paywall)

- **Booking.com** — ya hay una constante `VITE_BOOKING_AID` y `lib/bookingLinks.ts` genera URLs de hotel; **hoy el AID no se manda** (queda vacío hasta tener cuenta de afiliado aprobada). Cuando se active: no cambia la UX (el botón "Ver en Booking" ya existe en Plan/Hoy), solo se añade el parámetro de afiliado a la URL.
- **Otros candidatos:** GetYourGuide/Tiqets para entradas de museos (ya hay links directos sin afiliado en `lib/cityGuides.ts`), Skyscanner/Omio para trenes/vuelos.
- Estos generan ingreso **sin pedirle nada al usuario** (no ve diferencia) — es la vía de monetización de menor friction y no requiere paywall ni cuentas de pago.

## UI ya lista para store / venta (hecho en este pase, sin activar cobros)

- **`VenueFinder`, banners de hotel (`hotel-suggest-banner`), botones "Ver en Booking"** ya existen en Plan y Hoy — son el hueco natural donde vivirán afiliados o promos Pro sin rediseñar nada.
- **"Más opciones" en Plan** es un contenedor colapsable ya usado para features secundarias (import/export, guía de la ciudad, ajustar gustos) — mismo patrón para una futura sección "Pro" sin ensuciar la vista principal.
- **`AuthPage`/`authStore.ts`** ya manejan sesión y `coupleId` — una futura tabla `subscriptions` en Supabase se apoyaría en el mismo `user.id`, sin tocar la navegación.
- **Ningún hub asume gratis-siempre en el código** (no hay `// TODO quitar cuando sea gratis"): los 4 hubs y sus componentes son agnósticos de plan; el gate, cuando exista, se resuelve con un solo hook (p. ej. `useIsPro()`) consultado puntualmente donde haga falta, no repartido por toda la UI.

## Qué NO se hace en P0 (explícito)

- No hay pantalla de precios, checkout, ni Stripe/RevenueCat integrado.
- No hay lógica de "trial" ni contadores de uso con gate.
- No se manda `VITE_BOOKING_AID` en ninguna URL.
- No se oculta ni degrada ninguna feature actual para "dejar hueco" a Pro — todo lo que funciona hoy sigue gratis tal cual hasta que se decida lo contrario.
