import { Type } from 'class-transformer';
import { IsEmail, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';
import { DeviceContextDto } from '../../security/dto/device-context.dto';

export class LoginDto {
  @IsEmail()
  @MaxLength(254)
  email: string;

  @IsString()
  @MaxLength(128)
  password: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  mfaToken?: string;

  /** Device/platform context used for emulator + unsupported-environment checks. */
  @IsOptional()
  @ValidateNested()
  @Type(() => DeviceContextDto)
  device?: DeviceContextDto;
}
