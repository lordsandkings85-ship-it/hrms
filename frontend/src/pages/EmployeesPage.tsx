import { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Search, Plus, Users, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { employeesApi } from '../api/client';
import AddEmployeeModal from '../components/employees/AddEmployeeModal';
import { useAuthStore } from '../store/useAuthStore';
import { StatusBadge } from '../components/ui/Badge';
import { PageHeader } from '../components/ui/PageHeader';
import { EmptyState } from '../components/ui/EmptyState';
import { Spinner } from '../components/ui/Spinner';
import { Modal } from '../components/ui/Modal';

function EmployeeAvatar({ firstName, lastName }: { firstName: string; lastName: string }) {
  const initials = `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase();
  // Deterministic color from name
  const colors = ['bg-ledger/20 text-ledgerDark', 'bg-info-light text-info-dark', 'bg-warning-light text-warning-dark', 'bg-rust/10 text-rust'];
  const idx = (firstName.charCodeAt(0) + (lastName?.charCodeAt(0) ?? 0)) % colors.length;
  return (
    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${colors[idx]}`}>
      {initials}
    </div>
  );
}

export default function EmployeesPage() {
  const { user } = useAuthStore();
  const isAdmin = user?.role?.isSystem;

  const [search, setSearch]           = useState('');
  const [debouncedSearch, setDebounced] = useState('');
  const [page, setPage]               = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const queryClient = useQueryClient();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Debounce search input
  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { setDebounced(search); setPage(1); }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [search]);

  const { data, isLoading } = useQuery({
    queryKey: ['employees', debouncedSearch, page],
    queryFn: () => employeesApi.list({ search: debouncedSearch, page }),
  });

  function handleModalClose() {
    setIsModalOpen(false);
    queryClient.invalidateQueries({ queryKey: ['employees'] });
  }

  const totalPages = data?.totalPages ?? 1;

  return (
    <div className="page-container">
      {/* Add Employee Modal */}
      {isModalOpen && (
        <Modal open={isModalOpen} onClose={handleModalClose} title="Add New Employee" size="lg">
          <AddEmployeeModal onClose={handleModalClose} />
        </Modal>
      )}

      {/* Header */}
      <PageHeader
        title="Employees"
        subtitle={data ? `${data.total} people in the roster` : 'Loading…'}
        icon={Users}
        actions={
          isAdmin ? (
            <button onClick={() => setIsModalOpen(true)} className="btn-primary">
              <Plus size={15} /> Add Employee
            </button>
          ) : undefined
        }
      />

      {/* Search */}
      <div className="relative mb-5 max-w-xs">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Name, code, or email…"
          className="input pl-9"
        />
      </div>

      {/* Table */}
      <div className="section-card overflow-hidden">
        {/* Table header */}
        <div className="hidden md:grid grid-cols-[2.5rem_1fr_auto_auto_auto_auto] items-center gap-4 px-4 py-2.5 bg-paperDim/60 border-b border-line">
          <div />
          <span className="text-[11px] font-bold uppercase tracking-wide text-muted">Name</span>
          <span className="text-[11px] font-bold uppercase tracking-wide text-muted">Code</span>
          <span className="text-[11px] font-bold uppercase tracking-wide text-muted">Department</span>
          <span className="text-[11px] font-bold uppercase tracking-wide text-muted">Designation</span>
          <span className="text-[11px] font-bold uppercase tracking-wide text-muted">Status</span>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <Spinner />
          </div>
        )}

        {/* Empty */}
        {!isLoading && data?.items.length === 0 && (
          <EmptyState
            icon={Users}
            title="No employees found"
            description={debouncedSearch ? `No results for "${debouncedSearch}"` : 'Add your first employee to get started.'}
            action={
              isAdmin ? (
                <button onClick={() => setIsModalOpen(true)} className="btn-primary text-sm">
                  <Plus size={14} /> Add Employee
                </button>
              ) : undefined
            }
          />
        )}

        {/* Rows */}
        {!isLoading && data?.items.map((emp) => (
          <Link
            key={emp.id}
            to={`/employees/${emp.id}`}
            className="grid grid-cols-[2.5rem_1fr] md:grid-cols-[2.5rem_1fr_auto_auto_auto_auto] items-center gap-4 px-4 py-3.5 border-b border-line last:border-0 hover:bg-paperDim/40 transition-colors group"
          >
            <EmployeeAvatar firstName={emp.firstName} lastName={emp.lastName} />

            <div className="min-w-0">
              <div className="text-sm font-semibold text-ink group-hover:text-ledger transition-colors truncate">
                {emp.firstName} {emp.lastName}
              </div>
              <div className="text-xs text-muted truncate">{emp.email}</div>
            </div>

            <span className="hidden md:block font-mono text-xs text-muted">{emp.employeeCode}</span>

            <span className="hidden md:block text-xs text-muted max-w-[120px] truncate">
              {emp.department?.name ?? <span className="text-muted/40">—</span>}
            </span>

            <span className="hidden md:block text-xs text-muted max-w-[120px] truncate">
              {emp.designation?.title ?? <span className="text-muted/40">—</span>}
            </span>

            <div className="hidden md:flex items-center gap-2">
              <StatusBadge status={emp.status} />
              <ArrowRight size={12} className="text-muted/30 group-hover:text-ledger transition-colors" />
            </div>
          </Link>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-xs text-muted">Page {page} of {totalPages}</p>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(p => p - 1)}
              className="btn-ghost disabled:opacity-40"
            >
              <ChevronLeft size={14} /> Prev
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(p => p + 1)}
              className="btn-ghost disabled:opacity-40"
            >
              Next <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
