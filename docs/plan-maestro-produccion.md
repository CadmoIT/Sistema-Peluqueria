<!-- Reúne la auditoría y la hoja de ruta verificable para lanzar y operar TurnosRápidos. -->

# TurnosRápidos: plan maestro para una versión 1.0 profesional

Fecha de revisión: 26 de septiembre de 2026. Código revisado: `08bcff3`.

Este documento distingue hallazgos comprobados, configuraciones pendientes y propuestas de producto. Es una guía de trabajo; las casillas abiertas no representan funciones implementadas. La revisión incluyó código de web, API, worker, esquema y migraciones, pruebas automatizadas y consultas HTTP públicas de lectura. No se ingresó a cuentas, no se inspeccionaron secretos, no se realizaron cobros ni se modificaron datos productivos. No sustituye una prueba de penetración ni una validación contable/legal de la operación concreta.

Una versión terminada tiene alcance y criterios de aceptación. Se considera lista cuando funcionan sus recorridos prometidos, los permisos están probados, se puede recuperar de fallos y existe una persona responsable de su operación. Las mejoras de crecimiento del bloque 24 no deben convertirse en una condición infinita para publicar.

## Prioridades y responsables

- **P0:** requisito para abrir a clientes reales o cobrar por la función afectada.
- **P1:** requisito para completar la versión comercial profesional y operable.
- **P2:** crecimiento posterior; se implementa según demanda y rentabilidad.
- **Configuración:** trabajo en Vercel, Railway, Cloudflare, Cloudinary o proveedores.
- **Desarrollo:** cambios de código, datos, interfaz y pruebas.
- **Negocio:** decisiones del propietario; asesor contable/legal cuando corresponda.

Cada entrega debe registrar responsable, dependencia, fecha, prueba realizada y evidencia. No marcar una integración terminada sólo porque se cargaron sus credenciales.

## Estado observado y hallazgos concretos

| ID | Prioridad | Evidencia | Trabajo necesario |
| --- | --- | --- | --- |

Falta
| H01 | P0 | `autenticacion.ts` usa `WEB_URL` como origen de confianza; el usuario reportó Invalid origin desde Vercel | Confirmar variables del despliegue y probar acceso en el origen temporal y luego en el definitivo |

Falta, hice una parte de código
| H02 | P0 | Web y worker usan Resend; el worker envía los correos | Activar remitente/dominio en Resend y configurar `RESEND_API_KEY` y `EMAIL_REMITENTE` en Railway; la web requiere PostgreSQL |


| H03 | P1 | La web guarda autenticación en una bandeja persistente; el worker reintenta envíos y recupera reclamos vencidos | Aplicar la migración, desplegar web y worker, y comprobar correo pendiente/enviado/fallido en producción |

| H04 | P0 | El webhook de Mercado Pago en Nest sólo comprueba que exista el encabezado de firma y registra IDs en memoria | Retirar su exposición o reemplazarlo por validación criptográfica y registro duradero; establecer un receptor oficial |
| H05 | P0 | En Nest, consulta y confirmación de reserva por ID no tienen guard de sesión ni token específico | Proteger la operación y minimizar respuesta; verificar exposición del servicio Railway. Conocer un ID no debe otorgar permiso de confirmar |
| H06 | P0 | Checkout/cancelación de plan validan membresía, pero no rol; creación/edición de profesionales tampoco exige rol administrador | Completar autorización de cada lectura y escritura, también al invocar rutas directamente |
| H07 | P0 | La reserva pública Next se crea `CONFIRMADA` con `sena: 0` | Implementar cobro de seña si se ofrece esa función, o retirarla explícitamente de la oferta hasta entregarla |
| H08 | P0 | Webhook web procesa `subscription_preapproval`, pero no registra cuotas desde eventos de pago | Completar cobros reales, fallos, historial, conciliación y derechos del plan; autorización de recurrencia no equivale a cuota cobrada |
| H09 | P0 | Suscripción pertenece a Negocio; el contexto elige `membresia.findFirst`; onboarding reutiliza el primer negocio | Resolver qué compra la cuenta cuando se anuncian 1, 2 o ilimitados negocios, implementar selector y límites del servidor |
| H10 | P0 | Reserva pública actualiza cliente existente por coincidencia de email O teléfono, sin verificar propiedad del contacto | Evitar sobrescribir identidades de clientes por datos enviados sin autenticar; tratar coincidencias conflictivas y consentimiento por separado |
| H11 | P1 | Cancelación cambia inmediatamente a CANCELADA y a la vez marca `cancelarAlFinal` | Definir y cumplir el acceso hasta final de período pagado; distinguir cancelar renovación y suspender servicio |
| H12 | P1 | Avisos de turnos tienen reintentos limitados y recuperan reclamos abandonados; aún falta panel operativo | Mostrar errores y permitir reintento administrativo; guardar IDs/estados del proveedor cuando estén disponibles |
| H13 | P1 | El worker excluye demos mediante un slug específico | Usar entorno/indicador de demo; impedir mensajes y cobros reales desde todos los datos ficticios |
| H14 | P1 | Listados de clientes, productos y compras tienen consultas sin paginación | Búsqueda y paginación del servidor; límites de memoria y exportaciones grandes |
| H15 | P1 | Importadores permiten 5 MB y reciben multipart en funciones Vercel | Ajustar tamaño total por debajo de 4,5 MB o usar almacenamiento privado y procesamiento asíncrono |
| H16 | P1 | No se encontraron rutas admin global, sitemap, robots ni not-found propio | Crear administración interna, SEO y estados de error diseñados |
| H17 | P1 | `/pagos` sigue mostrando PRO/Próximamente; otros lugares dicen Pro/Empezar | Unificar catálogo y redirigir/eliminar la página duplicada con cuidado de enlaces |
| H18 | P1 | Términos y privacidad existen pero son textos iniciales breves | Completar identidad, condiciones, tratamiento, terceros, derechos y procedimientos reales |
| H19 | P1 | Falló la prueba de duración en `cinematica-hoja.spec.ts`: espera 500, recibe 1000 | Actualizar la expectativa al requisito vigente de un segundo y mantener prueba funcional de animación |
| H20 | P1 | Middleware reescribe sólo `/` del subdominio | Probar navegación completa, reservas, errores y caché por host; decidir qué rutas del panel deben estar disponibles en hosts de negocios |

Referencias de código: `apps/web/src/lib/autenticacion.ts`, `apps/web/src/lib/correo.ts`, `packages/correo/src/index.ts`, `apps/api/src/services/integraciones.service.ts`, `apps/api/src/modules/integraciones.module.ts`, `apps/api/src/controllers/reservas.controller.ts`, `apps/api/src/repositories/prisma/reservas-prisma.repository.ts`, `apps/web/src/servicios/contexto-api.service.ts`, `apps/web/src/app/api/reservas-publicas/route.ts`, `apps/web/src/app/webhooks/mercadopago/route.ts`, `apps/web/src/app/api/v1/facturacion/suscripciones/`, `apps/web/src/servicios/panel-datos.service.ts`, `apps/worker/src/jobs/avisos-entrega.ts`, `apps/worker/src/jobs/enviar-correos.job.ts` y `prisma/schema.prisma`.

Ya hay bases útiles: autenticación, validación de entradas, filtros por negocio, roles en varias operaciones, cookies seguras, índices, transacciones, restricción de solapamientos, firmas Cloudinary, separación borrador/publicación, pruebas de disponibilidad, importaciones y ventas. Los controles no son todavía uniformes en todas las rutas.

## 1. Definir producto, cuenta, negocio y plan — P0

