---
title: Arquitectura por capas
description: Router, Controller, Service y Model - responsabilidad de cada capa y reglas para no mezclarlas.
sidebar:
  order: 1
---

Todo endpoint nuevo del backend sigue el mismo flujo de 4 capas:

```
Router → Controller → Service → Model → Base de datos
```

Cada capa tiene **una** responsabilidad, y las capas de arriba nunca se saltan una capa de abajo (un Controller nunca llama a un Model directamente, por ejemplo).

## Router

Solo define: método HTTP, ruta, middlewares (`validate`, `requireIdentity`, `requireRole`, rate limiters) y qué Controller atiende. Cero lógica.

```ts title="routers/auth/authRouter.ts"
router
  .post('/auth/sign-in-credentials', validate(signInCredentialsSchema), signInController.Credentials)
```

## Controller

Responsable de la comunicación HTTP: leer `req` (body/params/query/headers), invocar al Service, y construir la respuesta con `response.success`/`response.error`. Puede hacer validación de entrada simple (parsear un `:id`, por ejemplo), pero **no** lógica de negocio ni acceso a datos.

```ts title="controllers/auth/identifyUserController.ts"
export const identifyUserController = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await identifyUserService(email);
    return response.success(res, SuccessCode.SUCCESS, 'Usuario encontrado', user, 200);
  } catch (error) {
    next(error);
  }
}
```

## Service

Acá vive **toda** la regla de negocio: validaciones propias del dominio, decisiones (¿la contraseña coincide?, ¿el email ya existe?, ¿este usuario puede gestionar a ese otro?), y la orquestación de uno o varios Models. El Service no toca `req`/`res` ni sabe que existe HTTP.

```ts title="service/auth/authService.ts"
export const signInService = {
  Credentials: async (data) => {
    const user = await signInModel.Credentials(data.email);
    if (!user) return { ok: false, code: ErrorCode.INVALID_EMAIL, ... };

    const isMatch = await bcrypt.compare(data.password, user.password_hash ?? '');
    if (!isMatch) return { ok: false, code: ErrorCode.INVALID_PASSWORD, ... };

    return { ok: true, data: { ...user, accessToken: generateUserSessionToken(user.id) } };
  },
  ...
}
```

## Model

Solo acceso a datos: `SELECT`, `INSERT`, `UPDATE`, llamadas a funciones SQL. Nunca decide reglas de negocio ni construye respuestas HTTP — recibe parámetros ya resueltos y devuelve datos o `undefined`/`null`.

```ts title="models/auth/authModel.ts"
export const signInModel = {
  Credentials: async (email: string) => {
    return prisma.users.findFirst({
      where: { email, is_active: true, type_auth: 'CREDENTIALS' },
      select: { id: true, username: true, email: true, password_hash: true, image_url: true }
    });
  },
  ...
}
```

## Reglas duras

- **Una regla de negocio en el lugar equivocado es un bug de arquitectura**, aunque el endpoint funcione. Ejemplo real corregido en este proyecto: `authModel.ts` comparaba la contraseña con `bcrypt.compare` y decidía el código de error — eso se movió a `authService.ts`, dejando al Model solo con el `findFirst`.
- **No crear capas ni abstracciones que no hacen falta todavía.** Si un Service no tiene ninguna regla que aplicar (por ejemplo `catalogService.ts`, que hoy solo reenvía al Model), se deja así — es el lugar reservado para cuando aparezca una regla, no haya que inventarla antes de tiempo.
- **Reutilizar antes que duplicar**, pero nunca a costa de romper un endpoint existente: si reusar una función requeriría cambiar su comportamiento actual, se crea una función nueva en vez de tocar la existente.

## Tipos que cruzan capas

Cuando un tipo describe la forma de un dato que pasa de una capa a otra (lo que el Model le devuelve al Service, por ejemplo), vive en `src/types/<dominio>/`, con nombre — nunca declarado inline dentro del Model o el Service. Ver [Estructura de carpetas](/backend/arquitectura/estructura-carpetas/).
