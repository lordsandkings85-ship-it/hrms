import { Type } from 'class-transformer';
import { IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';
import { DeviceContextDto } from '../../security/dto/device-context.dto';

export class RefreshDto {
  @IsString()
  @MaxLength(64)
  userId: string;

  @IsString()
  @MaxLength(4096)
  refreshToken: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => DeviceContextDto)
  device?: DeviceContextDto;
}
