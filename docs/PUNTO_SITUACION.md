# RutaDos — Punto de situación

**Fecha:** 22 jul 2026  
**Repo:** https://github.com/miguelbr16/RutaDos (`main`)  
**App:** PWA mobile-first — Vite + React + TypeScript + Supabase  
**UI:** español · diseño sencillo (móvil primero)  
**Bot:** [@RutaDosGuia_bot](https://t.me/RutaDosGuia_bot)  
**Supabase:** `odecdpzcnsmvafvbuiby` · https://odecdpzcnsmvafvbuiby.supabase.co  
**Vercel:** https://ruta-dos-miguelbr16s-projects.vercel.app  
(proyecto **ruta-dos** · auto-deploy en push; a veces Redeploy manual)  
Nota: `ruta-dos.vercel.app` ya no responde (404). Si al abrir la app pide login de Vercel, desactivá **Deployment Protection / Vercel Authentication** en Settings → Deployment Protection para que sea pública (PWA en el móvil).

---

## Posicionamiento (actualizado)

No es solo “app de parejas”. Sirve **solo o con alguien**; sync/pareja es **opcional**.

Propuesta: plan diario personal (1–2) con mapa, transporte, offline del día y compañero in situ (app + Telegram).

---

## Fase actual

**Wizard 3 pasos** (Viaje · Estilo · Listo) + UI más limpia (días/timeline primero, herramientas en «Más»). Recs: nightlife Overpass, sin inflar `must`, bias por gustos.

| Capa | Estado |
|------|--------|
| App web (wizard 3, días, mapa, offline, copiloto) | Hecho |
| Preferencias → discover / plan / presupuesto | Hecho (+ bias prefs) |
| Wizard 3 pasos (logística opcional colapsada) | Hecho |
| UI sencilla mobile-first | Hecho |
| Fichas de días (mini timeline) | Hecho |
| Cansados / Restaurantes / Hoteles | Hecho (en «Ajustar día») |
| Meteo del día (Open-Meteo) | Hecho |
| Supabase (migraciones + sync) | Hecho |
| Edge Function `telegram-bot` | **ACTIVE v6**, `verify_jwt: false` |
| Webhook Telegram | Configurado |
| Vercel | Vinculado; a veces Redeploy manual |
| Partners / B2B / afiliados formales | Stubs / Booking search sin `aid` aún |

---

## Backups git (revertir)

| Qué | Ref |
|-----|-----|
| Antes wizard 3 pasos + UI limpia | `backup/pre-wizard-3steps` · tag `backup-pre-wizard-3steps` |
| Antes fix horas + UX offline/Vercel URL | `backup/pre-fix-order-hours` · tag `backup-pre-fix-order-hours` |
| Antes visual día + offline | `backup/pre-day-visual-offline` · tag `backup-pre-day-visual-offline` |
| Antes wizard visual | `backup/pre-wizard-visual` · tag `backup-pre-wizard-visual` |

```bash
git reset --hard backup/pre-wizard-3steps
# o
git reset --hard backup/pre-fix-order-hours
```

(Si ya pusheaste, hace falta force-with-lease con cuidado.)

---

## Qué está implementado

### App
- Wizard **3 pasos:** Viaje (destino + fechas; hotel/vuelos opcionales) → Estilo (gustos + ritmo) → Listo (resumen + generar)
- Preferencias vacías al empezar; hay que elegir (influyen en discover, plan, €)
- Home: marca + CTA + lista de viajes; export/import/sync en «Más»
- TripPage: mapa + **días primero**; presupuesto/import/venues en «Más»
- DayPage: En ruta + timeline primero; caos/sugerencias en «Ajustar día»
- Pack offline del día; copiloto + Telegram; sync opcional

### Datos / APIs (sin Google Places de pago)
- Overpass (OSM, incl. nightlife) · Nominatim/Photon · Wikipedia · OSRM · Open-Meteo · OpenTripMap opcional
- Enlaces: web OSM, “reservar mesa” Google, Booking.com search

### Telegram (`telegram-bot` v6)
- Menú: ubicación · Restaurantes · Hoteles · Recomiéndame · Qué hay cerca · pines · ruta
- Docs setup: `docs/COPILOTO_TELEGRAM.md`

---

## Comercialización (dirección)

1. **Afiliados** (Booking / GetYourGuide / Civitatis) — más fácil al inicio  
2. **Freemium:** 1 viaje gratis; Pro = offline multi-día, sync, varios viajes  
3. Más adelante: city packs / white-label hoteles  

Métrica norte: uso **en destino** (En ruta / Maps / Telegram), no solo generar el plan en casa.

---

## Backlog siguiente (oleada 3)

### Servicios
- [ ] Afiliado Booking (`aid=`)
- [ ] GetYourGuide / Civitatis en actividades
- [ ] OpenTripMap key en prod
- [ ] Fotos de ciudad (hero del viaje)

### Optimizar
- [ ] Caché Overpass por destino
- [ ] Tiempos reales OSRM en legs
- [ ] Debounce búsqueda destino
- [ ] Telegram digests más cortos
- [ ] Deployment Protection off en production

### Ideas producto
- [ ] Modo «solo hoy» (GPS + gustos)
- [ ] Packs curados por ciudad
- [ ] Compartir día como story
- [ ] Freemium

### No ahora
- WhatsApp Business (caro)
- Ads invasivos
- Google Places de pago

---

## Entorno local

```bash
git clone https://github.com/miguelbr16/RutaDos.git
cd RutaDos
npm install
```

`.env` (gitignored):

```env
VITE_SUPABASE_URL=https://odecdpzcnsmvafvbuiby.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key>
VITE_TELEGRAM_BOT=RutaDosGuia_bot
# VITE_OPENTRIPMAP_KEY=
```

Secret solo en Supabase: `TELEGRAM_BOT_TOKEN`  
**Nunca** commitear token ni `.env`.

```bash
npm run dev
```

Deploy bot:

```bash
# MCP o CLI — siempre --no-verify-jwt / verify_jwt: false
supabase functions deploy telegram-bot --no-verify-jwt
```

---

## Archivos clave

| Ruta | Para qué |
|------|----------|
| `docs/PUNTO_SITUACION.md` | Este documento |
| `docs/COPILOTO_TELEGRAM.md` | Setup Telegram |
| `src/pages/WizardPage.tsx` | Wizard 3 pasos |
| `src/pages/HomePage.tsx` | Home sencillo |
| `src/pages/TripPage.tsx` | Días primero |
| `src/pages/DayPage.tsx` | Timeline + ajustar |
| `src/lib/discover.ts` | POIs / nightlife |
| `src/lib/prefPlan.ts` | Gustos → score |
| `src/lib/plan.ts` | Plan por días |
| `supabase/functions/telegram-bot/index.ts` | Bot |

---

## Nota para el asistente (Cursor)

- Path: carpeta `Projects/RutaDos` / repo **RutaDos**.  
- No redeployar el bot con JWT verificado.  
- No commitear `.env`, `_tg_*.txt/json`, tokens.  
- Si el usuario ve UI vieja: Redeploy Vercel + hard refresh / borrar caché PWA.  
- Preferencias solo rehace el plan al **generar** o **Ajustar gustos y ritmo → rearmar**.  
- Backup reciente UI: `backup/pre-wizard-3steps`.
