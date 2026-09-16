/** Muestra el isotipo oficial acompañado por el nombre legible de la marca. */
import Image from "next/image";
import logoTurnosRapidos from "../../../public/marca/logo-turnos-rapidos.png";

export function LogoTurnosRapidos({
  compacto = false,
}: {
  compacto?: boolean;
}) {
  return (
    <span className="logo-turnos" aria-label="Turnos Rápidos">
      <Image
        className="logo-turnos__imagen"
        src={logoTurnosRapidos}
        alt=""
        width={64}
        height={64}
      />
      {!compacto && (
        <span className="logo-turnos__nombre">
          Turnos<span>Rápidos</span>
        </span>
      )}
    </span>
  );
}
