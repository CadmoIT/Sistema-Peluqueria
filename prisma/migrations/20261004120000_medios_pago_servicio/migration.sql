-- Configuración independiente por servicio; conserva el descuento anterior.
ALTER TABLE "Servicio" ADD COLUMN "mediosPago" JSONB;
UPDATE "Servicio" s SET "mediosPago" = jsonb_build_object(
  'EFECTIVO', jsonb_build_object('tipo', 'DESCUENTO', 'unidad', 'PORCENTAJE', 'valor',
    CASE WHEN jsonb_typeof(n."configuracion"->'descuentoEfectivo') = 'number'
      AND (n."configuracion"->>'descuentoEfectivo')::numeric BETWEEN 0 AND 99
      THEN (n."configuracion"->>'descuentoEfectivo')::numeric ELSE 0 END))
FROM "Negocio" n WHERE n.id = s."negocioId";
