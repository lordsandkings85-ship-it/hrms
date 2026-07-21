import { useState, useEffect, useRef, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useLocation } from 'react-router-dom';
import { Users, Plus, ArrowRight, ArrowLeftRight, TrendingUp, LogOut, Briefcase } from 'lucide-react';
import { employeesApi } from '../api/client';
import AddEmployeeModal from '../components/employees/AddEmployeeModal';
import { useAuthStore } from '../store/useAuthStore';
import { StatusBadge } from '../components/ui/Badge';
import { PageHeader } from '../components/ui/PageHeader';
import { Modal } from '../components/ui/Modal';
import { DataTable, Column } from '../components/ui/DataTable';

function EmployeeAvatar({ firstName, lastName }: { firstName?: string; lastName?: string }) {
  const fName = firstName || '?';
  const lName = lastName || '';
  const initials = `${fName[0]}${lName[0] ?? ''}`.toUpperCase();
  const colors = ['bg-ledger/20 text-ledgerDark', 'bg-info-light text-info-dark', 'bg-warning-light text-warning-dark', 'bg-rust/10 text-rust'];
  const fCode = fName.charCodeAt(0) || 0;
  const lCode = lName ? lName.charCodeAt(0) : 0;
  const idx = (fCode + lCode) % colors.length;
  
  return (
    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${colors[idx]}`}>
      {initials}
    </div>
  );
}

export default function EmployeesPage() {
  const { user } = useAuthStore();
  const isAdmin = user?.role?.isSystem;
  const navigate = useNavigate();
  const location = useLocation();
  const pathParts = location.pathname.split('/');
  const action = pathParts.length > 2 ? pathParts[2] : 'list'; // add, transfer, promotion, resignation, exit

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const queryClient = useQueryClient();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (action === 'add' && !isModalOpen) {
      setIsModalOpen(true);
    }
  }, [action, isModalOpen]);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [search]);

  const { data, isLoading } = useQuery({
    queryKey: ['employees', debouncedSearch, page],
    queryFn: () => employeesApi.list({ search: debouncedSearch, page }),
  });

  function handleModalClose() {
    setIsModalOpen(false);
    if (action === 'add') navigate('/employees');
    queryClient.invalidateQueries({ queryKey: ['employees'] });
  }

  const columns = useMemo<Column<any>[]>(() => [
    {
      key: 'name',
      header: 'Employee',
      sortable: true,
      render: (emp) => (
        <div className="flex items-center gap-3">
          <EmployeeAvatar firstName={emp.firstName} lastName={emp.lastName} />
          <div className="min-w-0">
            <div className="text-sm font-semibold text-ink group-hover:text-ledger transition-colors truncate">
              {emp.firstName} {emp.lastName}
            </div>
            <div className="text-xs text-muted truncate">{emp.email}</div>
          </div>
        </div>
      )
    },
    { key: 'employeeCode', header: 'Code', sortable: true, render: (emp) => <span className="font-mono text-xs">{emp.employeeCode}</span> },
    { key: 'department', header: 'Department', render: (emp) => <span className="text-xs text-muted truncate max-w-[120px] block">{emp.department?.name ?? '—'}</span> },
    { key: 'designation', header: 'Designation', render: (emp) => <span className="text-xs text-muted truncate max-w-[120px] block">{emp.designation?.title ?? '—'}</span> },
    { key: 'status', header: 'Status', render: (emp) => <StatusBadge status={emp.status} /> },
    { key: 'actions', header: '', width: '50px', render: () => <ArrowRight size={14} className="text-muted/30 group-hover:text-ledger transition-colors ml-auto" /> }
  ], []);

  return (
    <div className="page-container max-w-7xl space-y-6">
      {isModalOpen && (
        <Modal open={isModalOpen} onClose={handleModalClose} title="Add New Employee" size="lg">
          <AddEmployeeModal onClose={handleModalClose} />
        </Modal>
      )}

      {/* TABS for Actions */}
      <div className="tab-container animate-slideUp" style={{ animationDelay: '0.1s' }}>
        {[
          { key: 'list', label: 'Employee List', icon: <Users size={16} /> },
          { key: 'transfer', label: 'Transfer', icon: <ArrowLeftRight size={16} />, adminOnly: true },
          { key: 'promotion', label: 'Promotion', icon: <TrendingUp size={16} />, adminOnly: true },
          { key: 'resignation', label: 'Resignation', icon: <LogOut size={16} /> },
          { key: 'exit', label: 'Exit Process', icon: <Briefcase size={16} />, adminOnly: true },
        ].filter(t => !t.adminOnly || isAdmin).map(t => (
          <button
            key={t.key}
            onClick={() => navigate(t.key === 'list' ? '/employees' : `/employees/${t.key}`)}
            className={`tab-pill flex items-center gap-2 ${
              action === t.key ? 'tab-pill-active' : 'tab-pill-inactive'
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {(action === 'list' || action === 'add') && (
        <div className="animate-slideUp" style={{ animationDelay: '0.2s' }}>
          <PageHeader
            title="Employees"
            subtitle={data ? `${data.total} people in the roster` : 'Loading…'}
            icon={Users}
            actions={
              isAdmin ? (
                <button onClick={() => navigate('/employees/add')} className="btn-primary">
                  <Plus size={15} /> Add Employee
                </button>
              ) : undefined
            }
          />

          <DataTable
            columns={columns}
            data={data?.items ?? []}
            keyField="id"
            loading={isLoading}
            emptyTitle="No employees found"
            emptyMessage={debouncedSearch ? `No results for "${debouncedSearch}"` : 'Add your first employee to get started.'}
            searchable
            searchPlaceholder="Name, code, or email…"
            onSearchChange={setSearch}
            serverPagination
            totalRecords={data?.total ?? 0}
            currentPage={page}
            onPageChange={setPage}
            pageSize={15}
            onRowClick={(row) => navigate(`/employees/${row.id}`)}
          />
        </div>
      )}

      {/* Transfer Tab */}
      {action === 'transfer' && isAdmin && (
        <div className="max-w-4xl animate-slideUp" style={{ animationDelay: '0.2s' }}>
          <div className="section-card p-6 flex flex-col justify-center items-center text-center h-48">
            <ArrowLeftRight size={32} className="text-muted/30 mb-2" />
            <h3 className="text-sm font-bold text-ink">Employee Transfers</h3>
            <p className="text-xs text-muted max-w-md">Manage branch and department transfers. Select an employee from the list to initiate a transfer request.</p>
          </div>
        </div>
      )}

      {/* Promotion Tab */}
      {action === 'promotion' && isAdmin && (
        <div className="max-w-4xl animate-slideUp" style={{ animationDelay: '0.2s' }}>
          <div className="section-card p-6 flex flex-col justify-center items-center text-center h-48">
            <TrendingUp size={32} className="text-muted/30 mb-2" />
            <h3 className="text-sm font-bold text-ink">Promotions & Pay Adjustments</h3>
            <p className="text-xs text-muted max-w-md">Process level promotions and generate updated compensation letters.</p>
          </div>
        </div>
      )}

      {/* Resignation Tab */}
      {action === 'resignation' && (
        <div className="max-w-4xl animate-slideUp" style={{ animationDelay: '0.2s' }}>
          <div className="section-card p-6 flex flex-col justify-center items-center text-center h-48">
            <LogOut size={32} className="text-muted/30 mb-2" />
            <h3 className="text-sm font-bold text-ink">Resignation Workflows</h3>
            <p className="text-xs text-muted max-w-md">Submit resignation requests, track notice periods, and view approval status.</p>
            {!isAdmin && <button className="btn-danger mt-2">Submit Resignation</button>}
          </div>
        </div>
      )}

      {/* Exit Process Tab */}
      {action === 'exit' && isAdmin && (
        <div className="max-w-4xl animate-slideUp" style={{ animationDelay: '0.2s' }}>
          <div className="section-card p-6 flex flex-col justify-center items-center text-center h-48">
            <Briefcase size={32} className="text-muted/30 mb-2" />
            <h3 className="text-sm font-bold text-ink">Exit Management</h3>
            <p className="text-xs text-muted max-w-md">Oversee full offboarding processes, clearance checklists, and Full & Final (FnF) settlements.</p>
          </div>
        </div>
      )}
    </div>
  );
}

