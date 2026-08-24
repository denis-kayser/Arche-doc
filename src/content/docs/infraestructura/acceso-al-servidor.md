---
title: Acceso al servidor
description: Cómo conectarse por SSH a la instancia EC2 y mantener el sistema actualizado.
sidebar:
  order: 1
---

## Credenciales

| Campo | Valor |
|---|---|
| Usuario | `dev1` |
| Host | `<IP_DEL_SERVIDOR>` |
| Password | `<COMPLETAR>` |

:::caution
El host y la contraseña quedan como placeholders. Reemplázalos con tus credenciales de acceso.
:::

## Conexión por SSH

```bash
ssh dev1@<IP_DEL_SERVIDOR>
```

Pide la contraseña del usuario `dev1` (o la passphrase de la clave SSH, según cómo esté configurado el acceso).

## Actualizar paquetes del sistema

Una vez dentro, antes de instalar cualquier dependencia nueva:

```bash
sudo apt update
sudo apt upgrade -y
```

- `apt update` refresca el índice de paquetes disponibles.
- `apt upgrade -y` instala las actualizaciones pendientes sin pedir confirmación por cada paquete.

## Grupo de desarrolladores

Todos los desarrolladores que necesitan tocar el código en el servidor (carpeta [`/opt/app/Arche`](/infraestructura/despliegue/)) comparten un grupo de Linux llamado `developers`, en vez de depender de `sudo` para cada operación.

Crear el grupo (una sola vez):

```bash
sudo groupadd developers
```

Agregar un usuario existente al grupo:

```bash
sudo usermod -aG developers <usuario>
```

- `-aG` **agrega** (`-a`) el usuario al grupo (`-G`) sin sacarlo de los grupos en los que ya está — sin la `-a` el comando reemplaza toda la lista de grupos secundarios del usuario.
- Repetir el comando por cada desarrollador que se suma al servidor.
- El usuario tiene que cerrar sesión SSH y volver a entrar para que el nuevo grupo tome efecto.

Verificar a qué grupos pertenece un usuario:

```bash
groups <usuario>
```

Siguiente paso: [Instalación de dependencias](/infraestructura/instalacion-de-dependencias/).
