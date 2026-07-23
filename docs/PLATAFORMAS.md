# RutaDos — Plataformas y breakpoints

**Fecha:** 23 jul 2026 · Ver `docs/VISION_APP_V2.md` §3–§5 y `docs/PUNTO_SITUACION.md`.

Un solo código (React + `src/ui/`), layouts distintos según ancho — no "una web estirada". Este doc fija el criterio para no volver a mezclar breakpoints.

---

## Hoy

- **PWA mobile-first.** Uso principal: móvil, en la calle, con el viaje ya generado (hub **Hoy**).
- **Usable en PC** desde el día 1 (no hace falta build nativo): mismo dominio, mismos datos (`localStorage` + Supabase opcional), layout de escritorio propio.
- Sin apps nativas todavía. Sin backend propio más allá de Supabase (sync/share/bot).

## Futuro (no implementado en P0)

- **App store:** empaquetar la PWA con **Capacitor** (Android/iOS) o publicar como **TWA** en Play Store. Misma lógica de dominio y los mismos hubs de `src/ui/` — no se reescribe nada, solo se envuelve.
- Requisitos que ya deja listo este pase: sin `alert()`/`confirm()` bloqueantes críticos nuevos, safe areas resueltas, sin flujo que dependa de hover.
- Pendiente cuando se aborde: iconos/splash nativos, permisos (geolocalización ya se usa vía `navigator.geolocation`, revisar prompts nativos), firma y stores.

---

## Breakpoints (fuente de verdad: `src/ui/app.css`, comentario en `:root`)

Un único punto de corte "desktop": **1024px**. No se usan 900px ni otros valores sueltos en el sistema v2 (`ui-*`).

| Rango | Nombre | Comportamiento |
|---|---|---|
| `<768px` | Móvil | Layout base (mobile-first). Todo apilado en 1 columna. |
| `768–1023px` | Tablet | **Igual que móvil** (más aire de sobra, no hay layout específico). Tab bar sigue abajo. |
| `>=1024px` | Desktop | Nav superior en vez de tab bar. Layouts lado a lado (mapa + lista/timeline). |

Probar siempre en **390px** (móvil de referencia, iPhone-ish) y **1280px** (desktop de referencia). Ver lista de pruebas en `docs/PUNTO_SITUACION.md`.

Tokens de alto reservados para offsets (`:root` en `app.css`):

| Variable | Valor | Para qué |
|---|---|---|
| `--ui-tabbar-h` | `4.3rem` | Alto de la tab bar fija (móvil/tablet, abajo). |
| `--ui-topnav-h` | `3.9rem` | Alto de la nav de hubs fija (desktop, arriba). |
| `--ui-pagenav-h` | `3.4rem` | Alto aprox. del header de página (`TopNav` con back+título) en desktop, para sticky offsets. |

---

## Navegación

- **Móvil/tablet (`<1024px`):** `ui/TabBar.tsx` fija abajo, 4 iconos+label (Viajes · Plan · Hoy · Ajustes). `env(safe-area-inset-bottom)` incluido.
- **Desktop (`>=1024px`):** el **mismo** `TabBar` (mismo componente, mismos 4 hubs) se reposiciona por CSS a una barra horizontal fija arriba, con marca "RutaDos" a la izquierda. No hay un componente nav distinto — una sola fuente de verdad para qué hub está activo/deshabilitado.
- El header de página (`ui/TopNav.tsx`, con back+título, usado en Plan) queda **debajo** de la nav de hubs en desktop (`top: var(--ui-topnav-h)`), formando dos franjas: global (hubs) + contextual (viaje/página). En Viajes, donde `TopNav` solo mostraba la marca, se oculta en desktop (`.ui-nav:has(.ui-brand)`) porque es redundante con la nav de hubs.

## Layouts por hub (desktop, `>=1024px`)

| Hub | Móvil | Desktop |
|---|---|---|
| **Viajes** | Hero full-bleed + listas en scroll horizontal/vertical | Split hero (texto + foto) + grid de 3 columnas para destinos (`ui-hero-desktop`, `ui-cols`) |
| **Wizard** | Todo apilado, CTA pegada abajo (sticky) | 2 columnas: formulario a la izquierda, **panel foto lateral** sticky a la derecha con la ciudad elegida (`ui-wiz-side`) |
| **Plan** | Mapa arriba (fijo, no sticky) + tabs + lista de días abajo | Mapa **sticky lateral ~60/40** (`grid-template-columns: 3fr 2fr`) a la izquierda, panel de días/presupuesto con scroll propio a la derecha |
| **Hoy** | Mapa arriba + sheet (timeline) + tab bar abajo | Mapa grande sticky a la izquierda + topbar arriba a todo el ancho + timeline/acciones a la derecha, vía `grid-template-areas` (`ui-day`) |

## Reglas transversales

- **Safe areas:** todo elemento fijo (tab bar, FAB Telegram, sheets) usa `env(safe-area-inset-*)`. No se asume notch ni barra de gestos.
- **Sin hover-only crítico:** ninguna acción imprescindible depende de `:hover` (revisado en `app.css`); los `:hover` que existen son refuerzos visuales en desktop (p. ej. item de nav), nunca la única forma de revelar una acción.
- **Un solo grid por hub:** los layouts desktop usan `grid-template-areas` con nombres explícitos (`map`, `sheet`, `bar`, `topbar`…) en vez de depender del orden de los hijos — evita que un cambio de marcado rompa el layout en silencio (fue el bug que arrastraba el wizard antes de este pase).

---

## Qué falta si se aborda app store más adelante

- Manifest/PWA ya existe (`vite-plugin-pwa` en `vite.config.ts`); revisar iconos de mayor resolución para stores. Nota: `src/main.tsx` hoy **desregistra** el service worker al arrancar (workaround de caché vieja) — revisar antes de depender de offline real vía SW.
- Capacitor: `npx cap init`, `npx cap add android|ios`, apuntar el `webDir` al build de Vite. Los hubs y el dominio no cambian.
- Revisar permisos nativos de geolocalización (usada en Hoy/copiloto) y ajustar los textos de permiso para store review.
