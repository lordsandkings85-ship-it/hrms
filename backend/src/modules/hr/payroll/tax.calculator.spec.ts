import { computeIncomeTax, computePF, computeESI } from './tax.calculator';

describe('computeIncomeTax — new regime', () => {
  const input = {
    basic: 23534,
    hra: 9414,
    da: 0,
    conveyance: 1600,
    medical: 1250,
    specialAllowance: 11270,
    regime: 'new' as const,
  };

  it('computes gross annual from monthly components', () => {
    const result = computeIncomeTax(input);
    expect(result.grossAnnual).toBe(564816);
  });

  it('applies 75k standard deduction in new regime', () => {
    const result = computeIncomeTax(input);
    expect(result.standardDeduction).toBe(75000);
    expect(result.taxableIncome).toBe(489816);
  });

  it('taxes only the 4L-8L slab slice at 5% (under 12L rebate)', () => {
    const result = computeIncomeTax(input);
    expect(result.taxSlabs).toEqual([{ slab: '4L–8L @ 5%', tax: 4490.8 }]);
    expect(result.baseTax).toBe(0);
    expect(result.totalAnnualTax).toBe(0);
    expect(result.tdsPerMonth).toBe(0);
  });
});

describe('computeIncomeTax — new regime rebate at 12L', () => {
  it('applies zero tax for taxable income at exactly 12L', () => {
    const result = computeIncomeTax({
      basic: 106250,
      hra: 0,
      da: 0,
      conveyance: 0,
      medical: 0,
      specialAllowance: 0,
      regime: 'new',
    });
    // gross = 12.75L, taxable = 12.75L - 75k = 12L
    expect(result.taxableIncome).toBe(1200000);
    expect(result.baseTax).toBe(0);
    expect(result.totalAnnualTax).toBe(0);
  });

  it('starts collecting tax above 12L (rebate no longer applies)', () => {
    const result = computeIncomeTax({
      basic: 110000,
      hra: 0,
      da: 0,
      conveyance: 0,
      medical: 0,
      specialAllowance: 0,
      regime: 'new',
    });
    // gross = 13.2L, taxable = 12.45L; slabs: 4-8L @5% = 20k, 8-12L @10% = 40k, 12-12.45L @15% = 6.75k
    expect(result.taxableIncome).toBe(1245000);
    expect(result.baseTax).toBe(66750);
  });
});

describe('computeIncomeTax — new regime above 12L rebate', () => {
  it('collects tax across slabs above 12L', () => {
    const result = computeIncomeTax({
      basic: 100000,
      hra: 40000,
      da: 0,
      conveyance: 10000,
      medical: 10000,
      specialAllowance: 40000,
      regime: 'new',
    });
    // gross = 200000/mo = 24L/yr; taxable = 24L - 75k = 23.25L
    expect(result.taxableIncome).toBe(2325000);
    // baseTax for 23.25L new regime: 4L@0 + 4L@5% + 4L@10% + 4L@15% + 4L@20% + 3.25L@25%
    const expectedBase = 400000 * 0.05 + 400000 * 0.1 + 400000 * 0.15 + 400000 * 0.2 + 325000 * 0.25;
    expect(result.baseTax).toBe(expectedBase);
    expect(result.tdsPerMonth).toBeCloseTo((expectedBase * 1.04) / 12, 6);
  });
});

describe('computeIncomeTax — surcharge (Finance Act 2025)', () => {
  it('applies 25% surcharge above 5Cr (previously 37%)', () => {
    const result = computeIncomeTax({
      basic: 4500000,
      hra: 1000000,
      da: 0,
      conveyance: 0,
      medical: 0,
      specialAllowance: 1500000,
      regime: 'new',
    });
    // gross = 7L/mo * 12 = 84L? no: 70L/mo * 12 = 84L/yr; taxable = 84L - 75k
    // exceeds 5Cr? 83.25L = 8.325Cr > 5Cr -> 25% surcharge
    expect(result.taxableIncome).toBeGreaterThan(50000000);
    expect(result.surcharge).toBeCloseTo(result.baseTax * 0.25, 6);
  });

  it('applies 10% surcharge between 50L and 1Cr', () => {
    const result = computeIncomeTax({
      basic: 450000,
      hra: 100000,
      da: 0,
      conveyance: 0,
      medical: 0,
      specialAllowance: 150000,
      regime: 'new',
    });
    // gross = 7L/mo * 12 = 84L; taxable = 83.25L -> between 50L and 1Cr
    expect(result.taxableIncome).toBeGreaterThan(5000000);
    expect(result.taxableIncome).toBeLessThan(10000000);
    expect(result.surcharge).toBeCloseTo(result.baseTax * 0.1, 6);
  });
});

describe('computeIncomeTax — old regime', () => {
  it('applies HRA exemption and 80C/80D caps', () => {
    const result = computeIncomeTax({
      basic: 50000,
      hra: 20000,
      da: 0,
      conveyance: 1600,
      medical: 1250,
      specialAllowance: 10000,
      rentPaid: 25000,
      cityType: 'metro',
      section80C: 200000,
      section80D: 30000,
      homeLoanInterest: 300000,
      regime: 'old',
    });
    // HRA exemption = min(actual 240k, 50% of basic 300k, rent 300k - 10% basic 60k = 240k) = 240k
    expect(result.hraExemption).toBe(240000);
    // 80C capped 150k, 80D capped 25k, home loan capped 200k
    expect(result.totalDeductions).toBe(50000 + 240000 + 150000 + 25000 + 200000);
  });

  it('applies 87A rebate under 5L', () => {
    const result = computeIncomeTax({
      basic: 15000,
      hra: 6000,
      da: 0,
      conveyance: 1600,
      medical: 1250,
      specialAllowance: 1000,
      regime: 'old',
    });
    // gross = 24850/mo = 298200; taxable = 298200 - 50k = 248200 <= 5L -> rebate
    expect(result.baseTax).toBe(0);
    expect(result.totalAnnualTax).toBe(0);
  });
});

describe('computePF', () => {
  it('is 12% of basic up to the 1800 cap', () => {
    expect(computePF(10000)).toBe(1200);
    expect(computePF(15000)).toBe(1800);
    expect(computePF(50000)).toBe(1800);
  });
});

describe('computeESI', () => {
  it('is 0.75% when gross is at or below 21000, else 0', () => {
    expect(computeESI(20000)).toBe(150);
    expect(computeESI(21000)).toBe(157.5);
    expect(computeESI(21001)).toBe(0);
  });
});
