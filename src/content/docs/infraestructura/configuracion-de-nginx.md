---
title: Configuración de Nginx
description: Reverse proxy de Nginx para qa.arche.pe — enrutamiento a frontend, backend y WebSockets, y HTTPS con Certbot.
sidebar:
  order: 3
---

Nginx corre en la misma instancia EC2 y hace de reverse proxy: recibe todo el tráfico de `qa.arche.pe` por HTTPS y lo reenvía al proceso correcto (frontend o backend) según el path de la URL.

## Habilitar los puertos en el Security Group de EC2

Antes de que Nginx sea alcanzable desde afuera, la instancia EC2 necesita las reglas de entrada (*inbound rules*) correspondientes en su **Security Group** — esto es a nivel de AWS, no de Nginx ni del sistema operativo. Sin esto, aunque Nginx esté escuchando y corriendo bien, las requests de afuera nunca llegan al servidor.

**AWS Console → EC2 → Instances → (la instancia) → Security → Security groups → (el grupo) → Inbound rules → Edit inbound rules:**

| Type | Port | Source | Cuándo se necesita |
|---|---|---|---|
| HTTP | 80 | `0.0.0.0/0` | Desde el principio (Etapa 1) — probar por IP pública, y luego para la validación/redirección de Certbot |
| HTTPS | 443 | `0.0.0.0/0` | Etapa 2 — una vez que Certbot emite el certificado SSL |
| SSH | 22 | la IP/rango del equipo (no `0.0.0.0/0`) | Ya necesaria para conectarse por SSH (ver [Acceso al servidor](/infraestructura/acceso-al-servidor/)) |

:::caution
Dejar el puerto 22 (SSH) abierto a `0.0.0.0/0` expone el servidor a intentos de fuerza bruta desde cualquier IP de internet. Restringirlo a la IP/VPN del equipo si todavía está abierto a todos.
:::

## Etapa 1: antes de tener el dominio

Al levantar el servidor todavía no existía el dominio `qa.arche.pe`, así que no había nada contra qué emitir un certificado SSL. En ese punto se prueba directo por la **IP pública de la instancia EC2**, con un `server_name` genérico:

```nginx
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://127.0.0.1:3000;
        # ... mismos proxy_set_header que abajo
    }

    location /api/v1/ {
        proxy_pass http://127.0.0.1:5000;
        # ...
    }

    location /socket.io/ {
        proxy_pass http://127.0.0.1:5000;
        # ...
    }
}
```

- `server_name _;` es un catch-all: Nginx responde a cualquier `Host` (incluida la IP pública), porque todavía no hay un dominio específico que filtrar.
- Solo hay `listen 80` (HTTP) — sin `listen 443 ssl`, porque Certbot necesita que el dominio ya resuelva por DNS antes de poder emitir el certificado (valida vía HTTP-01/DNS que el dominio apunta a este servidor).
- Se accede como `http://<IP_PUBLICA_EC2>/`.

## Etapa 2: con el dominio ya apuntando al servidor

