# Copiloto RutaDos en Telegram (gratis)

El botón azul de la app **abre Telegram** (app nativa con `tg://`, fallback `t.me`).

WhatsApp bots **no** son gratis. Telegram Bot API **sí**.

## Qué puede hacer el bot

| Pedís | Qué hace |
|--------|-----------|
| 📍 Ubicación | La guarda y busca sitios cerca (viaje + OpenStreetMap) |
| Botones ➕ | Marcáis pines (monumentos / sitios) |
| Ruta / Qué toca / Cómo llego | Plan del viaje + link de transporte en Maps |
| Abrir en Google Maps | Ruta multi-parada (vosotros + pines + plan) |
| Venues en Telegram | Pines en el mapa nativo de Telegram |

## Límite importante (Google)

**No se pueden guardar pines en “Guardados” de Google Maps desde un bot.** Google no lo permite.
El bot abre Maps con la ruta; ahí vosotros podéis guardar / My Maps / compartir.

## Setup

1. [@BotFather](https://t.me/BotFather) → `/newbot` → token + **username**.
2. En la app (`.env`):
   ```
   VITE_TELEGRAM_BOT=TuBotSinArroba
   ```
3. Supabase SQL: `002_trip_shares.sql`, `004_telegram.sql`, `005_telegram_state.sql`.
4. Secret:
   ```bash
   supabase secrets set TELEGRAM_BOT_TOKEN=123:ABC
   ```
5. Deploy:
   ```bash
   supabase functions deploy telegram-bot --no-verify-jwt
   ```
6. Webhook:
   ```
   https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://<PROJECT>.supabase.co/functions/v1/telegram-bot
   ```
7. Uso:
   - Botón azul en RutaDos → abre Telegram.
   - Opcional: Compartir viaje → `/start TOKEN` en el bot para enlazar el plan.
   - Sin viaje: ubicación → cerca → marcar → Maps.

## Viaje sync

Para “ruta de hoy / qué toca” el viaje debe estar en Supabase (Pareja + sync).
