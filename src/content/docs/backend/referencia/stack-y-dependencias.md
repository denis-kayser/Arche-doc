---
title: Stack y dependencias
description: Qué hace cada paquete del package.json dentro del backend.
sidebar:
  order: 1
---

## Dependencias de producción

| Paquete | Rol en el proyecto |
|---|---|
| `express` | Framework HTTP — routers, middlewares, `app.ts` |
| `@prisma/client` + `@prisma/adapter-pg` | Cliente de base de datos tipado (ver [Base de datos](/backend/arquitectura/base-de-datos/)) |
| `pg` | Driver nativo de PostgreSQL, usado por el adapter de Prisma |
| `jsonwebtoken` | Firma/verificación de los dos tipos de JWT (ver [Autenticación y autorización](/backend/arquitectura/autenticacion-y-autorizacion/)) |
| `bcryptjs` | Hash y comparación de contraseñas (`signUpService`, `signInService`) |
| `zod` | Esquemas de validación de entrada, usados por `middleware/validate.ts` |
| `socket.io` | Servidor de WebSockets — sesiones activas en tiempo real (ver [Websockets](/backend/referencia/websockets/)) |
| `helmet` | Cabeceras HTTP de seguridad, montado global en `app.ts` |
| `morgan` | Logging de requests en desarrollo (`app.use(morgan('dev'))`) |
| `express-rate-limit` | Rate limiting en las rutas de `auth` (`authRateLimiter`) |
| `date-fns` / `date-fns-tz` | Formateo de fechas (por ejemplo el `expires_in` del token, en zona `America/Lima`) |
| `dotenv` | Carga `.env` en `config/config.ts` y `prisma.config.ts` |

## Dependencias declaradas pero sin uso real

Detectadas revisando los imports de todo `src/` — no rompen nada por estar ahí, pero no cumplen ninguna función hoy:

- **`express-jwt`** — la verificación de JWT se hace a mano con `jsonwebtoken` directo en `middleware/middleware.ts`, no con este paquete.
- **`cors`** — no hay ningún `app.use(cors())` en `app.ts`. Socket.IO sí define su propio `cors: { origin: '*' }` en `server.ts`, pero eso no depende de este paquete (es una opción nativa de `socket.io`).

## Dependencias de desarrollo

| Paquete | Rol |
|---|---|
| `typescript` | Todo el código fuente |
| `ts-node-dev` | Servidor de desarrollo con recarga automática (`npm run dev`) |
| `ts-node` | Ejecuta TypeScript directo (usado también por `prisma.config.ts`) |
| `prisma` | CLI — `prisma generate` (corre en `postinstall`) |
| `nodemon` | Presente en `devDependencies`, no referenciado en ningún script de `package.json` (el reload automático real lo hace `ts-node-dev`) |
| `@types/*` | Tipos de Node, Express, bcryptjs, cors, jsonwebtoken, morgan, pg |
