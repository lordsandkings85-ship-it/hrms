import { IsISO8601, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class SubmitExpenseDto {
  @IsString() employeeId: string;
  @IsString() category: string;
  @IsNumber() @Min(0) amount: number;
  @IsOptional() @IsString() receiptUrl?: string;
}