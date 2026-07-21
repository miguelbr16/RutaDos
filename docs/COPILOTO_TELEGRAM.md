# Copiloto RutaDos (Telegram gratis)

WhatsApp **no** ofrece bots gratis para producción. Telegram Bot API **sí es gratis**.

## Ya funciona sin bot

En la app: botón flotante azul de Telegram (o **Copiloto**) → **Empezar chat** → elegid opción.
Ubicación con GPS o pegando un link de Google Maps / Apple Maps.
Sin WhatsApp (API de pago).

## Bot de Telegram (opcional)

1. Hablad con [@BotFather](https://t.me/BotFather) → `/newbot` → copiad el token.
2. En Supabase SQL: ejecutad `migrations/004_telegram.sql` (hace falta también `002_trip_shares.sql`).
3. Secretos de la function:

```bash
supabase secrets set TELEGRAM_BOT_TOKEN=123:ABC
```

(Supabase ya inyecta `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` en edge functions.)

4. Desplegar:

```bash
supabase functions deploy telegram-bot --no-verify-jwt
```

5. Webhook:

```text
https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://<PROJECT>.supabase.co/functions/v1/telegram-bot
```

6. En RutaDos: **Compartir** el viaje → copiáis el token del link (`?share=TOKEN`).
7. En Telegram al bot: `/start TOKEN`
8. Mensajes: `ruta`, `qué toca`, `cómo llego`, o **ubicación** (clip 📎 → Ubicación).

El bot lee el viaje en Supabase (tiene que estar sincronizado con Pareja).
