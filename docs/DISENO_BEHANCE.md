# RutaDos — Inspiración Behance y roadmap visual

**Referencias (jul 2026):**

1. [Travel agency landing](https://www.behance.net/gallery/168961811/Travel-agency-landing-page-uxui)
2. [Travelscape — Plan Trips Together](https://www.behance.net/gallery/252622071/Travelscape-Plan-Trips-Together-Powered-by-AI)
3. [Touri — AI Trip Planner](https://www.behance.net/gallery/248048297/Touri-AI-Trip-Planner-App-UI-UX-Design)
4. [Travel Booking Trip Planner](https://www.behance.net/gallery/249333877/Travel-Booking-Trip-Planner-App-UIUX-Design)
5. [YOGO Trip Planner](https://www.behance.net/gallery/78632553/YOGO-Trip-Planner-App)

**Principio:** RutaDos es para **cualquier viajero** (solo o acompañado). No copiar flujos 100% colaborativos; sí el diseño y herramientas útiles para todos.

---

## Qué tomar de cada referencia

| Referencia | Diseño | Feature / producto |
|------------|--------|-------------------|
| **Landing agency** | Hero potente, destinos curados, confianza | Home con fotos reales por ciudad; footer legal; copy claro |
| **Travelscape** | Presupuesto visible, timeline, cards ricas | Budget siempre en trip; share visual; cards con distancia/foto |
| **Touri** | Onboarding corto, presets grandes, progress minimal | Wizard: mapa preview, paso 3 “boarding pass”, iconos en presets |
| **Travel Booking** | Tabs Mapa/Días/Hotel/Comer, cards reserva | VenueFinder con tabs; CTA “Añadir al día” destacado |
| **YOGO** | Mapa fijo, día compacto, barra acciones abajo | Trip/Day map-first; barra fija Maps/Metro/Comer; color por día |

---

## Mapa pantalla → inspiración

```
HOME     → Landing agency + Touri (hero editorial + destinos con foto)
WIZARD   → Touri + Travelscape (dots progreso, banner ciudad, boarding pass)
TRIP     → YOGO + Travelscape (mapa overlay, presupuesto visible, días color)
DAY      → YOGO + Travel Booking (mapa + lista + reservar/comer)
VENUES   → Travel Booking (cards foto, tabs hotel/comida)
SHARE    → Travelscape (tarjeta visual del viaje)
```

---

## Fases de diseño (orden recomendado)

### Fase A — Hecho (rediseño v2, 22 jul 2026 noche)

- [x] Home v2: hero editorial “Donde vayas, día a día”, features 3 columnas, destinos scroll con **foto Unsplash**
- [x] Wizard v2: dots progreso, banner ciudad, search pill, presets con iconos, paso 3 **boarding pass**
- [x] Trip v2: presupuesto **siempre visible**, mapa con overlay título + foto ciudad, días con borde color
- [x] `src/redesign.css` importado en `main.tsx` (override limpio sobre `index.css`)
- [x] `DestinationGrid` con `<img>` por destino
- [x] VenueFinder cards v2 + OpenTripMap opcional — `docs/OPENTRIPMAP.md`
- [x] Afiliado Booking preparado sin activar — `docs/BOOKING_AFILIADO.md`
- [x] Fix selección aeropuerto wizard (comparar lat/lng/code)
- [x] Fotos documentadas — `docs/IMAGENES.md`

### Fase B — Siguiente (prioridad alta)

- [ ] **Wizard Touri:** mini mapa Leaflet al elegir destino (preview antes de generar)
- [ ] **Day YOGO:** mapa fijo arriba; barra inferior sticky (Maps · Metro · Comer · En ruta)
- [ ] Pulir trip: acciones rápidas fuera del menú ··· (Maps, compartir)

### Fase C — Pulido pre-lanzamiento

- [ ] Trip tabs: Mapa · Días · Alojamiento · Comer
- [ ] SharePage más visual (mapa + fechas + CTA)
- [ ] Página privacidad (requerida antes afiliado Booking)
- [ ] Hero propio `/public/hero/` por destino o rotación
- [ ] Sustituir Unsplash por fotos propias cuando existan

### Fase D — Post-beta (opcional)

- [ ] OpenTripMap key en Vercel prod
- [ ] Afiliado Booking (`VITE_BOOKING_AID`) tras aprobación
- [ ] Votación en link compartido (Travelscape) — solo si se quiere colaboración
- [ ] Packs curados por ciudad

---

## Qué NO copiar

- Catálogo Booking/Google embebido (API de pago / legal)
- IA chat como pantalla principal (ya hay Telegram)
- App centrada solo en grupos
- Animaciones Behance que pesen en móvil real

---

## OpenTripMap (resumen)

Base de datos **gratis** de POIs turísticos y restaurantes valorados. **No es Booking.**

- Sin key → solo OpenStreetMap (como siempre)
- Con `VITE_OPENTRIPMAP_KEY` → más sitios en plan + fotos en VenueFinder
- Guía: `docs/OPENTRIPMAP.md`

---

## Archivos tocados en Fase A v2

| Archivo | Cambio |
|---------|--------|
| `src/pages/HomePage.tsx` | Home v2 |
| `src/pages/WizardPage.tsx` | Wizard v2 |
| `src/pages/TripPage.tsx` | Trip v2 |
| `src/components/DestinationGrid.tsx` | Cards con foto |
| `src/components/VenueFinder.tsx` | Cards enriquecidas |
| `src/lib/quickDestinations.ts` | Destinos + URLs Unsplash |
| `src/lib/opentripmap.ts` | Cliente OTM |
| `src/lib/nearbyVenues.ts` | OSM + OTM |
| `src/redesign.css` | **Nuevo** — estilos v2 |
| `src/main.tsx` | Import redesign.css |
| `src/App.tsx` | Fondo app-v2 sin atmosphere mint |
| `docs/IMAGENES.md` | Atribución Unsplash |
