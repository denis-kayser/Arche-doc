---
title: Introduccion
description: Visión general del backend de Arche - stack, propósito y cómo está organizada esta documentación.
sidebar:
  order: 1
---

<!-- Arche API es el backend del sistema Arche: una API REST construida con **Express** y **TypeScript**, que expone autenticación, gestión de usuarios, roles/permisos, catálogos de mantenimiento y sesiones activas en tiempo real (vía WebSockets) para un panel administrativo tipo ERP. -->

## Stack principal

| Pieza | Qué es | Para qué se usa aquí |
|---|---|---|
| **Express 5** | Framework HTTP | Enrutamiento y middlewares de la API REST |
| **TypeScript** | Superset tipado de JS | Todo el código fuente |
| **Prisma 7** + `@prisma/adapter-pg` | Cliente de base de datos tipado | Lecturas (`.findFirst/findMany/findUnique`) y ejecución de SQL crudo/funciones |
| **PostgreSQL** | Base de datos | Persistencia. Buena parte de las reglas de escritura viven en funciones SQL (`ft_*`), no en Prisma |
| **jsonwebtoken** | Firma/verificación de JWT | Autenticación de la API (ver [Autenticación y autorización](/arquitectura/autenticacion-y-autorizacion/)) |
| **bcryptjs** | Hash de contraseñas | Registro y login con credenciales |
| **Socket.IO** | WebSockets | Sesiones activas en tiempo real (ver [Websockets](/referencia/websockets/)) |
| **Zod** | Validación de esquemas | Valida el body de las peticiones antes de llegar al Controller |
| **express-rate-limit**, **helmet** | Seguridad HTTP | Rate limiting en rutas de auth, cabeceras de seguridad |

## Cómo está organizada esta documentación

- **Introducción** — esta sección: qué es el proyecto y cómo levantarlo en local.
- **Arquitectura** — cómo está estructurado el código: las 4 capas (Router/Controller/Service/Model), el manejo de errores, la conexión a base de datos, y el mecanismo de autenticación/autorización que usan *todos* los módulos.
- **Módulos** — un grupo de páginas por cada dominio del backend (auth, usuarios, sesiones, catálogos, módulos de menú...). Documenta los endpoints concretos de cada dominio: qué reciben, qué devuelven, qué reglas de negocio aplican. **Esta sección crece con el proyecto**: cada dominio nuevo agrega su propia carpeta.
- **Referencia** — material transversal que no pertenece a un módulo puntual: el detalle de cada dependencia del `package.json`, y cómo funcionan los WebSockets.

:::note[Estado actual]
La primera versión de esta documentación cubre en detalle el módulo **Auth**. El resto de los módulos (usuarios, sesiones, catálogos, menú) se van a ir agregando bajo **Módulos** siguiendo la misma estructura, sin tener que reorganizar nada de lo ya escrito.
:::
