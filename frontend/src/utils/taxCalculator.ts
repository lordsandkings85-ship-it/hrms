/**
 * Pure TypeScript income tax calculator — Indian FY 2025-26
 * No API call needed — runs 100% in the browser.
 */

export interface TaxInput {
  basic: number;
  hra: number;
  da: number;
  conveyance: number;
  medical: number;
  specialAllowance: number;
  rentPaid?: number;
  cityType?: 'metro' | 'non-metro';
  section80C?: number;
  section80D?: number;
  homeLoanInterest?: number;
  regime: 'old' | 'new';
}

export interface SlabResult { slab: string; tax: number; }

export interface TaxResult {
  grossAnnual: number;
  hraExemption: number;
  standardDeduction: number;
  totalDeductions: number;
  taxableIncome: number;
  taxSlabs: SlabResult[];
  baseTax: number;
  surcharge: number;
  cess: number;
  totalAnnualTax: number;
  tdsPerMonth: number;
  effectiveRate: string;
}

export function computeTax(input: TaxInput): TaxResult {
  const monthly =
    input.basic + input.hra + input.da + input.conveyance + input.medical + input.specialAllowance;
  const grossAnnual = monthly * 12;

  let hraExemption = 0;
  let standardDeduction = 0;
  let deductions = 0;

  if (input.regime === 'old') {
    standardDeduction = 50000;
    const actualHra = input.hra * 12;
    const basicAnnual = input.basic * 12;
    const rentAnnual = (input.rentPaid || 0) * 12;
    const hraPercent = input.cityType === 'metro' ? 0.5 : 0.4;
    hraExemption = Math.min(actualHra, hraPercent * basicAnnual, Math.max(0, rentAnnual - 0.1 * basicAnnual));
    const sec80C = Math.min(input.section80C || 0, 150000);
    const sec80D = Math.min(input.section80D || 0, 25000);
    const hl = Math.min(input.homeLoanInterest || 0, 200000);
    deductions = standardDeduction + hraExemption + sec80C + sec80D + hl;
  } else {
    standardDeduction = 75000;
    deductions = standardDeduction;
  }

  const taxableIncome = Math.max(0, grossAnnual - deductions);
  const slabs: SlabResult[] = [];
  let baseTax = 0;

  if (input.regime === 'old') {
    const brackets = [
      [0, 250000, 0, '₹0–2.5L @0%'],
      [250000, 500000, 0.05, '₹2.5L–5L @5%'],
      [500000, 1000000, 0.2, '₹5L–10L @20%'],
      [1000000, Infinity, 0.3, 'Above ₹10L @30%'],
    ] as [number, number, number, string][];
    let rem = taxableIncome;
    for (const [lo, hi, rate, label] of brackets) {
      const slice = Math.min(rem, hi - lo);
      if (slice <= 0) break;
      const t = slice * rate;
      if (t > 0) slabs.push({ slab: label, tax: t });
      baseTax += t;
      rem -= slice;
    }
    if (taxableIncome <= 500000) baseTax = 0;
  } else {
    const brackets = [
      [0, 400000, 0, '₹0–4L @0%'],
      [400000, 800000, 0.05, '₹4L–8L @5%'],
      [800000, 1200000, 0.1, '₹8L–12L @10%'],
      [1200000, 1600000, 0.15, '₹12L–16L @15%'],
      [1600000, 2000000, 0.2, '₹16L–20L @20%'],
      [2000000, 2400000, 0.25, '₹20L–24L @25%'],
      [2400000, Infinity, 0.3, 'Above ₹24L @30%'],
    ] as [number, number, number, string][];
    let rem = taxableIncome;
    for (const [lo, hi, rate, label] of brackets) {
      const slice = Math.min(rem, hi - lo);
      if (slice <= 0) break;
      const t = slice * rate;
      if (t > 0) slabs.push({ slab: label, tax: t });
      baseTax += t;
      rem -= slice;
    }
    if (taxableIncome <= 700000) baseTax = 0;
  }

  let surchargeRate = 0;
  if (taxableIncome > 50000000) surchargeRate = 0.37;
  else if (taxableIncome > 20000000) surchargeRate = 0.25;
  else if (taxableIncome > 10000000) surchargeRate = 0.15;
  else if (taxableIncome > 5000000) surchargeRate = 0.1;
  const surcharge = baseTax * surchargeRate;
  const cess = (baseTax + surcharge) * 0.04;
  const totalAnnualTax = baseTax + surcharge + cess;
  const tdsPerMonth = totalAnnualTax / 12;
  const effectiveRate = grossAnnual > 0 ? ((totalAnnualTax / grossAnnual) * 100).toFixed(2) + '%' : '0.00%';

  return {
    grossAnnual, hraExemption, standardDeduction, totalDeductions: deductions,
    taxableIncome, taxSlabs: slabs, baseTax, surcharge, cess,
    totalAnnualTax, tdsPerMonth, effectiveRate,
  };
}

export function fmt(n: number) {
  return '₹' + Math.round(n).toLocaleString('en-IN');
}

/**
 * Employee PF Contribution: 12% of Basic salary.
 * Note: Per EPFO rules, the employer PF contribution ceiling is on ₹15,000 basic,
 * but the EMPLOYEE can contribute 12% of their full basic (VPF above the ceiling).
 * For standard payroll, we cap the PF-eligible basic at ₹15,000 (i.e. max deduction = ₹1,800)
 * UNLESS the employee opts for VPF on higher basic. We implement standard statutory capping here.
 */
export function computePF(basicMonthly: number): number {
  const pfEligibleBasic = Math.min(basicMonthly, 15000);
  return Math.round(pfEligibleBasic * 0.12);
}

/**
 * Employee ESI Contribution: 0.75% of gross if gross ≤ ₹21,000/month.
 * Employees earning > ₹21,000 gross are exempt from ESI.
 */
export function computeESI(grossMonthly: number): number {
  if (grossMonthly <= 21000) return Math.round(grossMonthly * 0.0075);
  return 0;
}

/**
 * Professional Tax: slab-based deduction (generic pan-India approximation).
 * Actual PT slabs vary by state. Using Maharashtra slabs as industry default.
 * Monthly Gross → Monthly PT:
 *   ≤ ₹7,500    → ₹0
 *   ₹7,501–10,000 → ₹175
 *   > ₹10,000   → ₹200 (₹2,500/year capped by law, so Feb = ₹300, rest = ₹200)
 */
export function computePT(grossMonthly: number): number {
  if (grossMonthly <= 7500) return 0;
  if (grossMonthly <= 10000) return 175;
  return 200;
}
