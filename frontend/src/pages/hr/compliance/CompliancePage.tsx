import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Shield, Percent, IndianRupee, Heart, FileText, Plus, Trash2, Loader2 } from 'lucide-react';
import { DataTable, Column } from '../../../components/ui/DataTable';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '../../../components/ui/ToastProvider';
import { complianceSetupApi } from '../../../api/client';

type TabKey = 'pt' | 'pf' | 'esic' | 'lwf' | 'forms';

const SUB_TO_TAB: Record<string, TabKey> = { pt: 'pt', pf: 'pf', esic: 'esic', lwf: 'lwf', forms: 'forms' };
const TAB_TO_SUB: Record<TabKey, string> = { pt: 'pt', pf: 'pf', esic: 'esic', lwf: 'lwf', forms: 'forms' };

interface FieldDef {
  key: string;
  label: string;
  placeholder: string;
  numeric?: boolean;
}

const TAB_FIELDS: Record<TabKey, FieldDef[]> = {
  pt: [
    { key: 'state', label: 'State', placeholder: 'State' },
    { key: 'fromAmount', label: 'From', placeholder: 'Salary range from', numeric: true },
    { key: 'toAmount', label: 'To', placeholder: 'Salary range to', numeric: true },
    { key: 'amount', label: 'Amount', placeholder: 'e.g. 200', numeric: true },
  ],
  pf: [
    { key: 'component', label: 'Component', placeholder: 'e.g. Employee PF' },
    { key: 'rate', label: 'Rate', placeholder: 'e.g. 12%' },
    { key: 'cap', label: 'Cap', placeholder: 'e.g. Ceiling ₹15,000' },
  ],
  esic: [
    { key: 'component', label: 'Component', placeholder: 'e.g. Employee ESI' },
    { key: 'rate', label: 'Rate', placeholder: 'e.g. 0.75%' },
    { key: 'wageLimit', label: 'Wage Limit', placeholder: 'e.g. ₹21,000' },
  ],
  lwf: [
    { key: 'state', label: 'State', placeholder: 'State' },
    { key: 'employeeShare', label: 'Employee Share', placeholder: 'e.g. 10', numeric: true },
    { key: 'employerShare', label: 'Employer Share', placeholder: 'e.g. 40', numeric: true },
  ],
  forms: [
    { key: 'formName', label: 'Form', placeholder: 'Form name' },
    { key: 'category', label: 'Category', placeholder: 'Category' },
  ],
};

function buildSchema(fields: FieldDef[]) {
  const shape: Record<string, z.ZodTypeAny> = {};
  fields.forEach((f) => {
    shape[f.key] = f.numeric ? z.string().min(1, 'Required') : z.string().min(1, 'Required');
  });
  return z.object(shape);
}

