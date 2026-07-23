# RutaDos — Diseño v3 (clean slate)

**Fecha:** 23 jul 2026  
**Backup:** `backup/pre-full-redesign` · tag `backup-pre-full-redesign`

## Diferencial (lo que nos separa)

La mayoría de planners (Atlas, YOGO, TripForge, Wanderlog…) brillan **antes** del viaje.  
RutaDos se diferencia en **durante el viaje**:

1. **Adaptación in situ** — botones Cansados / Lluvia / Vamos tarde que rehacen el día
2. **Copiloto Telegram** — ayuda con ubicación real, no solo chat en la app
3. **Mapa siempre visible** + transporte oficial de la ciudad (metro/bus)
4. **Offline del día** — el plan del día sigue usable sin red

Hero message: *“Un plan que se adapta cuando el día cambia.”*

## Síntesis visual (Behance + Dribbble)

| Ref | Qué cogemos |
|-----|-------------|
| YOGO | Día: mapa fijo + sheet + barra inferior |
| Atlas / Travel Booking | Cards destino foto; hotel/comer cerca |
| TripForge landing | Split light profesional (no hero oscuro sucio) |
| Dribbble 17978900 | Rundown del día claro, numerado |
| Weather cards shot | Chip meteo sobre el mapa |
| Smart / AI planners | Presets grandes (no encuesta) |
| TravelPlan stress-free | CTA “Cansados” visible, tono calmado |

**No copiamos:** chat IA como home, catálogo Booking embebido, dark glass genérico, app solo-grupo.

## Tokens v3

```
--ink #0b1f24 · --sea #1f6f63 · --sand #e08a3c · --mist #f3f5f4
--font-display Fraunces · --font-body Outfit
Clases: r3-* (nada de home-v2 / wiz-v2 legado)
```

## Archivos

| Archivo | Rol |
|---------|-----|
| `src/skin.css` | Única piel de pantallas |
| `src/index.css` | Tokens base + componentes genéricos (btn, chip, leaflet) |
| `src/pages/*` | Markup nuevo `r3-*` |
