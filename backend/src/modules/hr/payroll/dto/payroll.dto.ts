import { IsArray, IsInt, IsISO8601, IsNumber, IsOptional, IsString, Max, Min, ValidateIf } from 'class-validator';

export class SalaryStructureDto {
  @ValidateIf((o) => o.effectiveFrom !== undefined && o.effectiveFrom !== '')
  @IsISO8601()
  effectiveFrom?: string;

  @IsNumber()
  @Min(0)
  basic: number;

  @IsOptional() @IsNumber() @Min(0) hra?: number;
  @IsOptional() @IsNumber() @Min(0) da?: number;
  @IsOptional() @IsNumber() @Min(0) conveyance?: number;
  @IsOptional() @IsNumber() @Min(0) medical?: number;
  @IsOptional() @IsNumber() @Min(0) specialAllowance?: number;
  @IsOptional() @IsNumber() @Min(0) pfDeduction?: number;
  @IsOptional() @IsNumber() @Min(0) esiDeduction?: number;
  @IsOptional() @IsNumber() @Min(0) ptDeduction?: number;
}

export class RunPayrollDto {
  @IsInt()
  @Min(1)
  @Max(12)
  month: number;

  @IsInt()
  @Min(2000)
  year: number;

  @IsOptional()
  @IsString()
  regime?: 'old' | 'new';

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  employeeIds?: string[];
}

export class AddPayoutDto {
  @IsString()
  employeeId: string;

  @IsInt() @Min(1) month: number;
  @IsInt() @Min(2000) year: number;
  @IsString() type: string;
  @IsNumber() @Min(0) amount: number;
  @IsOptional() @IsString() notes?: string;
}

export class TaxPreviewDto {
  @IsNumber() @Min(0) basic: number;
  @IsNumber() @Min(0) hra: number;
  @IsNumber() @Min(0) da: number;
  @IsNumber() @Min(0) conveyance: number;
  @IsNumber() @Min(0) medical: number;
  @IsNumber() @Min(0) specialAllowance: number;
  @IsOptional() @IsNumber() @Min(0) rentPaid?: number;
  @IsOptional() @IsString() cityType?: 'metro' | 'non-metro';
  @IsOptional() @IsNumber() @Min(0) section80C?: number;
  @IsOptional() @IsNumber() @Min(0) section80D?: number;
  @IsOptional() @IsNumber() @Min(0) homeLoanInterest?: number;
  @IsString() regime: 'old' | 'new';
}