# RutaDos — Diseño UI (Behance + estado real)

**Referencias Behance (jul 2026):**

1. [Travel agency landing](https://www.behance.net/gallery/168961811/Travel-agency-landing-page-uxui)
2. [Travelscape](https://www.behance.net/gallery/252622071/Travelscape-Plan-Trips-Together-Powered-by-AI)
3. [Touri](https://www.behance.net/gallery/248048297/Touri-AI-Trip-Planner-App-UI-UX-Design)
4. [Travel Booking](https://www.behance.net/gallery/249333877/Travel-Booking-Trip-Planner-App-UIUX-Design)
5. [YOGO Trip Planner](https://www.behance.net/gallery/78632553/YOGO-Trip-Planner-App)

**Principio:** app para **cualquier viajero**. Inspiración visual, no copiar flujos de app solo-grupo.

---

## Mapa pantalla → inspiración

| Pantalla | Inspiración | Estado jul 2026 |
|----------|-------------|-----------------|
| **Home** | Landing agency + Touri | Parcial — hero + destinos foto; diseño aún en iteración |
| **Wizard** | Touri + Travelscape | Parcial — 3 pasos, sitios típicos; falta mapa preview |
| **Trip** | YOGO + Travelscape | Parcial — mapa+panel PC, presupuesto; falta tabs y pulido |
| **Day** | YOGO + Travel Booking | Legacy — pendiente rediseño |
| **Map popup** | Travel Booking cards | Hecho — galería al clicar pin |
| **Venues** | Travel Booking | Parcial — cards con thumb |

---

## Qué significa “wizard” en diseño

El **wizard** es la UI de **crear viaje** (no la home ni el trip). Objetivo Behance/Touri:

- Pocos pasos, sensación de app de viajes (no encuesta larga)
- Destinos visuales con foto
- Presets grandes (Clásico / Local / Foodie)
- Paso final tipo boarding pass
- Sitios típicos como inspiración al elegir ciudad

Problemas reportados por usuario (jul 2026):

- Sensación de “encuesta” / formulario largo
- Huecos vacíos (corregido parcialmente en `3c2f7d5`)
- Layout centrado estrecho en PC (mejorado en `37aafd7` con `--layout-max: 72rem`)
- Estética general aún no convence → **retomar mañana**

---

## Fases de diseño

### Fase A — Hecho (base v2)

- [x] `redesign.css` + import en `main.tsx`
- [x] Home v2: hero, destinos Unsplash, features, viajes numerados
- [x] Wizard v2: dots, presets SVG, boarding pass, sitios típicos, panel lateral paso 1
- [x] Trip v2: presupuesto visible, layout mapa+panel PC, días con color
- [x] Iconos SVG (`Icons.tsx`) en lugar de emojis
- [x] Popup mapa con fotos Wikipedia (no en pins)
- [x] Layout ancho desktop (`--layout-max: 72rem`)
- [x] OpenTripMap + VenueFinder + docs afiliado/OTM

### Fase B — Siguiente (prioridad usuario)

- [ ] **Diseño global** — sensación app profesional (home, wizard, trip, day coherentes)
- [ ] **Day YOGO** — mapa fijo + barra inferior sticky (Maps · Metro · Comer · En ruta)
- [ ] **Wizard Touri** — mini mapa Leaflet al elegir destino
- [ ] Trip: acciones rápidas visibles (no solo menú ···)

### Fase C — Pulido pre-lanzamiento

- [ ] Trip tabs: Mapa · Días · Alojamiento · Comer
- [ ] SharePage visual
- [ ] Página privacidad (requerida antes afiliado Booking)
- [ ] Fotos propias en `/public/` sustituyendo Unsplash

### Fase D — Post-beta

- [ ] `VITE_OPENTRIPMAP_KEY` en Vercel prod
- [ ] `VITE_BOOKING_AID` tras aprobación afiliado
- [ ] Packs curados por ciudad

---

## Qué NO copiar

- Catálogo Booking/Google embebido (API de pago)
- Chat IA como pantalla principal (Telegram ya cubre in situ)
- App centrada solo en grupos
- Animaciones pesadas en móvil real

---

## Tokens CSS v2

```css
--layout-max: 72rem;      /* ancho contenido desktop */
--v2-ink, --v2-card, --v2-muted, --v2-line
--page-pad: clamp(1rem, 3.5vw, 1.75rem);
```

Clases principales: `.rd-layout`, `.home-v2`, `.wizard-v2`, `.trip-v2`, `.map-stop-popup`

---

## Archivos diseño

| Archivo | Rol |
|---------|-----|
| `src/redesign.css` | Estilos v2 |
| `src/index.css` | Base + legacy |
| `src/pages/HomePage.tsx` | Portada |
| `src/pages/WizardPage.tsx` | Wizard |
| `src/pages/TripPage.tsx` | Trip |
| `src/pages/DayPage.tsx` | Day (siguiente foco) |
| `src/components/TripMap.tsx` | Mapa + popups |
| `src/components/Icons.tsx` | Iconos |
| `src/lib/quickDestinations.ts` | Fotos destino |
