# Acceso con Google

El callback OAuth utiliza `email_verified === true` del perfil autenticado por Google para habilitar el acceso sin un segundo correo de Turnos Rápidos. No se confía en un email escrito por el navegador ni se omite la validación OAuth del proveedor.

- El registro e ingreso con contraseña conservan la verificación por correo.
- Un email Google no verificado conserva la confirmación adicional y no obtiene sesión automáticamente.
- Las cuentas Google ya vinculadas que quedaron pendientes se actualizan al reintentar el ingreso con Google. No hay migración ni verificación masiva de usuarios históricos.
- Se actualiza el perfil personal Google en el callback para que la nueva verificación esté disponible en ese mismo ingreso. Esto no modifica el negocio, profesionales ni permisos.
- Una cuenta local con contraseña todavía sin verificar no se vincula automáticamente por coincidencia de email; se conserva la protección de Better Auth.

Las pruebas en memoria recorren el callback OAuth con un proveedor simulado: alta verificada sin correo adicional, Google no verificado, cuenta Google pendiente y reintento, protección de vinculación y registro con contraseña. No usan credenciales, correos ni base productiva. El inicio real con Google debe comprobarlo el titular después de publicar.
