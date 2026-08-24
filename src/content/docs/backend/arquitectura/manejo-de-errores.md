---
title: Manejo de errores y formato de respuesta
description: Shape de las respuestas de la API, códigos de error/éxito, y cómo el errorHandler central clasifica los errores.
sidebar:
  order: 4
---

## Formato de respuesta

Todas las respuestas (éxito y error) siguen el mismo shape, construido por `util/response.ts`:

```ts
interface ApiResponse<T> {
  ok: boolean;
  code: SuccessCode | ErrorCode;
  message: string;
  data: T | [];
}
```

```ts title="util/response.ts"
response.success(res, SuccessCode.SUCCESS, 'Usuario encontrado', data, 200)
response.error(res, ErrorCode.USER_NOT_FOUND, 'Usuario no encontrado', 404)
```

Los Controllers nunca arman el JSON de la respuesta a mano — siempre pasan por `response.success`/`response.error`.

## Cómo se propaga un error hasta el `errorHandler`

Los Controllers no capturan errores de negocio con `try/catch` para responder ellos mismos: los Services lanzan un error tipado y el Controller lo reenvía con `next(error)`. El middleware `errorHandler` (montado al final de `app.ts`) es el único lugar que decide el status HTTP.

```ts title="service/auth/authService.ts"
const error: AppError = new Error('Usuario no encontrado');
error.code = ErrorCode.USER_NOT_FOUND;
throw error;
```

`AppError` (`types/errors/appError.ts`) es el tipo compartido para esto: `Error & { code?: ErrorCode }`. Se usa en cualquier Service que necesite lanzar un error con código, en vez de repetir la intersección de tipos en cada archivo.

## `errorHandler` — la única fuente de verdad para el status HTTP

```ts title="middleware/errorHandler.ts"
const STATUS_BY_ERROR_CODE: Partial<Record<ErrorCode, number>> = {
  [ErrorCode.VALIDATION_ERROR]: 400,
  [ErrorCode.INVALID_PASSWORD]: 401,
  [ErrorCode.FORBIDDEN]: 403,
  [ErrorCode.USER_NOT_FOUND]: 404,
  [ErrorCode.DUPLICATE_EMAIL]: 409,
  [ErrorCode.DATABASE_CONNECTION_ERROR]: 503,
  // ...
}
```

Orden de resolución dentro de `errorHandler`:

1. **`ZodError`** (falló la validación de `middleware/validate.ts`) → 400, con los mensajes de cada campo unidos.
2. **Error de base de datos** (`util/errors.ts` → `isDatabaseError`) → clasificado por `getDatabaseErrorCode` (según sea `PrismaClientKnownRequestError`, `PrismaClientInitializationError`, etc., o el mensaje de conexión del Proxy de `config/prisma.ts`) → 503.
3. **Error con `.code`** (un `AppError` lanzado desde un Service) → busca el status en `STATUS_BY_ERROR_CODE`.
4. Cualquier otro error → `ErrorCode.INTERNAL_ERROR`, 500.

## Catálogo de códigos

`constants/errorCodes.ts` y `constants/successCodes.ts` son los enums de códigos. `errorCodes.ts` incluye bastantes códigos que todavía no se usan en ningún endpoint (catálogo pensado para crecer) — al agregar lógica nueva, conviene revisar primero si el código que se necesita ya existe ahí antes de crear uno nuevo.
