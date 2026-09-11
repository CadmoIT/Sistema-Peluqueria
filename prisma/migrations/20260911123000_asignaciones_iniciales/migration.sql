-- Completa las asignaciones de profesionales existentes para conservar su disponibilidad actual.
INSERT INTO "ProfesionalSede" ("profesionalId", "sedeId")
SELECT profesional."id", sede."id"
FROM "Profesional" profesional
JOIN "Sede" sede ON sede."negocioId" = profesional."negocioId"
WHERE profesional."activo" = true AND sede."activa" = true
ON CONFLICT DO NOTHING;

INSERT INTO "ProfesionalServicio" ("profesionalId", "servicioId")
SELECT profesional."id", servicio."id"
FROM "Profesional" profesional
JOIN "Servicio" servicio ON servicio."negocioId" = profesional."negocioId"
WHERE profesional."activo" = true AND servicio."activo" = true
ON CONFLICT DO NOTHING;
