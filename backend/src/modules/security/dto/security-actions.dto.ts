import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class SecurityReasonDto {
  @IsString()
  @MinLength(10, { message: 'A reason of at least 10 characters is required' })
  @MaxLength(500)
  reason: string;
}

export class UpdateSecurityPolicyDto {
  @IsOptional()
  @IsBoolean()
  blockEmulators?: boolean;

  @IsOptional()
  @IsBoolean()
  blockVirtualMachines?: boolean;

  @IsOptional()
  @IsBoolean()
  blockMobileClients?: boolean;

  @IsOptional()
  @IsBoolean()
  autoBlockAccounts?: boolean;

  @IsOptional()
  @IsBoolean()
  notifyAdmins?: boolean;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MaxLength(128, { each: true })
  allowedVmHosts?: string[];
}

export class TrustDeviceDto {
  @IsString()
  @MaxLength(128)
  deviceId: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  label?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  userId?: string;
}
