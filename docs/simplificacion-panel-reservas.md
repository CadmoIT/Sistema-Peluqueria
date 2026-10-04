<!-- Registra reglas de presentación, atribución y correos nuevos de la demo. -->
# Simplificación de panel y reservas

- Resumen y Reportes no consultan ni muestran el agregado pendiente. Los saldos de cada turno se conservan.
- Equipo usa cards neutras, estado en negrita y controles fuera de cualquier opacidad de inactividad. El dueño mantiene su identificación.
- Medios de pago muestra número firmado y unidad %/$; la estructura JSON anterior se conserva para mantener ajustes existentes.
- Actividad filtra por día local y profesional atribuido, no por actor. Los registros sin profesional aparecen sólo en Todos; el actor sigue visible en el detalle autorizado.
- Selección pública permite quitar directamente y regresar al catálogo para agregar; no admite cantidades. Cambiar servicios reinicia la elección de profesional y horario para impedir confirmar un horario calculado para otra duración.
- WhatsApp flotante comparte enlace con Contacto; sólo aparece con número de 10 a 15 dígitos y respeta el espacio ocupado por la selección en móvil.
- Carla: `demoCarlaConfirmacionesDesde` limita programación y entrega a reservas creadas desde ese instante. La demo sin marcador queda sin correos. Los emails ficticios `example.com` quedan excluidos aunque tengan fechas futuras.
- Después de publicar y verificar el worker, usar `avisos-demo-carla.ts --habilitar` con `CARLA_CONFIRMACION_ENABLE=solo-nuevas-reservas`, con copia previa de datos. Activa sólo confirmación por email, sin recordatorios ni WhatsApp, y omite avisos anteriores pendientes. Repetir no mueve el instante de habilitación.
- `avisos-demo-carla.ts` sin argumentos consulta estados sin exponer destinatarios. La recepción final requiere una reserva nueva y confirmación del usuario; no se reenvían reservas anteriores.
