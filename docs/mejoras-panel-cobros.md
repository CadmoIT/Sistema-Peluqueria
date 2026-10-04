<!-- Describe las mejoras del panel y su despliegue sin alterar registros anteriores. -->

# Panel, cuenta única y medios de pago

## Comportamiento

- Una cuenta pertenece a un negocio, incluso después de revocar el acceso. Las sucursales pertenecen al negocio; los permisos y asignaciones de empleados se mantienen. La restricción de base impide aceptar dos invitaciones o crear dos negocios simultáneamente. Las rutas antiguas redirigen sin permitir elegir roles.
- Se retiran Mi cuenta y el selector de cabecera. Actividad queda antes de Mi sitio y muestra un día del negocio con navegación, filtros y paginación por hora/ID. Los detalles financieros ajenos siguen filtrados antes de serializar.
- Equipo usa cards compactas; descripción y correo a la izquierda y acciones a la derecha. La administración de acceso está plegada.
- El loader deja pasar al contenido montado en 600 ms; las fuentes tienen un límite de 1,5 s. Una solicitud que sigue pendiente ofrece Reintentar a los 15 s. No se considera lista una vista que no se montó.
- Resumen agrega el saldo en PostgreSQL en lugar de transportar todos los turnos/pagos. Esto no redefine la semántica del indicador Pendiente de cobro ni sus filtros de Reportes: esa corrección queda independiente.
- En Servicios, el dueño configura un descuento global de efectivo de 0 a 99%, hasta dos decimales; inicialmente 0. Sólo aplica a servicios, no a productos. Tarjeta y Mercado Pago mantienen el precio base. No hay cobros ni devoluciones automáticas mediante proveedores.
- La reserva pública sigue eligiendo servicio y horario sin medio de pago. Publica el precio base como referencia y aclara el descuento aplicable al cobrar en el local. Las señas existentes no se cambian.
- El primer cobro manual fija base, porcentaje y total. Los cobros parciales posteriores conservan ese precio y no pueden mezclar efectivo con otros medios. Los cobros históricos conservan su total sin asignarles descuentos nuevos.
- Deshacer aparece al registrar una venta rápida por 15 s. El servidor comprueba el plazo, autor y sucursal. Reversa caja y stock en la misma transacción, conserva el original y registra actividad. Las repeticiones no duplican la reversión; luego del plazo sólo el dueño puede anular.

## Despliegue

1. Antes del despliegue, respaldar la base y comprobar que ningún usuario tiene más de una fila en Membresia. La creación del índice único fallará de forma segura si hay conflictos; no elimina membresías.
2. Aplicar `20261003220000_panel_medios_cuenta_unica` mediante el flujo de migración de Railway, antes de arrancar el código nuevo. Es una migración aditiva y requiere actualizar Prisma en todas las aplicaciones.
3. Desplegar web, API y worker. Probar ingreso de Carla y Lucía, menú, Equipo, Actividad, descuento, cobro parcial y Deshacer.
4. No ejecutar fixtures ni tests contra producción. Los tests nuevos usan repositorio en memoria y funciones puras. Las pruebas PostgreSQL/navegador requieren Docker local aislado.

No se modificaron las cuentas demo ni la configuración productiva del negocio durante este desarrollo. El descuento real lo configura el dueño después de desplegar.