export default function CompliancePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { success: toastSuccess, error: toastError } = useToast();
  const pathParts = location.pathname.split('/');
  const subAction = pathParts.length > 2 ? pathParts[2] : 'pt';

  const initialTab = SUB_TO_TAB[subAction] || 'pt';
  const [tab, setTab] = useState<TabKey>(initialTab);

  useEffect(() => {
    if (subAction && SUB_TO_TAB[subAction]) {
      setTab(SUB_TO_TAB[subAction]);
    }
  }, [subAction]);

  const handleTabChange = (t: TabKey) => {
    setTab(t);
    navigate(`/compliance/${TAB_TO_SUB[t]}`);
  };

  const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    { key: 'pt', label: 'Professional Tax', icon: <Percent size={16} /> },
    { key: 'pf', label: 'Provident Fund (PF)', icon: <Shield size={16} /> },
    { key: 'esic', label: 'ESIC', icon: <Heart size={16} /> },
    { key: 'lwf', label: 'Labour Welfare Fund', icon: <IndianRupee size={16} /> },
    { key: 'forms', label: 'Compliance Forms', icon: <FileText size={16} /> },
  ];

  const fields = TAB_FIELDS[tab];
  const schema = buildSchema(fields);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
  });

  const { data: rows, isLoading } = useQuery({
    queryKey: ['compliance-data', tab],
    queryFn: () => complianceSetupApi.list(tab),
  });
  const data = Array.isArray(rows) ? rows : (rows as any)?.items ?? [];

  const createMutation = useMutation({
    mutationFn: (payload: any) => complianceSetupApi.create(tab, payload),
    onSuccess: () => {
      toastSuccess('Rule added successfully');
      queryClient.invalidateQueries({ queryKey: ['compliance-data', tab] });
      reset();
    },
    onError: (e: any) => toastError(e.message || 'Failed to add rule'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => complianceSetupApi.remove(tab, id),
    onSuccess: () => {
      toastSuccess('Rule deleted');
      queryClient.invalidateQueries({ queryKey: ['compliance-data', tab] });
    },
    onError: (e: any) => toastError(e.message || 'Failed to delete rule'),
  });

  const onSubmit = (values: any) => {
    const payload: any = {};
    fields.forEach((f) => {
      payload[f.key] = f.numeric ? Number(values[f.key]) : values[f.key];
    });
    createMutation.mutate(payload);
  };

  const columns: Column<any>[] = [
    ...fields.map((f, i) => ({
      key: f.key,
      header: f.label,
      render: (row: any) =>
        i === 0 ? (
          <span className="font-bold text-[var(--text-primary)]">{String(row[f.key] ?? '—')}</span>
        ) : (
          <span className="text-sm text-[var(--text-muted)] font-semibold">{f.numeric ? `₹${Number(row[f.key] || 0).toLocaleString('en-IN')}` : String(row[f.key] ?? '—')}</span>
        ),
    })),
    {
      key: 'actions',
      header: 'Actions',
      render: (row: any) => (
        <button
          onClick={() => deleteMutation.mutate(row.id)}
          disabled={deleteMutation.isPending}
          className="text-rose-500 hover:text-rose-600 transition-colors p-1.5 hover:bg-rose-500/10 rounded disabled:opacity-50"
          aria-label="Delete"
        >
          <Trash2 size={16} />
        </button>
      ),
    },
  ];

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="absolute top-0 right-0 p-32 bg-rose-500/10 rounded-bl-full -z-0 blur-2xl"></div>
        <div className="relative z-10 flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 shadow-inner">
             <Shield size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Compliance Command Center</h1>
            <p className="text-sm text-[var(--text-muted)] mt-1 font-medium">Manage Professional Tax, PF, ESIC, and Statutory forms.</p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => handleTabChange(t.key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all border ${
              tab === t.key
                ? 'bg-rose-500 text-white border-rose-500 shadow-md shadow-rose-500/20'
                : 'bg-[var(--surface)] text-[var(--text-muted)] border-[var(--border)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]'
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 shadow-sm">
            <h3 className="text-sm font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2"><Plus size={16} className="text-rose-500" /> Create New Rule</h3>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {fields.map((f) => (
                <div key={f.key} className="space-y-2">
                  <label className="text-xs font-bold text-[var(--text-primary)]">{f.label}</label>
                  <input
                    {...register(f.key)}
                    type={f.numeric ? 'number' : 'text'}
                    className="w-full px-3 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-rose-500"
                    placeholder={f.placeholder}
                  />
                  {errors[f.key] && <p className="text-xs text-rose-500">{String(errors[f.key]?.message)}</p>}
                </div>
              ))}
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="w-full py-2 bg-rose-500 text-white rounded-xl text-sm font-bold hover:bg-rose-600 transition-colors flex justify-center items-center gap-2 mt-4 disabled:opacity-50"
              >
                {createMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Add Rule
              </button>
            </form>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm min-h-[400px]">
            <div className="premium-datatable">
               <style>{`
                  .premium-datatable table { width: 100%; border-collapse: separate; border-spacing: 0 8px; }
                  .premium-datatable th { padding: 12px 16px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); font-weight: 700; border-bottom: 1px solid var(--border); text-align: left; }
                  .premium-datatable td { padding: 12px 16px; background: var(--surface-alt); border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); transition: background 0.2s; }
                  .premium-datatable tr td:first-child { border-left: 1px solid var(--border); border-top-left-radius: 12px; border-bottom-left-radius: 12px; }
                  .premium-datatable tr td:last-child { border-right: 1px solid var(--border); border-top-right-radius: 12px; border-bottom-right-radius: 12px; }
                  .premium-datatable tbody tr:hover td { background: var(--surface-hover); }
               `}</style>
               <DataTable columns={columns} data={data} loading={isLoading} keyField="id"
                 emptyTitle="No records yet"
                 emptyMessage={`No ${TABS.find((t) => t.key === tab)?.label} rules configured. Add one using the form.`} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
