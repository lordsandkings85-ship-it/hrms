/**
 * Indian Income Tax Calculator — FY 2025-26
 * Supports Old Regime and New Regime
 */

export interface TaxInput {
  basic: number;
  hra: number;
  da: number;
  conveyance: number;
  medical: number;
  specialAllowance: number;
  // Old regime deductions
  rentPaid?: number;       // for HRA exemption
  cityType?: 'metro' | 'non-metro';
  section80C?: number;     // max 1,50,000
  section80D?: number;     // max 25,000
  homeLoanInterest?: number; // 24(b) max 2,00,000
  regime: 'old' | 'new';
}

export interface TaxOutput {
  grossAnnual: number;
  hraExemption: number;
  standardDeduction: number;
  totalDeductions: number;
  taxableIncome: number;
  taxSlabs: Array<{ slab: string; tax: number }>;
  baseTax: number;
  surcharge: number;
  healthEducationCess: number;
  totalAnnualTax: number;
  tdsPerMonth: number;
  effectiveRate: string;
}

export function computeIncomeTax(input: TaxInput): TaxOutput {
  const { regime } = input;
  const monthly = input.basic + input.hra + input.da + input.conveyance + input.medical + input.specialAllowance;
  const grossAnnual = monthly * 12;

  let hraExemption = 0;
  let standardDeduction = 0;
  let deductions = 0;

  if (regime === 'old') {
    // Standard deduction: ₹50,000
    standardDeduction = 50000;

    // HRA exemption = min of: actual HRA, 40/50% of basic, rent paid - 10% of basic
    const actualHra = input.hra * 12;
    const basicAnnual = input.basic * 12;
    const rentAnnual = (input.rentPaid || 0) * 12;
    const hraPercent = input.cityType === 'metro' ? 0.5 : 0.4;
    hraExemption = Math.min(actualHra, hraPercent * basicAnnual, Math.max(0, rentAnnual - 0.1 * basicAnnual));

    const sec80C = Math.min(input.section80C || 0, 150000);
    const sec80D = Math.min(input.section80D || 0, 25000);
    const homeLoanInt = Math.min(input.homeLoanInterest || 0, 200000);

    deductions = standardDeduction + hraExemption + sec80C + sec80D + homeLoanInt;
  } else {
    // New regime: only standard deduction ₹75,000 (Budget 2024)
    standardDeduction = 75000;
    deductions = standardDeduction;
  }

  const taxableIncome = Math.max(0, grossAnnual - deductions);

  const slabs: Array<{ slab: string; tax: number }> = [];
  let baseTax = 0;

  if (regime === 'old') {
    // Old regime slabs (FY 2025-26)
    const oldSlabs = [
      { limit: 250000, rate: 0, label: '0–2.5L @ 0%' },
      { limit: 500000, rate: 0.05, label: '2.5L–5L @ 5%' },
      { limit: 1000000, rate: 0.2, label: '5L–10L @ 20%' },
      { limit: Infinity, rate: 0.3, label: 'Above 10L @ 30%' },
    ];
    let remaining = taxableIncome;
    let prev = 0;
    for (const { limit, rate, label } of oldSlabs) {
      const slice = Math.min(remaining, limit - prev);
      const slabTax = slice * rate;
      slabs.push({ slab: label, tax: slabTax });
      baseTax += slabTax;
      remaining -= slice;
      prev = limit;
      if (remaining <= 0) break;
    }
    // Rebate 87A: if taxable ≤ 5L, no tax
    if (taxableIncome <= 500000) baseTax = 0;
  } else {
    // New regime slabs (FY 2025-26, post-Budget)
    const newSlabs = [
      { limit: 400000, rate: 0, label: '0–4L @ 0%' },
      { limit: 800000, rate: 0.05, label: '4L–8L @ 5%' },
      { limit: 1200000, rate: 0.1, label: '8L–12L @ 10%' },
      { limit: 1600000, rate: 0.15, label: '12L–16L @ 15%' },
      { limit: 2000000, rate: 0.2, label: '16L–20L @ 20%' },
      { limit: 2400000, rate: 0.25, label: '20L–24L @ 25%' },
      { limit: Infinity, rate: 0.3, label: 'Above 24L @ 30%' },
    ];
    let remaining = taxableIncome;
    let prev = 0;
    for (const { limit, rate, label } of newSlabs) {
      const slice = Math.min(remaining, limit - prev);
      const slabTax = slice * rate;
      slabs.push({ slab: label, tax: slabTax });
      baseTax += slabTax;
      remaining -= slice;
      prev = limit;
      if (remaining <= 0) break;
    }
    // Rebate 87A: if taxable ≤ 7L, no tax (new regime)
    if (taxableIncome <= 700000) baseTax = 0;
  }

  // Surcharge
  let surchargeRate = 0;
  if (taxableIncome > 50000000) surchargeRate = 0.37;
  else if (taxableIncome > 20000000) surchargeRate = 0.25;
  else if (taxableIncome > 10000000) surchargeRate = 0.15;
  else if (taxableIncome > 5000000) surchargeRate = 0.10;
  const surcharge = baseTax * surchargeRate;

  // Health & Education Cess: 4%
  const healthEducationCess = (baseTax + surcharge) * 0.04;
  const totalAnnualTax = baseTax + surcharge + healthEducationCess;
  const tdsPerMonth = totalAnnualTax / 12;

  const effectiveRate = grossAnnual > 0 ? ((totalAnnualTax / grossAnnual) * 100).toFixed(2) + '%' : '0%';

  return {
    grossAnnual,
    hraExemption,
    standardDeduction,
    totalDeductions: deductions,
    taxableIncome,
    taxSlabs: slabs.filter(s => s.tax > 0),
    baseTax,
    surcharge,
    healthEducationCess,
    totalAnnualTax,
    tdsPerMonth,
    effectiveRate,
  };
}

export function computePF(basicMonthly: number): number {
  // Employee PF: 12% of basic, capped at ₹1,800
  return Math.min(basicMonthly * 0.12, 1800);
}

export function computeESI(grossMonthly: number): number {
  // Employee ESI: 0.75% if gross ≤ ₹21,000
  if (grossMonthly <= 21000) return grossMonthly * 0.0075;
  return 0;
}
