import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateLoginDto {
  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;
}

export class ToggleLoginDto {
  @IsBoolean()
  active!: boolean;
}

export class ResetPasswordDto {
  @IsOptional()
  @IsBoolean()
  sendEmail?: boolean;
}
