---
title: Endpoints de Auth
description: Request y response de cada endpoint del dominio auth, con sus códigos de error.
sidebar:
  order: 2
---

Base path: `/api/v1`. Todas las rutas de esta página están detrás de `authRateLimiter` (desactivado en desarrollo). El campo **Autenticación** de cada endpoint indica qué necesita esa ruta puntual — no asumas que todos los endpoints de un módulo comparten el mismo requisito.

## `POST /auth/sign-up-credentials`

Registra un usuario nuevo con email y contraseña.

**Autenticación:** ninguna (ruta pública).

**Request** — body (`signUpCredentialsSchema`):

| Campo | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `name` | string | Sí | Mínimo 1 carácter |
| `email` | string | Sí | Formato de email válido |
| `password` | string | Sí | Mínimo 6 caracteres |
| `rolID` | number | No | Id de rol a asignar; si se omite, el registro queda sin rol |

**Responses**

| Status | `code` | Cuándo |
|---|---|---|
| 201 | `SUCCESS` | Usuario creado |
| 409 | `DUPLICATE_EMAIL` | Ya existe un usuario con ese email |
| 400 | `VALIDATION_ERROR` | Falta un campo, password &lt; 6 caracteres, email inválido |

```json title="201 - éxito"
{ "ok": true, "code": "SUCCESS", "message": "Usuario registrado correctamente", "data": null }
```

**Notas:** el email se normaliza (`trim` + `lowercase`) antes de chequear duplicados. Este endpoint no loguea automáticamente — hay que llamar a `sign-in-credentials` después para obtener un `accessToken`.

---

## `POST /auth/sign-up-google`

Registra un usuario nuevo autenticado con Google.

**Autenticación:** ninguna (ruta pública).

**Request** — body (`signUpGoogleSchema`):

| Campo | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `name` | string | Sí | Mínimo 1 carácter |
| `email` | string | Sí | Formato de email válido |
| `imageUrl` | string | Sí | URL del avatar de Google |
| `authID` | string | Sí | `sub` de la cuenta de Google |

**Responses**

| Status | `code` | Cuándo |
|---|---|---|
| 201 | `SUCCESS` | Usuario creado |
| 409 | `DUPLICATE_EMAIL` | Ya existe un usuario con ese email, o con ese `authID` + `type_auth: 'GOOGLE'` |
| 400 | `VALIDATION_ERROR` | Falta un campo o formato inválido |

```json title="201 - éxito"
{ "ok": true, "code": "SUCCESS", "message": "Usuario registrado correctamente", "data": null }
```

---

## `POST /auth/sign-in-credentials`

Inicia sesión con email y contraseña.

**Autenticación:** ninguna (ruta pública).

**Request** — body (`signInCredentialsSchema`):

| Campo | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `email` | string | Sí | Formato de email válido |
| `password` | string | Sí | Mínimo 1 carácter |

**Responses**

| Status | `code` | Cuándo |
|---|---|---|
| 200 | `SUCCESS` | Login correcto |
| 200 | `INVALID_EMAIL` | No existe un usuario `CREDENTIALS` activo con ese email |
| 200 | `INVALID_PASSWORD` | El email existe pero la contraseña no coincide |
| 400 | `VALIDATION_ERROR` | Falta un campo o formato inválido |

```json title="200 - éxito"
{
  "ok": true,
  "code": "SUCCESS",
  "message": "Inicio de sesión exitoso",
  "data": {
    "id": 13,
    "name": "JWT Demo",
    "email": "usuario@example.com",
    "imageUrl": "",
    "accessToken": "eyJhbGciOi..."
  }
}
```

```json title="200 - contraseña incorrecta"
{ "ok": false, "code": "INVALID_PASSWORD", "message": "Contraseña incorrecta", "data": [] }
```

:::caution[Este endpoint responde siempre con status 200]
A diferencia del resto de la API, `signInController.Credentials` devuelve **status HTTP 200 tanto en éxito como en fallo lógico** — el `ok:false` va en el body, no en el status. Hay que revisar `ok`/`code`, no solo el status code.
:::

`accessToken` es el JWT de sesión firmado con el id real del usuario — ver [JWT y tokens](/modulos/auth/jwt-y-tokens/).

---

## `POST /auth/sign-in-google`

Inicia sesión con una cuenta de Google ya registrada.

**Autenticación:** ninguna (ruta pública).

**Request** — body (`signInGoogleSchema`):

| Campo | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `email` | string | Sí | Formato de email válido |
| `authID` | string | Sí | `sub` de la cuenta de Google |

**Responses**

| Status | `code` | Cuándo |
|---|---|---|
| 200 | `SUCCESS` | Login correcto (acá sí sigue el patrón normal: fallo ≠ 200) |
| 404 | `USER_NOT_FOUND` | No existe un usuario activo con ese `email` + `authID` + `type_auth: 'GOOGLE'` |
| 400 | `VALIDATION_ERROR` | Falta un campo o formato inválido |

```json title="200 - éxito"
{
  "ok": true,
  "code": "SUCCESS",
  "message": "Usuario logueado correctamente",
  "data": {
    "id": 13,
    "name": "...",
    "email": "...",
    "imageUrl": "...",
    "typeAuth": "GOOGLE",
    "accessToken": "eyJhbGciOi..."
  }
}
```

---

## `POST /auth/token`

Emite el **token de aplicación** (sin identidad de usuario).

**Autenticación:** ninguna. No requiere body.

**Request:** sin campos.

**Responses**

| Status | `code` | Cuándo |
|---|---|---|
| 200 | `TOKEN_GENERATED` | Siempre, salvo error de configuración |
| 500 | `INTERNAL_ERROR` | `JWT_SECRET` no está configurado en el servidor |

```json title="200 - éxito"
{
  "ok": true,
  "code": "TOKEN_GENERATED",
  "message": "Autenticación exitosa",
  "data": { "access_token": "eyJhbGciOi...", "expires_in": "2026-08-23 08:01:02" }
}
```

Ver la diferencia entre este token y el de sesión de usuario en [JWT y tokens](/modulos/auth/jwt-y-tokens/).

---

## `POST /auth/identify-user`

Busca un usuario por email — no valida contraseña, solo confirma si existe.

**Autenticación:** ninguna (ruta pública).

**Request** — body (`identifyUserSchema`):

| Campo | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `email` | string | Sí | Formato de email válido |

**Responses**

| Status | `code` | Cuándo |
|---|---|---|
| 200 | `SUCCESS` | Existe un usuario con ese email |
| 404 | `USER_NOT_FOUND` | No existe ningún usuario con ese email |
| 400 | `VALIDATION_ERROR` | Email con formato inválido |

```json title="200 - éxito"
{
  "ok": true,
  "code": "SUCCESS",
  "message": "Usuario encontrado",
  "data": {
    "id": 13,
    "name": "...",
    "rolId": 2,
    "isActive": true,
    "email": "...",
    "imageUrl": "...",
    "authID": null,
    "typeAuth": "CREDENTIALS"
  }
}
```
