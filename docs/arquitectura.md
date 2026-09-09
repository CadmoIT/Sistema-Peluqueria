<!-- Explica las decisiones de arquitectura y los limites iniciales del sistema. -->

# Arquitectura de TurnosRapidos

TurnosRapidos usa un monolito modular para mantener transacciones simples sin cerrar el camino al escalado horizontal. `web` contiene las experiencias visuales, `api` concentra reglas de negocio y autorizacion, y `worker` procesa notificaciones y tareas diferidas.

Cada registro empresarial lleva `negocioId`. El servidor obtiene ese contexto desde la sesion o el hostname y nunca confia en un identificador enviado libremente por el cliente. La separacion se comprueba con pruebas automatizadas.

## Dominios durante la prueba

En desarrollo no hace falta comprar un dominio:

- Landing: `http://localhost:3000`
- Panel: `http://localhost:3000/panel`
- Sitio demo: `http://localhost:3000/sitio/manly-barber`
- API: `http://localhost:3001/api/v1`

La activación de `turnosrapidos.com.ar`, el wildcard `*.site.turnosrapidos.com.ar` y los dominios de clientes se deja para la última etapa. El modelo `Dominio` ya conserva host, verificación y modalidad; la resolución por hostname se implementará junto con el despliegue del wildcard, sin cambiar las páginas públicas.

## Capas de la API

La API usa una estructura horizontal explícita, elegida para que una persona nueva pueda seguir una petición de arriba hacia abajo:

1. `controllers`: recibe HTTP y no contiene reglas empresariales.
2. `dto` y `validators`: revisan forma y reglas de entrada.
3. `services`: ejecuta cada caso de uso.
4. `domain`: modela estados y comportamiento empresarial.
5. `repositories/contracts`: declara qué persistencia necesita cada servicio.
6. `repositories/memory`: implementación temporal para la demostración.
7. `modules`: conecta clases mediante la inyección de dependencias de NestJS.

Cuando se conecte PostgreSQL, se agregarán repositorios Prisma que implementen los mismos contratos. El resto del recorrido no debe cambiar.

## Convenciones

- Nombres del dominio, documentación y comentarios en español.
- Identificadores tecnicos exigidos por frameworks conservan su nombre oficial.
- Cada archivo humano y comentable empieza con una descripcion breve.
- Los módulos no acceden directamente a tablas de otro módulo: usan sus servicios públicos.
