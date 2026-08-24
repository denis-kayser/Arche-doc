---
title: WebSockets (Socket.IO)
description: Protocolo completo de eventos de Socket.IO - quién identifica a quién está conectado, y cómo se expulsa o cierra una sesión en tiempo real.
sidebar:
  order: 2
---

Los WebSockets no son un dominio con Router/Controller propio — es infraestructura que vive en `src/socket/` y `service/socket/socketService.ts`, conectada al dominio `sessions` (cada conexión de socket es, en la base de datos, una fila de la tabla `sessions`). Esta página documenta **cada evento**, en qué dirección viaja, qué lleva adentro, y el recorrido completo de "un admin cierra la sesión de otro usuario", incluyendo el lado frontend.

## Montaje del servidor

`server.ts` crea el servidor de Socket.IO sobre el mismo `http.Server` que usa Express — comparten el mismo puerto:

```ts title="src/server.ts"
const httpServer = http.createServer(app)
export const io = new Server(httpServer, { cors: { origin: '*', methods: ['GET', 'POST'] } })
setupSocket(io)
```

`cors: { origin: '*' }` es independiente del CORS de la API REST (que hoy no tiene ningún middleware `cors()` — ver [Stack y dependencias](/backend/referencia/stack-y-dependencias/)).

## Cómo se identifica quién está conectado

El cliente (frontend) manda su identidad **al momento de conectar**, no en un evento aparte:

```tsx title="providers/socket.provider.tsx (frontend)"
const socketInstance = io(socketUrl, {
    auth: { userId: session.user.id } // id real, sacado de la sesión de NextAuth
})
```

El servidor lo lee de `socket.handshake.auth.userId` en cuanto la conexión abre:

```ts title="src/socket/socketServer.ts"
io.on('connection', (socket) => {
  const userId = socket.handshake.auth.userId as string
  if (userId) {
    socketStore.add(userId, socket.id)
    createSessionModel({ userId: Number(userId), socketId: socket.id, userAgent: ..., ipAddress: ... })
      .then(() => io.emit('sessions_changed'))
  }
  // ...
})
```

Dos cosas pasan ahí: se guarda `userId → socket.id` en memoria (`socketStore`), y se inserta una fila en la tabla `sessions` (vía la función SQL `ft_create_session`, ver [Base de datos](/backend/arquitectura/base-de-datos/)) — **esa fila es lo que después aparece listado como "sesión activa"** en `GET /sessions`.

`socketStore` (`src/socket/socketStore.ts`) es un `Map<userId, Set<socketId>>` — un usuario puede tener varios sockets a la vez (varias pestañas/dispositivos). Vive solo en memoria del proceso: si el servidor se reinicia, se vacía, por eso `server.ts` limpia al arrancar cualquier sesión que haya quedado marcada activa en la BD de un arranque anterior (son "fantasma", su socket ya no existe).

:::caution[La identidad del socket no está verificada]
`socket.handshake.auth.userId` es un valor que el cliente simplemente declara al conectar — no se compara contra ningún JWT ni sesión real, a diferencia de las rutas HTTP (ver [Autenticación y autorización](/backend/arquitectura/autenticacion-y-autorizacion/), que sí se corrigió). Cualquiera que abra un socket directo contra el backend puede declarar el `userId` que quiera y aparecer como si esa persona estuviera conectada. No está arreglado todavía.
:::

## Catálogo completo de eventos

| Evento | Dirección | Quién lo dispara | Quién lo recibe | Payload | Cuándo ocurre |
|---|---|---|---|---|---|
| *(handshake)* | Cliente → Servidor | `io(url, { auth: { userId } })` al montar `SocketProvider` | `io.on('connection')` | `socket.handshake.auth.userId: string` | El usuario tiene sesión de NextAuth activa en el navegador |
| `disconnect` *(nativo de Socket.IO)* | — | Se dispara solo (cierre de pestaña, pérdida de red, o el servidor llama `socket.disconnect(true)`) | `socket.on('disconnect')` en `socketServer.ts` | — | Fin de la conexión, por el motivo que sea |
| `sessions_changed` | Servidor → **todos** los clientes conectados (`io.emit`, broadcast) | `socketServer.ts` (al conectar/desconectar) y `socketService.ts` (al forzar un cierre) | Cualquier cliente escuchando — hoy, la página de sesiones activas | *(vacío, es solo una notificación "algo cambió")* | Cada vez que se crea o cierra una fila en `sessions` |
| `force_logout` | Servidor → **un** socket puntual (`socket.emit`, no broadcast) | `socketService.ts` (`disconnectOneSession` / `disconnectAllSessions`) | El socket exacto que se está expulsando | `{ reason: 'DEVICE_TERMINATED' \| 'SESSION_TERMINATED' }` | Un admin cierra manualmente una sesión (o todas las de un usuario) desde `/sessions` |