Responsables: negocio y desarrollo. Desbloquea facturación, permisos, admin y métricas.

- [ ] Definir **cuenta/organización pagadora**, **negocio/marca**, **local/sede**, **profesional** y **usuario con acceso**. Un profesional puede ser una ficha sin usuario de login.
- [ ] Resolver si Plus permite dos negocios independientes o dos locales del mismo negocio. La interfaz promete negocios y el esquema factura por negocio; hace falta una decisión explícita.
- [ ] Si una cuota cubre varios negocios, crear una entidad de cuenta facturable que agrupe negocios y una suscripción asociada a ella. Migrar membresías y planes sin mezclar clientes.
- [ ] Si se factura cada negocio por separado, corregir oferta, límites y explicación comercial para que coincidan.
- [ ] Fijar catálogo único: precio ARS, periodicidad, límites, prestaciones, impuestos, prueba y reglas de actualización. Pro confirmado: ARS 14.900/mes; Plus en código: ARS 9.900/mes, a validar comercialmente.
- [ ] Resolver si Gratis significa prueba de siete días o plan gratuito permanente. Evitar que el nombre prometa algo que vence.
- [ ] Establecer inicio de prueba, vencimiento, gracia, suspensión, reactivación, conservación de datos y exportación al finalizar.
- [ ] Definir cuotas de WhatsApp, almacenamiento e importaciones y condiciones claras para prestaciones anunciadas como ilimitadas.
- [ ] Hacer que planes públicos, panel, checkout y permisos lean la misma configuración versionada.
- [ ] Aplicar límites en el servidor y dentro de transacciones cuando dos solicitudes puedan superar el cupo.
- [ ] Definir qué pasa al bajar de plan con más negocios que los permitidos: elección de cuáles quedan activos; no borrar datos automáticamente.

**Terminado cuando:** una cuenta cambia entre sus negocios, ve el plan correcto, no accede a negocios ajenos y no puede superar su plan invocando la API.

## 2. Ordenar arquitectura y ambientes — P0

Responsable: desarrollo/configuración.

- [ ] Documentar qué ejecuta Next en Vercel, qué queda en Nest/Railway y qué ejecuta el worker.
- [ ] Elegir una implementación oficial para reservas, pagos y webhooks. Compartir reglas de dominio o retirar caminos duplicados incompletos.
- [ ] Mantener la conexión de Vercel a PostgreSQL mientras Next use Prisma. Una migración total a Nest es otro proyecto; no es requisito automático para lanzar.
- [ ] Retirar exposición pública de servicios/rutas que no tengan un consumidor necesario, sin afectar healthchecks ni procesos internos.
- [ ] Separar desarrollo, pruebas y producción: bases, secretos, proveedores, almacenamiento y destinos de comunicaciones.
- [ ] Configurar Preview con base de prueba; nunca ejecutar seeds de demo contra producción.
- [ ] Guardar secretos en los proveedores y gestor de contraseñas; validar variables al iniciar con mensajes que no revelen valores.
- [ ] Revisar accesos a GitHub, Railway, Vercel, Cloudflare y Cloudinary, propietarios de cuentas, MFA y recuperación.
- [ ] Confirmar plan Vercel compatible con uso comercial. Hobby es para uso personal/no comercial según su documentación.
- [ ] Definir región de funciones Vercel cerca de Railway PostgreSQL; medir desde Argentina antes de cambiar regiones.
- [ ] Configurar puertos, healthchecks, reinicios, cierre ordenado del worker y conexiones de base limitadas.
- [ ] Versionar instrucciones y configuración de despliegue; mantener una única responsabilidad de migraciones y cambios de esquema compatibles entre versiones.

**Terminado cuando:** se puede desplegar y volver a una versión anterior con procedimiento conocido, sin modificar producción desde pruebas.

