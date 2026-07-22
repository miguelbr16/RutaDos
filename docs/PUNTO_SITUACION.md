# RutaDos — Punto de situación

**Fecha:** 22 jul 2026  
**Repo:** https://github.com/miguelbr16/RutaDos (`main` @ `e2df23c`)  
**App:** PWA mobile-first — Vite + React + TypeScript + Supabase  
**UI:** español  
**Bot:** [@RutaDosGuia_bot](https://t.me/RutaDosGuia_bot)  
**Supabase:** `odecdpzcnsmvafvbuiby` · https://odecdpzcnsmvafvbuiby.supabase.co  
**Vercel:** proyecto **ruta-dos** / RutaDos (auto-deploy en push; a veces hace falta Redeploy manual)

---

## Posicionamiento (actualizado)

No es solo “app de parejas”. Sirve **solo o con alguien**; sync/pareja es **opcional**.

Propuesta: plan diario personal (1–2) con mapa, transporte, offline del día y compañero in situ (app + Telegram).

---

## Fase actual

**Producto usable en web + Telegram.** Gustos influyen en generación; wizard visual; días con timeline; Cansados / Restaurantes / Hoteles; bot v6 con enlaces Web/Reservar/Booking.

| Capa | Estado |
|------|--------|
| App web (wizard, días, mapa, offline, copiloto) | Hecho · en `main` |
| Preferencias → discover / plan / presupuesto | Hecho |
| Wizard visual (presets + buckets, sin muro de chips) | Hecho (`b7dc13d`) |
| Fichas de días (mini timeline) | Hecho (`e2df23c`) — si ves UI vieja (“Check-in”), redeploy / hard refresh |
| Cansados (día corto + panel café) | Hecho (`9c4b109`) |
| Restaurantes / Hoteles + Web · Reservar · Booking | Hecho (app + Telegram) |
| Meteo del día (Open-Meteo) | Hecho |
| Supabase (migraciones + sync) | Hecho |
| Edge Function `telegram-bot` | **ACTIVE v6**, `verify_jwt: false` |
| Webhook Telegram | Configurado (si falla: revisar token en Secrets) |
| Vercel | Vinculado; a veces Redeploy manual |
| Partners / B2B / afiliados formales | Stubs / Booking search sin `aid` aún |

---

## Backups git (revertir)

| Qué | Ref |
|-----|-----|
| Antes visual día + offline | `backup/pre-day-visual-offline` · tag `backup-pre-day-visual-offline` |
| Antes wizard visual | `backup/pre-wizard-visual` · tag `backup-pre-wizard-visual` |

```bash
git reset --hard backup/pre-wizard-visual
# o
git reset --hard backup/pre-day-visual-offline
```

(Si ya pusheaste, hace falta force-with-lease con cuidado.)

---

## Qué está implementado

### App
- Wizard 5 pasos: destino → llegada/hotel → gustos (presets + 4 categorías + afinar) → ritmo (style packs + pills) → resumen
- Preferencias vacías al empezar; hay que elegir (influyen en discover, plan, €)
- TripPage: fichas día con mini timeline numerada, Maps / En ruta
- DayPage: timeline visual, meteo, Cansados, Restaurantes, Hoteles, offline pack
- En ruta: check-in, Cansados con cafés cerca
- Pack offline del día (transporte, minutos, Maps)
- Copiloto in-app + FAB → Telegram
- Sync opcional (Pareja / settings)

### Datos / APIs (sin Google Places de pago)
- Overpass (OSM) · Nominatim/Photon · Wikipedia · OSRM · Open-Meteo · OpenTripMap opcional
- Enlaces: web OSM, “reservar mesa” Google, Booking.com search

### Telegram (`telegram-bot` v6)
- Menú: ubicación · **Restaurantes** · **Hoteles** · Recomiéndame · Qué hay cerca · pines · ruta / qué toca / cómo llego
- Prioriza sitios con web OSM; botones inline Web / Reservar / Booking
- In situ sin viaje OK; plan del día necesita `/start TOKEN` tras Compartir
- Dedup `update_id` + cooldown ~20s (evita bucle de recomendaciones)
- Docs setup: `docs/COPILOTO_TELEGRAM.md`

---

## Comercialización (dirección)

1. **Afiliados** (Booking / GetYourGuide / Civitatis) — más fácil al inicio  
2. **Freemium:** 1 viaje gratis; Pro = offline multi-día, sync, varios viajes  
3. Más adelante: city packs / white-label hoteles  

Métrica norte: uso **en destino** (En ruta / Maps / Telegram), no solo generar el plan en casa.

---

## Backlog siguiente

### Corto
- [ ] Pack offline más visible en home del viaje
- [ ] Enlaces reserva museos cuando haya URL OSM
- [ ] Telegram: digests más cortos del día
- [ ] Confirmar Vercel siempre al día (Redeploy si UI vieja)
- [ ] Afiliado Booking (`aid=`) cuando haya cuenta

### Medio
- [ ] Partners / listings reales
- [ ] Mejor calidad POIs (OpenTripMap key / más filtros)
- [ ] Soften copy “Pareja” restante en Auth/Settings

### No ahora
- WhatsApp Business (caro)
- Ads invasivos

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
| `src/pages/WizardPage.tsx` | Wizard visual |
| `src/pages/TripPage.tsx` | Fichas de días |
| `src/pages/DayPage.tsx` | Día + Cansados / venues |
| `src/components/TiredPanel.tsx` | Panel cafés cansados |
| `src/components/VenueFinder.tsx` | Restaurantes / hoteles |
| `src/lib/bookingLinks.ts` | Web / reservar / Booking |
| `src/lib/nearbyVenues.ts` | OSM venues |
| `src/lib/prefPlan.ts` | Gustos → plan |
| `src/lib/weather.ts` | Meteo |
| `src/lib/offlineDay.ts` | Pack offline |
| `supabase/functions/telegram-bot/index.ts` | Bot |

---

## Nota para el asistente (Cursor)

- Path: carpeta `viajes` / repo **RutaDos**.  
- No redeployar el bot con JWT verificado.  
- No commitear `.env`, `_tg_*.txt/json`, tokens.  
- Si el usuario ve UI con “Check-in” / “llegada suave”: build viejo → Redeploy Vercel + hard refresh.  
- Preferencias solo rehace el plan al **generar** o **Ajustar gustos y ritmo → rearmar**.
