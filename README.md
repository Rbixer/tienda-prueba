# MI BARRIO

Sistema para tienda de barrio con inventario, POS, sucursales, bodega, proveedores, reportes y PWA.

## Funciones

- **Inventario**: productos con costo/venta, código de barras, foto, Excel/PDF
- **POS**: cobro sin facturación, descuenta stock y guarda tickets internos
- **Bodega**: traslados a sucursales
- **Proveedores**: saldos y pagos
- **Reportes**: ventas, márgenes y análisis
- **Usuarios**: roles y permisos por módulo
- **PWA**: instalable (requiere red para datos)

## Arranque

```bash
cp .env.example .env.local   # define SESSION_SECRET
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000)

## Seguridad

- Login y API del almacén protegidos con cookie HttpOnly firmada
- Contraseñas hasheadas (bcrypt); nunca se envían al cliente
- Control de versión al guardar (evita que dos cajas se pisen)
- Backups automáticos en `data/backups/`
- “Recordarme” solo guarda el **usuario**, no la contraseña

Tras el primer arranque, **cambia las contraseñas** desde Configuración o Usuarios.

## Offline (POS)

Si ya iniciaste sesión con red al menos una vez:

1. La PWA cachea el shell (login/app/POS).
2. Sin red puedes **cobrar**: stock y tickets quedan en el dispositivo.
3. Al reconectar se reaplican **venta por venta** sobre el stock del servidor (con reintentos).
4. Si hay **conflicto de stock**, la app muestra qué producto faltó (pide X, hay Y) y puedes reintentar o descartar.

Inventario/admin y el primer login sí requieren red.

## Tests

```bash
npm test
```

## Datos

Los datos viven en el servidor en **SQLite** (`data/store.db`, modo WAL), con espejo JSON (`data/store.json`) y backups en `data/backups/`. Al arrancar migra automáticamente desde un `store.json` legado si aún no hay base.

El cliente sincroniza con `/api/store` cuando hay sesión válida.

## Producción

```bash
./deploy.sh
```

En el servidor: Nginx (HTTPS) → Next en `127.0.0.1:3000`, PM2, y `SESSION_SECRET` fuerte en el entorno.