Una vez que el DNS de `qa.arche.pe` apunta a la IP de la instancia, se cambia `server_name _;` por el dominio real y se corre Certbot (ver [más abajo](#emitir-el-certificado-primera-vez)) para que agregue el bloque `listen 443 ssl` y la redirección HTTP→HTTPS. El archivo final queda como se muestra a continuación.

## Archivo de configuración

```nginx
server {
    server_name qa.arche.pe;

    # FRONTEND - Next.js
    location / {
        proxy_pass http://127.0.0.1:3000;

        proxy_http_version 1.1;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # BACKEND - Node.js
    location /api/v1/ {
        proxy_pass http://127.0.0.1:5000;

        proxy_http_version 1.1;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

   # WebSockets / Socket.IO
   location /socket.io/ {
        proxy_pass http://127.0.0.1:5000;

        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    listen 443 ssl; # managed by Certbot
    ssl_certificate /etc/letsencrypt/live/qa.arche.pe/fullchain.pem; # managed by Certbot
    ssl_certificate_key /etc/letsencrypt/live/qa.arche.pe/privkey.pem; # managed by Certbot
    include /etc/letsencrypt/options-ssl-nginx.conf; # managed by Certbot
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem; # managed by Certbot
}

server {
    if ($host = qa.arche.pe) {
        return 301 https://$host$request_uri;
    } # managed by Certbot

    listen 80;
    server_name qa.arche.pe;
    return 404; # managed by Certbot
}
```

## Qué hace cada bloque

| Location | Destino | Para qué |
|---|---|---|
| `/` | `127.0.0.1:3000` | Frontend Next.js |
| `/api/v1/` | `127.0.0.1:5000` | API REST del backend |
| `/socket.io/` | `127.0.0.1:5000` | Conexiones WebSocket de Socket.IO — necesita las cabeceras `Upgrade`/`Connection: upgrade` para que la conexión pase de HTTP a WebSocket |

El segundo `server` block escucha en el puerto `80` (HTTP) y redirige todo a `443` (HTTPS) con un `301`. Los certificados y esa redirección los administra Certbot automáticamente (comentarios `# managed by Certbot`).

## 1. Instalar Nginx

Ya cubierto en [Instalación de dependencias](/infraestructura/instalacion-de-dependencias/#nginx):

```bash
sudo apt install nginx -y
sudo systemctl enable nginx
```

## 2. Crear el archivo de configuración

```bash
sudo nano /etc/nginx/sites-available/qa.arche.pe
```

Pegar el contenido de la sección anterior, guardar, y habilitarlo (crear el symlink en `sites-enabled`):

```bash
sudo ln -s /etc/nginx/sites-available/qa.arche.pe /etc/nginx/sites-enabled/
```

## 3. Validar la sintaxis

**Siempre** antes de reiniciar — un error de sintaxis acá tumba Nginx en producción:

```bash
sudo nginx -t
```

Si todo está bien, la salida termina con:

```
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

Si aparece `nginx: [emerg] ...` en vez de eso, **no reiniciar**: corregir el archivo y volver a correr `nginx -t` hasta que diga `test is successful`.

## 4. Reiniciar / aplicar

Con la sintaxis validada, aplicar los cambios:

```bash
sudo systemctl reload nginx   # aplica sin cortar conexiones activas
# o, si reload no alcanza (cambios más profundos):
sudo systemctl restart nginx
```

## 5. Confirmar que el servicio está corriendo

```bash
sudo systemctl status nginx
```

Buscar la línea `Active: active (running)`. Si dice `failed`, revisar el detalle con:

```bash
sudo journalctl -u nginx -e
```

## 6. Probar cada ruta (frontend, backend, sockets)

Confirmar, uno por uno, que Nginx está enrutando bien cada `location` — desde el propio servidor:

```bash
curl -I http://127.0.0.1:3000              # frontend directo (sin Nginx)
curl -I http://127.0.0.1:5000/api/v1/       # backend directo (sin Nginx)
```

Y ya pasando por Nginx y el dominio público:

```bash
curl -I https://qa.arche.pe/                # → debe responder el frontend
curl -I https://qa.arche.pe/api/v1/          # → debe responder el backend
```

Un `HTTP/1.1 200` (o el código que devuelva esa ruta puntual, ej. `404` de una ruta de API que no existe pero que sí llega al backend) confirma que Nginx está reenviando correctamente. Un `502 Bad Gateway` significa que Nginx está bien pero el proceso de destino (frontend o backend, puerto `3000`/`5000`) no está corriendo — revisar con `pm2 list` (ver [Despliegue](/infraestructura/despliegue/)).

Para `/socket.io/`, la forma más simple de confirmar es abrir el frontend en el navegador y revisar en la pestaña Network (DevTools) que la conexión WebSocket a `/socket.io/` quede en estado `101 Switching Protocols`.

## Emitir el certificado (primera vez)

```bash
sudo certbot --nginx -d qa.arche.pe
```

Certbot edita este mismo archivo para agregar los bloques `ssl_certificate` y la redirección HTTP→HTTPS, y configura la renovación automática.

Siguiente paso: [Despliegue](/infraestructura/despliegue/).
