<!-- Describe las reglas de precios y el despliegue aditivo del panel. -->
# Ajustes de panel y precios por servicio

- Equipo: «Yo también atiendo» vincula una ficha disponible o crea una para el dueño. No cambia su rol. La ficha nueva queda inactiva hasta completar locales, servicios y horarios y habilitar «Disponible para nuevos turnos» desde Editar.
- Actividad: Fecha y Persona. Persona reúne operaciones realizadas y atribuidas, manteniendo la privacidad del empleado.
- Servicio: `mediosPago` guarda descuento/recargo en porcentaje o pesos para Efectivo, Tarjeta y Mercado Pago. Los productos no reciben ajustes.
- Cobros: primer cobro manual fija medio y total; se descuentan señas aprobadas. La reserva conserva sus precios base originales. Los cobros históricos no se recalculan.
- Requeridas antes de desplegar: `20261003220000_panel_medios_cuenta_unica` y `20261004120000_medios_pago_servicio`. Ambas aplicadas en producción con copia previa consistente de 53 tablas y 2896 filas, fuera del repositorio.
- La copia es una exportación de datos PostgreSQL en JSON (fila como texto para preservar importes), no una copia de roles ni un `pg_dump` de esquema. El esquema se conserva mediante migraciones del repositorio. No subirla ni compartirla; contiene información sensible.
- Verificaciones: `verificar-demo-carla.ts` recorre paneles de dueño/empleado y sitio público; `verificar-ajustes-panel.ts` prueba interfaz sin guardar formularios. Requieren la contraseña demo por variable de entorno.
