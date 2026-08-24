---
title: Autenticación y autorización
description: Cómo verifica la API un JWT, y cómo resuelve la identidad y el rol de quien hace la petición. Mecanismo transversal usado por todos los módulos.
sidebar:
  order: 5
---

Esta página documenta el **mecanismo** que usan todos los dominios protegidos (`users`, `sessions`, y los que se agreguen después). Los endpoints concretos que *emiten* los tokens están documentados en [Módulos → Auth](/modulos/auth/vision-general/).

## Dos tipos de JWT

La API firma dos clases de token distintas con el mismo `JWT_SECRET`, `issuer: "Arche-api"` y `audience: "external-services"` — la diferencia está en el **payload**:

| | Token de aplicación | Token de sesión de usuario |
|---|---|---|
| Se emite en | `POST /auth/token` (público, sin credenciales) | Login exitoso (`sign-in-credentials` / `sign-in-google`) |
| Payload | `{}` (vacío) | `{ sub: "<id del usuario>" }` |
| Prueba | Que quien llama tiene *algún* token válido para hablar con la API | Que quien llama **es** ese usuario (pasó su contraseña o su Google) |
| Sirve para | Rutas que no necesitan saber quién eres (`/modules`, `/catalogs`...) | Rutas que sí necesitan saber quién eres (`requireIdentity`/`requireRole`) |

Ambos expiran a las 2 horas y se generan en `service/token/tokenService.ts` (`generateTokenService` / `generateUserSessionToken`).

## `authMiddleware` — verifica la firma, no decide quién eres

Montado en `app.ts` delante de **todas** las rutas privadas (`app.use('/api/v1', authMiddleware)`):

```ts title="middleware/middleware.ts"
const decoded = jwt.verify(token, JWT_SECRET, { issuer: "Arche-api", audience: "external-services" });
req.auth = typeof decoded === 'object' ? decoded : undefined;
next();
```

Solo confirma que la firma es válida y no expiró — deja lo que venga en el payload (vacío o con `sub`) disponible en `req.auth` para las capas siguientes.

## `requireIdentity` — exige saber quién eres, sin exigir un rol puntual

```ts title="middleware/requireIdentity.ts"
const userId = Number(req.auth?.sub)
// ... busca al usuario en BD, confirma is_active, y setea req.currentUser
```

Si el token usado fue el genérico de aplicación (payload vacío, sin `sub`), `userId` da `NaN` y la petición se rechaza con 401 — por diseño: una ruta con `requireIdentity` **necesita** el token de sesión de usuario, no el genérico.

La autorización fina (¿puedo ver/gestionar los datos de *otro* usuario?) no se resuelve acá — se resuelve en el `service` de cada dominio, típicamente comparando roles (ver `util/roleHierarchy.ts` y cómo lo usa `sessionService.ts`).

## `requireRole(allowedRoles)` — exige identidad y un rol específico

Mismo mecanismo de identidad que `requireIdentity`, y además busca el rol del usuario en la base de datos (siempre fresco, no guardado en el token — así un cambio de rol aplica de inmediato, sin esperar a que el token expire) y lo compara contra la lista permitida:

```ts title="middleware/requireRole.ts"
const roleDescription = (user.roles?.description ?? '').toUpperCase()
const isAllowed = allowedRoles.some((role) => role.toUpperCase() === roleDescription)
```

Ejemplo de uso: `POST /users/:userId/logout-all-devices` solo lo pueden llamar `SUPER ADMIN`, `ADMIN` o `SOPORTE` (`userRouter.ts`).

## Por qué el id vive en el JWT y no en un header

Antes, la identidad se resolvía leyendo un header `x-user-id` puesto por el frontend, sin ninguna verificación — cualquier cliente podía escribir ese header a mano y ser tratado como cualquier usuario, incluyendo uno con rol `SUPER ADMIN`. El fix fue mover el id al payload del JWT firmado en el login: falsificarlo sin conocer `JWT_SECRET` es inviable, mientras que un header de texto plano no prueba nada por sí solo.

:::caution[Pendiente conocido]
`GET /users` y `PATCH /users/:id` todavía no tienen `requireIdentity`/`requireRole` — solo exigen el token de aplicación (que es público y gratuito de obtener). Cualquiera con ese token puede listar todos los usuarios o editar el perfil de cualquiera. Está identificado, no arreglado todavía.
:::
