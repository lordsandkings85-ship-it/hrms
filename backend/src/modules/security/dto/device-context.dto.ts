import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

/**
 * Device context reported by the client (desktop bridge or browser).
 * Every field is optional: the backend must never fail a legitimate request
 * just because a client could not report a signal. Signals are corroborated
 * server-side (see DeviceRiskService) and never trusted on their own.
 */
export class DeviceContextDto {
  @IsOptional()
  @IsString()
  @MaxLength(128)
  deviceId?: string;

  /** Physical network card MAC address (when reported by desktop app). */
  @IsOptional()
  @IsString()
  @MaxLength(64)
  macAddress?: string;

  /** "desktop" for the Electron app, "web" for a browser. */
  @IsOptional()
  @IsString()
  @MaxLength(32)
  clientType?: string;

  /** Node-style platform: win32, darwin, linux, android, ios. */
  @IsOptional()
  @IsString()
  @MaxLength(32)
  platform?: string;

  @IsOptional()
  @IsString()
  @MaxLength(96)
  osName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(96)
  osVersion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(16)
  arch?: string;

  /** Free-form corroborating signals: emulator:*, vm:*, webgl:*, ua:*. */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(256, { each: true })
  signals?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(256)
  webgl?: string;

  @IsOptional()
  @IsBoolean()
  webdriver?: boolean;

  @IsOptional()
  @IsBoolean()
  isEmulator?: boolean;

  @IsOptional()
  @IsBoolean()
  isVirtualMachine?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  vmHost?: string;

  @IsOptional()
  @IsInt()
  touchPoints?: number;

  @IsOptional()
  @IsInt()
  hardwareConcurrency?: number;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  deviceLabel?: string;

  /** Injected server-side from the request headers — never trusted from body. */
  userAgent?: string;
}

export class DeviceReportDto extends DeviceContextDto {
  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  email?: string;

  @IsString()
  @MaxLength(512)
  reason: string;
}
