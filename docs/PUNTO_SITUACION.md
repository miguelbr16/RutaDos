# RutaDos — Punto de situación

**Fecha:** 23 jul 2026 (Fase 1 P0 + oleada plataformas/P1)  
**Repo:** https://github.com/miguelbr16/RutaDos (`main`)  
**Live:** https://ruta-dos-miguelbr16s-projects.vercel.app  
**Bot:** [@RutaDosGuia_bot](https://t.me/RutaDosGuia_bot)  
**Supabase:** `odecdpzcnsmvafvbuiby` · https://odecdpzcnsmvafvbuiby.supabase.co

---

## Qué es RutaDos

PWA mobile-first (también usable en PC) para **planificar un viaje día a día**: destino, fechas, gustos → itinerario con mapa, transporte oficial, hoteles/restaurantes (OSM + links), offline del día y copiloto Telegram.

**Para cualquier viajero** (solo o acompañado). Sync en pareja es opcional (Supabase).

Guía de pantallas: **`docs/GUIA_APP.md`** · Diseño: **`docs/DISENO_BEHANCE.md`** · Visión v2: **`docs/VISION_APP_V2.md`** · Plataformas/breakpoints: **`docs/PLATAFORMAS.md`** · Monetización futura (diseño, no implementado): **`docs/FUTURO_MONETIZACION.md`**

---

## Navegación v2 (Fase 1 — MVP P0, implementado)

Sustituido el enum plano de 10 vistas por **3 hubs + Ajustes**, con tab bar fija en móvil (`docs/VISION_APP_V2.md` §3.2 y §9):

```
┌─────────────┬─────────────┬─────────────┬─────────────┐
│   Viajes    │    Plan     │     Hoy     │   Ajustes   │
│ TripsPage   │  PlanPage   │  TodayPage  │ SettingsPage│
└─────────────┴─────────────┴─────────────┴─────────────┘
```

- **Viajes** (`pages/TripsPage.tsx`) — lista de viajes guardados + CTA "Nuevo viaje" + destinos rápidos. Sustituye `HomePage` (borrado).
- **Plan** (`pages/PlanPage.tsx`) — hub de un viaje: mapa persistente, presupuesto y **Compartir siempre visibles** (nada detrás de "···"). Import/export KML, Telegram, ajustar gustos/ritmo y la **guía de la ciudad** (museos/shows/monumentos, fusionada desde `GuidesPage`) quedan en "Más opciones" colapsable. Sustituye `TripPage` (borrado).
- **Hoy** (`pages/TodayPage.tsx`) — hub "en destino": mapa fijo + timeline + barra inferior de 4 acciones (Maps · Metro · Comer · En ruta). Fusiona `DayPage` + `OnRoutePage` (ambos borrados). El modo "En ruta" es un overlay fullscreen (`components/OnRouteMode.tsx`), no una vista de navegación aparte. El **copiloto in-app** se abre como panel deslizable (`ui/CopilotSheet.tsx`, motor en `lib/copilot.ts`) desde el icono de chat de la barra superior — Telegram sigue disponible vía el FAB global (`ui/TelegramFab.tsx`, antes en `CopilotPage.tsx`, borrado). El botón **"Editar día a mano"** (dentro de "Ajustar día") abre `BuildPage.tsx`.
- **Ajustes** (`pages/SettingsPage.tsx`) — sin cambios funcionales, solo estilos alineados al sistema v2.
- **`build`** — se mantiene como vista P1 sin entrada propia en la tab bar (se llega solo desde "Ajustar día" en Hoy). `GuidesPage.tsx` se **borró**: su contenido (transporte + museos/shows/monumentos) vive ahora dentro de Plan.

El `View` de `store.ts` pasó de `home|wizard|trip|day|onroute|guides|build|share|copilot|auth|settings` a `trips|wizard|plan|today|build|share|auth|settings` (sin `guides`, fusionada). El wizard vive en 2 pasos (ver siguiente sección). El dominio (`Trip`/`DayPlan`/`Stop`, `localStorage rutados-storage`, `discover.ts`, `plan.ts`, `offlineDay.ts`, `sync.ts`, `share.ts`) no se tocó — solo cambió presentación y routing.

### Wizard 2 pasos

1. **Destino + fechas + estilo** — buscar ciudad (mini mapa + foto), fechas, presets grandes (Clásico/Local/Foodie), moverse y comida. Hotel/aeropuerto/horarios quedan en un `<details>` "Horarios, aeropuerto y hotel" opcional dentro del mismo paso.
2. **Confirmar** — boarding pass + checklist editable + "sitios imprescindibles" (opcional) + presupuesto orientativo → "Generar viaje".

---

## Plataformas: móvil vs desktop (oleada jul 2026)

Detalle completo y criterio de breakpoints en **`docs/PLATAFORMAS.md`**. Resumen:

- **Un solo punto de corte "desktop": `1024px`** (antes se mezclaban 900px sueltos y CSS de un layout de wizard que ya no existía — limpiado en este pase).
- **Nav:** `ui/TabBar.tsx` es el mismo componente en ambos casos — en `<1024px` es la tab bar fija de abajo (móvil/tablet); en `>=1024px` se reposiciona por CSS a una barra horizontal fija arriba con marca "RutaDos" (nav de hubs de escritorio). El header de página (`TopNav`, con back+título) queda debajo de esa barra en desktop; en Viajes (donde `TopNav` solo mostraba la marca) se oculta en desktop por ser redundante.
- **Wizard:** en desktop aparece un **panel foto lateral sticky** (`ui-wiz-side`) con la ciudad elegida — antes existía el CSS pero no el marcado (`ui-wiz-side` nunca se renderizaba); ahora está implementado en `WizardPage.tsx`.
- **Plan:** mapa **sticky lateral ~60/40** (`grid-template-columns: 3fr 2fr`) en desktop, panel de días con scroll propio.
- **Hoy:** en desktop, `grid-template-areas` explícito (`topbar`/`map`/`sheet`/`bar`) — mapa grande a la izquierda, timeline+acciones a la derecha, topbar arriba a todo el ancho.
- Tokens nuevos en `:root` de `app.css`: `--ui-topnav-h`, `--ui-pagenav-h` (offsets de sticky en desktop), junto al ya existente `--ui-tabbar-h`.

---

## Commits recientes

| Commit | Qué |
|--------|-----|
| **Nav v2: hubs + tab bar** | `store.ts` (View v2), `App.tsx`, `ui/TabBar.tsx`, `ui/CopilotSheet.tsx`, `ui/TelegramFab.tsx`, hubs `TripsPage/PlanPage/TodayPage`, `components/OnRouteMode.tsx`; borrado `HomePage/TripPage/DayPage/OnRoutePage/CopilotPage.tsx` |
| Light UI plan | `redesign.css` + `skin.css` borrados, sustituidos por `src/ui/app.css` |
| **Plataformas + P1** | Breakpoint único 1024px, nav de hubs responsive (tab bar↔barra superior), panel foto lateral del wizard, mapa sticky 60/40 en Plan, grid lado a lado en Hoy; botón "Editar día a mano"; `GuidesPage` fusionada en Plan (borrada); `docs/PLATAFORMAS.md` y `docs/FUTURO_MONETIZACION.md` |
| OpenTripMap | Cliente listo; activar con `VITE_OPENTRIPMAP_KEY` (ver `docs/OPENTRIPMAP.md`) |
| Atribución ODbL / licencias | Sección **Datos y licencias** en Ajustes + `docs/DATOS_LICENCIAS.md` |

Ver `git log --oneline -10` para SHAs actuales.

---

## Estado funcional

| Área | Estado |
|------|--------|
| Wizard 2 pasos (destino+estilo → confirmar) | OK |
| Mini mapa preview al elegir ciudad | OK |
| Generar plan (OSM + Wikipedia + OTM opcional) | OK |
| Plan: mapa siempre, tabs, presupuesto y compartir siempre visibles | OK |
| Hoy: mapa + timeline + barra 4 acciones + En ruta inmersivo | OK |
| Copiloto in-app (panel en Hoy) + Telegram (FAB global) | OK |
| VenueFinder (OSM + OTM) | OK |
| Share / Sync / Bot Telegram | OK |
| Afiliado Booking | Preparado, **no activar** |

---

## Estado diseño (sistema v2 — jul 2026)

| Hub | Estado |
|----------|--------|
| **Viajes** | Hero full-bleed móvil + split PC, destinos foto, viajes cards |
| **Wizard** | 2 pasos, presets, mini mapa destino, boarding pass, **panel foto lateral en desktop** |
| **Plan** | Mapa persistente (sticky 60/40 en desktop), presupuesto + Compartir siempre visibles, tabs Mapa/Días/Hotel/Comer, "Más opciones" colapsable (incluye guía de museos/shows/monumentos) |
| **Hoy** | Mapa sticky + timeline + barra Maps/Metro/Comer/En ruta + copiloto deslizable; **grid lado a lado en desktop** |
| **Ajustes** | Alineado al sistema v2 (`ui-page-tabbed`) |

Nav de hubs responsive (tab bar abajo en móvil/tablet, barra superior en desktop) — ver sección "Plataformas" arriba.

Sistema de diseño: `src/ui/app.css` + `src/ui/*`. Preview estático de tokens: **`docs/preview-light-ui.html`**

---

## Mapa del producto

```
Viajes → Wizard (2 pasos) → Plan → Hoy ⇄ En ruta (overlay)
                               ↓       ↓
                           Ajustes   Copiloto (panel) / VenueFinder / Share
```

---

## Stack y datos

- **Front:** Vite + React 19 + TypeScript + Zustand + PWA
- **Mapa:** Leaflet + OSM tiles (atribución ODbL en mapa)
- **Plan:** OSM/Overpass, Nominatim, Wikipedia, OSRM, landmarks
- **Opcional:** OpenTripMap (`VITE_OPENTRIPMAP_KEY`), Supabase sync
- **Deploy:** Vercel + Supabase Edge (bot)

---

## Variables de entorno

Ver `.env.example` y `docs/OPENTRIPMAP.md`.

| Variable | Uso |
|----------|-----|
| `VITE_OPENTRIPMAP_KEY` | POIs y fotos venues (free) |
| `VITE_SUPABASE_*` | Sync pareja / share |
| `VITE_TELEGRAM_BOT` | Username bot |
| `VITE_BOOKING_AID` | **No activar** hasta afiliado |

---

## Documentación

| Archivo | Contenido |
|---------|-----------|
| `docs/PUNTO_SITUACION.md` | Este archivo |
| `docs/GUIA_APP.md` | Pantallas y flujos |
| `docs/DISENO_BEHANCE.md` | Light UI + refs + fases |
| `docs/REFERENCIAS_IDEAS.md` | Inventario Behance/Dribbble |
| `docs/OPENTRIPMAP.md` | API key + Vercel |
| `docs/DATOS_LICENCIAS.md` | ODbL, OSM, OTM, atribuciones |
| `docs/DIFERENCIAL.md` | Workshop cuña de producto (pendiente decisión) |
| `docs/COPILOTO_TELEGRAM.md` | Bot |

---

## Archivos clave UI

| Ruta | Rol |
|------|-----|
| `src/ui/app.css` | Sistema de diseño v2 (hubs, tab bar, wizard, copiloto) |
| `src/ui/TabBar.tsx` | Tab bar fija de los 4 hubs |
| `src/ui/CopilotSheet.tsx` | Panel deslizable del copiloto in-app (Hoy) |
| `src/ui/TelegramFab.tsx` | FAB global → abre el bot de Telegram |
| `src/ui/{TopNav,DestGrid,SegmentedTabs,ProgressDots,DayBottomBar}.tsx` | Componentes compartidos entre hubs |
| `src/pages/TripsPage.tsx` | Hub Viajes |
| `src/pages/WizardPage.tsx` | Wizard (2 pasos) |
| `src/pages/PlanPage.tsx` | Hub Plan |
| `src/pages/TodayPage.tsx` | Hub Hoy (día + copiloto) |
| `src/components/OnRouteMode.tsx` | Modo inmersivo "En ruta" (overlay dentro de Hoy) |
| `src/pages/BuildPage.tsx` | P1 "Editar día a mano" — entra desde "Ajustar día" en Hoy (sin tab propia) |
| `src/components/TripMap.tsx` | Mapa + popups |
| `src/components/DayTimeline.tsx` | Timeline día |

---

## Pendiente / P1

Hecho en esta oleada (jul 2026): botón "Editar día a mano" en Hoy → `BuildPage`; fusión de `GuidesPage` en Plan (borrada la página standalone); breakpoint único 1024px + layouts desktop reales para Wizard/Plan/Hoy; nav de hubs responsive; `docs/PLATAFORMAS.md` y `docs/FUTURO_MONETIZACION.md`.

Sigue pendiente:

- `BuildPage.tsx` mantiene estilos legacy (`.page`) — no se rediseñó al sistema v2 en este pase (es P1 secundario, funcional).
- Citymapper deep links en el transit strip.
- Auditar/renovar fuente de fotos Unsplash (URLs fijas hardcoded).
- Hacer visible la wishlist/paradas pospuestas (`deferred`) como sección de "Plan".
- Código-splitting (`import()` dinámico) — bundle único ~800 kB, ver "Problemas conocidos".

---

## Lista de prueba manual: móvil (390px) vs desktop (1280px)

Probar en DevTools con esos dos anchos exactos (el resto de anchos usan el mismo layout que el más cercano de estos dos — ver `docs/PLATAFORMAS.md`).

### Móvil (390px)

1. **Viajes** — hero full-bleed con foto, botón "Nuevo viaje" visible sin scroll. Tab bar fija abajo con 4 iconos (Viajes/Plan/Hoy/Ajustes), "Plan" y "Hoy" deshabilitados si no hay viaje activo.
2. **Wizard** — paso 1 apilado (buscador ciudad → mini mapa → fechas → presets), sin panel lateral. CTA "Continuar" fija abajo, por encima de la tab bar (que no se muestra en wizard).
3. **Plan** — mapa arriba (no sticky), presupuesto y "Compartir" siempre visibles debajo del título, tabs Mapa/Días/Hotel/Comer, lista de días scrolleable.
4. **Hoy** — mapa arriba + sheet con timeline debajo + barra de 4 acciones (Maps/Metro/Comer/En ruta) fija justo encima de la tab bar. Abrir copiloto (icono chat arriba) → sheet deslizable desde abajo.
5. **En ruta** — desde la barra de Hoy, overlay a pantalla completa con la parada activa.

### Desktop (1280px)

1. **Viajes** — nav de hubs horizontal fija arriba (con marca "RutaDos"), sin tab bar abajo. Hero en 2 columnas (texto | foto), grid de destinos en 3 columnas.
2. **Wizard** — 2 columnas: formulario a la izquierda, panel foto de la ciudad elegida sticky a la derecha (ocupa toda la altura). Al no haber ciudad elegida, el panel muestra el mensaje genérico ("Elegí un destino…").
3. **Plan** — mapa sticky a la izquierda (~60% ancho) mientras se hace scroll del panel de días a la derecha; presupuesto/Compartir visibles sin abrir menús. "Más opciones" muestra también la guía de museos/shows/monumentos.
4. **Hoy** — topbar arriba a todo el ancho, mapa grande sticky a la izquierda, timeline + barra de acciones a la derecha (visibles simultáneamente, sin tab bar abajo tapando nada).
5. **Ajustes** — nav de hubs arriba resaltando "Ajustes"; contenido igual que móvil pero con el padding-top del nuevo header.

### Transversal (ambos anchos)

- Cambiar de pestaña entre Viajes/Plan/Hoy/Ajustes no rompe el layout ni duplica la barra de navegación.
- FAB de Telegram visible y no tapado por la tab bar/nav ni por la barra de acciones de Hoy.
- Un viaje creado en móvil se abre igual (mismos datos) al recargar en desktop y viceversa (mismo `localStorage`).

---

## Backups git

```bash
git tag -l 'backup*'
git branch -a | grep backup
```

| Tag / rama | Momento |
|------------|---------|
| `backup/pre-light-ui` | Antes light UI plan |
| `backup/pre-full-redesign` | Antes skin v3 |
| `backup/after-skin-v3` | Tras skin v3 |

---

## Problemas conocidos

1. **PWA cache** — hard refresh tras deploy. Además, `src/main.tsx` desregistra el service worker al arrancar (workaround de caché vieja) — revisar antes de depender de offline real vía SW (ver `docs/PLATAFORMAS.md`).
2. **SharePage** y **BuildPage** — mantienen estilos legacy (`.page`, `.trip-hero`), pendiente de pasar al sistema v2 (no bloquea: son vistas secundarias sin tab bar).
3. **Bundle** — `dist/assets/index-*.js` ronda 800 kB; considerar code-splitting (`import()` dinámico) si crece más.
4. **Cuña de producto** — planificador claro; features replan/Telegram como utilidades (`docs/DIFERENCIAL.md`).
5. **OpenTripMap** — activar en local con `.env`; Vercel cuando puedas entrar.
6. **Tablet (768–1023px)** — usa el mismo layout que móvil (sin diseño específico); si en el futuro se ve demasiado suelto, es el próximo breakpoint a diseñar.

---

## Notas para el asistente

- No commitear `.env`, `_tg_*`.
- `npm run build` antes de push.
- Bot Supabase: `verify_jwt: false`.
