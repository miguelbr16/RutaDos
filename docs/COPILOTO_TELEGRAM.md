# Copiloto RutaDos en Telegram (gratis)

El botón de la app **abre Telegram** (app nativa con `tg://`, fallback `t.me`).

Bot público: **[@RutaDosGuia_bot](https://t.me/RutaDosGuia_bot)**  
WhatsApp bots **no** son gratis. Telegram Bot API **sí**.

Edge Function: `telegram-bot` (Supabase) · **`verify_jwt: false`** · versión reciente **v6**.

## Qué puede hacer el bot

| Pedís | Qué hace |
|--------|-----------|
| 📍 Ubicación | Guarda posición y recomienda sitios **in situ** (con o sin viaje) |
| ✨ Recomiéndame | Atracciones / mix cerca |
| 🍽 **Restaurantes** | Restaurantes OSM cerca; prioriza con **web**; botones **Web** / **Reservar** |
| 🏨 **Hoteles** | Hoteles OSM; **Web** / **Booking**; si hay hotel del viaje, link Booking |
| 📍 Qué hay cerca | Monumentos / turismo |
| Botones ➕ | Marcar pines → Abrir en Google Maps |
| Ruta / Qué toca / Cómo llego | Solo con viaje enlazado (`/start TOKEN`) |
| Abrir en Google Maps | Ruta con pines (+ plan si hay viaje) |

## Cómo se arman los enlaces

- Si OSM tiene `website` / `contact:website` → botón **Web** (y Reservar si es TheFork/OpenTable/etc.)
- Si no hay web de reserva → Google “reservar mesa {nombre}”
- Hoteles sin web → búsqueda en **Booking.com** (aún sin afiliado `aid`)

## Límite importante (Google)

**No se pueden guardar pines en “Guardados” de Google Maps desde un bot.**  
El bot abre Maps; ahí podéis guardar / My Maps / compartir.

## Setup

1. [@BotFather](https://t.me/BotFather) → token + **username**.
2. En la app (`.env`):
   ```
   VITE_TELEGRAM_BOT=RutaDosGuia_bot
   ```
   (username **sin** `@`; **nunca** el token en Vite)
3. Supabase SQL: migraciones `002_trip_shares`, `004_telegram`, `005_telegram_state` (y resto del proyecto).
4. Secret:
   ```bash
   supabase secrets set TELEGRAM_BOT_TOKEN=123:ABC
   ```
5. Deploy (**sin JWT**):
   ```bash
   supabase functions deploy telegram-bot --no-verify-jwt
   ```
   O vía MCP `deploy_edge_function` con `verify_jwt: false`.
6. Webhook:
   ```
   https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://odecdpzcnsmvafvbuiby.supabase.co/functions/v1/telegram-bot
   ```
7. Uso:
   - App → abrir Telegram.
   - Sin viaje: ubicación → Restaurantes / Hoteles / Recomiéndame.
   - Con plan: Compartir en RutaDos → `/start TOKEN` en el bot.

## Viaje sync

Para “ruta de hoy / qué toca” el viaje debe estar en Supabase (sync) y el chat enlazado con el token de Compartir.

## Antispam

El bot responde `200` rápido, procesa en background, deduplica `update_id` y aplica cooldown ~20s en “recomienda” genérico. Los botones Restaurantes/Hoteles fuerzan búsqueda nueva.

## Ver también

- Estado del producto: [`docs/PUNTO_SITUACION.md`](PUNTO_SITUACION.md)
- Código: `supabase/functions/telegram-bot/index.ts`
