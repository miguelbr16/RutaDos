# RutaDos — Análisis de referencias (Behance + Dribbble)

**Fecha:** 23 jul 2026  
**Objetivo:** Inventario completo de ideas UI, features y servicios/herramientas para el rediseño v3 y el diferencial de producto.

---

## Por qué sigue pareciendo “viejo”

El cambio a `skin.css` / `r3-*` fue estructural pero **conservó el mismo esqueleto visual** (misma tipografía, mismos patrones de cards, mismo layout de secciones). Para olvidarse del diseño antiguo hace falta:

1. **Nuevo sistema visual** (no solo renombrar clases): espaciado, jerarquía, fotografía, vacío/blanco, motion sutil.
2. **Nuevos patrones por pantalla** copiados de las refs (YOGO day sheet, TripForge landing split, 17978900 rundown).
3. **Feature visible de diferenciación** en home y trip (no solo copy): botones Cansados/Lluvia, chip offline, barra Telegram.

---

## Mapa de referencias

| # | Ref | Fuente | Idea principal |
|---|-----|--------|----------------|
| 1 | [Mobile App Trip Planner](https://www.behance.net/gallery/218268339/Mobile-App-Trip-Planner) | Behance | Planner móvil genérico: onboarding visual, cards destino |
| 2 | [Atlas](https://www.behance.net/gallery/252827515/Travel-Planning-App-UIUX-Design-Atlas) | Behance | Itinerarios visuales + mapa interactivo + experiencia personalizada |
| 3 | [Travel Booking Trip Planner](https://www.behance.net/gallery/249333877/Travel-Booking-Trip-Planner-App-UIUX-Design) | Behance | Reservas integradas, cards hotel/restaurante, flujo booking |
| 4 | [Smart Travel Planning](https://www.behance.net/gallery/241997649/Smart-Travel-Planning-Mobile-App-UIUX-Design) | Behance | Planificación “smart”, dashboard contextual |
| 5 | [YOGO Trip Planner](https://www.behance.net/gallery/78632553/YOGO-Trip-Planner-App) | Behance | **Mapa fijo + sheet + barra inferior** (referencia día) |
| 6 | [TravelPlan Stress-Free](https://www.behance.net/gallery/248071881/TravelPlan-Mobile-App-for-Stress-Free-Trip-Planning) | Behance | Todo en uno: vuelos/hotel/actividades, UI calmada, menos fatiga |
| 7 | [AI Smart Trip Planner](https://www.behance.net/gallery/250037379/AI-Smart-Trip-Planner) | Behance | IA generativa, onboarding por prompts, confirmación visual |
| 8 | [Trip Rundown & Booking](https://dribbble.com/shots/26467848) | Dribbble | Resumen del viaje + flujo reserva unificado |
| 9 | [Trip Overview & Flights](https://dribbble.com/shots/26919922) | Dribbble | Overview con vuelos, gestión documentos viaje |
| 10 | [Travel Booking App](https://dribbble.com/shots/25863988) | Dribbble | Discovery + booking + categorías |
| 11 | [Trip Map + Weather Cards](https://dribbble.com/shots/27455621) | Dribbble | **Mapa + cards clima + resumen viaje en una vista** |
| 12 | [Trip Planner (17978900)](https://dribbble.com/shots/17978900-Trip-Planner-Mobile-App) | Dribbble | **Favorita:** rundown día claro, light limpio, booking flow |
| 13 | [TripForge Detail](https://dribbble.com/shots/27319870) | Dribbble | Página feature detallada, beneficios IA |
| 14 | [TripForge Landing V2](https://dribbble.com/shots/27530811) | Dribbble | Landing split profesional, CTA “plan in seconds” |
| 15 | [Dyrt Wayfinder](https://dribbble.com/shots/27547052) | Dribbble | Ruta por conducción, límites diarios, mapa offline |
| 16 | [AI Trip Planner](https://dribbble.com/shots/27154949) | Dribbble | Chat/prompts + cards destino + itinerario generado |

---

## A. Ideas de UI / UX (por pantalla)

### Home / Landing
| Idea | Ref | Aplicación RutaDos |
|------|-----|-------------------|
| Hero split: copy izq + card destino/ mockup der | TripForge 27530811, preview PC | Sustituir bloque genérico por split con foto editorial limpia |
| CTA dual: “Nuevo viaje” + “Explorar” | 17978900, Atlas | Ya existe; pulir jerarquía y espaciado |
| Bloque “por qué somos distintos” (3 bullets visuales) | TripForge detail, Atlas case | Adaptación in situ, Telegram, offline |
| Grid destinos con foto arriba + texto abajo | Atlas, Travel Booking | `rd-dest-*` — ampliar a scroll horizontal móvil |
| Social proof / stats (“X viajes planificados”) | TripForge landing | Opcional post-beta |
| Blog / guías destino (inspiración) | TripForge | Enlazar `GuidesPage` desde home |
| Tono calmado, mucho blanco, acentos teal/sand | TravelPlan, 17978900 | Tokens v3 ya definidos; falta densidad y ritmo |

### Wizard / Crear viaje
| Idea | Ref | Aplicación RutaDos |
|------|-----|-------------------|
| 3 pasos con dots horizontales (no encuesta) | 17978900, preview | Presets grandes primero, no 15 chips |
| Panel lateral foto ciudad (PC) | preview wizard desktop | Imagen destino + sitios típicos |
| Banner ciudad seleccionada | Atlas, AI planner | Mantener; mejorar crop y tipografía |
| Presets visuales: Clásico / Local / Foodie | 17978900, Touri | Iconos + 1 línea, no párrafos |
| 4 buckets vibe (Cultura, Callejear, Comer, Noche) | Ya en código | Cards 2×2 con toggle, estilo Dribbble |
| Mini mapa preview al elegir destino | Atlas, Traveln.ai | **Nuevo:** Leaflet pequeño con pin ciudad |
| Input natural “3 días en París” | AI Smart, context-aware | Futuro: campo único + inferencia |
| Boarding pass resumen final | Ya existe | Más visual: foto, fechas, estilo, presupuesto |
| Chat lateral IA (split view) | AI Travel Orbix, 27154949 | **No como home** — opción en paso confirmar o Telegram |

### Trip (vista viaje)
| Idea | Ref | Aplicación RutaDos |
|------|-----|-------------------|
| Mapa siempre visible + panel días | YOGO, Wanderlog, 27455621 | Layout 60/40 PC, mapa arriba móvil |
| Tabs: Plan · Hotel · Comer | 17978900, preview | 3 tabs, mapa no se desmonta |
| Strip presupuesto orientativo | TripForge, Wanderlog | Card compacta bajo título |
| Mini timeline por día (1-2-3 paradas) | 17978900, 26467848 | `day-summary-tl` — añadir fotos thumb |
| Chip clima en mapa | 27455621 | Por día en trip overview |
| Acciones rápidas visibles (no menú ···) | Atlas command center | Metro, Booking, Export, Telegram |
| Comparar escenarios de viaje | TripForge | Futuro: duplicar viaje |
| Import email reservas | TripIt | Futuro: forward a email RutaDos |

### Day (vista día)
| Idea | Ref | Aplicación RutaDos |
|------|-----|-------------------|
| Mapa fijo arriba (40%) + sheet abajo | **YOGO** | `r3-day-map` + sheet sin overlap agresivo |
| Weather chip sobre mapa | 27455621 | Ya existe; estilo card glass light |
| Stop cards con foto + hora + categoría | 17978900, YOGO | DayTimeline → cards visuales |
| Barra inferior sticky: Maps · Metro · Comer · En ruta | YOGO, preview | `r3-day-bar` |
| Botón “Cansados” prominente (sand) | TravelPlan stress-free | Ya existe; más visible |
| Pills caos: Lluvia, Tarde, Restaurantes | Atlas contextual | Barra bajo título |
| Leg transporte en mapa (walk/metro/bus) | Wanderlog, Dyrt | Ya en TripMap |
| Modo “en ruta” fullscreen | OnRoutePage | Enlazar desde barra inferior |

### Mapa
| Idea | Ref | Aplicación RutaDos |
|------|-----|-------------------|
| Pins numerados + popup con fotos | Travel Booking, Wanderlog | Hecho en TripMap |
| Jerarquía pins: plan / sugerido / descubrimiento | Traveln.ai AI map | Primary (itinerario), secondary (OTM), discovery (zoom) |
| Rutas por tramo con color según modo | Wanderlog | Hecho |
| Fit bounds + sticky map PC | YOGO desktop | Hecho en skin v3 |

---

## B. Features / flujos de producto

| Feature | Ref | Prioridad RutaDos | Notas |
|---------|-----|-------------------|-------|
| Replan in situ (cansados/lluvia/tarde) | **Diferencial propio** | P0 | Ya en código; hacer hero del producto |
| Copiloto Telegram + ubicación | **Diferencial propio** | P0 | Bot v6; surfacing en UI |
| Offline del día | Wanderlog, Dyrt | P0 | Ya existe |
| Transporte oficial ciudad | Sygic, guías | P0 | cityGuides |
| Presupuesto orientativo | TripForge, Wanderlog Pro | P1 | estimateTripBudget |
| Wishlist / sitios guardados | TravelPlan, Atlas | P1 | BuildPage parcial |
| Nearby “cerca de ti ahora” | TravelPlan | P1 | VenueFinder + geolocation |
| Comparar múltiples planes | TripForge | P2 | Duplicar viaje |
| Colaboración pareja/sync | Wanderlog, Atlas | P1 | Supabase ya |
| Share link solo lectura | Wanderlog | P1 | SharePage |
| Import KML/GeoJSON | Wanderlog | P1 | Ya en trip |
| Smart booking 1-tap | Trippin', Travel Booking | P2 | Links externos OK |
| Alertas vuelo/retraso | TripIt Pro | P3 | No core |
| GPS auto-track diary | Polarsteps | P3 | No core |
| Route optimizer AI | Wanderlog Pro, Dyrt | P2 | optimizeDay parcial |
| Drive time / radio búsqueda | Dyrt | P2 | Útil road trips |
| Export Google Maps | Wanderlog, Dyrt | P1 | Ya existe |

---

## C. Herramientas y servicios (stack / integraciones)

### Ya usamos en RutaDos
| Servicio | Uso |
|----------|-----|
| OpenStreetMap + Leaflet | Mapa base |
| Nominatim / geocode | Búsqueda ciudad |
| OSM Overpass | POIs plan |
| OSRM | Rutas a pie |
| Wikipedia / Unsplash | Fotos |
| OpenTripMap (opcional) | POIs extra |
| Open-Meteo | Clima día |
| Supabase | Sync pareja |
| Telegram Bot API | Copiloto |
| Booking affiliate (prep) | Hoteles |

### Podríamos añadir (ideas de refs + competencia)
| Servicio | Inspo | Para qué | Esfuerzo |
|----------|-------|----------|----------|
| **Mapbox** o Maptiler | Atlas, Dyrt | Mapas más bonitos, estilo custom light | Medio |
| **Google Directions API** | Wanderlog | Tiempos reales coche/transit | € + API key |
| **Rome2rio** embed/links | — | Multimodal ciudad a ciudad | Bajo (links) |
| **Skyscanner / Kiwi** deeplinks | TravelPlan | Vuelos en wizard | Bajo |
| **GetYourGuide / Tiqets** | Travel Booking | Entradas museos | Afiliado |
| **TheFork / OpenTable** | 17978900 booking | Reservas restaurante | Links + ciudad |
| **Citymapper** deeplinks | — | Metro Londres/NYC/etc. | Bajo |
| **What3words** | — | Direcciones precisas hotel | Opcional |
| **Firebase FCM** | Atlas live | Push “replan sugerido” | Medio |
| **Whisper / STT** | AI planners | “Planifica por voz” | Alto |
| **LLM via Telegram** | TripForge, 27154949 | IA ya en bot; no duplicar app chat | Hecho bot |
| **Polarsteps-style GPS** | Polarsteps | Track automático | Alto, otro producto |
| **TripIt email parse** | TripIt | plans@ rutados | Alto |
| **Algolia Places** | — | Autocomplete destinos mejor | Medio |

---

## D. Diferencial recomendado para RutaDos

> **Posicionamiento:** No competir con TripIt (email) ni Polarsteps (diario GPS) ni TripForge (IA chat genérica).

### Propuesta: “Companion del día real”

| Pilar | Qué es | Ref que lo inspira | Competidor que NO somos |
|-------|--------|-------------------|-------------------------|
| **Adapt** | Replan cuando cambia el día | TravelPlan (calma), Atlas (contexto) | TripForge (solo pre-viaje) |
| **Navigate** | Mapa + transporte oficial | YOGO, Wanderlog | TripIt (lista texto) |
| **Assist** | Telegram con ubicación | Atlas AI companion | Chat in-app genérico |
| **Offline** | Día usable sin red | Dyrt, Sygic | Apps solo online |

**Mensaje home:** *Un plan que se adapta cuando el día cambia.*

**Feature “hook” visible en UI:** barra de caos + chip offline + botón Telegram en trip/day.

---

## E. Qué NO copiar

- Catálogo Booking/Google embebido (API de pago, legal)
- Chat IA como pantalla principal de la app (Telegram ya cubre)
- Dark glass / neumorphism genérico (25863988, 26467848 dark)
- App solo-grupo / solo pareja
- Animaciones pesadas
- Prometer “plan en segundos” sin control usuario (frustración)
- Copiar pixel-perfect Behance (concept art ≠ producto real)

---

## F. Prioridad rediseño visual v3 (siguiente sprint)

### P0 — Debe verse distinto ya
1. **Home** al estilo TripForge 27530811 + 17978900: split hero, mucho aire, card destino editorial
2. **Wizard** al estilo preview: presets stack + vibe grid 2×2, panel foto PC
3. **Trip** Wanderlog/YOGO: mapa grande + días con mini-timeline numerado + fotos
4. **Day** YOGO estricto: mapa 45vh + sheet redondeado + stop cards con imagen
5. **Quitar** restos `index.css` de home/wizard/trip/day (solo componentes genéricos)

### P1 — Diferencial visible
6. Bloque “Adapta tu día” demo en home (Cansados / Lluvia / Tarde)
7. Mini mapa en wizard paso 0
8. Weather card en trip overview
9. FAB Telegram contextual en trip/day

### P2 — Inspiración servicios
10. Deeplinks Rome2rio / Citymapper por ciudad
11. GetYourGuide en paradas museo
12. Pins jerárquicos en mapa (plan vs discover)

---

## G. Checklist por link (ideas concretas)

### Behance
- **218268339:** onboarding 3 slides, iconografía viaje, CTA grande
- **252827515 Atlas:** itinerario visual, mapa interactivo, journey “inspiring not logistical”
- **249333877 Travel Booking:** cards reserva hotel/comida con thumb y CTA Reservar
- **241997649 Smart:** dashboard contextual según fase viaje (antes/durante/después)
- **78632553 YOGO:** map-first day, bottom bar, place cards
- **248071881 TravelPlan:** ecosistema único vuelo+hotel+actividad, UI calm, nearby walking
- **250037379 AI Smart:** prompt onboarding, confirmación visual antes de generar

### Dribbble
- **26467848 Rundown:** lista día con hora, categoría, CTA booking por ítem
- **26919922 Overview:** header viaje con vuelos, fechas, travelers count
- **25863988 Booking:** categorías explorar, filtros, ratings
- **27455621 Map+Weather:** card clima integrada en overview mapa
- **17978900:** **north star visual** — light, rundown, tabs, presupuesto strip
- **27319870 TripForge detail:** secciones feature con icono + beneficio
- **27530811 TripForge landing:** hero co-pilot, social proof, gradientes suaves
- **27547052 Dyrt:** route planner con límites conducción, capas mapa, offline packs
- **27154949 AI:** chat + cards lado a lado, itinerario generado expandable

---

*Documento vivo — actualizar cuando el usuario elija dirección final del rediseño.*
