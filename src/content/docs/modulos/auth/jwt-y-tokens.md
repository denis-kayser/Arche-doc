---
title: JWT y tokens
description: Cómo y dónde se generan los dos tipos de JWT que emite el dominio auth.
sidebar:
  order: 3
---

Esta página cubre **qué genera cada endpoint de auth**. Para cómo el resto de la API *verifica* esos tokens (`authMiddleware`, `requireIdentity`, `requireRole`), ver [Autenticación y autorización](/arquitectura/autenticacion-y-autorizacion/).

## `generateTokenService()` — token de aplicación

```ts title="service/token/tokenService.ts"
export const generateTokenService = () => {
  if (!JWT_SECRET) throw new Error('JWT_SECRET no está configurado');
  const payload = {}; // vacío a propósito
  const token = jwt.sign(payload, JWT_SECRET, {
    expiresIn: "2h",
    issuer: "Arche-api",
    audience: "external-services"
  });
  return { access_token: token, expires_in: /* formateado con date-fns-tz, America/Lima */ };
};
```

Lo usa únicamente `tokenController.ts`, detrás de `POST /auth/token`. El payload vacío es intencional: este token prueba que quien llama tiene *algún* token válido, no *quién* es. No requiere ningún dato de entrada.

## `generateUserSessionToken(userId)` — token de sesión

```ts title="service/token/tokenService.ts"
export const generateUserSessionToken = (userId: number): string => {
  if (!JWT_SECRET) throw new Error('JWT_SECRET no está configurado');
  return jwt.sign({ sub: String(userId) }, JWT_SECRET, {
    expiresIn: "2h",
    issuer: "Arche-api",
    audience: "external-services"
  });
};
```

Se llama desde `authService.ts`, **después** de verificar la identidad real del usuario:

```ts title="service/auth/authService.ts"
// sign-in-credentials, después de bcrypt.compare exitoso:
data: { id: user.id, name: ..., email: ..., imageUrl: ..., accessToken: generateUserSessionToken(user.id) }

// sign-in-google, después de encontrar al usuario:
return { ...user, accessToken: generateUserSessionToken(user.id) }
```

El claim `sub` (subject, estándar de JWT) lleva el id del usuario **como string**. Es lo único que distingue a este token del genérico — misma firma, mismo `issuer`/`audience`, misma expiración de 2 horas.

## Qué endpoints emiten cada token

| Endpoint | Token que emite | Lleva `sub` |
|---|---|---|
| `POST /auth/token` | Aplicación | No |
| `POST /auth/sign-in-credentials` (login exitoso) | Sesión | Sí |
| `POST /auth/sign-in-google` (login exitoso) | Sesión | Sí |
| `POST /auth/sign-up-*` | Ninguno — el registro no loguea automáticamente, hay que llamar a `sign-in-*` después | — |

## Cómo debería usarlo un cliente

1. Al arrancar, pedir el token de aplicación (`POST /auth/token`) y usarlo como `Authorization: Bearer` para todo lo que no necesite identidad (por ejemplo `GET /modules`).
2. Al loguearse (`sign-in-credentials`/`sign-in-google`), guardar el `accessToken` de la respuesta.
3. Para cualquier ruta protegida con `requireIdentity`/`requireRole` (por ejemplo `/sessions`), usar **ese** `accessToken` como `Authorization: Bearer` — no el genérico. El backend rechaza con 401 si el token no trae `sub`.