Fuente: [Vercel Hobby](https://vercel.com/docs/plans/hobby).

## 3. Dominio, Cloudflare y subdominios — P0

Responsable: configuración. Depende de que se habilite la administración del dominio comprado.

- [ ] Confirmar titularidad y renovación de `turnosrapidos.com.ar`; habilitar MFA donde corresponda.
- [ ] Agregar la zona a Cloudflare y copiar registros existentes, especialmente correo y verificaciones.
- [ ] Delegar desde el registrador a los nameservers asignados por Cloudflare cuando el dominio esté disponible; coordinar DNSSEC si ya hubiera un registro DS.
- [ ] Agregar `turnosrapidos.com.ar` y `www.turnosrapidos.com.ar` en Vercel; elegir un único destino canónico. Propuesta: raíz sin www, coherente con variables actuales.
- [ ] Configurar los valores A/CNAME que indique el proyecto Vercel, sin usar IPs de una captura antigua.
- [ ] Agregar `*.site.turnosrapidos.com.ar` en el proyecto.
- [ ] Conservar Cloudflare como DNS principal y seguir el procedimiento oficial de validación delegada del wildcard: habilitar Vercel DNS en la página del dominio del equipo, pero conservar los nameservers de Cloudflare en el registrador.
- [ ] Crear dos NS en Cloudflare con nombre `_acme-challenge.site`, a `ns1.vercel-dns.com.` y `ns2.vercel-dns.com.`. Son para certificados, no para tráfico web.
- [ ] Crear CNAME `*.site` hacia el destino indicado por Vercel, inicialmente **DNS Only**. Mantener los NS para renovaciones automáticas.
- [ ] Comprobar restricciones del panel, certificados, CAA y ausencia de registros en conflicto. La delegación de un challenge puede afectar a otro proveedor que necesite usar ese mismo nombre.
- [ ] No activar proxy Cloudflare para `negocio.site.turnosrapidos.com.ar` sin resolver su certificado: Universal SSL en zona completa cubre raíz y primer nivel, no ese segundo nivel.
- [ ] Si luego se habilita proxy, usar TLS Full (strict), resolver cobertura de certificados, revisar cookies/headers y excluir autenticación, panel, reservas mutantes y webhooks de reglas de caché/challenge inapropiadas.
- [ ] Recordar que DNS Only no aplica el WAF ni la caché HTTP de Cloudflare al sitio; Vercel sigue sirviendo y protegiendo el tráfico.
- [ ] Dejar `PUBLIC_SITE_DOMAIN=site.turnosrapidos.com.ar` sin protocolo ni asterisco; actualizar `WEB_URL` y `BETTER_AUTH_URL` al dominio definitivo y redeployar.
- [ ] Reservar nombres internos y validar unicidad, normalización, propiedad y publicación de subdominios.
- [ ] Definir cambio de slug, redirecciones y demora de reutilización para no enviar clientes de un negocio a otro.
- [ ] Probar host inexistente, negocio suspendido, local desactivado y todas las rutas del proceso de reserva.
- [ ] Mantener cookies del panel limitadas al host de la plataforma y evitar confianza general en todos los subdominios de clientes.

**Terminado cuando:** dominio y dos negocios de prueba abren con HTTPS válido, cada host muestra sólo su negocio y certificados tienen renovación automática.

Corrección respecto de indicaciones anteriores: no es obligatorio trasladar todo el DNS a Vercel. La documentación actual admite el DNS externo con delegación de `_acme-challenge`. [Guía oficial Vercel](https://vercel.com/docs/domains/working-with-domains/add-a-domain#use-wildcard-domains-with-an-external-dns-provider). [Cobertura de Cloudflare Universal SSL](https://developers.cloudflare.com/ssl/edge-certificates/universal-ssl/limitations/).

## 4. Acceso, identidad y seguridad de cuentas — P0

Responsable: desarrollo/configuración.

- [ ] Resolver Invalid origin: comprobar que `WEB_URL` y `BETTER_AUTH_URL` coincidan con el dominio usado; mientras se prueba Vercel puede usarse su alias de producción.
- [ ] Usar `/acceder?modo=ingreso`; `/ingresar` actualmente devuelve 404. Agregar redirección si se desea conservar ese enlace alternativo.
- [ ] Crear una cuenta de pruebas controlada; confirmar si las cuentas locales existen realmente en Railway. Publicar código no copia la base local.
- [ ] Completar registro, verificación, reenvío con enfriamiento, ingreso, salida y recuperación de contraseña.
- [ ] Probar enlace vencido/reutilizado, correo inexistente, error del proveedor, cambio de contraseña y revocación de sesiones.
- [ ] Traducir errores a mensajes claros y evitar revelar si existe una cuenta en flujos sensibles.
- [ ] Configurar Google Sign-In por separado del correo transaccional y Calendar: cliente OAuth web, pantalla de consentimiento, dominios y callback exacto de Better Auth bajo `/api/autenticacion`.
- [ ] Activar `NEXT_PUBLIC_GOOGLE_AUTH_HABILITADO` sólo después de completar el flujo real y probar vinculación segura con usuarios de email/contraseña.
- [ ] Incorporar vista de sesiones/dispositivos y cierre individual/global.
- [ ] Implementar MFA para administración global y propietarios con operaciones sensibles; conservar códigos de recuperación de forma segura.
- [ ] Completar cambio de email con nueva verificación, baja/exportación de cuenta y transferencia de propiedad.
- [ ] Revisar rate limiting con almacenamiento compartido entre instancias; no depender sólo de memoria de una función.
- [ ] Mantener cookies HttpOnly/Secure/SameSite y validación de origen. Añadir protección automatizada ante abuso sin bloquear usuarios legítimos.

**Terminado cuando:** un usuario nuevo completa registro verificado, entra, recupera la contraseña y sale; un enlace viejo o sesión revocada ya no concede acceso.

Fuente: [Better Auth: opciones y orígenes](https://better-auth.com/docs/reference/options).

## 5. Correo transaccional y buzones — P0

Responsable: configuración y desarrollo.

Hay tres funciones diferentes: enviar correos de la aplicación, recibir consultas en soporte e ingresar con Google. Necesitan configuraciones distintas.

- [ ] Verificar `mail.turnosrapidos.com.ar` en Resend cuando NIC active el dominio y agregar allí sus registros SPF/DKIM en el DNS autoritativo.
- [ ] Configurar `RESEND_API_KEY` y `EMAIL_REMITENTE` en Railway (worker), verificar DNS del remitente en Resend y confirmar que no queden variables SMTP sin uso. Vercel sólo persiste los correos en PostgreSQL.
- [ ] Comprobar que Vercel encole correos, que Railway los entregue y revisar métricas de Resend con el dominio verificado.
- [ ] Crear buzones/alias operativos para soporte, facturación y contacto. Verificar recepción y respuesta, no sólo envíos.
- [ ] Verificar dominio/remitente y configurar SPF, DKIM y DMARC sin duplicar registros SPF. Usar los valores de cada proveedor.
- [ ] Separar reputación de correo transaccional y marketing cuando se incorpore marketing; evitar seguimiento innecesario en enlaces de recuperación.
- [ ] Guardar la clave Resend con acceso mínimo, sólo en los servicios que envían, y documentar rotación/revocación.
- [x] Incorporar una cola persistente PostgreSQL para encolar autenticación y reintentar fallos transitorios; recuperar trabajos abandonados y usar idempotencia.
- [ ] Crear plantillas HTML y texto accesibles: verificación, reset, bienvenida, confirmación, cambio/cancelación de turno, recordatorio, cobro y vencimiento.
- [ ] Mostrar en administración proveedor, identificador, estado, intentos, siguiente intento y errores; incorporar webhooks de entrega/rebote cuando el proveedor los ofrezca.
- [ ] Suprimir reenvíos a direcciones inválidas y gestionar quejas/bajas de marketing separadamente de mensajes necesarios del servicio.
- [ ] Probar en Gmail y Outlook con usuarios controlados, cabeceras de autenticación, enlaces HTTPS y fechas en zona del negocio.

**Terminado cuando:** todos los emails críticos llegan, los errores se ven en administración y se recuperan sin duplicar mensajes.

Fuentes: [Autenticación de correo recomendada por Google](https://support.google.com/mail/answer/81126), [cuotas de Gmail personal](https://support.google.com/mail/answer/22839), [tokens OAuth en Testing](https://developers.google.com/identity/protocols/oauth2), [dominios verificados en Resend](https://resend.com/docs/dashboard/domains/introduction).

## 6. Suscripción que los negocios pagan a TurnosRápidos — P0

Responsable: negocio, desarrollo y configuración. Depende del bloque 1.

Stripe y Mercado Pago son proveedores diferentes. Para la integración local elegida se configura Mercado Pago directamente. Stripe podría evaluarse después para expansión internacional; no es un paso necesario para habilitar Mercado Pago.

- [ ] Crear/configurar aplicación Mercado Pago de la plataforma y separar credenciales de pruebas/producción.
- [ ] Fijar entidad que cobra, moneda, datos fiscales, descripción reconocible del cargo y canal de soporte.
- [ ] Configurar planes, periodicidad, trial y reglas de cambio/actualización de precio conforme al contrato.
- [ ] Limitar contratación, cambio y cancelación a los roles autorizados; auditar operaciones.
- [ ] Crear intento de checkout persistente con idempotencia estable y bloqueo de duplicados. Un UUID nuevo por cada clic no evita múltiples suscripciones.
- [ ] No reemplazar el plan efectivo antes de que se cumpla la condición acordada para activarlo; distinguir plan solicitado, suscripción autorizada y período pagado.
- [ ] Validar estado, importe, moneda, referencia, cuenta receptora y ambiente consultando al proveedor desde servidor.
- [ ] Registrar cuota por período e historial del plan/precio aplicado. No mostrar el nombre del plan actual como si hubiera sido el de todos los cobros pasados.
- [ ] Procesar eventos de suscripción, cuota y pago; incorporar rechazo, reintento, mora, pausa, cancelación, reembolso y contracargo según productos usados.
- [ ] Receptor único con firma válida, límites de entrada, idempotencia persistente y procesamiento recuperable. Atender eventos duplicados, tardíos, desordenados y caídas entre recepción y procesamiento.
- [ ] Conciliar periódicamente con Mercado Pago para reparar eventos perdidos o cambios hechos fuera del panel.
- [ ] Separar cancelar renovación de acceso hasta final de período; mostrar la fecha efectiva.
- [ ] Definir prorrateo o cambio al siguiente ciclo y probar reactivación de suscripción cancelada, cambio de medio y renovación.
- [ ] Completar `/panel/planes` y `/panel/facturacion` con estado real, cobros, comprobantes y edición de datos facturables.
- [ ] No almacenar tarjetas/CVV; el proveedor gestiona ese medio de pago.
- [ ] Validar obligaciones fiscales y emisión del comprobante correspondiente; el registro interno de un pago no reemplaza automáticamente una factura fiscal.

**Terminado cuando:** alta, renovación, rechazo, cambio, baja y reembolso se reflejan correctamente, incluso repitiendo webhooks o interrumpiendo el procesamiento.

Fuentes: [Mercado Pago: eventos disponibles](https://www.mercadopago.com.ar/developers/es/docs/links-and-debts/additional-content/your-integrations/notifications), [cuotas recurrentes](https://www.mercadopago.com.ar/developers/es/reference/online-payments/subscriptions/get-authorized-payment/get), [facturación ARCA](https://www.arca.gob.ar/facturacion/comprobantes/).

## 7. Señas y pagos que el cliente hace al local — P0 si se ofrece

Responsable: negocio y desarrollo. Es un circuito distinto del pago del plan.

- [ ] Definir quién recibe el dinero: propuesta, cada negocio recibe sus cobros en su propia cuenta Mercado Pago.
- [ ] Implementar conexión OAuth de cada comercio, permisos mínimos, tokens cifrados, renovación y desconexión.
- [ ] Definir comisiones de plataforma si las hubiera y condiciones de liquidación; no mezclar fondos de locales con ingresos de suscripciones.
- [ ] Calcular seña fija/porcentual en servidor según servicio y guardar precio/duración históricos.
- [ ] Retener turno durante checkout, liberar al vencer y confirmar por pago verificado.
- [ ] Resolver pago aprobado después de que venza la retención: no crear dos turnos; compensar/reembolsar o derivar a atención según política.
- [ ] Gestionar pago parcial, saldo en el local, devolución parcial/total y cancelación.
- [ ] Conciliar cobro con reserva, recibo, caja y reportes sin duplicar ingresos.
- [ ] Mostrar importe total, seña, saldo, política de cancelación y responsable del servicio antes de confirmar.
- [ ] Asegurar que no exista una ruta alternativa que confirme una reserva con seña sin verificar el pago.

**Terminado cuando:** dos clientes que intentan pagar el mismo horario no obtienen dos reservas confirmadas y ningún cobro queda sin trazabilidad.

Fuente: [Mercado Pago OAuth para vendedores](https://www.mercadopago.com.ar/developers/es/docs/security/oauth/introduction).

## 8. Motor de reservas y experiencia del cliente — P0/P1

- [ ] Unificar reglas de disponibilidad usadas por web, agenda manual, API y Calendar.
- [ ] Cruzar horario del local, del profesional, servicios habilitados, duración, buffers, pausas, bloqueos y ocupaciones externas.
- [ ] Respetar que una persona no pueda atender simultáneamente en dos locales; definir tiempos de traslado si corresponde.
- [ ] Validar zona horaria, cambio de día/mes/año, turnos que terminan fuera del horario y eventos de día completo.
- [ ] Configurar anticipación mínima, horizonte máximo y ventana de cancelación/reprogramación por negocio.
- [ ] Manejar transacciones concurrentes, restricción de solapamiento y errores de serialización como conflicto entendible/reintentable.
- [ ] Agregar idempotencia para doble clic, reenvío por mala conexión y navegación atrás.
- [ ] Normalizar teléfono argentino e internacional con reglas explícitas; un icono de WhatsApp no demuestra que el número tenga WhatsApp.
- [ ] Evitar modificación de fichas ajenas por coincidencias de email/teléfono no verificados; resolver conflictos sin revelar datos de terceros.
- [ ] Incorporar enlace seguro y revocable para ver, cancelar o reprogramar la propia reserva. El código corto visible no debe ser la única autorización.
- [ ] Mostrar confirmación duradera, dirección, profesional, servicios, fecha, importe y código; permitir agregar al calendario mediante archivo/enlace.
- [ ] Avisar cambios al cliente y al negocio y anular recordatorios desactualizados.
- [ ] Probar estados sin horarios, local cerrado, profesional desactivado, falta de contacto, red cortada y pago pendiente.
- [ ] Añadir protección contra spam y retenciones abusivas con límites por IP/contacto/negocio y desafío adaptativo si hace falta.

**Terminado cuando:** la reserva completa funciona en móvil sin asistencia, y todas las formas de crear/modificar un turno respetan las mismas reglas.

## 9. Panel operativo del negocio — P1

- [ ] Completar estados de agenda, reprogramación, ausencias, bloqueo, vacaciones, feriados y horarios excepcionales.
- [ ] Implementar invitación/revocación de acceso al equipo; no confundir ficha profesional con credencial para entrar.
- [ ] Agregar rol de recepción si lo requiere el piloto y restringir a profesionales a los locales/turnos que les correspondan.
- [ ] Validar historial del cliente, notas, consentimientos, duplicados, exportaciones y archivo/baja definitiva con comportamiento consistente.
- [ ] Mantener servicios, precios, duración, seña y asignaciones sin cambiar retrospectivamente reservas vendidas.
- [ ] Conservar movimientos de stock auditables; completar mínimo, devolución, ajuste, compra, transferencia y consumo interno según alcance vendido.
- [ ] Separar venta de servicio/producto, forma de pago, saldo pendiente y atribución a profesional/local.
- [ ] Incorporar anulaciones mediante contramovimientos cuando corresponda; evitar borrar historia contable para corregir un error.
- [ ] Definir gastos, cierre de caja, diferencias y comisiones si se venderá control financiero completo. Actualmente el alta manual de caja sólo permite ingreso por pedido previo; no cambiar esa regla sin diseñar su reemplazo.
- [ ] Verificar Reportes por fechas, local y profesional contra operaciones reales conocidas.
- [ ] Importaciones con vista previa, errores por fila, límites reales, deduplicación y confirmación idempotente; exportaciones seguras frente a fórmulas.
- [ ] Añadir paginación y filtros del servidor conservados en la URL.

**Terminado cuando:** un local puede pasar un día de trabajo completo —crear turno, atender, cobrar, descontar stock y revisar cierre— con números reconciliables.

## 10. WhatsApp y entrega de notificaciones — P0 para vender Pro con WhatsApp

- [ ] Definir remitente: número central identificado como TurnosRápidos o número conectado de cada negocio. Son modelos diferentes de integración, costos y soporte.
- [ ] Configurar negocio/aplicación Meta, número, nombre visible, permisos, token adecuado y facturación del proveedor.
- [ ] Crear y aprobar plantillas transaccionales con idioma y variables correctas, identificando el negocio beneficiario.
- [ ] Obtener consentimiento explícito y registrarlo con alcance, fecha y origen; ofrecer baja. Una reserva no equivale a consentimiento de marketing.
- [ ] Implementar verificación inicial del webhook Meta y validación de firma sobre el cuerpo original.
- [ ] Guardar ID del mensaje y estados aceptado, entregado, leído o fallido cuando el proveedor los informe. Aceptado por API no significa entregado.
- [x] Añadir reintentos limitados con espera creciente y recuperación de avisos ENVIANDO abandonados.
- [ ] Definir cuotas/paquetes, vencimiento de créditos, costo real y bloqueo/aviso por saldo agotado antes de prometer mensajes ilimitados.
- [ ] Registrar consumo por negocio y canal; evitar que un negocio agote el presupuesto de toda la plataforma.
- [ ] Sustituir exclusión de un único slug demo por un control general del entorno y de cuentas de prueba.
- [ ] Revisión periódica de versión API, plantillas rechazadas, calidad, cuotas y reautorización.

**Terminado cuando:** se entregan confirmación y recordatorio aprobados, la cancelación detiene avisos pendientes, un fallo se recupera y cada costo queda atribuido.

Fuente: [Política oficial WhatsApp Business](https://business.whatsapp.com/policy). La documentación técnica de Cloud API devolvió 429 durante la consulta; validar los detalles del panel/versión antes de implementar.

## 11. Google Calendar, Maps y presencia local — P1

- [ ] Configurar Calendar OAuth y sus callbacks independientes de Sign-In; custodiar `INTEGRATIONS_ENCRYPTION_KEY` y plan de rotación.
- [ ] Confirmar alcance del producto: hoy se trabaja con calendarios creados por la aplicación, no con acceso general al calendario personal.
- [ ] Probar conexión, reconexión, revocación, token vencido, calendario borrado, evento de día completo y cambios fuera de la aplicación.
- [ ] Evitar duplicados en sincronización y exponer último éxito/error al negocio.
- [ ] Verificar pantalla OAuth, dominio, privacidad y publicación; completar verificación de permisos si aplica.
- [ ] Configurar Places con restricciones de clave/API, cuotas y alertas de gasto.
- [ ] Revisar atribución y condiciones de almacenamiento de datos de Maps/Places; no inventar reseñas ni publicar datos scrapeados como verificados.
- [ ] Validar Place ID/dirección, local sin ficha Google, links cortos y el enlace al tocar ubicación.
- [ ] Actualizar reseñas con frecuencia controlada y no en cada visita al sitio.

**Terminado cuando:** un cambio de turno no duplica eventos, las revocaciones se muestran y Maps abre el local correcto sin disparar consultas innecesarias.

Fuente: [Preparación OAuth Google](https://developers.google.com/identity/protocols/oauth2/production-readiness/brand-verification).

## 12. Cloudinary y ciclo de vida de imágenes — P0/P1

- [ ] Verificar preset firmado, formatos, transformación y credenciales del entorno.
- [ ] Probar logo, hero, profesional y producto desde producción.
- [ ] Aplicar permisos de carga y cuotas por negocio, frecuencia y espacio; los metadatos de tamaño enviados por el navegador no son prueba de los bytes reales.
- [ ] Validar el recurso real con el proveedor antes de asociarlo al negocio; guardar `public_id`/identificador estable, bytes, dimensiones, formato y propietario.
- [ ] Restringir URLs manuales a políticas explícitas de protocolo/dominio; evitar URLs arbitrarias que permitan seguimiento o contenido no admitido.
- [ ] Manejar carga interrumpida, reintento, reemplazo y archivos huérfanos con una tarea de limpieza segura.
- [ ] No borrar una imagen aún usada por una versión publicada cuando sólo se cambió el borrador.
- [ ] Elegir conservación y backup de originales según costos y necesidad; al borrar una cuenta, contemplar imágenes, caché y obligaciones de conservación.
- [ ] Servir tamaños adecuados, formatos modernos y carga diferida; no descargar un hero grande para un avatar.
- [ ] Verificar permisos de uso de fotos, logos y personas; diferenciar el ejemplo Manly de una cuenta real autorizada.
- [ ] Mantener R2 histórico hasta inventariar/migrar las referencias; sólo después retirar credenciales y código que ya no se use.

**Terminado cuando:** un negocio sólo administra sus archivos, reemplazar imágenes no rompe publicaciones y el consumo se puede medir y limitar.

## 13. Administración global de TurnosRápidos — P0 mínimo, P1 completo

Responsable: desarrollo. Es un panel interno distinto del administrador de una peluquería.

- [ ] Crear rol/permisos de plataforma separados de `RolMembresia`; alta de administradores sólo por procedimiento controlado.
- [ ] Proteger cada consulta/acción del servidor; MFA y reautenticación para acciones delicadas.
- [ ] Lista paginada y buscable de cuentas, usuarios, negocios, locales, propietario, fecha de alta, plan, prueba, próximo cobro y estado.
- [ ] Ficha de cuenta con consumo, último uso, integraciones, subdominios, pagos, avisos fallidos y actividad de soporte.
- [ ] Distinguir cuenta demo, prueba comercial, pagadora, en gracia, suspendida y baja solicitada.
- [ ] Permitir suspensión/reactivación, extensión de prueba y ajustes de derechos con motivo, vencimiento y registro de auditoría.
- [ ] No cambiar manualmente un pago a aprobado para otorgar acceso: separar concesión comercial excepcional de hechos del proveedor.
- [ ] Incorporar historial de cambios de plan/precio y conciliación de cobros.
- [ ] Panel de trabajos/webhooks fallidos con reintento autorizado e idempotente.
- [ ] Gestionar solicitudes de eliminación/exportación y reportes de contenido abusivo.
- [ ] Exportación mínima para operación/contabilidad con permisos propios y registro de acceso.
- [ ] Limitar información personal visible; nunca mostrar contraseñas, tokens o secretos.
- [ ] Si se incorpora acceso de soporte a cuentas, diseñar permiso explícito, duración limitada, indicador visible y auditoría; priorizar sólo lectura.
- [ ] Mantener auditoría de plataforma independiente de borrados del negocio; definir retención y anonimización.

**Terminado cuando:** el propietario de TurnosRápidos conoce cada cuenta y su estado sin editar SQL, y un administrador de local no puede abrir ni invocar esas funciones.

## 14. Métricas globales, gastos y rentabilidad — P1

Responsables: negocio y desarrollo. Separar finanzas de la plataforma y caja de los locales.

- [ ] Instrumentar altas, verificación, primer negocio, primera publicación, primera reserva y primera suscripción.
- [ ] Medir visitas → registro → activación → pago con eventos sin emails/teléfonos y respetando consentimiento aplicable.
- [ ] Medir cuentas activas semanales/mensuales y uso por módulo, sin registrar campos sensibles ni contenido libre.
- [ ] Mostrar MRR (ingreso recurrente mensual normalizado), nuevas altas pagas, expansión, reducción y bajas; excluir trials y cobros únicos del MRR.
- [ ] ARR estimado = MRR × 12; identificarlo como proyección, no dinero ya cobrado.
- [ ] ARPA = MRR / cuentas pagadoras; churn de cuentas = bajas del período / cuentas pagadoras al inicio. Definir períodos, exclusiones y denominadores en pantalla.
- [ ] Conversión de prueba por cohortes que ya pudieron completar la prueba; no dividir pagos de hoy por registros de hoy.
- [ ] Añadir cobrado bruto, devoluciones, comisiones, impuestos/retenciones, neto recibido y pendientes como conceptos distintos.
- [ ] Registrar gastos: proveedor, categoría, período del servicio, fecha de pago, moneda original, importe, impuestos, comprobante y recurrencia.
- [ ] Categorías: Vercel, Railway, DB/backups, Cloudinary, correo, WhatsApp, dominios, herramientas, marketing, soporte y honorarios.
- [ ] Conservar USD/ARS originales y cotización/fuente/fecha usada para conversión. No reescribir costos históricos cuando cambia el cambio.
- [ ] Separar gasto real facturado, estimación del mes en curso y presupuesto.
- [ ] Empezar con carga manual/CSV fiable de facturas; automatizar APIs de consumo donde realmente existan y estén permitidas.
- [ ] Calcular costo variable por negocio: mensajes, imágenes, almacenamiento y operaciones medibles; repartir costos comunes con un criterio visible.
- [ ] Mostrar margen de contribución por plan y resultado operativo según criterio contable acordado. No equiparar reservas de los locales con facturación de TurnosRápidos.
- [ ] Alertas de presupuesto/consumo con umbrales configurables y medidas documentadas; un aviso no equivale a un corte automático.
- [ ] Añadir CAC y recuperación de CAC cuando haya atribución y datos fiables; evitar un LTV aparentemente exacto sin historial suficiente.

**Terminado cuando:** el cierre de un mes se concilia con Mercado Pago y comprobantes de proveedores y se puede explicar de dónde sale cada indicador.

## 15. Experiencia visual, errores y accesibilidad — P1

- [ ] Crear 404 propia, conservando código HTTP 404, con retorno al lugar correcto para plataforma o micrositio.
- [ ] Diseñar error global/500, error de sección, sesión vencida, sin permiso, mantenimiento y servicios externos no disponibles.
- [ ] Diferenciar local inexistente, despublicado, plan vencido y falta de horarios con mensajes que no revelen datos privados.
- [ ] Asegurar que el borrador represente exactamente el componente publicado y sus reglas responsive.
- [ ] Comprobar guardado/publicación sin recarga completa y con estado de guardando, éxito, conflicto y error.
- [ ] Resolver edición simultánea/versionado para no sobrescribir silenciosamente el borrador de otra persona.
- [ ] Verificar dropdowns en cada apertura, foco, Escape, clic exterior, teclado y tacto.
- [ ] Mantener la duración pedida de un segundo en agenda y corregir las expectativas antiguas de tests/documentación.
- [ ] Revisar tamaños de controles, contraste, textos, labels, errores de formularios, foco visible, zoom y lectores de pantalla.
- [ ] Ofrecer una experiencia de movimiento reducido o una preferencia accesible conservando las animaciones normales. Revisar este punto con la decisión previa de animar siempre el calendario.
- [ ] Probar 320–1440 px, orientación horizontal, móvil de baja potencia, Chrome, Firefox y Safari/iOS.
- [ ] Unificar vocabulario, Pro/Plus/Gratis, precios, moneda, decimales, fechas y zona horaria.
- [ ] Limpiar páginas duplicadas, links rotos, botones sin acción y referencias a funciones todavía no habilitadas.

**Terminado cuando:** los recorridos principales funcionan con teclado y móvil, los errores tienen salida útil y no hay acciones falsas o estados de espera permanentes.

Referencia de calidad propuesta: [WCAG 2.2](https://www.w3.org/TR/wcag/), nivel AA; verificación manual además de herramientas automáticas.

## 16. SEO y presentación pública — P1

- [ ] Crear `robots.txt` y `sitemap.xml`; incluir sólo contenido público publicado y definir política por host.
- [ ] Añadir título, descripción, canonical y Open Graph por negocio/local; imagen social y favicons de tamaños adecuados.
- [ ] Evitar duplicación indexable entre `/sitio/slug` y el subdominio; planear redirecciones o canonical coherentes.
- [ ] Excluir de indexación panel, administración, borrador, pruebas y tokens de recuperación/reserva. Robots no sustituye permisos.
- [ ] Crear datos estructurados LocalBusiness/BarberShop/HairSalon según rubro, con datos reales y sin reseñas inventadas.
- [ ] Verificar Search Console y sitemap del dominio; controlar errores, páginas eliminadas y cambios de slug.
- [ ] Revisar textos alternativos, encabezados, enlaces, contacto y consistencia de nombre/dirección/teléfono.
- [ ] Alinear landing y precios con prestaciones realmente disponibles y documentar promociones/testimonios legítimos.

**Terminado cuando:** las páginas públicas se comparten con el contenido correcto y los buscadores reciben sólo URLs públicas canónicas.

## 17. Seguridad y aislamiento multiempresa — P0

- [ ] Inventariar rutas Next, Server Actions, Nest, worker y panel interno; identificar autenticación y rol requerido por operación.
- [ ] Probar acceso cruzado entre dos negocios para reservas, clientes, ventas, stock, imágenes, exportaciones, facturación e integraciones.
- [ ] Validar cada sede/profesional/servicio contra el negocio autenticado, no sólo la existencia del ID.
- [ ] Unificar validación de sesión, negocio activo, rol, local asignado y derechos del plan.
- [ ] Evitar rutas alternativas que permitan acciones rechazadas en la interfaz; CORS y ocultar botones no son autorización.
- [ ] Rate limiting distribuido para login, reset, registro, reservas, consultas de disponibilidad, firmas e importaciones; proteger costos además de CPU.
- [ ] Límites reales de cuerpo, filas, dimensiones y procesamiento, incluso sin Content-Length. Revisar archivos Excel comprimidos maliciosos.
- [ ] Revisar enlaces externos/redirecciones, protocolos, HTML, SQL parametrizado y acceso a URLs externas para evitar SSRF.
- [ ] Completar firma de webhooks, cuerpo original en Meta, validación de recurso en Mercado Pago y estrategia contra repetición compatible con reintentos legítimos.
- [ ] Añadir CSP compatible con Maps, Cloudinary y pagos; probar primero en modo reporte. Ya existen otros encabezados de seguridad.
- [ ] Evitar tokens y datos personales en logs, analytics, URL, trazas y capturas de sesión.
- [ ] Revisar cuenta de DB con privilegios mínimos, conexiones externas cifradas, backup y secretos diferenciados.
- [ ] Revisar historial del repositorio por secretos; `.gitignore` no elimina material previamente versionado. Rotar sólo las credenciales que correspondan a hallazgos.
- [ ] Dependencias actualizadas con análisis periódico, licencias y revisión de cambios; no hacer upgrades mayores indiscriminados antes de lanzar.
- [ ] Evaluar una revisión independiente antes de ampliar a muchos negocios o pagos relevantes.

**Terminado cuando:** tests de aislamiento/roles niegan todos los accesos cruzados, los endpoints duplicados están resueltos y no quedan hallazgos críticos/altos abiertos del alcance de lanzamiento.

Referencia: [OWASP ASVS](https://owasp.org/projects/asvs?tab=meet-the-asvs).

## 18. Privacidad, contratos, impuestos y contenido — P0

Responsables: negocio con asesoría legal/contable, más desarrollo de los mecanismos.

- [ ] Identificar titular/razón social, CUIT cuando corresponda, domicilio y contactos efectivos.
- [ ] Completar términos del SaaS: alcance, precio, trial, renovación, actualización, mora, baja, reembolsos, soporte, disponibilidad y responsabilidades.
- [ ] Completar privacidad con categorías de datos, finalidades, base aplicable, destinatarios, conservación y derechos.
- [ ] Distinguir el rol de TurnosRápidos respecto de cuentas propias y datos que cada negocio administra de sus clientes; documentar contrato de tratamiento cuando corresponda.
- [ ] Inventariar subencargados/proveedores y ubicación/transferencias internacionales; validar el mecanismo aplicable, especialmente por uso de servicios fuera de Argentina.
- [ ] Revisar obligaciones de registro de bases y medidas de seguridad con AAIP según actividad/datos concretos.
- [ ] Guardar versión/fecha de aceptación de términos y prueba del consentimiento cuando se requiera; Google login también debe cubrir el alta contractual.
- [ ] Implementar mecanismos efectivos de acceso, corrección, exportación y supresión; excepciones de conservación fiscal y tratamiento en backups documentadas.
- [ ] Separar consentimiento de mensajes transaccionales, WhatsApp y marketing. Implementar preferencias/baja y no usar casillas preseleccionadas para permisos opcionales.
- [ ] Inventariar cookies y medición; aplicar aviso y consentimiento cuando corresponda a tecnologías, fines y jurisdicciones reales.
- [ ] Evaluar botones de baja/arrepentimiento y sus excepciones B2B/por servicio bajo normativa vigente. No copiar una regla derogada ni asumir que todo SaaS B2B tiene idénticas obligaciones.
- [ ] Validar condiciones fiscales, facturación, moneda, IVA y qué comprobante emite plataforma versus local. Evitar textos fiscales no respaldados por la situación real.
- [ ] Definir condiciones de cancelación/no-show/seña del local y mostrarlas antes de la reserva.
- [ ] Verificar permisos de fotos, logos, contenido de Manly, testimonios y reseñas; una foto pública no acredita licencia de reutilización.
- [ ] Definir qué rubros admite la versión. Si se agregan datos de salud o historias clínicas, requieren evaluación y controles adicionales; la personalización de un icono no habilita ese uso especializado.
- [ ] Definir respuesta ante incidentes, canal de privacidad y obligaciones de comunicación aplicables.

**Terminado cuando:** textos revisados describen lo que el sistema hace y los derechos/bajas se pueden ejecutar, no sólo leer.

Fuentes: [Ley 25.326 vigente](https://www.argentina.gob.ar/normativa/nacional/64790/actualizacion), [AAIP: transferencias internacionales](https://www.argentina.gob.ar/transferencias-internacionales), [Disposición 954/2025](https://www.argentina.gob.ar/normativa/nacional/norma-417152/texto) y [su modificación 3/2026](https://www.argentina.gob.ar/normativa/nacional/disposici%C3%B3n-3-2026-423007/texto), [ARCA comprobantes](https://www.arca.gob.ar/facturacion/comprobantes/).

## 19. Rendimiento y capacidad — P1, límites básicos P0

- [ ] Medir producción desde Argentina, móvil y red lenta; separar tiempo de build, servidor, red, imágenes y navegador.
- [ ] Objetivos públicos: LCP ≤ 2,5 s, INP ≤ 200 ms y CLS ≤ 0,1 en percentil 75 de usuarios reales, cuando exista volumen suficiente.
- [ ] Definir presupuesto medible para disponibilidad de horarios, creación de reserva, login y panel; medir percentil 95 y tasa de error, no sólo promedio.
- [ ] Reemplazar listados sin límite por paginación y búsqueda indexable del servidor; limitar rangos de reportes y descargar exportaciones grandes por tarea asíncrona.
- [ ] Medir consultas con datos representativos y planes SQL; mantener restricciones de integridad. No agregar índices sin observar consultas.
- [ ] Controlar cantidad total de conexiones Prisma al escalar funciones; evaluar pooling compatible con transacciones, migraciones y pg-boss.
- [ ] Alinear regiones web/DB/worker y medir latencia/costos antes de mover infraestructura.
- [ ] Revisar `select`, agregaciones SQL, consultas repetidas y caché sólo donde corresponda.
- [ ] Aislar caché pública por negocio/host/versión; invalidar al publicar y evitar servir disponibilidad obsoleta como confirmación definitiva.
- [ ] Dividir JS pesado de calendario, exportaciones y edición; reducir fuentes/pesos no usados e imágenes iniciales.
- [ ] Mantener feedback de carga sin demoras artificiales que oculten una página ya disponible.
- [ ] Procesar escaneos del worker por lotes, con índices y cuotas; evitar recorrer todo el histórico cada minuto.
- [ ] Probar concurrencia y recuperación en staging: reservar el mismo horario, ventas con stock bajo y múltiples webhooks simultáneos.

**Terminado cuando:** las métricas cumplen objetivos con volumen definido y no aparecen dobles reservas, agotamiento de conexiones ni consumo inesperado.

Fuentes: [Core Web Vitals](https://web.dev/articles/vitals), [límite de payload Vercel](https://vercel.com/docs/functions/limitations). El warning de npm de 11 segundos pertenece al proceso de instalación; no mide estas métricas.

## 20. Backups, recuperación y conservación — P0

- [ ] Activar backups automáticos de PostgreSQL/volumen según plan y verificar retención, cifrado y acceso.
- [ ] Evaluar recuperación a un instante si el objetivo de pérdida de datos lo requiere; no asumir que un snapshot diario equivale a PITR.
- [ ] Mantener copia recuperable fuera de la dependencia principal cuando lo justifique el riesgo; documentar costo.
- [ ] Definir RPO (cuántos datos se tolera perder) y RTO (cuánto tiempo se tolera estar caído). Acordarlos con el uso real, no prometer cifras no ensayadas.
- [ ] Restaurar una copia en entorno aislado y comprobar usuarios, reservas, pagos, integraciones y referencias a imágenes.
- [ ] Respaldar configuración operativa y claves de cifrado por un canal seguro; una DB con tokens cifrados no basta si se pierde la clave.
- [ ] Probar recuperación de archivos Cloudinary y de URLs históricas R2 según su política.
- [ ] Diferenciar rollback de código y recuperación de DB; usar migraciones compatibles y no destruir datos al volver una versión.
- [ ] Documentar bajas, archivo, eliminación, purga de eventos/logs y conservación de comprobantes.
- [ ] Programar ejercicios periódicos y alertas si falla la copia o está demasiado vieja.

**Terminado cuando:** se ha restaurado exitosamente un backup reciente y se conoce el tiempo real de recuperación.

Fuente: [Railway backups](https://docs.railway.com/volumes/backups).

## 21. Observabilidad, soporte y operación — P0 mínimo/P1 completo

- [ ] Centralizar errores de navegador, web, API y worker con entorno, versión e ID de solicitud; filtrar datos sensibles.
- [ ] Medir salud funcional: página responde, DB accesible, cola procesando y último éxito de sincronización/avisos.
- [ ] Alertar por tasa de 5xx, cola atrasada, cobros no procesados, DB sin espacio/conexiones, errores OAuth y crecimiento de costos.
- [ ] Preparar procedimientos para caída de DB, proveedor de pagos, correo, WhatsApp, dominio/certificado y filtración de credenciales.
- [ ] Tener interruptores por función para suspender una integración defectuosa sin bloquear todo el panel.
- [ ] Crear canal de soporte real, responsable, horarios y objetivos de respuesta alcanzables.
- [ ] Publicar ayuda de registro, servicios, horarios, reservas, pagos, cancelación y exportación con capturas reales.
- [ ] Incorporar aviso de estado/incidentes y mantenimiento; proteger rutas de monitoreo sin exponer datos.
- [ ] Preparar respuestas de soporte y registro de solicitudes; no pedir contraseñas ni tokens para ayudar.
- [ ] Establecer revisiones semanales de entregas fallidas/costos y mensuales de acceso, backups y dependencias.

**Terminado cuando:** un fallo relevante genera una alerta accionable y hay un procedimiento ensayado para resolverlo.

## 22. Pruebas, automatización y entrega — P0/P1

- [ ] Corregir la prueba desactualizada de 500 ms sin revertir el requisito de animación de 1000 ms.
- [ ] Agregar CI del repositorio para lint, tipos, pruebas unitarias, build y verificación de migraciones.
- [ ] Ejecutar integración con DB efímera y dos negocios aislados, nunca con la base de producción.
- [ ] Crear fixtures controladas de roles y planes; cubrir acciones directas, no sólo botones visibles.
- [ ] E2E: registro/verificación, login, onboarding, publicación, reserva, reprogramación, baja, cobro, stock, permisos y exportación.
- [ ] Pruebas de proveedor: pago aprobado/rechazado, webhook duplicado/desordenado, Resend no disponible, token revocado y Cloudinary no disponible.
- [ ] Probar expiración de trial, fin de gracia, baja al final del período, cuotas y downgrade.
- [ ] Probar inicios simultáneos de checkout, creación de negocios y reserva del mismo hueco.
- [ ] Pruebas visuales y manuales de dropdowns repetidos, vista previa, logo, espaciado y animaciones; no tomar sólo una captura estática como prueba de movimiento.
- [ ] Matriz de navegadores con Safari móvil y teclado; evaluación de accesibilidad y navegación con red inestable.
- [ ] Protección de ramas, revisión de cambios sensibles y despliegue sólo con validaciones requeridas.
- [ ] Confirmar que Vercel, API y worker usan el commit esperado y que se aplicaron las migraciones correspondientes.
- [ ] Checklist de release, prueba posterior al deploy y rollback ensayado.

Resultado de esta revisión: `pnpm lint` pasó. `pnpm audit --prod --json` informó cero vulnerabilidades conocidas en la consulta (no certifica seguridad de la aplicación). `pnpm test` falló por la expectativa 500/1000: web 50 aprobadas, 1 fallida y 1 integración omitida deliberadamente; worker 3 aprobadas. Turbo reutilizó resultados previos de API y Google Calendar: no se presenta eso como nueva ejecución de esas suites. No se ejecutó E2E ni carga sobre producción.

## 23. Piloto y apertura comercial — P0 para apertura general

- [ ] Seleccionar dos o tres negocios piloto autorizados con características distintas: uno pequeño, uno con varios profesionales y uno multilocal.
- [ ] Cargar datos propios/autorizados y bloquear mensajes/cobros de cuentas ficticias.
- [ ] Acompañar registro → configuración → primera reserva → atención → cobro → reporte.
- [ ] Ensayar un día real y al menos un ciclo de facturación simulado; observar qué funciones generan errores o asistencia.
- [ ] Medir activación, reservas completadas, incidencias y tiempo de soporte; priorizar problemas observados.
- [ ] Confirmar precio, costos variables y margen antes de ampliar anuncios o WhatsApp incluido.
- [ ] Corregir bloqueantes y abrir por grupos; no convertir datos demo o reseñas falsas en referencias comerciales.
- [ ] Establecer responsable de guardia, canal de incidentes, backups y presupuesto antes de promocionar públicamente.

**Terminado cuando:** negocios piloto pueden operar sin intervención técnica habitual y las funciones cobradas están probadas de extremo a extremo.

## 24. Mejoras del rubro y crecimiento — P2, salvo que ya se vendan

La comparación con productos del rubro confirma la relevancia de reservas móviles, señas, control de ausencias, permisos, historial y stock. Las siguientes opciones son oportunidades a validar con clientes, no requisitos universales:

- [ ] Lista de espera que ofrece cancelaciones con plazo de aceptación.
- [ ] Repetición de turnos y sugerencia de próxima visita.
- [ ] Turnos encadenados con distintos profesionales y recursos compartidos (sillón, cabina, equipo).
- [ ] Duración/precio por profesional, variantes y complementos.
- [ ] Comisiones por servicio/producto, liquidaciones y propinas con reglas verificables.
- [ ] Paquetes de sesiones, membresías del local, cupones, gift cards y fidelización; tener modelos Prisma no equivale a tener el flujo.
- [ ] Informes de retención, ausentismo, ocupación, ticket promedio y margen por servicio.
- [ ] Campañas de reactivación y cumpleaños con consentimiento y presupuesto.
- [ ] Solicitud de reseña posterior a asistencia sin manipular ni inventar opiniones.
- [ ] QR por local/profesional, enlaces con atribución y reservas desde redes.
- [ ] PWA instalable y notificaciones push si la demanda lo justifica; modo offline con límites explícitos y sin confirmar reservas sin servidor.
- [ ] Dominio propio del cliente con prueba de titularidad, certificado, verificación periódica y desvinculación segura.
- [ ] API pública/webhooks de clientes con permisos, tokens, límites y documentación.
- [ ] Integraciones fiscales, contables y otros calendarios según mercado.
- [ ] Idiomas, monedas y países adicionales con adaptación horaria/fiscal y proveedores compatibles.
- [ ] Agendamiento grupal o rubros especializados sólo con modelo de capacidad y privacidad apropiado.
- [ ] Asistente conversacional/IA después de estabilizar permisos, reservas y costos; nunca confirmar disponibilidad basándose sólo en texto generado.

Fuentes de comparación: [Fresha: reserva, señas y lista de espera](https://www.fresha.com/help-center/academy/get-booked-online/accept-online-bookings/lessons/100352), [permisos del equipo](https://www.fresha.com/help-center/knowledge-base/team/101715-assign-permission-roles-to-team-members), [stock mínimo](https://www.fresha.com/help-center/knowledge-base/inventory/156-set-up-stock-quantity-tracking). Se consultan como ejemplos de producto, no como prueba de que TurnosRápidos ya los implementa.

## Orden de ejecución y dependencias

| Etapa | Resultado | Dependencias principales |
| --- | --- | --- |
| A. Ahora, sin dominio | Origen de acceso, modelo comercial, cierre de rutas inseguras, entornos y tests base | Código y paneles de despliegue |
| B. Dominio activo | Cloudflare/Vercel, HTTPS, URLs finales, correo autenticado y callbacks OAuth | Dominio administrable |
| C. Núcleo confiable | Permisos, múltiples negocios, onboarding, reserva completa y recuperación | A; correo de B para nuevos usuarios |
| D. Monetización | Suscripciones reconciliadas, límites, señas si se ofrecen, WhatsApp Pro | Modelo de A, C y proveedores |
| E. Operación profesional | Admin, métricas/gastos, backups restaurados, alertas, legales, 404/SEO | Modelo estable y flujos instrumentados |
| F. Validación y piloto | E2E/carga/accesibilidad, pilotos y corrección de bloqueantes | Todas las prestaciones del alcance |
| G. Crecimiento | Funciones P2 priorizadas con evidencia de uso | Producto operable y rentable |

Parte de E —backups, legales, observabilidad y administración mínima— comienza durante A/C; no se espera al final para proteger datos o tramitar cuentas externas.

## Qué se puede avanzar antes de recibir el dominio

1. Corregir configuración de origen temporal y confirmar migraciones/base conectada.
2. Definir modelo cuenta/negocio/local y política exacta de planes.
3. Unificar/proteger endpoints de Nest y Next y completar roles.
4. Corregir prueba desactualizada y preparar CI con DB de pruebas.
5. Diseñar e implementar administración global y estructura de gastos.
6. Preparar correos/plantillas, pago de suscripción, webhooks y estados sin cobros reales.
7. Crear 404, errores, robots/sitemap preparados para dominio final y mejoras de paginación.
8. Preparar textos legales con datos del titular, circuito de baja y tratamiento de datos.
9. Activar y ensayar backups en un entorno aislado; preparar alertas y documentación.
10. Configurar cuentas de proveedores y ambientes de prueba; dejar DNS/remitentes/callbacks definitivos para cuando puedan verificarse.

## Criterios finales para declarar terminada la versión 1.0

- [ ] Cero hallazgos críticos/altos abiertos en recorridos y endpoints incluidos en el lanzamiento.
- [ ] Registro, verificación, acceso y recuperación funcionando con entrega de correo comprobada.
- [ ] Aislamiento entre negocios y permisos de cada rol probados desde servidor.
- [ ] Dominio y subdominios con certificado y renovación comprobables.
- [ ] Reserva completa, concurrencia, cambios/cancelación y notificaciones comprobados.
- [ ] Cada prestación anunciada/cobrada disponible o explícitamente excluida del lanzamiento antes de contratar.
- [ ] Planes y pagos con historial, conciliación, límites y baja correcta.
- [ ] Admin global, soporte, alertas y gastos operativos mínimos disponibles.
- [ ] Copia restaurada, rollback ensayado y responsables definidos.
- [ ] Legales revisados, consentimiento, privacidad, retención y eliminación implementados.
- [ ] Pruebas automatizadas requeridas aprobadas; móvil, accesibilidad y rendimiento medidos.
- [ ] Pilotos completados con datos autorizados y sin bloqueantes.

Después de la versión 1.0 siguen mantenimiento, revisiones de seguridad, costos, backups, vencimientos y cambios de proveedores. Eso forma parte de operar el servicio y debe quedar presupuestado.
