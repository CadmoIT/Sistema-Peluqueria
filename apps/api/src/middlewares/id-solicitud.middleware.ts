/** Añade un identificador rastreable a cada respuesta de la API. */
import { Injectable, type NestMiddleware } from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";
import { randomUUID } from "node:crypto";

@Injectable()
export class IdSolicitudMiddleware implements NestMiddleware {
  use(solicitud: Request, respuesta: Response, siguiente: NextFunction) {
    const idExistente = solicitud.header("x-request-id");
    respuesta.setHeader("x-request-id", idExistente ?? randomUUID());
    siguiente();
  }
}
