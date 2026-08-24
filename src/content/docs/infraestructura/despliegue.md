---
title: Despliegue
description: Conectar el servidor a GitHub por SSH, traer el código, y gestionar los procesos con PM2.
sidebar:
  order: 4
---

Hoy el despliegue es **manual**: alguien con acceso SSH al servidor trae los últimos cambios y reinicia los procesos con PM2. El flujo automatizado (GitHub Actions) está documentado como objetivo en [Arquitectura](/arquitectura/), pero todavía no está activo.

## 1. Conectar el servidor a GitHub por SSH

El servidor necesita su propia clave SSH para poder hacer `git clone`/`git pull` de los repos privados de Arche sin pedir usuario y contraseña.

```bash
# generar un par de claves (una sola vez)
ssh-keygen -t ed25519 -C "dev1@ec2-arche"

# mostrar la clave pública para copiarla
cat ~/.ssh/id_ed25519.pub
```

Esa clave pública se agrega en GitHub: **Settings → SSH and GPG keys → New SSH key** (a nivel de usuario, o como *Deploy key* del repo si se quiere acceso limitado a un solo repositorio).

Probar la conexión:

```bash
ssh -T git@github.com
```

## 2. Carpeta de proyectos

Todos los proyectos de Arche viven bajo `/opt/app/Arche` (ya creada en el servidor) — no en el home de cada usuario. Esto permite que cualquier miembro del grupo `developers` (ver [Grupo de desarrolladores](/infraestructura/acceso-al-servidor/#grupo-de-desarrolladores)) pueda desplegar sin depender de la carpeta personal de otro usuario.

```bash
cd /opt/app/Arche
ls -la
```

Si el grupo `developers` todavía no es dueño de la carpeta, ajustar permisos (una sola vez, con un usuario que tenga `sudo`):

```bash
sudo chown -R :developers /opt/app/Arche
sudo chmod -R g+rwX /opt/app/Arche
sudo chmod g+s /opt/app/Arche   # setgid: los archivos/carpetas nuevos heredan el grupo "developers"
```

## 3. Clonar el repositorio

Cada proyecto (backend, frontend) queda como una subcarpeta dentro de `/opt/app/Arche`:

```bash
cd /opt/app/Arche
git clone git@github.com:Kayser-Peru/arche_backend.git
cd arche_backend
```

(Mismo comando para el repo del frontend — queda como `/opt/app/Arche/<repo-frontend>`.)

## 4. Instalar, compilar y arrancar con PM2

```bash
npm install
npm run build
pm2 start dist/server.js --name arche-backend
```

Para el frontend (Next.js), típicamente:

```bash
npm install
npm run build
pm2 start npm --name arche-frontend -- start
```

## 5. Actualizar una versión ya desplegada

Cuando hay cambios nuevos en la rama que corre en el servidor:

```bash
cd /opt/app/Arche/arche_backend
git pull
npm install
npm run build
pm2 restart arche-backend
```

## Comandos de PM2 usados en el día a día

| Comando | Qué hace |
|---|---|
| `pm2 list` | Lista los procesos corriendo y su estado |
| `pm2 logs <nombre>` | Muestra logs en vivo de un proceso |
| `pm2 restart <nombre>` | Reinicia el proceso (aplica un build nuevo) |
| `pm2 stop <nombre>` | Detiene el proceso sin borrarlo |
| `pm2 delete <nombre>` | Elimina el proceso de la lista de PM2 |
| `pm2 save` | Guarda la lista actual de procesos para que sobrevivan a un reinicio del servidor |
