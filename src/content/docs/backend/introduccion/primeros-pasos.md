---
title: Primeros pasos
description: Cómo levantar el backend de Arche en local - variables de entorno y scripts disponibles.
sidebar:
  order: 2
---

## Variables de entorno

El proyecto carga variables desde un archivo `.env` (vía `dotenv`, en `src/config/config.ts`). El repo trae un `.env.template` de referencia:

| Variable | Para qué | Obligatoria |
|---|---|---|
| `DATABASE_URL` | Connection string de PostgreSQL que usa Prisma (`postgresql://usuario:password@host:puerto/bd?schema=public`) | Sí |
| `JWT_SECRET` | Clave con la que se firman y verifican todos los JWT de la API | Sí |
| `API_PORT` | Puerto donde escucha el servidor HTTP | No (default `5000`) |

Si `DATABASE_URL` no está definida, `src/config/prisma.ts` no crea un cliente Prisma real: en su lugar arma un `Proxy` que lanza un error de conexión apenas se intenta usar. Esto evita que la app arranque "a medias" con un cliente roto en silencio — cualquier intento de tocar la base de datos falla explícitamente.

## Scripts (`package.json`)

| Script | Qué hace |
|---|---|
| `npm run dev` | Levanta el servidor en desarrollo con `ts-node-dev --respawn --transpile-only` (recarga automática al guardar) |
| `npm run build` | Compila TypeScript a `dist/` (`tsc`) |
| `npm start` | Corre el build compilado (`node dist/server.js`) |
| `npm run pm2:start` / `pm2:restart` / `pm2:stop` / `pm2:logs` / `pm2:delete` | Gestión del proceso en producción con PM2 |
| `npm run deploy` | `build` + reinicia (o arranca si no existía) el proceso de PM2 |
| `postinstall` (automático) | Corre `prisma generate` después de `npm install`, para regenerar el cliente tipado a partir de `prisma/schema.prisma` |

## Arrancar en local

```bash
npm install
# completar .env a partir de .env.template
npm run dev
```

El servidor queda escuchando en `http://localhost:5000` (o el puerto de `API_PORT`), con Socket.IO montado sobre el mismo `http.Server` (ver [Websockets](/backend/referencia/websockets/)).

Al arrancar, el proceso también limpia cualquier sesión que haya quedado marcada como activa de un arranque anterior (`closeAllStaleSessionsModel`) — el store de sockets en memoria siempre empieza vacío, así que esas sesiones son necesariamente "fantasma".
