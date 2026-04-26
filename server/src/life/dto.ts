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

export class TimeBlockDto {
  @IsString()
  title!: string;

  @IsString()
  lifeArea!: string;

  @IsString()
  date!: string; // 'YYYY-MM-DD'

  @IsInt()
  @Min(0)
  @Max(1439)
  startMinutes!: number;

  @IsInt()
  @Min(5)
  @Max(1440)
  durationMins!: number;

  @IsOptional()
  @IsString()
  taskId?: string;

  @IsOptional()
  @IsString()
  note?: string;
}
