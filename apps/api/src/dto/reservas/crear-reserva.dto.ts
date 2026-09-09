/** Define y valida los datos públicos necesarios para retener un turno. */
import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsArray,
  IsEmail,
  IsISO8601,
  IsNotEmpty,
  IsString,
  ValidateNested,
} from "class-validator";

export class ClienteReservaDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  nombre!: string;

  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  telefono!: string;
}

export class CrearReservaDto {
  @ApiProperty()
  @IsString()
  negocioSlug!: string;

  @ApiProperty()
  @IsString()
  sedeId!: string;

  @ApiProperty()
  @IsString()
  profesionalId!: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  servicioIds!: string[];

  @ApiProperty()
  @IsISO8601()
  inicio!: string;

  @ApiProperty({ type: ClienteReservaDto })
  @ValidateNested()
  @Type(() => ClienteReservaDto)
  cliente!: ClienteReservaDto;
}
