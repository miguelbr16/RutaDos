# RutaDos — Punto de situación

**Fecha:** 21 jul 2026  
**Repo:** https://github.com/miguelbr16/RutaDos  
**App:** PWA pareja (B2C) — Vite + React + TypeScript + Supabase  
**UI:** español

---

## Fase actual

**MVP comercial B2C casi cerrado en código.**  
Pendiente de “producción usable”: webhook de Telegram (bloqueado por token), push/sync del repo si hay cambios locales, y vincular Vercel.

| Capa | Estado |
|------|--------|
| App web (plan viaje, mapa, pareja, copiloto in-app) | Hecho |
| Supabase (proyecto + migraciones 001–005) | Hecho |
| Edge Function `telegram-bot` | Desplegada y ACTIVE |
| Secret `TELEGRAM_BOT_TOKEN` en Supabase | Creído configurado (verificar) |
| Webhook Telegram → función | **NO** (falla 404 al setWebhook) |
| Vercel | **NO** vinculado aún |
| Partners / B2B | Solo stubs; **más adelante** |

---

## Qué es el producto (recordatorio)

App para **parejas** que planifican un viaje: destino, días, POIs, ruta, mapa, sync entre dos, y un **copiloto** (in-app + Telegram).

- **Prioridad:** B2C pareja primero. Hoteles/agencias después.
- **Sin WhatsApp** (bots de pago). Live copiloto = **Telegram**.
- El FAB azul abre la **app de Telegram** (`tg://` + fallback `t.me`), no solo el chat web.

---

## Qué ya está implementado

### App
- Wizard de viaje + resumen, hotel, presupuesto
- Descubrimiento POIs (OSM/Overpass; OpenTripMap opcional)
- Plan por días, editar paradas, Maps one-tap del día
- Modo “en ruta”, replan caos (tarde / lluvia / corto)
- Likes/dislikes, check-in (hecho / otro día / saltar)
- Notas (`userNotes`), fotos Wikimedia, link compartir (`trip_shares`)
- Pareja + sync Supabase
- Copiloto in-app (`src/lib/copilot.ts`, `src/pages/CopilotPage.tsx`)
- Offline del día activo, horarios de apertura, ajuste fino copiloto (cerrado / cola / tarde)
- PWA con caché

### Supabase
- **Project id:** `odecdpzcnsmvafvbuiby`
- **URL:** https://odecdpzcnsmvafvbuiby.supabase.co
- **Región:** eu-central-1
- Tablas: `couples`, `profiles`, `trips`, `trip_shares`, `partners`, `listings`, `telegram_chats`
- Migraciones en `supabase/migrations/` (001 → 005), aplicadas en remoto

### Telegram (código + deploy)
- Función: `supabase/functions/telegram-bot/index.ts`
- Deploy: **ACTIVE**, `verify_jwt: false` (necesario: Telegram no manda JWT de Supabase)
- Docs setup: `docs/COPILOTO_TELEGRAM.md`
- Capacidades previstas: ubicación, sitios cerca (OSM), marcar pines, ruta/transporte, abrir Google Maps  
  (Google **no** deja guardar en “Guardados” desde un bot)

---

## Bloqueo actual (Telegram webhook)

Al abrir:

```
https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://odecdpzcnsmvafvbuiby.supabase.co/functions/v1/telegram-bot
```

respuesta:

```json
{"ok":false,"error_code":404,"description":"Not Found"}
```

Eso es **Telegram rechazando el token**, no un fallo de Supabase/Vercel.

### Cómo desbloquearlo en casa

