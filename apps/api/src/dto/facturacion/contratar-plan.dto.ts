/** Define y valida una solicitud para iniciar la contratación de un plan. */
import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsString } from "class-validator";

export class ContratarPlanDto {
  @ApiProperty({ enum: ["autogestionado"] })
  @IsIn(["autogestionado"])
  planId!: string;

  @ApiProperty()
  @IsString()
  negocioId!: string;
}
