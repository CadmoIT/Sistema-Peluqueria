-- Crea el esquema relacional inicial y protege la agenda contra solapamientos.
-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "RolMembresia" AS ENUM ('DUENO', 'ADMINISTRADOR', 'PROFESIONAL');

-- CreateEnum
CREATE TYPE "EstadoReserva" AS ENUM ('BORRADOR', 'RETENIDA', 'PENDIENTE_PAGO', 'CONFIRMADA', 'COMPLETADA', 'AUSENTE', 'CANCELADA', 'VENCIDA');

-- CreateEnum
CREATE TYPE "EstadoSuscripcion" AS ENUM ('CONFIGURACION_GRATUITA', 'ACTIVA', 'EN_GRACIA', 'PAUSADA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "EstadoPago" AS ENUM ('PENDIENTE', 'APROBADO', 'RECHAZADO', 'REEMBOLSADO', 'REEMBOLSADO_PARCIAL');

-- CreateEnum
CREATE TYPE "TipoMovimientoStock" AS ENUM ('INGRESO', 'VENTA', 'CONSUMO', 'AJUSTE', 'DEVOLUCION', 'RESERVA', 'LIBERACION');

-- CreateEnum
CREATE TYPE "TipoMovimientoCaja" AS ENUM ('INGRESO', 'EGRESO', 'APERTURA', 'CIERRE', 'AJUSTE');

-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerificado" BOOLEAN NOT NULL DEFAULT false,
    "imagen" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sesion" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiraEn" TIMESTAMP(3) NOT NULL,
    "ip" TEXT,
    "agente" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sesion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CuentaOAuth" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "proveedor" TEXT NOT NULL,
    "cuentaProveedorId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiraEn" TIMESTAMP(3),
    "refreshTokenExpiraEn" TIMESTAMP(3),
    "alcance" TEXT,
    "contrasena" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CuentaOAuth_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Verificacion" (
    "id" TEXT NOT NULL,
    "identificador" TEXT NOT NULL,
    "valor" TEXT NOT NULL,
    "expiraEn" TIMESTAMP(3) NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Verificacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Negocio" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "telefono" TEXT,
    "email" TEXT,
    "zonaHoraria" TEXT NOT NULL DEFAULT 'America/Argentina/Buenos_Aires',
    "publicado" BOOLEAN NOT NULL DEFAULT false,
    "configuracion" JSONB,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Negocio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Membresia" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "negocioId" TEXT NOT NULL,
    "rol" "RolMembresia" NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Membresia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sede" (
    "id" TEXT NOT NULL,
    "negocioId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "direccion" TEXT NOT NULL,
    "telefono" TEXT,
    "latitud" DECIMAL(10,7),
    "longitud" DECIMAL(10,7),
    "activa" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Sede_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HorarioSede" (
    "id" TEXT NOT NULL,
    "negocioId" TEXT NOT NULL,
    "sedeId" TEXT NOT NULL,
    "diaSemana" INTEGER NOT NULL,
    "abre" TEXT NOT NULL,
    "cierra" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "HorarioSede_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CategoriaServicio" (
    "id" TEXT NOT NULL,
    "negocioId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CategoriaServicio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Servicio" (
    "id" TEXT NOT NULL,
    "negocioId" TEXT NOT NULL,
    "categoriaId" TEXT,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "precio" DECIMAL(12,2) NOT NULL,
    "duracionMinutos" INTEGER NOT NULL,
    "bufferMinutos" INTEGER NOT NULL DEFAULT 0,
    "porcentajeSena" DECIMAL(5,2),
    "imagen" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Servicio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Combo" (
    "id" TEXT NOT NULL,
    "negocioId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "precio" DECIMAL(12,2) NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Combo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComboServicio" (
    "comboId" TEXT NOT NULL,
    "servicioId" TEXT NOT NULL,
    "orden" INTEGER NOT NULL,

    CONSTRAINT "ComboServicio_pkey" PRIMARY KEY ("comboId","servicioId")
);

-- CreateTable
CREATE TABLE "Profesional" (
    "id" TEXT NOT NULL,
    "negocioId" TEXT NOT NULL,
    "membresiaId" TEXT,
    "nombre" TEXT NOT NULL,
    "biografia" TEXT,
    "foto" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Profesional_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfesionalSede" (
    "profesionalId" TEXT NOT NULL,
    "sedeId" TEXT NOT NULL,

    CONSTRAINT "ProfesionalSede_pkey" PRIMARY KEY ("profesionalId","sedeId")
);

-- CreateTable
CREATE TABLE "ProfesionalServicio" (
    "profesionalId" TEXT NOT NULL,
    "servicioId" TEXT NOT NULL,

    CONSTRAINT "ProfesionalServicio_pkey" PRIMARY KEY ("profesionalId","servicioId")
);

-- CreateTable
CREATE TABLE "HorarioProfesional" (
    "id" TEXT NOT NULL,
    "negocioId" TEXT NOT NULL,
    "profesionalId" TEXT NOT NULL,
    "sedeId" TEXT NOT NULL,
    "diaSemana" INTEGER NOT NULL,
    "comienza" TEXT NOT NULL,
    "termina" TEXT NOT NULL,

    CONSTRAINT "HorarioProfesional_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BloqueoAgenda" (
    "id" TEXT NOT NULL,
    "negocioId" TEXT NOT NULL,
    "profesionalId" TEXT NOT NULL,
    "inicio" TIMESTAMPTZ NOT NULL,
    "fin" TIMESTAMPTZ NOT NULL,
    "motivo" TEXT,

    CONSTRAINT "BloqueoAgenda_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cliente" (
    "id" TEXT NOT NULL,
    "negocioId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT,
    "telefono" TEXT NOT NULL,
    "notas" TEXT,
    "aceptaWhatsapp" BOOLEAN NOT NULL DEFAULT false,
    "puntos" INTEGER NOT NULL DEFAULT 0,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Cliente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reserva" (
    "id" TEXT NOT NULL,
    "negocioId" TEXT NOT NULL,
    "sedeId" TEXT NOT NULL,
    "profesionalId" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "estado" "EstadoReserva" NOT NULL DEFAULT 'BORRADOR',
    "inicio" TIMESTAMPTZ NOT NULL,
    "fin" TIMESTAMPTZ NOT NULL,
    "retenidaHasta" TIMESTAMPTZ,
    "total" DECIMAL(12,2) NOT NULL,
    "sena" DECIMAL(12,2) NOT NULL,
    "notas" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Reserva_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReservaServicio" (
    "id" TEXT NOT NULL,
    "reservaId" TEXT NOT NULL,
    "servicioId" TEXT NOT NULL,
    "orden" INTEGER NOT NULL,
    "precio" DECIMAL(12,2) NOT NULL,
    "duracionMinutos" INTEGER NOT NULL,

    CONSTRAINT "ReservaServicio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Producto" (
    "id" TEXT NOT NULL,
    "negocioId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "sku" TEXT,
    "descripcion" TEXT,
    "precio" DECIMAL(12,2) NOT NULL,
    "costo" DECIMAL(12,2),
    "imagen" TEXT,
    "ventaPublica" BOOLEAN NOT NULL DEFAULT false,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Producto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Existencia" (
    "id" TEXT NOT NULL,
    "negocioId" TEXT NOT NULL,
    "sedeId" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL DEFAULT 0,
    "minimo" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Existencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MovimientoStock" (
    "id" TEXT NOT NULL,
    "negocioId" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "sedeId" TEXT NOT NULL,
    "tipo" "TipoMovimientoStock" NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "referencia" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MovimientoStock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Venta" (
    "id" TEXT NOT NULL,
    "negocioId" TEXT NOT NULL,
    "sedeId" TEXT NOT NULL,
    "clienteId" TEXT,
    "total" DECIMAL(12,2) NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Venta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VentaItem" (
    "id" TEXT NOT NULL,
    "ventaId" TEXT NOT NULL,
    "productoId" TEXT,
    "concepto" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "precio" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "VentaItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MovimientoCaja" (
    "id" TEXT NOT NULL,
    "negocioId" TEXT NOT NULL,
    "sedeId" TEXT NOT NULL,
    "tipo" "TipoMovimientoCaja" NOT NULL,
    "concepto" TEXT NOT NULL,
    "monto" DECIMAL(12,2) NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MovimientoCaja_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Comision" (
    "id" TEXT NOT NULL,
    "negocioId" TEXT NOT NULL,
    "profesionalId" TEXT NOT NULL,
    "referenciaId" TEXT NOT NULL,
    "porcentaje" DECIMAL(5,2) NOT NULL,
    "monto" DECIMAL(12,2) NOT NULL,
    "creadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Comision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pago" (
    "id" TEXT NOT NULL,
    "negocioId" TEXT NOT NULL,
    "reservaId" TEXT,
    "ventaId" TEXT,
    "proveedor" TEXT NOT NULL DEFAULT 'mercadopago',
    "proveedorId" TEXT,
    "idempotencia" TEXT NOT NULL,
    "estado" "EstadoPago" NOT NULL DEFAULT 'PENDIENTE',
    "monto" DECIMAL(12,2) NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pago_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Suscripcion" (
    "id" TEXT NOT NULL,
    "negocioId" TEXT NOT NULL,
    "plan" TEXT NOT NULL,
    "estado" "EstadoSuscripcion" NOT NULL DEFAULT 'CONFIGURACION_GRATUITA',
    "precioMensual" DECIMAL(12,2) NOT NULL,
    "proveedorId" TEXT,
    "proximoCobro" TIMESTAMP(3),
    "graciaHasta" TIMESTAMP(3),
    "cancelarAlFinal" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Suscripcion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dominio" (
    "id" TEXT NOT NULL,
    "negocioId" TEXT NOT NULL,
    "host" TEXT NOT NULL,
    "principal" BOOLEAN NOT NULL DEFAULT false,
    "gestionado" BOOLEAN NOT NULL DEFAULT false,
    "verificado" BOOLEAN NOT NULL DEFAULT false,
    "venceEn" TIMESTAMP(3),

    CONSTRAINT "Dominio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cupon" (
    "id" TEXT NOT NULL,
    "negocioId" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "porcentaje" DECIMAL(5,2),
    "monto" DECIMAL(12,2),
    "usosMaximos" INTEGER,
    "venceEn" TIMESTAMP(3),
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Cupon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GiftCard" (
    "id" TEXT NOT NULL,
    "negocioId" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "saldo" DECIMAL(12,2) NOT NULL,
    "venceEn" TIMESTAMP(3),

    CONSTRAINT "GiftCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsumoWhatsapp" (
    "id" TEXT NOT NULL,
    "negocioId" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "destinatarioHash" TEXT NOT NULL,
    "costo" DECIMAL(12,4) NOT NULL,
    "enviadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsumoWhatsapp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventoExterno" (
    "id" TEXT NOT NULL,
    "negocioId" TEXT,
    "proveedor" TEXT NOT NULL,
    "eventoId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "contenido" JSONB NOT NULL,
    "procesadoEn" TIMESTAMP(3),
    "recibidoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventoExterno_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Auditoria" (
    "id" TEXT NOT NULL,
    "negocioId" TEXT NOT NULL,
    "usuarioId" TEXT,
    "accion" TEXT NOT NULL,
    "recurso" TEXT NOT NULL,
    "recursoId" TEXT,
    "detalle" JSONB,
    "ip" TEXT,
    "creadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Auditoria_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Sesion_token_key" ON "Sesion"("token");

-- CreateIndex
CREATE INDEX "Sesion_usuarioId_idx" ON "Sesion"("usuarioId");

-- CreateIndex
CREATE UNIQUE INDEX "CuentaOAuth_proveedor_cuentaProveedorId_key" ON "CuentaOAuth"("proveedor", "cuentaProveedorId");

-- CreateIndex
CREATE INDEX "Verificacion_identificador_idx" ON "Verificacion"("identificador");

-- CreateIndex
CREATE UNIQUE INDEX "Negocio_slug_key" ON "Negocio"("slug");

-- CreateIndex
CREATE INDEX "Membresia_negocioId_rol_idx" ON "Membresia"("negocioId", "rol");

-- CreateIndex
CREATE UNIQUE INDEX "Membresia_usuarioId_negocioId_key" ON "Membresia"("usuarioId", "negocioId");

-- CreateIndex
CREATE INDEX "Sede_negocioId_activa_idx" ON "Sede"("negocioId", "activa");

-- CreateIndex
CREATE UNIQUE INDEX "Sede_negocioId_nombre_key" ON "Sede"("negocioId", "nombre");

-- CreateIndex
CREATE INDEX "HorarioSede_negocioId_sedeId_diaSemana_idx" ON "HorarioSede"("negocioId", "sedeId", "diaSemana");

-- CreateIndex
CREATE UNIQUE INDEX "CategoriaServicio_negocioId_nombre_key" ON "CategoriaServicio"("negocioId", "nombre");

-- CreateIndex
CREATE INDEX "Servicio_negocioId_categoriaId_activo_idx" ON "Servicio"("negocioId", "categoriaId", "activo");

-- CreateIndex
CREATE INDEX "Combo_negocioId_activo_idx" ON "Combo"("negocioId", "activo");

-- CreateIndex
CREATE UNIQUE INDEX "Profesional_membresiaId_key" ON "Profesional"("membresiaId");

-- CreateIndex
CREATE INDEX "Profesional_negocioId_activo_idx" ON "Profesional"("negocioId", "activo");

-- CreateIndex
CREATE INDEX "HorarioProfesional_negocioId_profesionalId_sedeId_diaSemana_idx" ON "HorarioProfesional"("negocioId", "profesionalId", "sedeId", "diaSemana");

-- CreateIndex
CREATE INDEX "BloqueoAgenda_negocioId_profesionalId_inicio_fin_idx" ON "BloqueoAgenda"("negocioId", "profesionalId", "inicio", "fin");

-- CreateIndex
CREATE INDEX "Cliente_negocioId_email_idx" ON "Cliente"("negocioId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "Cliente_negocioId_telefono_key" ON "Cliente"("negocioId", "telefono");

-- CreateIndex
CREATE INDEX "Reserva_negocioId_sedeId_inicio_idx" ON "Reserva"("negocioId", "sedeId", "inicio");

-- CreateIndex
CREATE INDEX "Reserva_negocioId_profesionalId_inicio_fin_idx" ON "Reserva"("negocioId", "profesionalId", "inicio", "fin");

-- CreateIndex
CREATE UNIQUE INDEX "Reserva_negocioId_codigo_key" ON "Reserva"("negocioId", "codigo");

-- CreateIndex
CREATE UNIQUE INDEX "ReservaServicio_reservaId_orden_key" ON "ReservaServicio"("reservaId", "orden");

-- CreateIndex
CREATE INDEX "Producto_negocioId_activo_ventaPublica_idx" ON "Producto"("negocioId", "activo", "ventaPublica");

-- CreateIndex
CREATE UNIQUE INDEX "Producto_negocioId_sku_key" ON "Producto"("negocioId", "sku");

-- CreateIndex
CREATE INDEX "Existencia_negocioId_cantidad_idx" ON "Existencia"("negocioId", "cantidad");

-- CreateIndex
CREATE UNIQUE INDEX "Existencia_sedeId_productoId_key" ON "Existencia"("sedeId", "productoId");

-- CreateIndex
CREATE INDEX "MovimientoStock_negocioId_sedeId_creadoEn_idx" ON "MovimientoStock"("negocioId", "sedeId", "creadoEn");

-- CreateIndex
CREATE INDEX "Venta_negocioId_sedeId_creadoEn_idx" ON "Venta"("negocioId", "sedeId", "creadoEn");

-- CreateIndex
CREATE INDEX "MovimientoCaja_negocioId_sedeId_creadoEn_idx" ON "MovimientoCaja"("negocioId", "sedeId", "creadoEn");

-- CreateIndex
CREATE INDEX "Comision_negocioId_profesionalId_creadaEn_idx" ON "Comision"("negocioId", "profesionalId", "creadaEn");

-- CreateIndex
CREATE UNIQUE INDEX "Pago_proveedorId_key" ON "Pago"("proveedorId");

-- CreateIndex
CREATE UNIQUE INDEX "Pago_idempotencia_key" ON "Pago"("idempotencia");

-- CreateIndex
CREATE INDEX "Pago_negocioId_estado_creadoEn_idx" ON "Pago"("negocioId", "estado", "creadoEn");

-- CreateIndex
CREATE UNIQUE INDEX "Suscripcion_negocioId_key" ON "Suscripcion"("negocioId");

-- CreateIndex
CREATE UNIQUE INDEX "Suscripcion_proveedorId_key" ON "Suscripcion"("proveedorId");

-- CreateIndex
CREATE UNIQUE INDEX "Dominio_host_key" ON "Dominio"("host");

-- CreateIndex
CREATE INDEX "Dominio_negocioId_principal_idx" ON "Dominio"("negocioId", "principal");

-- CreateIndex
CREATE UNIQUE INDEX "Cupon_negocioId_codigo_key" ON "Cupon"("negocioId", "codigo");

-- CreateIndex
CREATE UNIQUE INDEX "GiftCard_negocioId_codigo_key" ON "GiftCard"("negocioId", "codigo");

-- CreateIndex
CREATE INDEX "ConsumoWhatsapp_negocioId_enviadoEn_idx" ON "ConsumoWhatsapp"("negocioId", "enviadoEn");

-- CreateIndex
CREATE INDEX "EventoExterno_negocioId_recibidoEn_idx" ON "EventoExterno"("negocioId", "recibidoEn");

-- CreateIndex
CREATE UNIQUE INDEX "EventoExterno_proveedor_eventoId_key" ON "EventoExterno"("proveedor", "eventoId");

-- CreateIndex
CREATE INDEX "Auditoria_negocioId_creadaEn_idx" ON "Auditoria"("negocioId", "creadaEn");

-- CreateIndex
CREATE INDEX "Auditoria_usuarioId_creadaEn_idx" ON "Auditoria"("usuarioId", "creadaEn");

-- AddForeignKey
ALTER TABLE "Sesion" ADD CONSTRAINT "Sesion_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CuentaOAuth" ADD CONSTRAINT "CuentaOAuth_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membresia" ADD CONSTRAINT "Membresia_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membresia" ADD CONSTRAINT "Membresia_negocioId_fkey" FOREIGN KEY ("negocioId") REFERENCES "Negocio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sede" ADD CONSTRAINT "Sede_negocioId_fkey" FOREIGN KEY ("negocioId") REFERENCES "Negocio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HorarioSede" ADD CONSTRAINT "HorarioSede_sedeId_fkey" FOREIGN KEY ("sedeId") REFERENCES "Sede"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CategoriaServicio" ADD CONSTRAINT "CategoriaServicio_negocioId_fkey" FOREIGN KEY ("negocioId") REFERENCES "Negocio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Servicio" ADD CONSTRAINT "Servicio_negocioId_fkey" FOREIGN KEY ("negocioId") REFERENCES "Negocio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Servicio" ADD CONSTRAINT "Servicio_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "CategoriaServicio"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Combo" ADD CONSTRAINT "Combo_negocioId_fkey" FOREIGN KEY ("negocioId") REFERENCES "Negocio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComboServicio" ADD CONSTRAINT "ComboServicio_comboId_fkey" FOREIGN KEY ("comboId") REFERENCES "Combo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComboServicio" ADD CONSTRAINT "ComboServicio_servicioId_fkey" FOREIGN KEY ("servicioId") REFERENCES "Servicio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Profesional" ADD CONSTRAINT "Profesional_negocioId_fkey" FOREIGN KEY ("negocioId") REFERENCES "Negocio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Profesional" ADD CONSTRAINT "Profesional_membresiaId_fkey" FOREIGN KEY ("membresiaId") REFERENCES "Membresia"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfesionalSede" ADD CONSTRAINT "ProfesionalSede_profesionalId_fkey" FOREIGN KEY ("profesionalId") REFERENCES "Profesional"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfesionalSede" ADD CONSTRAINT "ProfesionalSede_sedeId_fkey" FOREIGN KEY ("sedeId") REFERENCES "Sede"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfesionalServicio" ADD CONSTRAINT "ProfesionalServicio_profesionalId_fkey" FOREIGN KEY ("profesionalId") REFERENCES "Profesional"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfesionalServicio" ADD CONSTRAINT "ProfesionalServicio_servicioId_fkey" FOREIGN KEY ("servicioId") REFERENCES "Servicio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HorarioProfesional" ADD CONSTRAINT "HorarioProfesional_profesionalId_fkey" FOREIGN KEY ("profesionalId") REFERENCES "Profesional"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BloqueoAgenda" ADD CONSTRAINT "BloqueoAgenda_profesionalId_fkey" FOREIGN KEY ("profesionalId") REFERENCES "Profesional"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cliente" ADD CONSTRAINT "Cliente_negocioId_fkey" FOREIGN KEY ("negocioId") REFERENCES "Negocio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reserva" ADD CONSTRAINT "Reserva_negocioId_fkey" FOREIGN KEY ("negocioId") REFERENCES "Negocio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reserva" ADD CONSTRAINT "Reserva_sedeId_fkey" FOREIGN KEY ("sedeId") REFERENCES "Sede"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reserva" ADD CONSTRAINT "Reserva_profesionalId_fkey" FOREIGN KEY ("profesionalId") REFERENCES "Profesional"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reserva" ADD CONSTRAINT "Reserva_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReservaServicio" ADD CONSTRAINT "ReservaServicio_reservaId_fkey" FOREIGN KEY ("reservaId") REFERENCES "Reserva"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReservaServicio" ADD CONSTRAINT "ReservaServicio_servicioId_fkey" FOREIGN KEY ("servicioId") REFERENCES "Servicio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Producto" ADD CONSTRAINT "Producto_negocioId_fkey" FOREIGN KEY ("negocioId") REFERENCES "Negocio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Existencia" ADD CONSTRAINT "Existencia_sedeId_fkey" FOREIGN KEY ("sedeId") REFERENCES "Sede"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Existencia" ADD CONSTRAINT "Existencia_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoStock" ADD CONSTRAINT "MovimientoStock_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Venta" ADD CONSTRAINT "Venta_negocioId_fkey" FOREIGN KEY ("negocioId") REFERENCES "Negocio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Venta" ADD CONSTRAINT "Venta_sedeId_fkey" FOREIGN KEY ("sedeId") REFERENCES "Sede"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Venta" ADD CONSTRAINT "Venta_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VentaItem" ADD CONSTRAINT "VentaItem_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES "Venta"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VentaItem" ADD CONSTRAINT "VentaItem_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoCaja" ADD CONSTRAINT "MovimientoCaja_negocioId_fkey" FOREIGN KEY ("negocioId") REFERENCES "Negocio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoCaja" ADD CONSTRAINT "MovimientoCaja_sedeId_fkey" FOREIGN KEY ("sedeId") REFERENCES "Sede"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comision" ADD CONSTRAINT "Comision_profesionalId_fkey" FOREIGN KEY ("profesionalId") REFERENCES "Profesional"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pago" ADD CONSTRAINT "Pago_reservaId_fkey" FOREIGN KEY ("reservaId") REFERENCES "Reserva"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pago" ADD CONSTRAINT "Pago_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES "Venta"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Suscripcion" ADD CONSTRAINT "Suscripcion_negocioId_fkey" FOREIGN KEY ("negocioId") REFERENCES "Negocio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dominio" ADD CONSTRAINT "Dominio_negocioId_fkey" FOREIGN KEY ("negocioId") REFERENCES "Negocio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cupon" ADD CONSTRAINT "Cupon_negocioId_fkey" FOREIGN KEY ("negocioId") REFERENCES "Negocio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GiftCard" ADD CONSTRAINT "GiftCard_negocioId_fkey" FOREIGN KEY ("negocioId") REFERENCES "Negocio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsumoWhatsapp" ADD CONSTRAINT "ConsumoWhatsapp_negocioId_fkey" FOREIGN KEY ("negocioId") REFERENCES "Negocio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventoExterno" ADD CONSTRAINT "EventoExterno_negocioId_fkey" FOREIGN KEY ("negocioId") REFERENCES "Negocio"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Auditoria" ADD CONSTRAINT "Auditoria_negocioId_fkey" FOREIGN KEY ("negocioId") REFERENCES "Negocio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Auditoria" ADD CONSTRAINT "Auditoria_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Impide que un profesional tenga reservas activas superpuestas.
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "Reserva"
ADD CONSTRAINT "Reserva_profesional_sin_solapamientos"
EXCLUDE USING gist (
  "profesionalId" WITH =,
  tstzrange("inicio", "fin", '[)') WITH &&
)
WHERE ("estado" IN ('RETENIDA', 'PENDIENTE_PAGO', 'CONFIRMADA'));

