import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Search, Plus } from 'lucide-react';
import { employeesApi } from '../api/client';
import AddEmployeeModal from '../components/employees/AddEmployeeModal';
import { useAuthStore } from '../store/useAuthStore';

const STATUS_ACCENT: Record<string, string> = {
  active: '#1F6F5C',
  archived: '#8A7B4E',
  terminated: '#B5522E',
};

export default function EmployeesPage() {
  const { user } = useAuthStore();
  const isAdmin = user?.role?.isSystem;

  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ['employees', search],
    queryFn: () => employeesApi.list({ search }),
  });

  return (
    <div className="p-8">
      {isModalOpen && <AddEmployeeModal onClose={() => setIsModalOpen(false)} />}
      
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">Employees</h1>
          <p className="text-sm text-muted mt-1">
            {data ? `${data.total} people in the roster` : 'Loading roster...'}
          </p>
        </div>
        {isAdmin && (
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-ink text-paper px-4 py-2 rounded-md text-sm hover:bg-ink/90"
          >
            <Plus size={16} /> Add Employee
          </button>
        )}
      </header>

      <div className="relative mb-4 max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, code, or email"
          className="w-full pl-9 pr-3 py-2 rounded-md border border-line bg-white text-sm focus:outline-none focus:ring-2 focus:ring-ledger/40"
        />
      </div>

      <div className="bg-white border border-line rounded-lg overflow-hidden">
        {isLoading && <div className="p-6 text-sm text-muted">Loading...</div>}
        {data?.items.length === 0 && (
          <div className="p-6 text-sm text-muted">No employees match that search.</div>
        )}
        {data?.items.map((emp) => (
          <Link
            key={emp.id}
            to={`/employees/${emp.id}`}
            className="ledger-row hover:bg-paper/60"
            style={{ ['--accent' as any]: STATUS_ACCENT[emp.status] ?? '#6B6A63' }}
          >
            <div>
              <div className="text-sm font-medium">{emp.firstName} {emp.lastName}</div>
              <div className="text-xs text-muted">{emp.email}</div>
            </div>
            <div className="flex items-center gap-6 text-xs text-muted">
              <span className="font-mono">{emp.employeeCode}</span>
              <span>{emp.department?.name ?? '—'}</span>
              <span>{emp.designation?.title ?? '—'}</span>
              <span className="capitalize">{emp.status}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
