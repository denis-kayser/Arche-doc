---
title: Estructura de carpetas
description: Cómo se organizan los archivos por capa y por dominio, y qué carpeta le corresponde a un tipo o un helper nuevo.
sidebar:
  order: 2
---

El backend organiza el código **por capa primero, por dominio adentro** (no al revés):

```
src/
  routers/<dominio>/       → definición de rutas
  controllers/<dominio>/   → HTTP: leer req, llamar al Service, responder
  service/<dominio>/       → reglas de negocio
  models/<dominio>/        → acceso a datos (Prisma / SQL)
  schemas/<dominio>/       → validación de entrada (Zod)
  types/<dominio>/         → tipos que cruzan capas dentro de ese dominio
  middleware/               → JWT, roles, rate limit, validación, manejo de errores
  constants/                 → ErrorCode, SuccessCode
  util/                      → helpers transversales sin estado (formateo de respuesta, clasificación de errores de BD, jerarquía de roles)
  config/                    → variables de entorno, cliente de Prisma
  socket/                    → servidor y store de Socket.IO
```

Cada dominio existente (`auth`, `users`, `sessions`, `catalogs`, `module`, `token`) repite ese mismo patrón. Agregar un dominio nuevo significa crear la misma carpeta en cada capa que la necesite — no todas las capas son obligatorias por dominio (por ejemplo `token` no tiene `models/`, porque generar un JWT no toca la base de datos).

## Dónde va un tipo nuevo

| El tipo... | Va en |
|---|---|
| Describe un dato que cruza de una capa a otra dentro de un dominio (lo que el Model le devuelve al Service, por ejemplo) | `types/<dominio>/` |
| Es compartido por más de un dominio (por ejemplo, la forma de un error con código: `AppError`) | `types/<algo-transversal>/`, no metido dentro de un dominio puntual |
| Es 100% interno a una sola función y nunca sale de ahí | Puede quedar inline, mejor si TypeScript lo infiere solo |

Ejemplo real: `types/auth/` (login, registro, JWT) está separado de `types/users/` (perfil de usuario) — antes vivían mezclados en el mismo archivo, lo cual hacía difícil saber qué tipo pertenecía a qué dominio.

## `util/` vs `service/<dominio>/`

`util/` es solo para helpers **sin estado y sin reglas de negocio con acceso a datos mezclado**. Si un helper hace una consulta a la base de datos *y* además decide algo de negocio con ese resultado, no es un "util" — esa lógica de negocio debería vivir en el `service/` del dominio que lo usa, y el acceso a datos en su `model/`.

## Convenciones de nombres

- Funciones como `const nombreClaro = async () => {}` — nombres identificables en stack traces, no `function() {}` anónimas ni arrow functions sin nombre.
- Cuando un dominio tiene varias variantes de una misma operación (por ejemplo `signIn` con `Credentials` y `Google`), se agrupan como métodos de un objeto: `signInService.Credentials`, `signInService.Google`. Cuando el dominio tiene una sola operación, se exporta una función simple (`identifyUserService`, `moduleController.getAllModule` es la excepción por consistencia con el resto de `auth`).
