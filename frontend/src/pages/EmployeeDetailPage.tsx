import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Edit2, Check, X as CloseIcon, ShieldAlert, Briefcase } from 'lucide-react';
import { employeesApi, organizationApi, payrollApi } from '../api/client';
import { useState, useEffect, useMemo } from 'react';
import { computePF, computeESI, computePT, fmt } from '../utils/taxCalculator';

export default function EmployeeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: emp, isLoading } = useQuery({
    queryKey: ['employee', id],
    queryFn: () => employeesApi.get(id!),
    enabled: !!id,
  });

  if (isLoading) return <div className="p-8 text-sm text-muted">Loading...</div>;
  if (!emp) return <div className="p-8 text-sm text-rust">Employee not found.</div>;

  return (
    <div className="p-8 max-w-3xl">
      <Link to="/employees" className="flex items-center gap-2 text-sm text-muted hover:text-ink mb-6">
        <ArrowLeft size={16} /> Back to roster
      </Link>

      <header className="mb-8">
        <h1 className="font-display text-2xl font-semibold">{emp.firstName} {emp.lastName}</h1>
        <p className="text-sm text-muted mt-1 font-mono">{emp.employeeCode} · {emp.email}</p>
      </header>

      <EmploymentSection emp={emp} />

      <SalaryStructureSection emp={emp} />

      <ComplianceSection emp={emp} />
    </div>
  );
}

function ComplianceSection({ emp }: { emp: any }) {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({
    uan: emp.uan || '',
    pfNumber: emp.pfNumber || '',
    esic: emp.esic || '',
    pan: emp.pan || '',
    aadhaar: emp.aadhaar || '',
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => employeesApi.update(emp.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee', emp.id] });
      setIsEditing(false);
    },
  });

  return (
    <div className="bg-white border border-line rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted flex items-center gap-2">
          Compliance & Tax Info
          <ShieldAlert size={16} className="text-muted" />
        </h2>
        {!isEditing && (
          <button onClick={() => setIsEditing(true)} className="text-xs text-ledger hover:underline flex items-center gap-1">
            <Edit2 size={12} /> Edit Details
          </button>
        )}
      </div>

      {isEditing ? (
        <div className="space-y-4 max-w-sm">
          {([
            ['UAN', 'uan', form.uan],
            ['PF Account Number', 'pfNumber', form.pfNumber],
            ['ESIC Number', 'esic', form.esic],
            ['PAN Card', 'pan', form.pan],
            ['Aadhaar Card', 'aadhaar', form.aadhaar],
          ] as [string, keyof typeof form, string][]).map(([label, key, val]) => (
            <div key={key}>
              <label className="block text-[10px] uppercase font-semibold text-muted mb-1">{label}</label>
              <input 
                type="text" 
                value={val}
                onChange={e => setForm(prev => ({ ...prev, [key]: e.target.value }))}
                className="w-full border border-line px-2 py-1.5 rounded text-sm bg-paper/50"
              />
            </div>
          ))}
          <div className="flex gap-2 pt-2">
            <button 
              onClick={() => updateMutation.mutate(form)}
              disabled={updateMutation.isPending}
              className="flex-1 bg-ledger text-white text-xs py-2 rounded font-medium flex justify-center items-center gap-1"
            >
              <Check size={14} /> Save
            </button>
            <button 
              onClick={() => setIsEditing(false)}
              className="flex-1 bg-paper border border-line text-ink text-xs py-2 rounded font-medium flex justify-center items-center gap-1"
            >
              <CloseIcon size={14} /> Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Detail label="UAN (Provident Fund)" value={emp.uan} />
          <Detail label="PF Account Number" value={emp.pfNumber} />
          <Detail label="ESIC Number" value={emp.esic} />
          <Detail label="PAN Card" value={emp.pan} />
          <Detail label="Aadhaar Card" value={emp.aadhaar} />
        </div>
      )}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <div className="text-[10px] uppercase font-semibold text-muted mb-1">{label}</div>
      <div className="text-sm font-mono font-medium">{value || 'Not Provided'}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-5 py-3">
      <span className="text-sm text-muted">{label}</span>
      <span className="text-sm font-medium capitalize">{value}</span>
    </div>
  );
}