1. En [@BotFather](https://t.me/BotFather): copiar el **token** (formato `123456789:AAF...`), no el username.
2. Probar primero:

   ```
   https://api.telegram.org/botPEGAR_TOKEN_AQUI/getMe
   ```

   - Si `404` → token inválido / mal pegado / con `<>` / espacios.
   - Si `"ok":true` → anotar el `username` del bot.
3. Luego:

   ```
   https://api.telegram.org/botPEGAR_TOKEN_AQUI/setWebhook?url=https://odecdpzcnsmvafvbuiby.supabase.co/functions/v1/telegram-bot
   ```

   Esperado: `"ok":true`.
4. En `.env` local: `VITE_TELEGRAM_BOT=` ese username **sin @** (ej. `RutaDosGuia_bot`).
5. Confirmar en Supabase → Edge Functions → Secrets: `TELEGRAM_BOT_TOKEN` = el mismo token.
6. Probar: FAB → Telegram → `/start` → enviar ubicación.

**Nunca** subir el token a GitHub ni poner `VITE_TELEGRAM_BOT_TOKEN` en el front.

---

## Qué necesitás en el otro ordenador

### 1. Código
```bash
git clone https://github.com/miguelbr16/RutaDos.git
cd RutaDos
npm install
```

Si en este PC hay commits sin push, **antes de irte** (o desde aquí):

```bash
git status
git add .
# revisar que .env NO entre
git commit -m "..."
git push
```

### 2. Archivo `.env` (no está en Git; recrearlo)

```env
VITE_SUPABASE_URL=https://odecdpzcnsmvafvbuiby.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key del dashboard Supabase → Settings → API>
VITE_TELEGRAM_BOT=RutaDosGuia_bot
# opcional:
# VITE_OPENTRIPMAP_KEY=
```

- `VITE_TELEGRAM_BOT` = username del bot (sin `@`), no el token.
- Anon key: copiar del dashboard si no la tenés a mano.

### 3. Secretos solo en Supabase (no en `.env` de Vite)
- `TELEGRAM_BOT_TOKEN` = token de BotFather

### 4. Correr en local
```bash
npm run dev
```

---

## Vincular Vercel (pendiente)

1. [vercel.com](https://vercel.com) → Add New Project → importar `miguelbr16/RutaDos`
2. Framework Vite; ya hay `vercel.json` (`dist`, SPA rewrites)
3. Environment Variables (Production + Preview):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_TELEGRAM_BOT`
4. Deploy → cada push a `main` redeploya

El **bot no va por Vercel**; solo la web. El bot vive en Supabase Edge Functions.

---

## Ideas / backlog (después del webhook)

### Corto plazo (cerrar B2C)
- [ ] Webhook OK + prueba real en Telegram
- [ ] Push repo limpio + Vercel en marcha
- [ ] Alinear username BotFather ↔ `VITE_TELEGRAM_BOT`
- [ ] Probar pareja: sync viaje + `/start` con share token

### Producto pareja
- [ ] Pulir onboarding “dos personas / un plan”
- [ ] Mejorar mensajes del bot (español claro, menos texto)
- [ ] Avisos del día (qué toca, cómo llegar) cuando hay viaje sync

### Más adelante (no ahora)
- Partners / listings (hoteles, agencias) — stubs ya existen
- Monetización B2B
- OpenTripMap key si hace falta más calidad de POIs
- WhatsApp: **descartado** por coste

### Límite conocido
Google Maps no permite que un bot escriba en “Guardados”; el bot abre Maps y el usuario guarda a mano.

---

## Archivos clave

| Ruta | Para qué |
|------|----------|
| `docs/COPILOTO_TELEGRAM.md` | Setup Telegram |
| `docs/PUNTO_SITUACION.md` | Este documento |
| `supabase/functions/telegram-bot/index.ts` | Bot |
| `supabase/migrations/` | SQL ya aplicado en remoto |
| `src/lib/copilot.ts` | Copiloto + `openTelegramBot` |
| `src/pages/CopilotPage.tsx` | UI copiloto / FAB |
| `vercel.json` | Deploy Vercel |
| `.env` | Local only (gitignored) |

---

## Checklist “retomar en casa”

1. Clonar / pull del repo  
2. Crear `.env` con URL + anon + username bot  
3. `npm install` → `npm run dev`  
4. Arreglar token: `getMe` → `setWebhook` hasta `"ok":true`  
5. Confirmar secret `TELEGRAM_BOT_TOKEN` en Supabase  
6. Probar FAB → Telegram  
7. Conectar Vercel + variables de entorno  
8. Seguir con backlog corto plazo  

---

## Nota para el asistente (Cursor)

Proyecto path típico: carpeta `viajes` / repo `RutaDos`.  
No redeployar con JWT verificado: Telegram necesita `verify_jwt: false`.  
No commitear `.env` ni `recovery-codes.txt`.  
Fase: cerrar Telegram + Vercel; B2B después.
