import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Edit2, Check, X as CloseIcon, ShieldAlert, Briefcase } from 'lucide-react';
import { employeesApi, organizationApi, payrollApi } from '../api/client';
import { useState, useEffect, useMemo } from 'react';
import { computePF, computeESI, computePT, fmt } from '../utils/taxCalculator';
import { Modal } from '../components/ui/Modal';

export default function EmployeeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState('profile');

  const { data: emp, isLoading } = useQuery({
    queryKey: ['employee', id],
    queryFn: () => employeesApi.get(id!),
    enabled: !!id,
  });

  if (isLoading) return <div className="page-container flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ledger"></div></div>;
  if (!emp) return <div className="page-container flex items-center justify-center h-64 text-danger">Employee not found.</div>;

  const TABS = [
    { id: 'profile', label: 'Profile' },
    { id: 'salary', label: 'Salary' },
    { id: 'compliance', label: 'Compliance & Bank' },
    { id: 'emergency', label: 'Emergency Contact' },
    { id: 'education', label: 'Education' },
    { id: 'experience', label: 'Experience' },
    { id: 'documents', label: 'Documents' },
  ];

  const [showPromoteModal, setShowPromoteModal] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);

  return (
    <div className="page-container max-w-5xl space-y-6">
      <Link to="/employees" className="flex items-center gap-2 text-sm text-muted hover:text-ink w-fit transition-colors">
        <ArrowLeft size={16} /> Back to roster
      </Link>

      <div className="section-card p-8 flex justify-between items-start gap-4">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center font-display font-bold text-2xl flex-shrink-0 shadow-sm" style={{ background: 'var(--action-primary)', color: 'var(--action-primary-text)' }}>
            {emp.firstName[0]}{emp.lastName?.[0] ?? ''}
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-ink">{emp.firstName} {emp.lastName}</h1>
            <p className="text-sm font-medium text-muted mt-1">{emp.employeeCode} · {emp.email}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowPromoteModal(true)} className="btn-secondary text-sm">Promote/Transfer</button>
          <button onClick={() => setShowExitModal(true)} className="btn-danger text-sm">Initiate Exit</button>
        </div>
      </div>

      <div className="border-b border-line">
        <nav className="flex gap-6 overflow-x-auto">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 text-sm font-semibold whitespace-nowrap transition-colors relative ${
                activeTab === tab.id ? 'text-ledger' : 'text-muted hover:text-ink'
              }`}
            >
              {tab.label}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-ledger rounded-t-full animate-slideUp" />
              )}
            </button>
          ))}
        </nav>
      </div>

      <div className="animate-slideUp" style={{ animationDuration: '0.3s' }}>
        {activeTab === 'profile' && <EmploymentSection emp={emp} />}
        {activeTab === 'salary' && <SalaryStructureSection emp={emp} />}
        {activeTab === 'compliance' && <ComplianceSection emp={emp} />}
        {activeTab === 'emergency' && <EmergencySection emp={emp} />}
        {activeTab === 'education' && <EducationSection emp={emp} />}
        {activeTab === 'experience' && <ExperienceSection emp={emp} />}
        {activeTab === 'documents' && <DocumentsSection emp={emp} />}
      </div>

      {showPromoteModal && (
        <PromotionTransferModal 
          emp={emp} 
          onClose={() => setShowPromoteModal(false)} 
        />
      )}
      
      {showExitModal && (
        <ExitModal 
          emp={emp} 
          onClose={() => setShowExitModal(false)} 
        />
      )}
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
    bankAccountNumber: emp.bankAccountNumber || '',
    bankIfsc: emp.bankIfsc || '',
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
          Compliance & Bank Info
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
            ['Bank Account No.', 'bankAccountNumber', form.bankAccountNumber],
            ['Bank IFSC Code', 'bankIfsc', form.bankIfsc],
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
          <Detail label="Bank Account No." value={emp.bankAccountNumber} />
          <Detail label="Bank IFSC Code" value={emp.bankIfsc} />
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

// ── NEW SECTIONS ───────────────────────────────────────────────

function EmergencySection({ emp }: { emp: any }) {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({
    emergencyContact: emp.emergencyContact || '',
    phone: emp.phone || '',
    address: emp.address || '',
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => employeesApi.update(emp.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee', emp.id] });
      setIsEditing(false);
    },
  });

  return (
    <div className="bg-white border border-line rounded-lg mb-8 overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-line bg-paper/20">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">Contact & Emergency</h2>
        {!isEditing && (
          <button onClick={() => setIsEditing(true)} className="text-xs text-ledger hover:underline flex items-center gap-1">
            <Edit2 size={12} /> Edit
          </button>
        )}
      </div>
      {isEditing ? (
        <div className="p-6 space-y-4 max-w-sm">
          {([
            ['Phone Number', 'phone', form.phone],
            ['Emergency Contact', 'emergencyContact', form.emergencyContact],
            ['Address', 'address', form.address],
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
            <button onClick={() => updateMutation.mutate(form)} className="btn-primary text-xs flex-1"><Check size={14} /> Save</button>
            <button onClick={() => setIsEditing(false)} className="btn-secondary text-xs flex-1"><CloseIcon size={14} /> Cancel</button>
          </div>
        </div>
      ) : (
        <div className="divide-y divide-line">
          <Row label="Phone Number" value={emp.phone || '—'} />
          <Row label="Emergency Contact" value={emp.emergencyContact || '—'} />
          <Row label="Residential Address" value={emp.address || '—'} />
        </div>
      )}
    </div>
  );
}

function EducationSection({ emp }: { emp: any }) {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  
  // education is a JSON array
  const currentEdu = Array.isArray(emp.education) ? emp.education : [];
  const [items, setItems] = useState<{ degree: string; institution: string; year: string }[]>(currentEdu);

  const updateMutation = useMutation({
    mutationFn: (data: any) => employeesApi.update(emp.id, {education: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee', emp.id] });
      setIsEditing(false);
    },
  });

  return (
    <div className="bg-white border border-line rounded-lg mb-8 overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-line bg-paper/20">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">Education</h2>
        {!isEditing && (
          <button onClick={() => setIsEditing(true)} className="text-xs text-ledger hover:underline flex items-center gap-1">
            <Edit2 size={12} /> Edit
          </button>
        )}
      </div>
      {isEditing ? (
        <div className="p-6 space-y-4 max-w-md">
          {items.map((item, idx) => (
            <div key={idx} className="p-3 border border-line rounded flex flex-col gap-2 relative bg-paper/30">
              <button onClick={() => setItems(items.filter((_, i) => i !== idx))} className="absolute top-2 right-2 text-rust hover:text-danger"><CloseIcon size={14}/></button>
              <input placeholder="Degree (e.g. B.Tech CS)" value={item.degree} onChange={e => { const copy = [...items]; copy[idx].degree = e.target.value; setItems(copy); }} className="border border-line px-2 py-1 text-sm rounded"/>
              <input placeholder="Institution" value={item.institution} onChange={e => { const copy = [...items]; copy[idx].institution = e.target.value; setItems(copy); }} className="border border-line px-2 py-1 text-sm rounded"/>
              <input placeholder="Year" value={item.year} onChange={e => { const copy = [...items]; copy[idx].year = e.target.value; setItems(copy); }} className="border border-line px-2 py-1 text-sm rounded"/>
            </div>
          ))}
          <button onClick={() => setItems([...items, { degree: '', institution: '', year: '' }])} className="text-xs text-ledger font-semibold">+ Add Education</button>
          
          <div className="flex gap-2 pt-2">
            <button onClick={() => updateMutation.mutate(items)} className="btn-primary text-xs flex-1"><Check size={14} /> Save</button>
            <button onClick={() => setIsEditing(false)} className="btn-secondary text-xs flex-1"><CloseIcon size={14} /> Cancel</button>
          </div>
        </div>
      ) : (
        <div className="p-6 space-y-4">
          {currentEdu.length === 0 ? <p className="text-sm text-muted">No education records added.</p> : null}
          {currentEdu.map((item: any, i: number) => (
            <div key={i} className="border-l-2 border-ledger pl-4 py-1">
              <h4 className="text-sm font-semibold text-ink">{item.degree}</h4>
              <p className="text-xs text-muted">{item.institution} · {item.year}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ExperienceSection({ emp }: { emp: any }) {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  
  const currentExp = Array.isArray(emp.experience) ? emp.experience : [];
  const [items, setItems] = useState<{ company: string; role: string; duration: string }[]>(currentExp);

  const updateMutation = useMutation({
    mutationFn: (data: any) => employeesApi.update(emp.id,{experience: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee', emp.id] });
      setIsEditing(false);
    },
  });

  return (
    <div className="bg-white border border-line rounded-lg mb-8 overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-line bg-paper/20">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">Past Experience</h2>
        {!isEditing && (
          <button onClick={() => setIsEditing(true)} className="text-xs text-ledger hover:underline flex items-center gap-1">
            <Edit2 size={12} /> Edit
          </button>
        )}
      </div>
      {isEditing ? (
        <div className="p-6 space-y-4 max-w-md">
          {items.map((item, idx) => (
            <div key={idx} className="p-3 border border-line rounded flex flex-col gap-2 relative bg-paper/30">
              <button onClick={() => setItems(items.filter((_, i) => i !== idx))} className="absolute top-2 right-2 text-rust hover:text-danger"><CloseIcon size={14}/></button>
              <input placeholder="Job Title" value={item.role} onChange={e => { const copy = [...items]; copy[idx].role = e.target.value; setItems(copy); }} className="border border-line px-2 py-1 text-sm rounded"/>
              <input placeholder="Company Name" value={item.company} onChange={e => { const copy = [...items]; copy[idx].company = e.target.value; setItems(copy); }} className="border border-line px-2 py-1 text-sm rounded"/>
              <input placeholder="Duration (e.g. 2020 - 2023)" value={item.duration} onChange={e => { const copy = [...items]; copy[idx].duration = e.target.value; setItems(copy); }} className="border border-line px-2 py-1 text-sm rounded"/>
            </div>
          ))}
          <button onClick={() => setItems([...items, { company: '', role: '', duration: '' }])} className="text-xs text-ledger font-semibold">+ Add Experience</button>
          
          <div className="flex gap-2 pt-2">
            <button onClick={() => updateMutation.mutate(items)} className="btn-primary text-xs flex-1"><Check size={14} /> Save</button>
            <button onClick={() => setIsEditing(false)} className="btn-secondary text-xs flex-1"><CloseIcon size={14} /> Cancel</button>
          </div>
        </div>
      ) : (
        <div className="p-6 space-y-4">
          {currentExp.length === 0 ? <p className="text-sm text-muted">No experience records added.</p> : null}
          {currentExp.map((item: any, i: number) => (
            <div key={i} className="border-l-2 border-ledger pl-4 py-1">
              <h4 className="text-sm font-semibold text-ink">{item.role}</h4>
              <p className="text-xs text-muted">{item.company} · {item.duration}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── DOCUMENTS SECTION ──────────────────────────────────────────────

function DocumentsSection({ emp }: { emp: any }) {
  const docs = emp.documents || [];
  
  return (
    <div className="bg-white border border-line rounded-lg mb-8 overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-line bg-paper/20">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">Employee Documents</h2>
        <button className="btn-primary text-xs py-1.5"><Briefcase size={12} className="mr-1"/> Upload New</button>
      </div>
      <div className="p-6">
        {docs.length === 0 ? (
          <div className="text-center py-8 text-muted border border-dashed rounded-lg bg-paper/50">
            <Briefcase size={32} className="mx-auto mb-2 opacity-50"/>
            <p className="text-sm">No documents uploaded yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {docs.map((doc: any) => (
              <div key={doc.id} className="flex items-center justify-between p-3 border border-line rounded-lg hover:border-ledger transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded bg-paper flex items-center justify-center text-ledger">
                    <Briefcase size={18}/>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-ink capitalize">{doc.type.replace(/_/g, ' ')}</h4>
                    <p className="text-xs text-muted">Uploaded on {new Date(doc.uploadedAt).toLocaleDateString()}</p>
                  </div>
                </div>
                <a href={doc.fileUrl} target="_blank" rel="noreferrer" className="text-xs text-info hover:underline">View</a>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── MODALS ──────────────────────────────────────────────

function PromotionTransferModal({ emp, onClose }: { emp: any; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    departmentId: emp.departmentId || '',
    designationId: emp.designationId || '',
  });

  const { data: departments } = useQuery({ queryKey: ['departments'], queryFn: organizationApi.listDepartments });
  const { data: designations } = useQuery({ queryKey: ['designations'], queryFn: organizationApi.listDesignations });

  const mutate = useMutation({
    mutationFn: (data: any) => employeesApi.update(emp.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee', emp.id] });
      onClose();
    }
  });

  return (
    <Modal open onClose={onClose} title="Promote / Transfer Employee">
      <div className="space-y-4 p-4">
        <div>
          <label className="block text-xs font-semibold mb-1">New Department</label>
          <select value={form.departmentId} onChange={e => setForm(p => ({...p, departmentId: e.target.value}))} className="w-full border rounded px-3 py-2 text-sm">
            <option value="">-- Select --</option>
            {departments?.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1">New Designation</label>
          <select value={form.designationId} onChange={e => setForm(p => ({...p, designationId: e.target.value}))} className="w-full border rounded px-3 py-2 text-sm">
            <option value="">-- Select --</option>
            {designations?.map((d: any) => <option key={d.id} value={d.id}>{d.title}</option>)}
          </select>
        </div>
        <div className="flex gap-2 justify-end pt-4">
          <button onClick={onClose} className="btn-secondary text-sm">Cancel</button>
          <button onClick={() => mutate.mutate(form)} disabled={mutate.isPending} className="btn-primary text-sm">{mutate.isPending ? 'Saving...' : 'Confirm Change'}</button>
        </div>
      </div>
    </Modal>
  );
}

function ExitModal({ emp, onClose }: { emp: any; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    resignationDate: '',
    lastWorkingDay: '',
    reason: '',
  });

  const mutate = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/exit/initiate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
        body: JSON.stringify({ employeeId: emp.id, ...data }),
      });
      if (!res.ok) throw new Error('Failed to initiate exit');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee', emp.id] });
      onClose();
    }
  });

  return (
    <Modal open onClose={onClose} title="Initiate Employee Exit">
      <div className="space-y-4 p-4">
        <div>
          <label className="block text-xs font-semibold mb-1">Resignation Date</label>
          <input type="date" value={form.resignationDate} onChange={e => setForm(p => ({...p, resignationDate: e.target.value}))} className="w-full border rounded px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1">Last Working Day</label>
          <input type="date" value={form.lastWorkingDay} onChange={e => setForm(p => ({...p, lastWorkingDay: e.target.value}))} className="w-full border rounded px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1">Reason (Optional)</label>
          <textarea value={form.reason} onChange={e => setForm(p => ({...p, reason: e.target.value}))} className="w-full border rounded px-3 py-2 text-sm" rows={3}></textarea>
        </div>
        <div className="flex gap-2 justify-end pt-4">
          <button onClick={onClose} className="btn-secondary text-sm">Cancel</button>
          <button onClick={() => mutate.mutate(form)} disabled={mutate.isPending} className="btn-danger text-sm">{mutate.isPending ? 'Processing...' : 'Initiate Exit'}</button>
        </div>
      </div>
    </Modal>
  );
}