function EmploymentSection({ emp }: { emp: any }) {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({
    status: emp.status || 'active',
    departmentId: emp.departmentId || '',
    designationId: emp.designationId || '',
    joiningDate: emp.joiningDate ? new Date(emp.joiningDate).toISOString().split('T')[0] : '',
  });

  const { data: departments } = useQuery({
    queryKey: ['departments'],
    queryFn: () => organizationApi.listDepartments(),
    enabled: isEditing,
  });

  const { data: designations } = useQuery({
    queryKey: ['designations'],
    queryFn: () => organizationApi.listDesignations(),
    enabled: isEditing,
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => {
      const payload = { ...data };
      if (!payload.departmentId) payload.departmentId = null;
      if (!payload.designationId) payload.designationId = null;
      if (!payload.joiningDate) payload.joiningDate = null;
      return employeesApi.update(emp.id, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee', emp.id] });
      setIsEditing(false);
    },
  });

  return (
    <div className="bg-white border border-line rounded-lg mb-8 overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-line bg-paper/20">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted flex items-center gap-2">
          <Briefcase size={16} className="text-muted" /> Employment Details
        </h2>
        {!isEditing && (
          <button onClick={() => setIsEditing(true)} className="text-xs text-ledger hover:underline flex items-center gap-1">
            <Edit2 size={12} /> Edit Details
          </button>
        )}
      </div>

      {isEditing ? (
        <div className="p-6 space-y-4 max-w-sm">
          <div>
            <label className="block text-[10px] uppercase font-semibold text-muted mb-1">Status</label>
            <select
              value={form.status}
              onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
              className="w-full border border-line px-2 py-1.5 rounded text-sm bg-paper/50 capitalize"
            >
              <option value="active">Active</option>
              <option value="archived">Archived</option>
              <option value="terminated">Terminated</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] uppercase font-semibold text-muted mb-1">Department</label>
            <select
              value={form.departmentId}
              onChange={(e) => setForm((p) => ({ ...p, departmentId: e.target.value }))}
              className="w-full border border-line px-2 py-1.5 rounded text-sm bg-paper/50"
            >
              <option value="">-- Select Department --</option>
              {departments?.map((d: any) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] uppercase font-semibold text-muted mb-1">Designation</label>
            <select
              value={form.designationId}
              onChange={(e) => setForm((p) => ({ ...p, designationId: e.target.value }))}
              className="w-full border border-line px-2 py-1.5 rounded text-sm bg-paper/50"
            >
              <option value="">-- Select Designation --</option>
              {designations?.map((d: any) => (
                <option key={d.id} value={d.id}>{d.title}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] uppercase font-semibold text-muted mb-1">Joining Date</label>
            <input
              type="date"
              value={form.joiningDate}
              onChange={(e) => setForm((p) => ({ ...p, joiningDate: e.target.value }))}
              className="w-full border border-line px-2 py-1.5 rounded text-sm bg-paper/50"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <button 
              onClick={() => updateMutation.mutate(form)}
              disabled={updateMutation.isPending}
              className="flex-1 bg-ledger text-white text-xs py-2 rounded font-medium flex justify-center items-center gap-1"
            >
              <Check size={14} /> Save
            </button>
            <button 
              onClick={() => setIsEditing(false)}
              className="flex-1 bg-paper border border-line text-ink text-xs py-2 rounded font-medium flex justify-center items-center gap-1"
            >
              <CloseIcon size={14} /> Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="divide-y divide-line">
          <Row label="Status" value={emp.status} />
          <Row label="Department" value={emp.department?.name ?? '—'} />
          <Row label="Designation" value={emp.designation?.title ?? '—'} />
          <Row label="Joining Date" value={emp.joiningDate ? new Date(emp.joiningDate).toLocaleDateString() : '—'} />
        </div>
      )}
    </div>
  );
}

function SalaryStructureSection({ emp }: { emp: any }) {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [ctcInput, setCtcInput] = useState('');

  const blankStruct = { basic: 0, hra: 0, da: 0, conveyance: 0, medical: 0, specialAllowance: 0 };
  const currentStruct = emp.salaryStructures?.[0] || blankStruct;

  const [form, setForm] = useState<typeof blankStruct>({
    basic: currentStruct.basic || 0,
    hra: currentStruct.hra || 0,
    da: currentStruct.da || 0,
    conveyance: currentStruct.conveyance || 0,
    medical: currentStruct.medical || 0,
    specialAllowance: currentStruct.specialAllowance || 0,
  });

  // Keep form in sync when emp data updates
  useEffect(() => {
    setForm({
      basic: currentStruct.basic || 0,
      hra: currentStruct.hra || 0,
      da: currentStruct.da || 0,
      conveyance: currentStruct.conveyance || 0,
      medical: currentStruct.medical || 0,
      specialAllowance: currentStruct.specialAllowance || 0,
    });
  }, [emp]);

  // Auto-compute all salary fields from Annual CTC
  const handleCtcChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCtcInput(val);
    if (val && Number(val) > 0) {
      const annualCtc = Number(val);
      const monthly = annualCtc / 12;
      const basic = Math.round(monthly * 0.4);
      const hra = Math.round(monthly * 0.2);
      const da = 0;
      const conveyance = Math.round(monthly * 0.05);
      const medical = Math.round(monthly * 0.05);
      const specialAllowance = Math.round(monthly - basic - hra - conveyance - medical);
      setForm({ basic, hra, da, conveyance, medical, specialAllowance });
    }
  };

  // Live-compute statutory deductions from the current form values
  const computed = useMemo(() => {
    const gross = form.basic + form.hra + form.da + form.conveyance + form.medical + form.specialAllowance;
    const pf = computePF(form.basic);
    const esi = computeESI(gross);
    const pt = computePT(gross);
    const netMonthly = gross - pf - esi - pt;
    const annualCtc = gross * 12;
    return { gross, pf, esi, pt, netMonthly, annualCtc };
  }, [form]);

  // Live-compute for READ-ONLY view (from saved structure)
  const savedComputed = useMemo(() => {
    const gross = (currentStruct.basic || 0) + (currentStruct.hra || 0) + (currentStruct.da || 0)
      + (currentStruct.conveyance || 0) + (currentStruct.medical || 0) + (currentStruct.specialAllowance || 0);
    const pf = computePF(currentStruct.basic || 0);
    const esi = computeESI(gross);
    const pt = computePT(gross);
    const netMonthly = gross - pf - esi - pt;
    const annualCtc = gross * 12;
    return { gross, pf, esi, pt, netMonthly, annualCtc };
  }, [emp]);

  const updateMutation = useMutation({
    mutationFn: (data: any) => {
      const payload = { ...data, effectiveFrom: new Date().toISOString() };
      // Strip non-schema fields
      for (const k in payload) {
        if (k !== 'effectiveFrom') payload[k] = Number(payload[k]);
      }
      return payrollApi.setSalaryStructure(emp.id, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee', emp.id] });
      setIsEditing(false);
      setCtcInput('');
    },
  });

  const Row = ({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) => (
    <div className={`px-5 py-3 flex items-center justify-between ${highlight ? 'bg-ledger/5' : ''}`}>
      <span className="text-sm text-muted">{label}</span>
      <span className={`text-sm font-semibold ${highlight ? 'text-ledger text-base' : 'text-ink'}`}>{value}</span>
    </div>
  );

  return (
    <div className="bg-white border border-line rounded-lg mb-8 overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-line bg-paper/20">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted flex items-center gap-2">
          Salary Structure
        </h2>
        {!isEditing && (
          <button onClick={() => setIsEditing(true)} className="text-xs text-ledger hover:underline flex items-center gap-1">
            <Edit2 size={12} /> Edit Details
          </button>
        )}
      </div>

      {isEditing ? (
        <div className="p-6 space-y-4">
          {/* CTC Auto-fill */}
          <div className="p-4 bg-ledger/5 rounded-lg border border-ledger/20">
            <label className="block text-xs font-semibold text-ledger mb-1">⚡ Auto-calculate from Annual CTC (₹)</label>
            <input
              type="number"
              min="0"
              placeholder="e.g. 600000"
              value={ctcInput}
              onChange={handleCtcChange}
              className="w-full border border-ledger/30 px-3 py-2 rounded text-sm bg-white focus:ring-2 focus:ring-ledger/40 focus:outline-none"
            />
            <p className="text-[10px] text-muted mt-1">Entering a CTC value auto-splits salary into Basic (40%), HRA (20%), Conveyance (5%), Medical (5%), Special Allowance (balance).</p>
          </div>

          {/* Earnings fields */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted mb-3">Earnings</h3>
            <div className="grid grid-cols-2 gap-3">
              {([
                ['Basic Pay (₹/mo)', 'basic'],
                ['HRA (₹/mo)', 'hra'],
                ['DA (₹/mo)', 'da'],
                ['Conveyance (₹/mo)', 'conveyance'],
                ['Medical Reimb. (₹/mo)', 'medical'],
                ['Special Allowance (₹/mo)', 'specialAllowance'],
              ] as [string, keyof typeof form][]).map(([label, key]) => (
                <div key={key}>
                  <label className="block text-[10px] uppercase font-semibold text-muted mb-1">{label}</label>
                  <input
                    type="number" min="0"
                    value={form[key]}
                    onChange={e => setForm(prev => ({ ...prev, [key]: Number(e.target.value) }))}
                    className="w-full border border-line px-2 py-1.5 rounded text-sm"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Auto-computed deductions preview */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="text-xs font-semibold text-amber-700 mb-3 uppercase tracking-wider">📊 Auto-Computed Deductions (from above earnings)</div>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-sm font-bold text-ink">{fmt(computed.pf)}</div>
                <div className="text-[10px] text-muted mt-0.5">PF (12% of Basic)</div>
                <div className="text-[10px] text-amber-600">(Basic capped at ₹15,000)</div>
              </div>
              <div>
                <div className="text-sm font-bold text-ink">{fmt(computed.esi)}</div>
                <div className="text-[10px] text-muted mt-0.5">ESI (0.75% of Gross)</div>
                <div className="text-[10px] text-amber-600">{computed.gross > 21000 ? 'Exempt (Gross > ₹21,000)' : 'Applicable'}</div>
              </div>
              <div>
                <div className="text-sm font-bold text-ink">{fmt(computed.pt)}</div>
                <div className="text-[10px] text-muted mt-0.5">Prof. Tax (PT)</div>
                <div className="text-[10px] text-amber-600">MH slab-based</div>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-amber-200 flex justify-between items-center">
              <span className="text-xs font-semibold text-amber-800">Estimated Net Monthly Take-Home</span>
              <span className="text-lg font-bold text-ledger">{fmt(computed.netMonthly)}</span>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={() => updateMutation.mutate(form)}
              disabled={updateMutation.isPending}
              className="flex-1 bg-ledger text-white text-xs py-2.5 rounded font-medium flex justify-center items-center gap-1"
            >
              <Check size={14} /> {updateMutation.isPending ? 'Saving…' : 'Save Structure'}
            </button>
            <button
              onClick={() => { setIsEditing(false); setCtcInput(''); }}
              className="flex-1 bg-paper border border-line text-ink text-xs py-2.5 rounded font-medium flex justify-center items-center gap-1"
            >
              <CloseIcon size={14} /> Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="divide-y divide-line">
          {/* Earnings */}
          <Row label="Annual CTC" value={fmt(savedComputed.annualCtc)} />
          <Row label="Monthly Gross" value={fmt(savedComputed.gross)} />
          <Row label="Basic Pay" value={fmt(currentStruct.basic || 0)} />
          <Row label="HRA" value={fmt(currentStruct.hra || 0)} />
          {(currentStruct.da > 0) && <Row label="DA" value={fmt(currentStruct.da)} />}
          {(currentStruct.conveyance > 0) && <Row label="Conveyance" value={fmt(currentStruct.conveyance)} />}
          {(currentStruct.medical > 0) && <Row label="Medical Reimb." value={fmt(currentStruct.medical)} />}
          {(currentStruct.specialAllowance > 0) && <Row label="Special Allowance" value={fmt(currentStruct.specialAllowance)} />}

          {/* Deductions — dynamically computed, NOT static stored values */}
          <div className="bg-red-50/50">
            <div className="px-5 pt-3 pb-1">
              <p className="text-[10px] uppercase font-semibold text-muted tracking-wider">Statutory Deductions</p>
            </div>
            <Row label="PF Deduction (12% of Basic ≤ ₹15K)" value={`− ${fmt(savedComputed.pf)}`} />
            <Row label={`ESI (0.75%${savedComputed.gross > 21000 ? ' — Exempt' : ''})`} value={`− ${fmt(savedComputed.esi)}`} />
            <Row label="Professional Tax" value={`− ${fmt(savedComputed.pt)}`} />
          </div>

          {/* Net Pay */}
          <div className="bg-ledger/5 border-t-2 border-ledger/30 px-5 py-4 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-ink">Net Monthly Pay</div>
              <div className="text-[10px] text-muted">Gross − PF − ESI − PT (excl. TDS)</div>
            </div>
            <span className="text-xl font-bold text-ledger">{fmt(savedComputed.netMonthly)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
