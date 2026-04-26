import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class InputDto {
  @IsString()
  text!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  mood?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  energy?: number;
}

export class GuruDto {
  @IsString()
  message!: string;
}

