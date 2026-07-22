# RutaDos — Guía de la app

Documentación de **pantallas**, **flujos** y **conceptos** para desarrolladores y handoff entre sesiones.

---

## Glosario rápido

| Término | Qué es |
|---------|--------|
| **Wizard** | Asistente de **3 pasos** para crear un viaje nuevo (`WizardPage.tsx`). No es magia: es el formulario “Crear viaje”. |
| **Trip** | Vista resumen de un viaje ya generado: mapa, presupuesto, días, hotel/restaurantes. |
| **Day** | Un día concreto: timeline de paradas, mapa, caos, offline. |
| **VenueFinder** | Panel de hoteles o restaurantes cerca (OSM + OpenTripMap opcional). |
| **Discover** | Lógica que busca sitios al generar el plan (`discover.ts`). |
| **Landmarks** | Sitios icónicos curados Londres/París (`landmarks.ts`); también “sitios típicos” en wizard. |
| **v2 / redesign.css** | Capa visual nueva (home, wizard, trip) sobre `index.css`. |

---

## Navegación

La app no usa React Router para pantallas principales. Usa **Zustand** (`store.ts`) con un objeto `view`:

```typescript
// Ejemplos
{ name: 'home' }
{ name: 'wizard', step: 0 | 1 | 2 }
{ name: 'trip', tripId: string }
{ name: 'day', tripId: string, dayId: string }
{ name: 'onroute', tripId, dayId }
{ name: 'settings' }
{ name: 'share', token: string }
// … guides, build, copilot, auth
```

`App.tsx` renderiza la página según `view.name`.

---

## Pantallas

### Home (`HomePage.tsx`)

- Hero con foto Unsplash + CTA **Crear viaje**
- Grid de destinos populares (Londres, Roma, Madrid…)
- Lista de viajes guardados
- Export / import JSON
- Clases: `home-v2`, layout ancho vía `.rd-layout` (`--layout-max: 72rem`)

**Crear viaje** → resetea wizard y abre `{ name: 'wizard', step: 0 }`.  
**Clic en destino** → wizard paso 0 con ciudad pre-rellenada.

---

### Wizard — crear viaje (`WizardPage.tsx`)

El **wizard** es el flujo para definir un viaje **antes** de generarlo.

#### Paso 0 — Destino (`step: 0`)

- Buscar ciudad (Nominatim)
- Grid **Destinos populares** (siempre visible)
- Al elegir ciudad: chips **Sitios típicos** (Tower Bridge, British Museum… en Londres)
  - Clic en chip → añade a `mustVisits` (prioridad en el plan)
- Fechas llegada / salida
- Desplegable opcional: horarios vuelo, aeropuerto, hotel

#### Paso 1 — Estilo (`step: 1`)

- Presets: Clásico / Más local / Foodie (iconos SVG)
- Movilidad: andando, transporte, coche…
- Comida: económica / media / especial
- Panel lateral (PC): foto ciudad + sitios típicos

#### Paso 2 — Confirmar (`step: 2`)

- Tarjeta tipo “boarding pass”
- Resumen destino, fechas, estilo
- Opcional: añadir sitios imprescindibles
- Botón **Generar viaje** → `generateTrip()` en store → discover + plan → `TripPage`

Footer fijo único abajo con Continuar / Atrás / Generar.

---

### Trip — resumen del viaje (`TripPage.tsx`)

- Presupuesto orientativo (siempre visible)
- **Mapa** con todos los pins del viaje (numerados por color/categoría)
  - **Clic en pin** → popup con galería de fotos (Wikipedia), nombre, categoría, transporte
  - Pines **sin** foto embebida (solo número)
- Transporte local (links oficiales TfL, etc.)
- Banner hotel si no hay uno
- Botones Restaurantes / Hoteles → `VenueFinder`
- Lista de días → abrir `DayPage`

Layout PC: mapa a la izquierda (sticky), contenido a la derecha.

---

### Day — un día (`DayPage.tsx`)

- Timeline de paradas ordenadas
- Mapa del día con ruta a pie (OSRM)
- Botones Maps, En ruta, caos (“cansados”), Telegram
- Guardar offline del día
- Meteo (Open-Meteo)

---

### Otras pantallas

| Pantalla | Uso |
|----------|-----|
| `OnRoutePage` | Navegación simplificada entre paradas del día |
| `BuildPage` | Armar ruta manual en mapa (wishlist) |
| `GuidesPage` | Enlaces oficiales museos, transporte, etc. |
| `VenueFinder` | Componente embebido en Trip, no pantalla full |
| `SharePage` | Ver viaje compartido por token |
| `CopilotPage` | Chat in-app (alternativa a Telegram) |
| `SettingsPage` | Sync Supabase, pareja, cuenta |
| `AuthPage` | Login email Supabase |

---

## Flujo de datos al generar un viaje

```
Wizard (destino, fechas, prefs, mustVisits)
    ↓
discover.ts — OSM Overpass + Wikipedia + OpenTripMap (opcional)
    ↓
landmarks.ts — iconos curados mezclados
    ↓
plan.ts — reparte sitios por días según ritmo y logística
    ↓
store.trips[] — viaje persistido (localStorage + Supabase opcional)
    ↓
TripPage / DayPage
```

---

## Fotos en la app

| Dónde | Fuente |
|-------|--------|
| Hero / cards destino | Unsplash (`quickDestinations.ts`) — ver `docs/IMAGENES.md` |
| Popup mapa (paradas) | Wikipedia API (`placePhotos.ts`), cargadas al abrir trip |
| VenueFinder cards | OpenTripMap preview o OSM (si hay key) |

**Importante:** las fotos de monumentos se ven al **clicar el pin** en el mapa, no en el pin mismo.

---

## CSS — dos capas

1. **`index.css`** — base, componentes legacy, wizard antiguo, day, botones `.btn`, map legend
2. **`redesign.css`** — override v2: `.home-v2`, `.wizard-v2`, `.trip-v2`, popups `.map-stop-popup`, layout `.rd-layout`

Import en `main.tsx`: primero `index.css`, luego `redesign.css`.

Páginas con fondo gris plano: home, wizard, trip (`App.tsx` → clase `app-v2`).

---

## Iconos

`src/components/Icons.tsx` — SVG stroke (map, transit, dining, landmark, hotel…).  
Sustituyen emojis en home, wizard presets y VenueFinder.

---

## Telegram

Bot: [@RutaDosGuia_bot](https://t.me/RutaDosGuia_bot)  
Setup: `docs/COPILOTO_TELEGRAM.md`  
Edge Function `telegram-bot` en Supabase, `verify_jwt: false`.

---

## Checklist antes de un deploy

1. `npm run build` sin errores
2. Variables en Vercel si usáis sync / OTM
3. Redeploy; probar en incógnito o borrar caché PWA
4. Probar wizard completo → trip → day → pin con popup
