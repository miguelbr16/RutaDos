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
HOME     → Landing agency + Touri (hero + destinos curados)
WIZARD   → Touri + Travelscape (pocos pasos, preview mapa, resumen bonito)
TRIP     → YOGO + Travelscape (mapa, stats, días, presupuesto visible)
DAY      → YOGO + Travel Booking (mapa + lista + reservar/comer)
VENUES   → Travel Booking (cards foto, tabs hotel/comida)
SHARE    → Travelscape (tarjeta visual del viaje)
```

---

## Fases de diseño (orden recomendado)

### Fase A — Hecho (sesión 22 jul 2026 noche)

- [x] Home reescrita: hero compacto, grid destinos con gradientes, viajes en cards
- [x] Wizard menos encuesta: progress 3 segmentos, destinos visuales, presets estilo cards
- [x] Sistema `.rd-surface`, `DestinationGrid`, VenueFinder cards v2
- [x] OpenTripMap integrado (opcional con `VITE_OPENTRIPMAP_KEY`) — ver `docs/OPENTRIPMAP.md`
- [x] Afiliado Booking preparado sin activar — ver `docs/BOOKING_AFILIADO.md`
- [x] Limpieza CSS muerto (~preset-card, icons.svg Vite)
- [x] Fix selección aeropuerto wizard (comparar lat/lng/code)

### Fase B — Siguiente (prioridad alta)

- [ ] **Wizard Touri:** mini mapa Leaflet al elegir destino; paso 3 tipo “boarding pass”
- [ ] **Trip YOGO:** presupuesto fuera de “Opciones” (siempre visible); días con color D1/D2
- [ ] **Day YOGO:** mapa fijo arriba; barra inferior sticky (Maps · Metro · Comer · En ruta)
- [ ] Iconos/emoji en presets Clásico / Local / Foodie

### Fase C — Pulido pre-lanzamiento

- [ ] Fotos reales en dest cards (Wikimedia/Unsplash por ciudad)
- [ ] Trip tabs: Mapa · Días · Alojamiento · Comer
- [ ] SharePage más visual (mapa + fechas + CTA)
- [ ] Página privacidad (requerida antes afiliado Booking)
- [ ] Hero propio `/public/hero/` por destino o rotación

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

## Archivos tocados en Fase A

| Archivo | Cambio |
|---------|--------|
| `src/pages/HomePage.tsx` | Home nueva |
| `src/pages/WizardPage.tsx` | Wizard visual |
| `src/pages/TripPage.tsx` | Stats + panels |
| `src/components/DestinationGrid.tsx` | Cards destino |
| `src/components/VenueFinder.tsx` | Cards enriquecidas |
| `src/lib/quickDestinations.ts` | Destinos + gradientes |
| `src/lib/opentripmap.ts` | Cliente OTM |
| `src/lib/nearbyVenues.ts` | OSM + OTM |
| `src/index.css` | Rediseño + limpieza |
