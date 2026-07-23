# RutaDos — Diseño UI light limpio (jul 2026)

**Dirección:** light limpio / editorial de viaje — no dark, no glass, no purple-on-white genérico.

**Ancla visual:** [Dribbble 17978900](https://dribbble.com/shots/17978900-Trip-Planner-Mobile-App) + Behance YOGO / Atlas / Travel Booking / AI Smart Trip Planner.

**Principio:** app para **cualquier viajero** (solo o acompañado). Inspiración visual, no copiar flujos ajenos.

---

## Tokens

| Token | Valor |
|-------|--------|
| Fondo | `#F3F5F4` (mist/foam) |
| Superficie | cards blancas, radio 16–20px |
| Marca | teal `--sea` / `--rd-sea` |
| Tipo | Fraunces (títulos) + Outfit (UI) |
| Layout | `--layout-max: 72rem`, `.rd-layout` |

CSS: `src/redesign.css` (tokens `--rd-*`) + `src/skin.css` (pantallas `r3-*`). Import en `main.tsx`.

---

## Mapa pantalla → inspiración

| Pantalla | Inspiración | Estado |
|----------|-------------|--------|
| **Home** | TripIt cards + Polarsteps foto + landing TripForge | Hero full-bleed móvil + split PC, destinos grid, viajes foto |
| **Wizard** | Touri / Atlas | 3 pasos, presets, mini mapa destino, boarding pass |
| **Trip** | Wanderlog + YOGO | Map-first, tabs Mapa·Días·Hotel·Comer, presupuesto strip |
| **Day** | YOGO + Sygic place cards | Mapa sticky, timeline cards, barra inferior |
| **Map popup** | Travel Booking | Galería al clicar pin |
| **Venues** | Travel Booking | Cards thumb OSM + OpenTripMap |

---

## Qué coger de competidores (ideas, no copiar UI)

| Fuente | Adoptar | No adoptar |
|--------|---------|------------|
| TripIt | Cards escaneables, itinerario por día | Inbox email |
| Wanderlog | Mapa + lista, rutas, tabs | Paywall chat |
| Polarsteps | Foto grande, estética revista | GPS diary / photobook |
| Sygic | Place cards, duración | UI densa, ads |
| YOGO | Day mapa fijo + barra sticky | — |

---

## Referencias Behance / Dribbble

1. [YOGO Trip Planner](https://www.behance.net/gallery/78632553/YOGO-Trip-Planner-App)
2. [Atlas](https://www.behance.net/gallery/252827515/Travel-Planning-App-UIUX-Design-Atlas)
3. [Travel Booking](https://www.behance.net/gallery/249333877/Travel-Booking-Trip-Planner-App-UIUX-Design)
4. [TravelPlan stress-free](https://www.behance.net/gallery/248071881/TravelPlan-Mobile-App-for-Stress-Free-Trip-Planning)
5. [AI Smart Trip Planner](https://www.behance.net/gallery/250037379/AI-Smart-Trip-Planner)
6. [Dribbble 17978900](https://dribbble.com/shots/17978900-Trip-Planner-Mobile-App) — north star light
7. [TripForge landing](https://dribbble.com/shots/27530811-TripForge-AI-for-Trip-Planner-Landing-Page-V2)

Inventario ampliado: `docs/REFERENCIAS_IDEAS.md`

---

## Fase B — Hecho (light UI jul 2026)

- [x] Backup `backup/pre-light-ui`
- [x] Tokens `--rd-*` + `.rd-layout` en `redesign.css`
- [x] Home: hero full-bleed móvil + split PC, destinos, trip cards foto
- [x] Wizard: 3 pasos, presets, mini mapa al elegir ciudad, confirm boarding
- [x] Trip: mapa siempre visible, tabs Mapa/Días/Hotel/Comer, días numerados
- [x] Day YOGO: mapa + sheet + barra Maps/Metro/Comer/En ruta + place cards
- [x] Iconos SVG (`Icons.tsx`)
- [x] Popup mapa con fotos
- [x] OpenTripMap opcional (`docs/OPENTRIPMAP.md`)

## Fase C — Pulido

- [ ] Settings / Share visual alineado
- [ ] Fotos propias en `/public/`
- [ ] Página privacidad (Booking afiliado)
- [ ] Atribución ODbL completa en Ajustes

---

## Qué NO copiar

- Catálogo Booking/Google embebido
- Chat IA como pantalla principal (Telegram cubre in situ)
- App centrada solo en grupos
- Dark glass / neumorphism genérico

---

## Archivos diseño

| Archivo | Rol |
|---------|-----|
| `src/redesign.css` | Tokens `--rd-*`, motion, overrides timeline |
| `src/skin.css` | Home, Wizard, Trip, Day (`r3-*`) |
| `src/index.css` | Base + componentes genéricos |
| `docs/preview-light-ui.html` | Mock estático móvil/PC |
| `src/pages/HomePage.tsx` | Portada |
| `src/pages/WizardPage.tsx` | Wizard |
| `src/pages/TripPage.tsx` | Trip |
| `src/pages/DayPage.tsx` | Day |
| `src/components/TripMap.tsx` | Mapa + popups |
| `src/components/DayTimeline.tsx` | Timeline día |
