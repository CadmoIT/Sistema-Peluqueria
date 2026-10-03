-- Conserva slug y dominios de sedes; asigna una dirección pública por negocio.
ALTER TABLE "Negocio" ADD COLUMN "subdominio" TEXT;
ALTER TABLE "Negocio" ADD COLUMN "nombreClave" TEXT NOT NULL DEFAULT '';
CREATE UNIQUE INDEX "Negocio_subdominio_key" ON "Negocio"("subdominio");
CREATE INDEX "Negocio_nombreClave_idx" ON "Negocio"("nombreClave");
CREATE TABLE "SubdominioAnterior" (
  "nombre" TEXT NOT NULL PRIMARY KEY,
  "negocioId" TEXT NOT NULL REFERENCES "Negocio"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "SubdominioAnterior_negocioId_idx" ON "SubdominioAnterior"("negocioId");
UPDATE "Negocio" SET "nombreClave" = regexp_replace(lower(normalize("nombre", NFD)), '[^a-z0-9]', '', 'g');
DO $$
DECLARE negocio RECORD; base TEXT; candidato TEXT; sufijo INTEGER;
BEGIN
  FOR negocio IN SELECT "id", "nombreClave" FROM "Negocio" ORDER BY "creadoEn", "id" LOOP
    base := left(COALESCE(NULLIF(negocio."nombreClave", ''), 'mi-negocio'), 50);
    candidato := CASE WHEN length(base) < 2 THEN base || '-2' ELSE base END; sufijo := CASE WHEN length(base) < 2 THEN 3 ELSE 2 END;
    WHILE candidato = ANY(ARRAY['www','api','panel','admin','mail','smtp','imap','pop','ftp','site','app','auth','acceder','static','assets','cdn','support','soporte','status','vercel','localhost'])
      OR EXISTS(SELECT 1 FROM "Negocio" WHERE "id" <> negocio."id" AND ("subdominio" = candidato OR "slug" = candidato))
      OR EXISTS(SELECT 1 FROM "Sede" WHERE "subdominio" = candidato) LOOP
      candidato := base || '-' || sufijo; sufijo := sufijo + 1;
    END LOOP;
    UPDATE "Negocio" SET "subdominio" = candidato WHERE "id" = negocio."id";
  END LOOP;
END $$;
