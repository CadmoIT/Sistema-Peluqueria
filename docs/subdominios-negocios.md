# Sitios por negocio y rutas de sucursal

## Direcciones públicas

- `PUBLIC_SITE_DOMAIN=turnosrapidos.com.ar` en Vercel Production y en el worker.
- El dominio identifica al negocio: `barberstudio.turnosrapidos.com.ar`.
- Con una sola sede activa, la raíz abre directamente su agenda y configuración.
- Con varias sedes activas, la raíz muestra un selector; cada sede abre en `/sucursal/{sedeId}`.
- La ruta comprueba que la sede esté activa y pertenezca al negocio resuelto. No acepta sucursales de otro negocio.
- El identificador interno `Negocio.slug` no cambia. Las reservas siguen utilizando ese identificador y validando pertenencia en el servidor.
- Los subdominios antiguos de sedes y las rutas `/sitio/{slug}` siguen funcionando. Cambiar una dirección conserva la anterior como alias reservado para el mismo negocio.

## Nombres repetidos

La dirección inicial se genera automáticamente compactando el nombre, sin acentos ni espacios. Si está ocupada, se agrega un sufijo numérico. Las mayúsculas, los acentos y separadores no distinguen nombres para esta política.

Mi sitio muestra el editor de dirección únicamente cuando existe otro negocio con el mismo nombre normalizado. El servidor vuelve a comprobar esta condición, el rol DUENO/ADMIN, la vigencia de la suscripción y que el sitio no esté retirado. No basta con mostrar u ocultar el formulario.

No se pueden ocupar nombres internos, direcciones actuales, antiguos aliases ni subdominios históricos de sucursales ajenas. La asignación y la edición usan transacciones serializables y unicidad en PostgreSQL; el conflicto concurrente no produce dos propietarios.

Cambiar el nombre del negocio actualiza la clave usada para detectar homónimos, pero no cambia automáticamente una dirección ya compartida.

## Migración y despliegue

1. Conservar backup de la base productiva.
2. Aplicar `20261003090000_subdominio_por_negocio` mediante `pnpm db:deploy` en Railway. Agrega campos y tabla de aliases, asigna direcciones a negocios existentes y conserva los datos y enlaces históricos.
3. Confirmar éxito de las migraciones antes de servir la nueva web. Desplegar web, API y worker con Prisma regenerado. El worker utiliza la nueva dirección en avisos de reservas.
4. Mantener wildcard `*.turnosrapidos.com.ar` en Vercel y su CNAME DNS-only en Cloudflare. No cambia el dominio de autenticación ni los registros de correo.
5. En producción, verificar un negocio de una sede, uno con varias, los enlaces anteriores y una sucursal inválida. La compra real de Mercado Pago permanece pendiente; este cambio no prueba credenciales reales ni genera cobros.

## Verificación local del 03/10/2026

- Pruebas de normalización, etiquetas reservadas, enlaces y middleware.
- Prueba PostgreSQL aislada de homónimos, permisos, vigencia, aliases y dos ediciones concurrentes del mismo dominio.
- Migración completa en un esquema local aislado; backfill adicional con negocios preexistentes, nombres acentuados y reservados.
- Pruebas de navegador en base local aislada, cuentas desechables y sin credenciales de Mercado Pago: selector, sede única, filtrado de servicios por sede, enlaces antiguos, edición excepcional y rechazo de sucursales inexistentes/inactivas.

Las pruebas locales no reemplazan la comprobación de la versión desplegada y su certificado wildcard.
