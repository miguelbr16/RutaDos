# Workshop diferencial — RutaDos

**Actualizado:** 23 jul 2026

## Decisión de producto

**No hay una cuña de marketing única** (tipo «solo replan» o «solo Telegram»). RutaDos es un **planificador de viaje claro**: destino → plan por días → mapa → transporte → comer cerca.

Las features A / B / C **existen y se mantienen**, pero como **utilidades del producto**, no como identidad de marca:

| Feature | Qué hace | Dónde |
|---------|----------|-------|
| Replan (Cansados / Lluvia / Tarde) | Ajusta el día in situ | Day |
| Mapa + barra inferior | Maps · Metro · Comer · En ruta | Day (YOGO) |
| Telegram copiloto | Ayuda con el viaje cargado | Bot + chip en Trip |

**Posicionamiento honesto:** *Planificá tu viaje por días, con mapa y transporte real — sin lío.*

---

## Diseño (greenfield jul 2026)

Referencia visual: Behance YOGO / Atlas / TravelPlan + Dribbble **17978900**, **27455621**, TripForge landing.

| Pantalla | Patrón |
|----------|--------|
| Home | Hero foto full-bleed móvil + split PC, destinos scroll, viajes cards |
| Wizard | 3 pasos, presets, dots, sticky CTA, mini mapa ciudad |
| Trip | Mapa persistente + tabs Mapa/Días/Hotel/Comer + mini timeline días |
| Day | Mapa arriba + sheet + place cards + barra sticky |

**Stack UI:** `src/ui/app.css` + componentes `src/ui/*`. Eliminados `skin.css` y `redesign.css`.

---

## Criterio de éxito UX

1. Usuario nuevo crea un viaje en &lt; 2 min sin leer ayuda.
2. Trip se escanea en 2 s (días + mapa).
3. Day usable con una mano (barra inferior).
4. Misma familia visual en las 4 pantallas.

---

Ver también: `docs/DISENO_BEHANCE.md`, `docs/preview-light-ui.html`, `docs/REFERENCIAS_IDEAS.md`.

---

## Actualización — Fase 0 v2 (23 jul 2026)

El posicionamiento («planificador de viaje claro») **se mantiene**. Lo que cambia en v2 es la **navegación**: en vez de Home/Wizard/Trip/Day como 4 pantallas sueltas dentro de 10 vistas planas, se propone consolidar en 3 hubs (Viajes / Plan / Hoy) + Ajustes, con el copiloto y las guías de ciudad integrados dentro de "Hoy" en vez de vivir en pantallas separadas (hoy inalcanzables desde la UI).

Detalle completo de auditoría, propuesta y decisiones pendientes: **`docs/VISION_APP_V2.md`**.
