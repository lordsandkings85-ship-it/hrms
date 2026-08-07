import { useNavigate, useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Award, Loader2 } from 'lucide-react';
import { employeesApi } from '../../../api/client';
import { StructureSection } from '../payroll/sections/EmployeeSections';

export default function EmployeeSalaryStructurePage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: employee, isLoading } = useQuery({
    queryKey: ['employee-detail', id],
    queryFn: () => employeesApi.get(id!),
    enabled: !!id,
  });

  if (!id) {
    return null;
  }

  return (
    <div className="p-6 space-y-6 max-w-[1200px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Link to="/employees/salary-structure" className="inline-flex items-center gap-2 text-xs font-bold text-[var(--text-muted)] hover:text-indigo-500 transition-colors">
        <ArrowLeft size={14} /> Back to Salary Structure Database
      </Link>

      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="absolute top-0 right-0 p-32 bg-teal-500/10 rounded-bl-full -z-0 blur-2xl"></div>
        <div className="relative z-10 flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-500 shadow-inner">
            <Award size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Salary Structure</h1>
            <p className="text-sm text-[var(--text-muted)] mt-1 font-medium">
              {isLoading ? (
                <span className="inline-flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Loading employee…</span>
              ) : employee ? (
                <>Manage salary for {employee.firstName} {employee.lastName} ({employee.employeeCode || '—'})</>
              ) : (
                'Manage salary structure'
              )}
            </p>
          </div>
        </div>
        <button
          onClick={() => navigate(`/employees/${id}`)}
          className="relative z-10 px-4 py-2 border border-[var(--border)] rounded-xl text-xs font-bold text-[var(--text-muted)] hover:text-indigo-500 hover:border-indigo-500/30 transition-colors bg-[var(--surface-alt)]"
        >
          View Employee Profile
        </button>
      </div>

      <StructureSection initialEmployeeId={id} />
    </div>
  );
}
