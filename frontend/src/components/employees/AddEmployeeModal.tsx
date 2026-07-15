import { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { X, ChevronRight, ChevronLeft, CheckCircle2 } from 'lucide-react';
import { employeesApi, organizationApi } from '../../api/client';

interface AddEmployeeModalProps {
  onClose: () => void;
}

const STEPS = ['Basic Information', 'Employment Details', 'Compliance & Tax Info'];

export default function AddEmployeeModal({ onClose }: AddEmployeeModalProps) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    employeeCode: '',
    departmentId: '',
    designationId: '',
    joiningDate: '',
    workingDaysPerWeek: 5,
    uan: '',
    pfNumber: '',
    esic: '',
    pan: '',
    aadhaar: '',
    ctc: '',
  });

  const { data: departments } = useQuery({
    queryKey: ['departments'],
    queryFn: () => organizationApi.listDepartments(),
  });

  const { data: designations } = useQuery({
    queryKey: ['designations'],
    queryFn: () => organizationApi.listDesignations(),
  });

  const mutation = useMutation({
    mutationFn: (data: any) => employeesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      onClose();
    },
  });

  const handleNext = () => {
    if (step < 3) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: any = { ...formData, workingDaysPerWeek: Number(formData.workingDaysPerWeek) };
    if (!payload.departmentId) delete payload.departmentId;
    if (!payload.designationId) delete payload.designationId;
    if (!payload.joiningDate) delete payload.joiningDate;
    if (!payload.phone) delete payload.phone;
    if (payload.ctc) {
      payload.ctc = Number(payload.ctc);
    } else {
      delete payload.ctc;
    }
    
    mutation.mutate(payload);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-line">
          <div>
            <h2 className="text-xl font-display font-semibold text-ink">Add New Employee</h2>
            <p className="text-sm text-muted mt-1">Complete the onboarding steps below.</p>
          </div>
          <button onClick={onClose} className="text-muted hover:text-ink">
            <X size={24} />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="bg-paper/30 border-b border-line px-6 py-4">
          <div className="flex items-center justify-between">
            {STEPS.map((s, index) => {
              const isActive = step === index + 1;
              const isCompleted = step > index + 1;
              return (
                <div key={s} className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold
                    ${isActive ? 'bg-ledger text-white' : isCompleted ? 'bg-ledger/20 text-ledger' : 'bg-line text-muted'}`}>
                    {isCompleted ? <CheckCircle2 size={14} /> : index + 1}
                  </div>
                  <span className={`text-sm font-medium ${isActive || isCompleted ? 'text-ink' : 'text-muted'}`}>{s}</span>
                </div>
              );
            })}
          </div>
        </div>
        
        {/* Body */}
        <div className="p-6 overflow-y-auto">
          {step === 1 && (
            <div className="space-y-5 animate-in fade-in slide-in-from-right-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">First Name *</label>
                  <input required type="text" className="w-full border border-line rounded px-3 py-2 text-sm focus:ring-2 focus:ring-ledger/40"
                    value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">Last Name *</label>
                  <input required type="text" className="w-full border border-line rounded px-3 py-2 text-sm focus:ring-2 focus:ring-ledger/40"
                    value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">Email *</label>
                  <input required type="email" className="w-full border border-line rounded px-3 py-2 text-sm focus:ring-2 focus:ring-ledger/40"
                    value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">Phone Number</label>
                  <input type="tel" className="w-full border border-line rounded px-3 py-2 text-sm focus:ring-2 focus:ring-ledger/40"
                    value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted mb-1">Login Password *</label>
                <input required type="text" className="w-full border border-line rounded px-3 py-2 text-sm focus:ring-2 focus:ring-ledger/40"
                  placeholder="e.g. securePass123"
                  value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
                <p className="text-[10px] text-muted mt-1">Provide this to the employee for their first login.</p>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5 animate-in fade-in slide-in-from-right-4">
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Employee Code *</label>
                <input required type="text" className="w-full border border-line rounded px-3 py-2 text-sm focus:ring-2 focus:ring-ledger/40"
                  placeholder="e.g. EMP001"
                  value={formData.employeeCode} onChange={e => setFormData({...formData, employeeCode: e.target.value})} />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">Department</label>
                  <select
                    value={formData.departmentId}
                    onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                    className="w-full border border-line rounded px-3 py-2 text-sm focus:ring-2 focus:ring-ledger/40"
                  >
                    <option value="">-- Select Department --</option>
                    {departments?.map((d: any) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">Designation</label>
                  <select
                    value={formData.designationId}
                    onChange={(e) => setFormData({ ...formData, designationId: e.target.value })}
                    className="w-full border border-line rounded px-3 py-2 text-sm focus:ring-2 focus:ring-ledger/40"
                  >
                    <option value="">-- Select Designation --</option>
                    {designations?.map((d: any) => (
                      <option key={d.id} value={d.id}>{d.title}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">Joining Date</label>
                  <input type="date" className="w-full border border-line rounded px-3 py-2 text-sm focus:ring-2 focus:ring-ledger/40"
                    value={formData.joiningDate} onChange={e => setFormData({...formData, joiningDate: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">Working Days Per Week</label>
                  <select className="w-full border border-line rounded px-3 py-2 text-sm focus:ring-2 focus:ring-ledger/40"
                    value={formData.workingDaysPerWeek} onChange={e => setFormData({...formData, workingDaysPerWeek: Number(e.target.value)})}>
                    <option value={5}>5 Days (Mon-Fri)</option>
                    <option value={6}>6 Days (Mon-Sat)</option>
                    <option value={7}>7 Days (All days)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5 animate-in fade-in slide-in-from-right-4">
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Annual CTC (₹)</label>
                <input type="number" min="0" className="w-full border border-line rounded px-3 py-2 text-sm focus:ring-2 focus:ring-ledger/40"
                  placeholder="e.g. 600000"
                  value={formData.ctc} onChange={e => setFormData({...formData, ctc: e.target.value})} />
                <p className="text-[10px] text-muted mt-1">This will automatically generate their basic salary structure.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">UAN (Provident Fund)</label>
                  <input type="text" className="w-full border border-line rounded px-3 py-2 text-sm focus:ring-2 focus:ring-ledger/40"
                    value={formData.uan} onChange={e => setFormData({...formData, uan: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">PF Account Number</label>
                  <input type="text" className="w-full border border-line rounded px-3 py-2 text-sm focus:ring-2 focus:ring-ledger/40"
                    value={formData.pfNumber} onChange={e => setFormData({...formData, pfNumber: e.target.value})} />
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-muted mb-1">ESIC Number</label>
                <input type="text" className="w-full border border-line rounded px-3 py-2 text-sm focus:ring-2 focus:ring-ledger/40"
                  value={formData.esic} onChange={e => setFormData({...formData, esic: e.target.value})} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">PAN Card</label>
                  <input type="text" className="w-full border border-line rounded px-3 py-2 text-sm focus:ring-2 focus:ring-ledger/40 uppercase"
                    value={formData.pan} onChange={e => setFormData({...formData, pan: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">Aadhaar Card</label>
                  <input type="text" className="w-full border border-line rounded px-3 py-2 text-sm focus:ring-2 focus:ring-ledger/40"
                    value={formData.aadhaar} onChange={e => setFormData({...formData, aadhaar: e.target.value})} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-line bg-paper/20 flex items-center justify-between">
          <div>
             {mutation.isError && (
              <p className="text-xs text-rust font-medium">Error saving employee. Email or Code may be taken.</p>
             )}
          </div>
          <div className="flex gap-3">
            {step > 1 ? (
              <button type="button" onClick={handleBack} className="px-4 py-2 border border-line bg-white text-sm font-medium text-ink rounded-md hover:bg-paper transition-colors flex items-center gap-1">
                <ChevronLeft size={16} /> Back
              </button>
            ) : (
              <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-muted hover:text-ink">
                Cancel
              </button>
            )}

            {step < 3 ? (
              <button type="button" onClick={handleNext} 
                disabled={step === 1 && (!formData.firstName || !formData.lastName || !formData.email || !formData.password)}
                className="bg-ledger hover:bg-ledgerDark text-white px-5 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-1 disabled:opacity-50">
                Next <ChevronRight size={16} />
              </button>
            ) : (
              <button onClick={handleSubmit} disabled={mutation.isPending || !formData.employeeCode} className="bg-ledger hover:bg-ledgerDark text-white px-5 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-1 disabled:opacity-50">
                {mutation.isPending ? 'Saving...' : 'Complete Setup'} <CheckCircle2 size={16} />
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
