/** Valida la canonicalización de firmas del API de Cloudinary con su vector oficial. */
import assert from "node:assert/strict";
import { test } from "node:test";
import { crearFirmaCloudinary } from "./cloudinary-firma";

test("firma los parámetros ordenados y adjunta el secreto al final", () => {
  assert.equal(
    crearFirmaCloudinary(
      {
        timestamp: "1315060510",
        public_id: "sample_image",
        eager: "w_400,h_300,c_pad|w_260,h_200,c_crop",
      },
      "abcd",
    ),
    "bfd09f95f331f558cbd1320e67aa8d488770583e",
  );
});
