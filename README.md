# MI BARRIO

Sistema para tienda de barrio con inventario, POS sin facturación, 3 sucursales y PWA.

## Funciones

- **Inventario**: alta de productos (nombre, precio, cantidad), listado y descarga PDF
- **POS**: cobro sin facturación, descuenta stock y guarda tickets internos
- **Sucursales**: 3 ubicaciones administrables
- **Usuarios**: roles administrador y vendedor
- **PWA**: instalable, con navegación inferior (sidebar/bottom bar)

## Arranque

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000)

## Accesos demo

| Rol | Usuario | Contraseña |
|-----|---------|------------|
| Administrador | `admin` | `admin123` |
| Vendedor | `vendedor` | `vendedor123` |

Los datos se guardan en el navegador (`localStorage`).
