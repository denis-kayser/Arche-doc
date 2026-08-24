---
title: Instalación de dependencias
description: Instalación de Git, PM2 y Nginx en la instancia EC2.
sidebar:
  order: 2
---

Con el sistema actualizado (ver [Acceso al servidor](/infraestructura/acceso-al-servidor/)), instalar las tres dependencias que sostienen el despliegue: **Git** (traer el código), **Node.js/npm** (correrlo), **PM2** (mantenerlo vivo como proceso) y **Nginx** (exponerlo por HTTPS).

## Git

```bash
sudo apt install git -y
git --version
```

## Node.js y npm (vía nvm)

Node se instala con **nvm** (Node Version Manager), no desde el repo de `apt` — así se puede tener varias versiones de Node en el servidor y cambiar de una a otra sin reinstalar nada.

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash

# recargar el shell para que quede disponible el comando nvm
source ~/.bashrc

nvm install --lts
nvm use --lts

node --version
npm --version
```

`nvm install --lts` instala la última versión LTS de Node; `nvm use --lts` la deja activa en la sesión actual. Para que quede fija en cada login nuevo:

```bash
nvm alias default lts/*
```

## PM2

PM2 corre los procesos de frontend y backend en segundo plano y los reinicia si se caen.

```bash
npm install -g pm2
pm2 --version
```

(Sin `sudo`: al ser Node instalado por nvm en el home del usuario, los paquetes globales de npm no necesitan permisos de root.)

## Nginx

```bash
sudo apt install nginx -y
sudo systemctl enable nginx
sudo systemctl start nginx
```

## Certbot (certificados HTTPS)

```bash
sudo apt install certbot python3-certbot-nginx -y
```

Se usa para emitir y renovar el certificado de `qa.arche.pe` (ver [Configuración de Nginx](/infraestructura/configuracion-de-nginx/)).

Siguiente paso: [Configuración de Nginx](/infraestructura/configuracion-de-nginx/).