:::note[Reason que existe en el código pero no se usa]
`socketService.ts` también define `disconnectOtherSessions()`, que emitiría `force_logout` con `reason: 'LOGIN_FROM_ANOTHER_DEVICE'` (pensado para cuando un nuevo login debería desplazar sesiones anteriores). **Ninguna parte del proyecto la llama** — no está conectada a ningún flujo real todavía. Tampoco `src/socket/socketAction.ts` (`disconnectUser()`), que quedó reemplazada por las funciones de `socketService.ts`.
:::

## Flujo completo: un admin cierra la sesión de otro usuario

Este es el recorrido de punta a punta cuando alguien hace clic en "cerrar sesión" sobre el dispositivo de otro usuario, en la página `mantenimientos/sesiones`:

1. **Frontend** — `closeSession(id)` (`action/sessions/sessions.ts`) llama `DELETE /sessions/:id`, con el `accessToken` de quien hace clic como `Authorization` (ver [Autenticación y autorización](/backend/arquitectura/autenticacion-y-autorizacion/)).
2. **Backend, HTTP** — `sessionController.close` → `sessionService.close(sessionId, requesterId)`.
3. **Backend, permisos** — `sessionService.close` busca la sesión (`getSessionByIdModel`), y llama `assertCanManage(requesterId, session.userId)`: si no es tu propia sesión, chequea que tu rol pueda gestionar el rol del dueño (ver [Capas](/backend/arquitectura/capas/) y `util/roleHierarchy.ts`). Si no tiene permiso, corta acá con 403 y nada de lo siguiente ocurre.
4. **Backend, WebSocket** — `disconnectOneSession(userId, socketId)` (`service/socket/socketService.ts`):
   - Busca el socket exacto en `socketStore`.
   - Le manda **`force_logout`** con `{ reason: 'DEVICE_TERMINATED' }`, **solo a ese socket** (nadie más lo recibe).
   - Llama `socket.disconnect(true)` — corta la conexión desde el servidor.
5. **Backend, base de datos** — en paralelo, `closeSessionModel(socketId)` marca esa fila de `sessions` como inactiva (función SQL `ft_close_session`), y al terminar emite **`sessions_changed`** a todos los clientes conectados.
6. **También se dispara el handler de `disconnect`** en `socketServer.ts` del lado del socket recién cortado (por el `disconnect(true)` del paso 4) — que a su vez vuelve a llamar `closeSessionModel` y a emitir `sessions_changed` otra vez. Es intencional, no un bug: así la sesión igual queda cerrada en base de datos aunque el socket ya no existiera en memoria (proceso reiniciado, por ejemplo) — ver el comentario "por si el socket ya no existe" en `sessionService.ts`.
7. **Frontend, del lado expulsado** — `SocketProvider` tiene un listener fijo:
   ```tsx title="providers/socket.provider.tsx"
   socketInstance.on('force_logout', () => {
       signOutRelative('/auth/login')
   })
   ```
   Cierra sesión de NextAuth y redirige a `/auth/login`, sin importar el `reason` (hoy no distingue entre motivos).
8. **Frontend, del lado de todos los demás** — la página de sesiones activas escucha `sessions_changed` e invalida la query de React Query, así la tabla se refresca sola, sin recargar la página:
   ```tsx title="app/(protected)/mantenimientos/sesiones/page.tsx"
   socket.on("sessions_changed", refresh) // refresh = invalidateQueries(['sessions', 'users'])
   ```

`closeAllSessionsForUser(userId)` (botón "cerrar todos los dispositivos de este usuario") sigue el mismo recorrido, pero usa `sessionService.closeAllByUser` → `disconnectAllSessions(userId)`, que repite los pasos 4-6 **una vez por cada socket** que ese usuario tenga abierto.
