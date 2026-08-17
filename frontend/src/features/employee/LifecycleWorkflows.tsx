import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  employeesApi, organizationApi, payrollApi, exitApi, orgMastersApi 
} from '../../api/client';
import { 
  ArrowLeftRight, TrendingUp, LogOut, Briefcase, CheckCircle2, Circle, ClipboardList, ChevronRight, UserMinus
} from 'lucide-react';
import { Spinner } from '../../components/ui/Spinner';
import { useToast } from '../../components/ui/ToastProvider';

export function EmployeeTransferForm() {
  const qc = useQueryClient();
  const { success: toastSuccess, error: toastError } = useToast();
  const [empId, setEmpId] = useState('');
  const [branchId, setBranchId] = useState('');
  const [deptId, setDeptId] = useState('');
  const [desigId, setDesigId] = useState('');
  const [grade, setGrade] = useState('');

  const { data: employees } = useQuery({
    queryKey: ['employees-transfer-select'],
    queryFn: () => employeesApi.list({ page: 1 }),
  });

  const { data: branches } = useQuery({
    queryKey: ['branches-list'],
    queryFn: () => organizationApi.listBranches(),
  });

  const { data: departments } = useQuery({
    queryKey: ['departments-list'],
    queryFn: () => organizationApi.listDepartments(),
  });

  const { data: designations } = useQuery({
    queryKey: ['designations-list'],
    queryFn: () => organizationApi.listDesignations(),
  });

  const { data: allMasters } = useQuery({
    queryKey: ['org-masters-grades'],
    queryFn: () => orgMastersApi.list('masters'),
  });
  const grades = (allMasters ?? []).filter((m: any) => m.master === 'grade');

  const transferMutation = useMutation({
    mutationFn: () => employeesApi.update(empId, {
      ...(branchId ? { branchId } : {}),
      ...(deptId ? { departmentId: deptId } : {}),
      ...(desigId ? { designationId: desigId } : {}),
      ...(grade ? { grade } : {}),
    }),
    onSuccess: () => {
      toastSuccess('Employee transferred successfully!');
      setEmpId('');
      setBranchId('');
      setDeptId('');
      setDesigId('');
      setGrade('');
      qc.invalidateQueries({ queryKey: ['employees'] });
    },
    onError: (err: any) => toastError(err.message),
  });

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 max-w-xl shadow-xs">
      <div className="flex items-center gap-2 mb-4 border-b border-slate-100 dark:border-slate-800 pb-2">
        <ArrowLeftRight className="text-indigo-500 w-5 h-5" />
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Process Department/Location Transfer</h3>
      </div>
      <div className="space-y-4 text-xs">
        <div>
          <label className="block text-slate-500 mb-1">Select Employee</label>
          <select value={empId} onChange={e => setEmpId(e.target.value)} className="w-full border border-slate-200 dark:border-slate-700 bg-transparent rounded p-2">
            <option value="">-- Choose Employee --</option>
            {employees?.items.map((e: any) => (
              <option key={e.id} value={e.id}>{e.firstName} {e.lastName} ({e.employeeCode})</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-slate-500 mb-1">New Branch Location</label>
            <select value={branchId} onChange={e => setBranchId(e.target.value)} className="w-full border border-slate-200 dark:border-slate-700 bg-transparent rounded p-2">
              <option value="">-- No Change --</option>
              {branches?.map((b: any) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-slate-500 mb-1">New Department</label>
            <select value={deptId} onChange={e => setDeptId(e.target.value)} className="w-full border border-slate-200 dark:border-slate-700 bg-transparent rounded p-2">
              <option value="">-- No Change --</option>
              {departments?.map((d: any) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-slate-500 mb-1">New Designation</label>
            <select value={desigId} onChange={e => setDesigId(e.target.value)} className="w-full border border-slate-200 dark:border-slate-700 bg-transparent rounded p-2">
              <option value="">-- No Change --</option>
              {designations?.map((d: any) => (
                <option key={d.id} value={d.id}>{d.title}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-slate-500 mb-1">New Pay Cadre/Grade</label>
            <select value={grade} onChange={e => setGrade(e.target.value)} className="w-full border border-slate-200 dark:border-slate-700 bg-transparent rounded p-2">
              <option value="">-- No Change --</option>
              {grades.map((g: any) => (
                <option key={g.id} value={g.name}>{g.name}</option>
              ))}
            </select>
          </div>
        </div>
        <button onClick={() => transferMutation.mutate()} disabled={!empId || transferMutation.isPending} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded transition-colors disabled:opacity-50">
          {transferMutation.isPending ? 'Processing Transfer...' : 'Complete Transfer'}
        </button>
      </div>
    </div>
  );
}

export function EmployeePromotionForm() {
  const qc = useQueryClient();
  const { success: toastSuccess, error: toastError } = useToast();
  const [empId, setEmpId] = useState('');
  const [desigId, setDesigId] = useState('');
  const [grade, setGrade] = useState('');
  
  // Salary structure fields
  const [basic, setBasic] = useState('0');
  const [hra, setHra] = useState('0');
  const [da, setDa] = useState('0');
  const [conveyance, setConveyance] = useState('0');
  const [medical, setMedical] = useState('0');
  const [special, setSpecial] = useState('0');

  const { data: employees } = useQuery({
    queryKey: ['employees-promotion-select'],
    queryFn: () => employeesApi.list({ page: 1 }),
  });

  const { data: designations } = useQuery({
    queryKey: ['designations-list-promotion'],
    queryFn: () => organizationApi.listDesignations(),
  });

  const { data: promoGrades } = useQuery({
    queryKey: ['org-masters-grades-promotion'],
    queryFn: () => orgMastersApi.list('masters'),
  });
  const gradeOptions = (promoGrades ?? []).filter((m: any) => m.master === 'grade');

  const promotionMutation = useMutation({
    mutationFn: async () => {
      // 1. Update designation and grade
      await employeesApi.update(empId, {
        ...(desigId ? { designationId: desigId } : {}),
        ...(grade ? { grade } : {}),
      });

      // 2. Set new salary structure
      await payrollApi.setSalaryStructure(empId, {
        basic: Number(basic),
        hra: Number(hra),
        da: Number(da),
        conveyance: Number(conveyance),
        medical: Number(medical),
        specialAllowance: Number(special),
        effectiveFrom: new Date().toISOString(),
        reason: 'promotion',
      });
    },
    onSuccess: () => {
      toastSuccess('Promotion and salary structure updated successfully!');
      setEmpId('');
      setDesigId('');
      setGrade('');
      setBasic('0');
      setHra('0');
      setDa('0');
      setConveyance('0');
      setMedical('0');
      setSpecial('0');
      qc.invalidateQueries({ queryKey: ['employees'] });
    },
    onError: (err: any) => toastError(err.message),
  });

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 max-w-xl shadow-xs">
      <div className="flex items-center gap-2 mb-4 border-b border-slate-100 dark:border-slate-800 pb-2">
        <TrendingUp className="text-teal-500 w-5 h-5" />
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Process Employee Promotion</h3>
      </div>
      <div className="space-y-4 text-xs">
        <div>
          <label className="block text-slate-500 mb-1">Select Employee</label>
          <select value={empId} onChange={e => setEmpId(e.target.value)} className="w-full border border-slate-200 dark:border-slate-700 bg-transparent rounded p-2">
            <option value="">-- Choose Employee --</option>
            {employees?.items.map((e: any) => (
              <option key={e.id} value={e.id}>{e.firstName} {e.lastName} ({e.employeeCode})</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-slate-500 mb-1">New Designation</label>
            <select value={desigId} onChange={e => setDesigId(e.target.value)} className="w-full border border-slate-200 dark:border-slate-700 bg-transparent rounded p-2">
              <option value="">-- No Change --</option>
              {designations?.map((d: any) => (
                <option key={d.id} value={d.id}>{d.title}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-slate-500 mb-1">New Pay Grade</label>
            <select value={grade} onChange={e => setGrade(e.target.value)} className="w-full border border-slate-200 dark:border-slate-700 bg-transparent rounded p-2">
              <option value="">-- No Change --</option>
              {gradeOptions.map((g: any) => (
                <option key={g.id} value={g.name}>{g.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="border-t border-slate-100 dark:border-slate-800 pt-3">
          <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-2">Revised Monthly Salary Details (INR)</h4>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-500 mb-1">Basic Pay</label>
              <input type="number" value={basic} onChange={e => setBasic(e.target.value)} className="w-full border border-slate-200 dark:border-slate-700 bg-transparent rounded p-2" />
            </div>
            <div>
              <label className="block text-slate-500 mb-1">HRA</label>
              <input type="number" value={hra} onChange={e => setHra(e.target.value)} className="w-full border border-slate-200 dark:border-slate-700 bg-transparent rounded p-2" />
            </div>
            <div>
              <label className="block text-slate-500 mb-1">DA</label>
              <input type="number" value={da} onChange={e => setDa(e.target.value)} className="w-full border border-slate-200 dark:border-slate-700 bg-transparent rounded p-2" />
            </div>
            <div>
              <label className="block text-slate-500 mb-1">Conveyance</label>
              <input type="number" value={conveyance} onChange={e => setConveyance(e.target.value)} className="w-full border border-slate-200 dark:border-slate-700 bg-transparent rounded p-2" />
            </div>
            <div>
              <label className="block text-slate-500 mb-1">Medical</label>
              <input type="number" value={medical} onChange={e => setMedical(e.target.value)} className="w-full border border-slate-200 dark:border-slate-700 bg-transparent rounded p-2" />
            </div>
            <div>
              <label className="block text-slate-500 mb-1">Special Allowance</label>
              <input type="number" value={special} onChange={e => setSpecial(e.target.value)} className="w-full border border-slate-200 dark:border-slate-700 bg-transparent rounded p-2" />
            </div>
          </div>
        </div>
        <button onClick={() => promotionMutation.mutate()} disabled={!empId || promotionMutation.isPending} className="bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 px-4 rounded transition-colors disabled:opacity-50">
          {promotionMutation.isPending ? 'Processing Promotion...' : 'Complete Promotion'}
        </button>
      </div>
    </div>
  );
}

export function ResignationWorkflowPanel({ isAdmin }: { isAdmin: boolean }) {
  const qc = useQueryClient();
  const { success: toastSuccess, error: toastError } = useToast();
  const [empId, setEmpId] = useState('');
  const [resDate, setResDate] = useState('');
  const [lwd, setLwd] = useState('');
  const [reason, setReason] = useState('');

  const { data: employees } = useQuery({
    queryKey: ['employees-resignation-select'],
    queryFn: () => employeesApi.list({ page: 1 }),
  });

  const { data: exitList, isLoading: loadingExits } = useQuery({
    queryKey: ['exit-list'],
    queryFn: exitApi.list,
  });

  const initiateMutation = useMutation({
    mutationFn: exitApi.initiate,
    onSuccess: () => {
      toastSuccess('Resignation filed successfully.');
      setEmpId('');
      setResDate('');
      setLwd('');
      setReason('');
      qc.invalidateQueries({ queryKey: ['exit-list'] });
    },
    onError: (err: any) => toastError(err.message),
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-xs">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-xs">
        <div className="flex items-center gap-2 mb-4 border-b border-slate-100 dark:border-slate-800 pb-2">
          <LogOut className="text-rose-500 w-5 h-5" />
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">File Resignation</h3>
        </div>
        <div className="space-y-3">
          {isAdmin && (
            <div>
              <label className="block text-slate-500 mb-1">Select Employee</label>
              <select value={empId} onChange={e => setEmpId(e.target.value)} className="w-full border border-slate-200 dark:border-slate-700 bg-transparent rounded p-2">
                <option value="">-- Choose Employee --</option>
                {employees?.items.map((e: any) => (
                  <option key={e.id} value={e.id}>{e.firstName} {e.lastName} ({e.employeeCode})</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="block text-slate-500 mb-1">Resignation Submission Date</label>
            <input type="date" value={resDate} onChange={e => setResDate(e.target.value)} className="w-full border border-slate-200 dark:border-slate-700 bg-transparent rounded p-2" />
          </div>
          <div>
            <label className="block text-slate-500 mb-1">Requested Last Working Day (LWD)</label>
            <input type="date" value={lwd} onChange={e => setLwd(e.target.value)} className="w-full border border-slate-200 dark:border-slate-700 bg-transparent rounded p-2" />
          </div>
          <div>
            <label className="block text-slate-500 mb-1">Reason for Resignation</label>
            <textarea rows={3} value={reason} onChange={e => setReason(e.target.value)} placeholder="Reason description..." className="w-full border border-slate-200 dark:border-slate-700 bg-transparent rounded p-2 resize-none" />
          </div>
          <button onClick={() => initiateMutation.mutate({ employeeId: empId, resignationDate: resDate, lastWorkingDay: lwd, reason })} disabled={!empId || !resDate || !lwd || initiateMutation.isPending} className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-2 px-4 rounded transition-colors disabled:opacity-50">
            {initiateMutation.isPending ? 'Filing Resignation...' : 'File Resignation'}
          </button>
        </div>
      </div>

      <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-xs">
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-4 pb-2 border-b border-slate-100 dark:border-slate-800">Active Resignations & Notice Periods</h3>
        {loadingExits ? (
          <Spinner />
        ) : !exitList || exitList.length === 0 ? (
          <p className="text-slate-400 text-center py-8">No active separations recorded.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400">
                  <th className="pb-2">Employee</th>
                  <th className="pb-2">Submission Date</th>
                  <th className="pb-2">Last Working Day</th>
                  <th className="pb-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {exitList.map((ex: any) => (
                  <tr key={ex.id}>
                    <td className="py-2.5 font-medium">{ex.employee?.firstName} {ex.employee?.lastName}</td>
                    <td className="py-2.5">{new Date(ex.resignationDate).toLocaleDateString()}</td>
                    <td className="py-2.5">{new Date(ex.lastWorkingDay).toLocaleDateString()}</td>
                    <td className="py-2.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                        ex.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                      }`}>{ex.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export function ExitClearanceDashboard() {
  const qc = useQueryClient();
  const { success: toastSuccess } = useToast();
  const [activeExitId, setActiveExitId] = useState('');
  const [interviewNote, setInterviewNote] = useState('');

  const { data: exitList } = useQuery({
    queryKey: ['exit-list'],
    queryFn: exitApi.list,
  });

  const { data: exitDetail, isLoading: loadingDetail } = useQuery({
    queryKey: ['exit-detail', activeExitId],
    queryFn: () => exitApi.get(activeExitId),
    enabled: !!activeExitId,
  });

  const checklistMutation = useMutation({
    mutationFn: ({ id, done }: { id: string; done: boolean }) =>
      done ? exitApi.completeChecklist(id) : exitApi.uncompleteChecklist(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['exit-detail', activeExitId] }),
  });

  const interviewMutation = useMutation({
    mutationFn: ({ id, note }: { id: string; note: string }) => exitApi.saveInterview(id, note),
    onSuccess: () => {
      toastSuccess('Interview notes saved!');
      qc.invalidateQueries({ queryKey: ['exit-detail', activeExitId] });
      qc.invalidateQueries({ queryKey: ['exit-list'] });
    },
  });

  const advanceMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => exitApi.advance(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['exit-detail', activeExitId] });
      qc.invalidateQueries({ queryKey: ['exit-list'] });
    },
  });

  const completedTasks = exitDetail?.checklists?.filter((c: any) => !!c.completedAt).length || 0;
  const totalTasks = exitDetail?.checklists?.length || 0;
  const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-xs">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-xs">
        <div className="flex items-center gap-2 mb-4 border-b border-slate-100 dark:border-slate-800 pb-2">
          <Briefcase className="text-indigo-500 w-5 h-5" />
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Clearance Exits</h3>
        </div>
        {!exitList || exitList.length === 0 ? (
          <p className="text-slate-400 text-center py-4">No exit processes ongoing.</p>
        ) : (
          <div className="space-y-2">
            {exitList.map((ex: any) => (
              <button
                key={ex.id}
                onClick={() => { setActiveExitId(ex.employeeId); setInterviewNote(ex.exitInterviewNote || ''); }}
                className={`w-full flex items-center justify-between p-3 border rounded text-left ${
                  activeExitId === ex.employeeId ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200' : 'border-slate-150 dark:border-slate-800'
                }`}
              >
                <div>
                  <div className="font-bold text-slate-700 dark:text-slate-200">{ex.employee?.firstName} {ex.employee?.lastName}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">LWD: {new Date(ex.lastWorkingDay).toLocaleDateString()}</div>
                </div>
                <ChevronRight size={16} className="text-slate-400" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="lg:col-span-2 space-y-6">
        {!activeExitId ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-8 flex flex-col justify-center items-center text-center h-48 text-slate-400">
            <ClipboardList className="w-10 h-10 mb-2 opacity-50" />
            <p>Select an ongoing exit to manage clearance task verification & offboarding checklists.</p>
          </div>
        ) : loadingDetail ? (
          <Spinner />
        ) : exitDetail ? (
          <>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-xs">
              <div className="flex justify-between items-center mb-3">
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  {exitDetail.employee?.firstName} {exitDetail.employee?.lastName} — Progress Checklist
                </h4>
                <span className="bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded text-[10px] font-bold uppercase">{exitDetail.status}</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 mb-4">
                <div className="bg-indigo-600 h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
              </div>
              <div className="space-y-2">
                {exitDetail.checklists?.map((item: any) => (
                  <label key={item.id} className="flex items-center gap-3 p-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded cursor-pointer">
                    <button onClick={() => checklistMutation.mutate({ id: item.id, done: !item.completedAt })}>
                      {item.completedAt ? (
                        <CheckCircle2 size={16} className="text-emerald-500" />
                      ) : (
                        <Circle size={16} className="text-slate-300" />
                      )}
                    </button>
                    <span className={item.completedAt ? 'line-through text-slate-400' : 'text-slate-700 dark:text-slate-300'}>{item.task}</span>
                  </label>
                ))}
              </div>
              {exitDetail.status !== 'completed' && (
                <button
                  onClick={() => {
                    const steps = ['initiated', 'clearance', 'fnf', 'completed'];
                    const next = steps[steps.indexOf(exitDetail.status) + 1];
                    if (next) advanceMutation.mutate({ id: exitDetail.id, status: next });
                  }}
                  className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white py-1 px-3 rounded text-[10px] font-bold"
                >
                  Advance Clearance Stage →
                </button>
              )}
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-xs">
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-3">Exit Interview Feedback</h4>
              <textarea rows={4} value={interviewNote} onChange={e => setInterviewNote(e.target.value)} placeholder="Record why employee is leaving, feedback on management, etc..." className="w-full border border-slate-200 dark:border-slate-700 bg-transparent rounded p-2 resize-none" />
              <button onClick={() => interviewMutation.mutate({ id: exitDetail.id, note: interviewNote })} disabled={interviewMutation.isPending} className="mt-3 bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 px-4 rounded transition-colors disabled:opacity-50">
                {interviewMutation.isPending ? 'Saving Notes...' : 'Save Interview Notes'}
              </button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
