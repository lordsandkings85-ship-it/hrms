import { useState, useMemo } from 'react';
import { computeTax, fmt, TaxInput } from '../utils/taxCalculator';
import { Calculator, TrendingDown, IndianRupee, Info } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';

const DEFAULT: TaxInput = {
  basic: 50000, hra: 20000, da: 5000, conveyance: 1600, medical: 1250,
  specialAllowance: 12000, rentPaid: 15000, cityType: 'metro',
  section80C: 150000, section80D: 25000, homeLoanInterest: 0, regime: 'new',
};

export default function TaxCalculatorPage() {
  const [form, setForm] = useState<TaxInput>(DEFAULT);
  const result = useMemo(() => computeTax(form), [form]);

  const set = (key: keyof TaxInput, val: any) => setForm(f => ({ ...f, [key]: val }));
  const numField = (label: string, key: keyof TaxInput, note?: string) => (
    <div>
      <label className="block text-xs text-muted mb-0.5">{label}</label>
      {note && <span className="text-[10px] text-ledger">{note}</span>}
      <input
        type="number"
        value={form[key] as number}
        onChange={e => set(key, Number(e.target.value))}
        className="w-full border border-line rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ledger/40"
      />
    </div>
  );

  const regimeColor = form.regime === 'new' ? 'bg-ledger text-paper' : 'bg-amber-500 text-white';
  const otherColor = form.regime === 'new' ? 'bg-paper text-ink border border-line' : 'bg-paper text-ink border border-line';

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <header className="mb-8">
        <h1 className="font-display text-2xl font-semibold flex items-center gap-3">
          <Calculator size={26} className="text-ledger" />
          Income Tax Calculator
        </h1>
        <p className="text-sm text-muted mt-1">
          FY 2025-26 · Old Regime vs New Regime · Live computation with 87A rebate, cess, and surcharge.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-8">
        {/* Input Section */}
        <div className="space-y-6">
          {/* Regime Toggle */}
          <div className="section-card p-5">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted mb-3">Tax Regime</h2>
            <div className="flex gap-2">
              <button onClick={() => set('regime', 'new')} className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${form.regime === 'new' ? regimeColor : otherColor}`}>
                🆕 New Regime
              </button>
              <button onClick={() => set('regime', 'old')} className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${form.regime === 'old' ? 'bg-amber-500 text-white' : 'bg-paper text-ink border border-line'}`}>
                📋 Old Regime
              </button>
            </div>
            <p className="text-xs text-muted mt-2">
              {form.regime === 'new' ? 'New Regime: Standard deduction ₹75,000. No other deductions. 87A rebate up to ₹7L.' : 'Old Regime: Standard deduction ₹50,000 + HRA + 80C/80D. 87A rebate up to ₹5L.'}
            </p>
          </div>

          {/* Monthly Salary */}
          <div className="section-card p-5">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted mb-4">Monthly Salary Components</h2>
            <div className="grid grid-cols-2 gap-3">
              {numField('Basic Salary (₹/mo)', 'basic')}
              {numField('HRA (₹/mo)', 'hra')}
              {numField('DA (₹/mo)', 'da')}
              {numField('Conveyance (₹/mo)', 'conveyance')}
              {numField('Medical Reimbursement (₹/mo)', 'medical')}
              {numField('Special Allowance (₹/mo)', 'specialAllowance')}
            </div>
          </div>

          {/* Old Regime Deductions */}
          {form.regime === 'old' && (
            <div className="section-card p-5">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted mb-4">Deductions (Old Regime)</h2>
              <div className="grid grid-cols-2 gap-3">
                {numField('Monthly Rent Paid (₹)', 'rentPaid', 'For HRA exemption')}
                <div>
                  <label className="block text-xs text-muted mb-0.5">City Type</label>
                  <select
                    value={form.cityType}
                    onChange={e => set('cityType', e.target.value)}
                    className="w-full border border-line rounded px-2 py-1.5 text-sm"
                  >
                    <option value="metro">Metro (50%)</option>
                    <option value="non-metro">Non-Metro (40%)</option>
                  </select>
                </div>
                {numField('Section 80C (₹/yr)', 'section80C', 'Max ₹1,50,000')}
                {numField('Section 80D (₹/yr)', 'section80D', 'Max ₹25,000')}
                {numField('Home Loan Interest 24(b) (₹/yr)', 'homeLoanInterest', 'Max ₹2,00,000')}
              </div>
            </div>
          )}
        </div>

        {/* Result Section */}
        <div className="space-y-4">
          {/* TDS per Month — hero */}
          <div className="bg-gradient-to-br from-ledger to-ledgerDark rounded-xl p-6 text-paper">
            <div className="text-xs uppercase tracking-wider opacity-70 mb-1">Monthly TDS Deduction</div>
            <div className="font-display text-3xl font-bold">{fmt(result.tdsPerMonth)}</div>
            <div className="text-sm opacity-80 mt-1">Effective Tax Rate: {result.effectiveRate}</div>
          </div>

          {/* Annual Summary */}
          <div className="section-card p-5 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">Annual Summary</h3>
            {[
              ['Gross Annual Income', result.grossAnnual],
              ['Standard Deduction', result.standardDeduction],
              ...(form.regime === 'old' && result.hraExemption > 0 ? [['HRA Exemption', result.hraExemption]] : []),
              ['Total Deductions', result.totalDeductions],
              ['Taxable Income', result.taxableIncome],
            ].map(([label, val]) => (
              <div key={label as string} className="flex justify-between text-sm">
                <span className="text-muted">{label}</span>
                <span className="font-mono font-medium">{fmt(val as number)}</span>
              </div>
            ))}
          </div>

          {/* Tax Breakdown */}
          <div className="section-card p-5 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">Tax Breakdown</h3>
            {result.taxSlabs.length === 0 && (
              <p className="text-sm text-ledger font-medium">✅ No tax payable (87A rebate applied)</p>
            )}
            {result.taxSlabs.map(s => (
              <div key={s.slab} className="flex justify-between text-sm">
                <span className="text-muted text-xs">{s.slab}</span>
                <span className="font-mono">{fmt(s.tax)}</span>
              </div>
            ))}
            <hr className="border-line" />
            {[
              ['Base Tax', result.baseTax],
              ['Surcharge', result.surcharge],
              ['Health & Education Cess (4%)', result.cess],
              ['Total Annual Tax', result.totalAnnualTax],
            ].map(([label, val]) => (
              <div key={label as string} className={`flex justify-between text-sm ${label === 'Total Annual Tax' ? 'font-semibold' : ''}`}>
                <span className={label === 'Total Annual Tax' ? 'text-ink' : 'text-muted'}>{label}</span>
                <span className={`font-mono ${label === 'Total Annual Tax' ? 'text-rust' : ''}`}>{fmt(val as number)}</span>
              </div>
            ))}
          </div>

          <div className="bg-paper/60 border border-line rounded-lg p-4 text-xs text-muted flex gap-2">
            <Info size={14} className="flex-shrink-0 mt-0.5" />
            <span>This calculator is for estimation only. Consult your CA for final tax computation. Based on Finance Act 2025.</span>
          </div>
        </div>
      </div>
    </div>
  );
}


