/** Confía únicamente en el email que Google declara verificado en el perfil autenticado. */
export const politicaVerificacionGoogle = {
  requireEmailVerification: true,
  // Actualiza también la instancia de usuario del callback para cuentas Google antes pendientes.
  overrideUserInfoOnSignIn: true,
  mapProfileToUser: (perfil: { email_verified?: boolean }) => ({
    emailVerified: perfil.email_verified === true,
  }),
};
