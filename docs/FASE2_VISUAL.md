# Fase 2 — Rediseño visual greenfield

**Referencia aprobada:** `docs/preview-v2-ui.html` (abrir en navegador, modo "Ambos")  
**Breakpoint único desktop:** 1024px (`docs/PLATAFORMAS.md`)

---

## Prompt para Sonnet (copiar entero)

```
FASE 2 — REDISEÑO VISUAL GREENFIELD

REFERENCIA APROBADA POR EL USUARIO:
Leer y emular docs/preview-v2-ui.html (Rhyme × Atlas, coral + navy).
Abrir en navegador: Viajes / Wizard / Plan / Hoy en modo "Ambos" (móvil + PC).

Contexto: Fase 1 (hubs Viajes/Plan/Hoy + TabBar) YA ESTÁ HECHA.
NO tocar store.ts, routing App.tsx, ni lógica de negocio.
SOLO look & feel — web móvil (<1024px) Y web PC (≥1024px), layouts distintos.

══════════════════════════════════════════════════════════════
AJUSTES OBLIGATORIOS DEL USUARIO (además de la preview)
══════════════════════════════════════════════════════════════

1) MARCA / LOGO — NO dejar "RutaDos" como texto plano:
   - Crear componente V2Wordmark (src/ui/v2/V2Wordmark.tsx):
     · Icono/mark cuadrado coral con iniciales "RD" o símbolo ruta (pin+ línea)
     · Texto "RutaDos" sans bold; "Dos" en color accent coral
   - Usar en: TabBar desktop, nav superior PC, header Viajes móvil
   - NO usar Fraunces/Outfit como marca; NO texto serif suelto "RutaDos"

2) WIZARD MÓVIL — PROHIBIDO mitad blanca:
   - Foto destino cubre TODO el viewport (position absolute inset 0)
   - Gradiente oscuro de abajo (72–100%) para legibilidad
   - Inputs + CTA "Continuar" flotan SOBRE la foto en el tercio inferior
   - CERO bloque blanco vacío entre foto y botón
   - Ver preview corregida: tpl-mobile-wizard en preview-v2-ui.html
   - Desktop wizard: mantener split 50/50 foto sticky | formulario (OK)

══════════════════════════════════════════════════════════════
DIRECCIÓN VISUAL — Rhyme × Atlas (mezcla A+B)
══════════════════════════════════════════════════════════════

Rhyme/App Store: blanco limpio, mapa+fotos dominan, FAB, sheets, cero landing
Atlas/Behance: cards grandes con aire, map radius 24px, sombras azul-gris
Wanderlog/Tripsy: trip cards foto, place cards con thumb + hora columna izq
YOGO: Hoy = mapa fijo + bottom sheet móvil

Paleta (crear desde cero — NO reutilizar):
--v2-bg #FAFAFA | --v2-accent #FF5A3C | --v2-accent-2 #1A2B4A
Tipografía: Plus Jakarta Sans (UI) + Instrument Serif (solo títulos viaje/ciudad)

PROHIBIDO: --ui-sea, --ui-sand, teal, sand, hero "Tu viaje a tu ritmo",
ui-features, .btn/.chip de index.css en P0, DayTimeline tal cual.

══════════════════════════════════════════════════════════════
WEB MÓVIL (<1024px)
══════════════════════════════════════════════════════════════

Nav: TabBar abajo blur + safe-area. FAB coral "Nuevo viaje" en Viajes.

Viajes: V2Wordmark arriba + "Tus viajes" · trip XL foto · scroll horizontal · chips destinos
Wizard: full-bleed foto SIN mitad blanca (ver arriba)
Plan: mapa arriba radius 24 · V2Segmented · day pills · budget strip
Hoy: mapa ~40vh · V2Sheet · V2PlaceCard con foto · daybar flotante 4 iconos

══════════════════════════════════════════════════════════════
WEB PC (≥1024px)
══════════════════════════════════════════════════════════════

Nav: barra superior blur con V2Wordmark + tabs hubs + botón "Nuevo viaje"
(SIN tab bar abajo)

Viajes: grid 2 cols (trip XL | lista) + fila 3 cols abajo
Wizard: split 50/50 — foto sticky izq/derecha + formulario
Plan: mapa sticky 60/40 (grid 3fr 2fr) + toolbar icon buttons
Hoy: topbar acciones (Maps/Metro/Comer/En ruta) + mapa | place cards lado a lado

══════════════════════════════════════════════════════════════
COMPONENTES (src/ui/v2/)
══════════════════════════════════════════════════════════════

V2Wordmark, V2Button, V2Chip, V2Card, V2Sheet, V2TabBar, V2Segmented,
V2Fab, V2TripCard, V2PlaceCard, V2PlaceCardList, V2MapShell, V2ProgressBar
CSS: src/ui/v2.css — import en main.tsx

Páginas P0: TripsPage, WizardPage, PlanPage, TodayPage
Reemplazar DayTimeline → V2PlaceCardList en TodayPage

══════════════════════════════════════════════════════════════
SUB-FASES (orden estricto)
══════════════════════════════════════════════════════════════

2A — v2.css + componentes base + V2Wordmark + TripsPage (móvil+PC)
2B — Wizard (móvil full-bleed SIN blanco + desktop split) + Plan
2C — Hoy + V2PlaceCard + DayBottomBar + V2MapShell
2D — Secundarias + limpieza index.css/app.css

Verificar screenshot cada sub-fase antes de continuar.

══════════════════════════════════════════════════════════════
CRITERIOS DE ACEPTACIÓN
══════════════════════════════════════════════════════════════

1. Viajes 390px: CERO hero marketing, CERO bloque 3 features
2. Wizard 390px: foto cubre 100% alto — CERO mitad blanca vacía
3. V2Wordmark visible en nav (no "RutaDos" texto plano serif)
4. Cero className="btn" en TripsPage, TodayPage, PlanPage, WizardPage
5. Hoy: place cards con foto thumb
6. PC 1280px: nav superior, Plan 60/40, Hoy mapa|panel (no tab bar abajo)
7. npm run build OK
8. Describir cambios por pantalla y breakpoint

NO refactors de navegación. NO docs hasta visual verificado.
Empieza sub-fase 2A leyendo preview-v2-ui.html y TripsPage.tsx.
```

---

## Tabla layouts (fuente de verdad)

| Hub | Web móvil | Web PC |
|-----|-----------|--------|
| Nav | Tab bar abajo + FAB | Nav superior + V2Wordmark |
| Viajes | Wordmark + trip XL + scroll | Grid 2+3 columnas |
| Wizard | Foto 100vh, inputs sobre gradiente | Split 50/50 foto sticky |
| Plan | Mapa arriba + lista | Mapa sticky 60/40 |
| Hoy | Mapa 40vh + sheet + daybar | Topbar + mapa \| cards |
