/** Define y valida los datos públicos necesarios para retener un turno. */
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsArray,
  IsEmail,
  IsISO8601,
  IsOptional,
  IsString,
  ValidateNested,
} from "class-validator";

export class ClienteReservaDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  nombre?: string;

  @ApiPropertyOptional()
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  telefono?: string;
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
