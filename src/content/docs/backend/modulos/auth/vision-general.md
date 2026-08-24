---
title: Auth — visión general
description: Qué resuelve el dominio auth, qué archivos lo componen y cómo se relaciona con el resto de la API.
sidebar:
  order: 1
---

El dominio **auth** resuelve tres cosas: registrar usuarios, autenticarlos (con contraseña o con Google), y emitir los JWT que el resto de la API usa para verificar peticiones. No incluye la gestión del perfil ya logueado (eso es el dominio `users`) ni las sesiones activas por dispositivo (eso es `sessions`).

## Archivos del dominio

| Capa | Archivo | Contiene |
|---|---|---|
| Router | `routers/auth/authRouter.ts` | Las 6 rutas de este dominio, todas bajo `authRateLimiter` |
| Router | `routers/token/tokenRouter.ts` | `POST /auth/token` (vive en su propia carpeta porque no genera identidad, ver [JWT y tokens](/backend/modulos/auth/jwt-y-tokens/)) |
| Controller | `controllers/auth/signInController.ts` | `Credentials`, `Google` |
| Controller | `controllers/auth/signUpController.ts` | `Credentials`, `Google` |
| Controller | `controllers/auth/identifyUserController.ts` | Búsqueda de usuario por email |
| Controller | `controllers/token/tokenController.ts` | Emisión del token de aplicación |
| Service | `service/auth/authService.ts` | `signInService`, `signUpService`, `identifyUserService` |
| Service | `service/token/tokenService.ts` | `generateTokenService`, `generateUserSessionToken` |
| Model | `models/auth/authModel.ts` | `signInModel`, `signUpModel`, `identifyUserModel` |
| Schema | `schemas/auth/authSchemas.ts` | Validación Zod de cada endpoint |
| Types | `types/auth/user.ts`, `types/auth/register.ts` | Tipos que cruzan capas dentro de este dominio |

## Todas las rutas son públicas

Ningún endpoint de `auth` pasa por `authMiddleware` — están montados en `app.ts` **antes** del middleware que exige JWT (tiene sentido: para loguearte todavía no tenés un token). La única protección es el rate limiter, y está desactivado en desarrollo (`NODE_ENV !== 'production'`).

## Dónde vive cada regla de negocio

Siguiendo la arquitectura del proyecto ([ver Capas](/backend/arquitectura/capas/)), el Model de este dominio solo hace `SELECT`/`INSERT` — toda decisión (¿la contraseña es correcta?, ¿el email ya existe?, ¿qué token generar?) vive en `authService.ts`. Esto no siempre fue así: originalmente `authModel.ts` comparaba contraseñas con `bcrypt` y decidía códigos de error — se refactorizó para que el Model solo consulte datos.

Ver el detalle endpoint por endpoint en [Endpoints](/backend/modulos/auth/endpoints/), y cómo funciona el JWT que emite el login en [JWT y tokens](/backend/modulos/auth/jwt-y-tokens/).
