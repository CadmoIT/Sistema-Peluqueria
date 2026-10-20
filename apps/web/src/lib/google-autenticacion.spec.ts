/** Comprueba el acceso Google y contraseña sin credenciales externas ni base productiva. */
import assert from "node:assert/strict";
import { test } from "node:test";
import { betterAuth } from "better-auth";
import { memoryAdapter } from "better-auth/adapters/memory";
import { politicaVerificacionGoogle } from "./google-autenticacion";

function entorno(verificado: boolean) {
  const datos: {
    user: Record<string, unknown>[];
    account: Record<string, unknown>[];
    session: Record<string, unknown>[];
    verification: Record<string, unknown>[];
  } = {
    user: [],
    account: [],
    session: [],
    verification: [],
  };
  let correos = 0;
  const auth = betterAuth({
    baseURL: "http://localhost:3000",
    secret: "prueba-local-google-sin-secretos-productivos-2026",
    database: memoryAdapter(datos),
    emailAndPassword: { enabled: true, requireEmailVerification: true },
    emailVerification: {
      sendOnSignUp: true,
      sendVerificationEmail: async () => {
        correos++;
      },
    },
    socialProviders: {
      google: {
        clientId: "cliente-de-prueba.apps.googleusercontent.com",
        clientSecret: "solo-prueba",
        ...politicaVerificacionGoogle,
        // Simula exclusivamente la respuesta del proveedor en este test; producción conserva la validación OAuth real.
        verifyIdToken: async () => true,
        getUserInfo: async () => ({
          user: {
            name: "Prueba",
            email: "google@example.com",
            image: "https://example.com/perfil.png",
            ...politicaVerificacionGoogle.mapProfileToUser({
              email_verified: verificado,
            }),
          },
          data: {
            sub: "google-prueba",
            aud: "cliente-de-prueba.apps.googleusercontent.com",
            azp: "cliente-de-prueba.apps.googleusercontent.com",
            email: "google@example.com",
            email_verified: verificado,
            name: "Prueba",
            given_name: "Prueba",
            family_name: "",
            picture: "https://example.com/perfil.png",
            locale: "es",
            iat: 1,
            exp: 9999999999,
            iss: "https://accounts.google.com",
          },
        }),
      },
    },
  });
  const llamar = async (ruta: string, body: unknown) =>
    auth.handler(
      new Request(`http://localhost:3000/api/auth/${ruta}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: "http://localhost:3000",
        },
        body: JSON.stringify(body),
      }),
    );
  return {
    datos,
    llamar,
    correos: () => correos,
    verificarGoogle: () => {
      verificado = true;
    },
    google: async () => {
      const contexto = await auth.$context;
      const proveedor = contexto.socialProviders.find(
        (p) => p.id === "google",
      )!;
      proveedor.validateAuthorizationCode = async () => ({
        accessToken: "token-solo-test",
      });
      const inicio = await llamar("sign-in/social", {
        provider: "google",
        disableRedirect: true,
        callbackURL: "http://localhost:3000/ok",
      });
      const { url } = (await inicio.json()) as { url: string };
      const state = new URL(url).searchParams.get("state")!;
      const cookie = inicio.headers
        .getSetCookie()
        .map((c) => c.split(";")[0])
        .join("; ");
      const respuesta = await auth.handler(
        new Request(
          `http://localhost:3000/api/auth/callback/google?code=prueba&state=${encodeURIComponent(state)}`,
          { headers: { Cookie: cookie } },
        ),
      );
      const destino = respuesta.headers.get("location") ?? "";
      return new Response(destino, {
        status: destino === "http://localhost:3000/ok" ? 200 : 403,
      });
    },
  };
}

test("Google verificado crea sesión sin enviar confirmación adicional", async () => {
  const e = entorno(true);
  const respuesta = await e.google();
  assert.equal(respuesta.status, 200, await respuesta.clone().text());
  assert.equal(e.datos.user[0]?.emailVerified, true);
  assert.equal(e.datos.session.length, 1);
  assert.equal(e.correos(), 0);
});
test("Google sin email verificado no obtiene sesión", async () => {
  const e = entorno(false);
  const respuesta = await e.google();
  assert.notEqual(respuesta.status, 200);
  assert.equal(e.datos.session.length, 0);
  assert.equal(e.datos.user[0]?.emailVerified, false);
});
test("una cuenta pendiente puede verificar su email al volver a ingresar con Google", async () => {
  const e = entorno(false);
  assert.notEqual((await e.google()).status, 200);
  assert.equal(e.datos.user[0]?.emailVerified, false);
  const id = e.datos.user[0]?.id;
  const antes = e.correos();
  e.verificarGoogle();
  assert.equal((await e.google()).status, 200);
  assert.equal(e.datos.user.length, 1);
  assert.equal(e.datos.user[0]?.id, id);
  assert.equal(e.datos.user[0]?.emailVerified, true);
  assert.equal(e.correos(), antes);
  assert.equal((await e.google()).status, 200);
  assert.equal(e.datos.user.length, 1);
});
test("no vincula automáticamente una cuenta con contraseña todavía sin verificar", async () => {
  const e = entorno(true);
  await e.llamar("sign-up/email", {
    name: "Prueba",
    email: "google@example.com",
    password: "SoloPrueba-2026!",
  });
  assert.notEqual((await e.google()).status, 200);
  assert.equal(e.datos.session.length, 0);
});
test("el registro con contraseña conserva el requisito de confirmar email", async () => {
  const e = entorno(true);
  await e.llamar("sign-up/email", {
    name: "Prueba",
    email: "clave@example.com",
    password: "SoloPrueba-2026!",
  });
  const respuesta = await e.llamar("sign-in/email", {
    email: "clave@example.com",
    password: "SoloPrueba-2026!",
  });
  assert.equal(respuesta.status, 403);
  assert.equal(e.datos.session.length, 0);
  assert.equal(e.correos(), 1);
});
