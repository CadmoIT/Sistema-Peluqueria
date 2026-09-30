/** Permite usar un comprador ficticio sin cambiar el correo de autenticación. */
export function obtenerCorreoCompradorMercadoPago(
  correoUsuario: string,
  correoPrueba?: string,
): string {
  const correo = correoPrueba?.trim().toLowerCase();
  if (!correo) return correoUsuario;
  if (!/^test_user_[0-9]+@testuser\.com$/.test(correo)) {
    throw new Error("MERCADOPAGO_TEST_PAYER_EMAIL debe ser el correo de un comprador de prueba.");
  }
  return correo;
}
