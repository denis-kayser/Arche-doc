---
title: Base de datos y cadena de conexión
description: Cómo se conecta el backend a PostgreSQL, y por qué las lecturas usan Prisma pero las escrituras pasan por funciones SQL.
sidebar:
  order: 3
---

## Cadena de conexión

```
Request (Model)
  → Prisma Client (prisma/schema.prisma, generado en postinstall)
  → @prisma/adapter-pg (PrismaPg)
  → pg (driver nativo de PostgreSQL)
  → PostgreSQL
```

`src/config/prisma.ts` arma el cliente una sola vez, como singleton, a partir de `DATABASE_URL`:

```ts title="src/config/prisma.ts"
export const prisma: PrismaClient = hasDatabaseUrl
  ? new PrismaClient({ adapter: new PrismaPg({ connectionString: DATABASE_URL }) })
  : new Proxy({} as PrismaClient, {
      get() { throw new Error(DB_CONNECTION_ERROR_MESSAGE) }
    })
```

Si `DATABASE_URL` no está configurada, no se crea un cliente roto en silencio: se arma un `Proxy` que lanza el error `"No se puede conectar a la base de datos"` apenas algo intenta usar `prisma.lo-que-sea`. Ese mensaje es la constante `DB_CONNECTION_ERROR_MESSAGE`, y es lo que `util/errors.ts` reconoce para clasificar el error como `DATABASE_CONNECTION_ERROR` (ver [Manejo de errores](/backend/arquitectura/manejo-de-errores/)).

Todos los `models/<dominio>/*.ts` importan ese mismo `prisma` desde `config/prisma.ts` — no hay un cliente por dominio.

## Prisma no administra el schema

No existe `prisma/migrations/`. El schema de la base de datos (`prisma/schema.prisma`) se generó por introspección sobre una base ya existente, administrada a mano con SQL (`sql/functions/`, `sql/procedures/`, `src/config/tablaBD.sql`). Prisma acá cumple el rol de **cliente tipado sobre un schema externo**, no de dueño del schema.

## La regla: lecturas con Prisma, escrituras con funciones SQL

Es una regla aplicada sin excepciones en todo el proyecto (verificado sobre el 100% de las queries del código):

- **Lecturas (`SELECT`)** → siempre con el API de Prisma: `.findFirst`, `.findMany`, `.findUnique`.
- **Escrituras (`INSERT`/`UPDATE`/cambios de estado)** → siempre a través de una función de PostgreSQL (`ft_*`, en `sql/functions/`), invocada con `prisma.$queryRaw`/`$executeRaw`. Nunca `.create()`, `.update()` ni `.delete()` de Prisma.

```ts title="models/auth/authModel.ts — lectura"
return prisma.users.findFirst({ where: { email }, select: {...} });
```

```ts title="models/auth/authModel.ts — escritura"
await prisma.$queryRaw`
  SELECT * FROM ft_register_user(${name}::varchar, ${email}::varchar, ...)
`;
```

### Por qué

Documentado en los propios comentarios de los archivos `.sql`:

1. **Timestamps calculados en la base de datos, no en Node** — evita desfases de zona horaria entre el proceso Node y el servidor de BD.
2. **Atomicidad de la regla de negocio** — por ejemplo `ft_register_user` verifica "¿el email ya existe?" e inserta, dentro de la misma función, evitando una condición de carrera entre leer y escribir en dos pasos separados desde TypeScript.
3. **Columnas con nombres problemáticos** — por ejemplo `roles.updated_At` (con mayúscula), que se maneja directo en SQL sin depender del mapeo de Prisma.
4. **`RETURNING *` / `RETURNS SETOF`** — la función devuelve la fila ya insertada/actualizada en la misma llamada.

La única excepción es `pingModel.ts` (`SELECT 1`), que no es parte de esta regla de negocio — es un chequeo de conectividad, no toca ninguna tabla.

## ¿Por qué seguir usando Prisma entonces?

Aunque las escrituras no usan el query builder de Prisma, Prisma sigue siendo el motor real de ejecución también ahí: mantiene el pool de conexiones y **parametriza automáticamente** los valores dentro de los template strings de `$queryRaw` (protección contra inyección SQL), igual que con su API normal. Sacarlo significaría perder eso y los tipos autogenerados de cada lectura, sin ganar nada — el proyecto ya evita deliberadamente el "ORM completo".
