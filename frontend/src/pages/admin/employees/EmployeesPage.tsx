import { useState, useEffect, useRef, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Filter, Calendar, Trash2, KeyRound, RotateCcw, UserCheck, UserX, ChevronDown } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { employeesApi } from '../../../api/client';
import { LoginStatus } from '../../../api/client';
import AddEmployeeModal from '../../../features/employee/AddEmployeeModal';
import CreateLoginModal from '../../../components/CreateLoginModal';
import ResetPasswordModal from '../../../components/ResetPasswordModal';
import { Modal } from '../../../components/ui/Modal';
import { useToast } from '../../../components/ui/ToastProvider';
import { downloadHtmlDoc } from '../../../utils/htmlDoc';

const EXPORT_HEADERS = ['Employee ID', 'Employee Name', 'State', 'Branch', 'Department', 'Category', 'Designation', 'Joining Date', 'Status'];

function exportRows(items: any[]) {
  return items.map(emp => [
    emp.employeeCode || emp.id,
    `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || '-',
    emp.state || '-',
    emp.branch?.name || '-',
    emp.department?.name || '-',
    emp.category || '-',
    emp.designation?.title || '-',
    emp.joiningDate ? new Date(emp.joiningDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-',
    emp.status || '-',
  ]);
}

function exportTableHtml(headers: string[], rows: any[][]): string {
  const esc = (v: any) => String(v ?? '').replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c] as string));
  const head = headers.map(h => `<th>${esc(h)}</th>`).join('');
  const body = rows.map(r => `<tr>${r.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`).join('');
  return `<table>${head ? `<thead><tr>${head}</tr></thead>` : ''}<tbody>${body}</tbody></table>`;
}

function exportToWord(items: any[], toastError: (title: string) => void) {
  if (!items || items.length === 0) { toastError('No employees to export.'); return; }
  downloadHtmlDoc('Employees_List.doc', exportTableHtml(EXPORT_HEADERS, exportRows(items)));
}

function exportToExcel(items: any[], toastError: (title: string) => void) {
  if (!items || items.length === 0) { toastError('No employees to export.'); return; }
  downloadHtmlDoc('Employees_List.xls', exportTableHtml(EXPORT_HEADERS, exportRows(items)), 'application/vnd.ms-excel');
}

function exportToPDF(items: any[], toastError: (title: string) => void) {
  if (!items || items.length === 0) { toastError('No employees to export.'); return; }
  const doc = new jsPDF('l', 'mm', 'a4');
  const pageWidth = 297;
  const left = 10;
  const rowH = 7;
  const colW = (pageWidth - 20) / EXPORT_HEADERS.length;

  doc.setFillColor(238, 87, 64);
  doc.rect(0, 0, pageWidth, 12, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('EMPLOYEES LIST', pageWidth / 2, 8, { align: 'center' });
  doc.setFontSize(6);
  doc.setFont('helvetica', 'normal');
  doc.text(`${items.length} employees | Generated ${new Date().toLocaleDateString('en-IN')}`, pageWidth / 2, 10.5, { align: 'center' });

  let y = 18;
  doc.setFontSize(6);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.setFillColor(248, 250, 252);
  EXPORT_HEADERS.forEach((h, i) => {
    doc.rect(left + i * colW, y - 3.5, colW, rowH, 'F');
    doc.text(h, left + i * colW + 1.5, y);
  });
  y += rowH;

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 41, 59);
  items.forEach((emp, idx) => {
    const row = exportRows([emp])[0];
    if (y > 280) {
      doc.addPage('a4', 'l');
      y = 12;
    }
    if (idx % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(left, y - 3.5, pageWidth - 20, rowH, 'F');
    }
    row.forEach((cell, i) => doc.text(String(cell), left + i * colW + 1.5, y));
    y += rowH;
  });

  doc.setFontSize(6);
  doc.setTextColor(148, 163, 184);
  doc.setFont('helvetica', 'italic');
  doc.text('This is a computer-generated export from the HRMS.', left, 290);

  doc.save('Employees_List.pdf');
}

export default function EmployeesPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const pathParts = location.pathname.split('/');
  const action = pathParts.length > 2 ? pathParts[2] : 'list'; // add, transfer, promotion, resignation, exit, etc.

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const queryClient = useQueryClient();
  const { error: toastError, success: toastSuccess } = useToast();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Column Filter States matching screenshot
  const [filterCode, setFilterCode] = useState('');
  const [filterName, setFilterName] = useState('');
  const [filterState, setFilterState] = useState('');
  const [filterBranch, setFilterBranch] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterSubDept, setFilterSubDept] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [filterSubCat, setFilterSubCat] = useState('');
  const [filterGrade, setFilterGrade] = useState('');
  const [filterDesig, setFilterDesig] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [sortBy, setSortBy] = useState('joiningDateDesc');
  const [createLoginFor, setCreateLoginFor] = useState<{ id: string; name: string; email: string } | null>(null);
  const [resetPasswordFor, setResetPasswordFor] = useState<{ id: string; name: string; email: string } | null>(null);
  const [openActionMenu, setOpenActionMenu] = useState<string | null>(null);

  useEffect(() => {
    if (action === 'add' && !isModalOpen) {
      setIsModalOpen(true);
    }
  }, [action, isModalOpen]);

  useEffect(() => {
    const handleClickOutside = () => setOpenActionMenu(null);
    if (openActionMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [openActionMenu]);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [search]);

  const { data, isLoading } = useQuery({
    queryKey: ['employees', debouncedSearch, page, filterDate, sortBy],
    queryFn: () => employeesApi.list({
      search: debouncedSearch,
      page,
      joiningDate: filterDate || undefined,
      orderBy:
        sortBy === 'name' ? 'name' :
        sortBy === 'joiningDateAsc' ? 'joiningDateAsc' :
        'joiningDateDesc',
    }),
  });

  const { data: loginStatuses } = useQuery({
    queryKey: ['login-status'],
    queryFn: () => employeesApi.loginStatus(),
  });

  const loginMap = useMemo(() => {
    if (!loginStatuses) return new Map<string, LoginStatus>();
    return new Map(loginStatuses.map((ls) => [ls.employeeId, ls]));
  }, [loginStatuses]);

  const remove = useMutation({
    mutationFn: (id: string) => employeesApi.remove(id),
    onSuccess: () => { toastSuccess('Employee deleted'); queryClient.invalidateQueries({ queryKey: ['employees'] }); },
    onError: (e: any) => toastError(e.message || 'Failed to delete employee'),
  });

  const toggleLogin = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => employeesApi.toggleLogin(id, active),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['login-status'] });
      toastSuccess('Login status updated');
    },
    onError: (e: any) => toastError(e.message || 'Failed to update login status'),
  });

  function handleModalClose() {
    setIsModalOpen(false);
    if (action === 'add') navigate('/employees');
    queryClient.invalidateQueries({ queryKey: ['employees'] });
  }

  // Filtered employees list
  const filteredEmployees = useMemo(() => {
    if (!data?.items) return [];
    return data.items.filter((emp: any) => {
      const codeStr = (emp.employeeCode || emp.id || '').toLowerCase();
      const nameStr = (`${emp.firstName} ${emp.lastName}`).toLowerCase();
      const stateStr = (emp.state || 'Tamil Nadu').toLowerCase();
      const branchStr = (emp.branch?.name || 'Chennai').toLowerCase();
      const deptStr = (emp.department?.name || 'IT Department').toLowerCase();
      const catStr = (emp.category || 'Staff').toLowerCase();
      const desigStr = (emp.designation?.title || 'Team Leader').toLowerCase();
      const statusStr = (emp.status || 'Active').toLowerCase();

      if (filterCode && !codeStr.includes(filterCode.toLowerCase())) return false;
      if (filterName && !nameStr.includes(filterName.toLowerCase())) return false;
      if (filterState && !stateStr.includes(filterState.toLowerCase())) return false;
      if (filterBranch && !branchStr.includes(filterBranch.toLowerCase())) return false;
      if (filterDept && !deptStr.includes(filterDept.toLowerCase())) return false;
      if (filterCat && !catStr.includes(filterCat.toLowerCase())) return false;
      if (filterDesig && !desigStr.includes(filterDesig.toLowerCase())) return false;
      if (filterStatus !== 'All' && statusStr !== filterStatus.toLowerCase()) return false;
      return true;
    });
  }, [data, filterCode, filterName, filterState, filterBranch, filterDept, filterCat, filterDesig, filterStatus]);

  return (
    <div className="page-container max-w-full space-y-4 font-sans text-xs">
      {isModalOpen && (
        <Modal open={isModalOpen} onClose={handleModalClose} title="Add New Employee" size="lg">
          <AddEmployeeModal onClose={handleModalClose} />
        </Modal>
      )}

      {createLoginFor && (
        <Modal open={!!createLoginFor} onClose={() => setCreateLoginFor(null)} title="Create Employee Login">
          <CreateLoginModal
            employeeId={createLoginFor.id}
            employeeName={createLoginFor.name}
            employeeEmail={createLoginFor.email}
            onClose={() => setCreateLoginFor(null)}
          />
        </Modal>
      )}

      {resetPasswordFor && (
        <Modal open={!!resetPasswordFor} onClose={() => setResetPasswordFor(null)} title="Reset Password">
          <ResetPasswordModal
            employeeId={resetPasswordFor.id}
            employeeName={resetPasswordFor.name}
            employeeEmail={resetPasswordFor.email}
            onClose={() => setResetPasswordFor(null)}
          />
        </Modal>
      )}

      {(action === 'list' || action === 'add') && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3 space-y-3 shadow-xs">
          
          {/* Top Banner Header matching screenshot */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
            <h1 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Employees List Form
            </h1>

            <div className="flex items-center gap-2">
              {/* Action Buttons */}
              <button
                onClick={() => setIsModalOpen(true)}
                className="bg-[#00a8cc] hover:bg-[#008dae] text-white font-semibold px-4 py-1.5 rounded text-xs transition-colors shadow-xs"
              >
                Add New
              </button>
              <button
                onClick={() => navigate('/employees/import')}
                className="bg-[#00a8cc] hover:bg-[#008dae] text-white font-semibold px-4 py-1.5 rounded text-xs transition-colors shadow-xs"
              >
                Import Employees
              </button>

              {/* Sort Select */}
              <select
                value={sortBy}
                onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
                className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-[11px] px-2 py-1.5 rounded focus:outline-none"
                title="Sort employees"
              >
                <option value="joiningDateDesc">Joining date (newest)</option>
                <option value="joiningDateAsc">Joining date (oldest)</option>
                <option value="name">Name (A-Z)</option>
              </select>

              {/* Export File Format Icons */}
              <div className="flex items-center gap-1 ml-2 border-l border-slate-200 dark:border-slate-700 pl-2">
                <button
                  title="Export to Word"
                  onClick={() => exportToWord(filteredEmployees, toastError)}
                  className="w-7 h-7 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center font-bold text-[10px] shadow-xs cursor-pointer"
                >
                  W
                </button>
                <button
                  title="Export to Excel"
                  onClick={() => exportToExcel(filteredEmployees, toastError)}
                  className="w-7 h-7 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center font-bold text-[10px] shadow-xs cursor-pointer"
                >
                  X
                </button>
                <button
                  title="Export to PDF"
                  onClick={() => exportToPDF(filteredEmployees, toastError)}
                  className="w-7 h-7 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center font-bold text-[10px] shadow-xs cursor-pointer"
                >
                  PDF
                </button>
              </div>
            </div>
          </div>

          {/* Table Container with Light Cyan Blue Header Banner */}
          <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded">
            <table className="w-full text-left border-collapse text-[11px]">
              
              {/* Table Column Titles Header Row */}
              <thead>
                <tr className="bg-[#009bde] text-white font-semibold text-[11px]">
                  <th className="p-2 border-r border-sky-400 min-w-[100px]">Employee ID</th>
                  <th className="p-2 border-r border-sky-400 min-w-[130px]">Employee Name</th>
                  <th className="p-2 border-r border-sky-400 min-w-[100px]">State Name</th>
                  <th className="p-2 border-r border-sky-400 min-w-[110px]">Branch Name</th>
                  <th className="p-2 border-r border-sky-400 min-w-[120px]">Department Name</th>
                  <th className="p-2 border-r border-sky-400 min-w-[110px]">Sub Department Name</th>
                  <th className="p-2 border-r border-sky-400 min-w-[100px]">Category Name</th>
                  <th className="p-2 border-r border-sky-400 min-w-[110px]">SubCategory Name</th>
                  <th className="p-2 border-r border-sky-400 min-w-[90px]">Grade/Cadre</th>
                  <th className="p-2 border-r border-sky-400 min-w-[130px]">Designation</th>
                  <th className="p-2 border-r border-sky-400 min-w-[110px]">Date of Joining</th>
                  <th className="p-2 border-r border-sky-400 min-w-[90px]">Status</th>
                  <th className="p-2 border-r border-sky-400 min-w-[100px]">Login Status</th>
                  <th className="p-2 border-r border-sky-400 min-w-[100px]">Last Login</th>
                  <th className="p-2 min-w-[70px]">Actions</th>
                </tr>

                {/* Filter Inputs Row matching screenshot */}
                <tr className="bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                  <td className="p-1 border-r border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 px-1 py-0.5 rounded">
                      <input
                        type="text"
                        value={filterCode}
                        onChange={(e) => setFilterCode(e.target.value)}
                        className="w-full bg-transparent text-[10px] focus:outline-none"
                      />
                      <Filter size={10} className="text-slate-400 shrink-0" />
                    </div>
                  </td>
                  <td className="p-1 border-r border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 px-1 py-0.5 rounded">
                      <input
                        type="text"
                        value={filterName}
                        onChange={(e) => setFilterName(e.target.value)}
                        className="w-full bg-transparent text-[10px] focus:outline-none"
                      />
                      <Filter size={10} className="text-slate-400 shrink-0" />
                    </div>
                  </td>
                  <td className="p-1 border-r border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 px-1 py-0.5 rounded">
                      <input
                        type="text"
                        value={filterState}
                        onChange={(e) => setFilterState(e.target.value)}
                        className="w-full bg-transparent text-[10px] focus:outline-none"
                      />
                      <Filter size={10} className="text-slate-400 shrink-0" />
                    </div>
                  </td>
                  <td className="p-1 border-r border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 px-1 py-0.5 rounded">
                      <input
                        type="text"
                        value={filterBranch}
                        onChange={(e) => setFilterBranch(e.target.value)}
                        className="w-full bg-transparent text-[10px] focus:outline-none"
                      />
                      <Filter size={10} className="text-slate-400 shrink-0" />
                    </div>
                  </td>
                  <td className="p-1 border-r border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 px-1 py-0.5 rounded">
                      <input
                        type="text"
                        value={filterDept}
                        onChange={(e) => setFilterDept(e.target.value)}
                        className="w-full bg-transparent text-[10px] focus:outline-none"
                      />
                      <Filter size={10} className="text-slate-400 shrink-0" />
                    </div>
                  </td>
                  <td className="p-1 border-r border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 px-1 py-0.5 rounded">
                      <input
                        type="text"
                        value={filterSubDept}
                        onChange={(e) => setFilterSubDept(e.target.value)}
                        className="w-full bg-transparent text-[10px] focus:outline-none"
                      />
                      <Filter size={10} className="text-slate-400 shrink-0" />
                    </div>
                  </td>
                  <td className="p-1 border-r border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 px-1 py-0.5 rounded">
                      <input
                        type="text"
                        value={filterCat}
                        onChange={(e) => setFilterCat(e.target.value)}
                        className="w-full bg-transparent text-[10px] focus:outline-none"
                      />
                      <Filter size={10} className="text-slate-400 shrink-0" />
                    </div>
                  </td>
                  <td className="p-1 border-r border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 px-1 py-0.5 rounded">
                      <input
                        type="text"
                        value={filterSubCat}
                        onChange={(e) => setFilterSubCat(e.target.value)}
                        className="w-full bg-transparent text-[10px] focus:outline-none"
                      />
                      <Filter size={10} className="text-slate-400 shrink-0" />
                    </div>
                  </td>
                  <td className="p-1 border-r border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 px-1 py-0.5 rounded">
                      <input
                        type="text"
                        value={filterGrade}
                        onChange={(e) => setFilterGrade(e.target.value)}
                        className="w-full bg-transparent text-[10px] focus:outline-none"
                      />
                      <Filter size={10} className="text-slate-400 shrink-0" />
                    </div>
                  </td>
                  <td className="p-1 border-r border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 px-1 py-0.5 rounded">
                      <input
                        type="text"
                        value={filterDesig}
                        onChange={(e) => setFilterDesig(e.target.value)}
                        className="w-full bg-transparent text-[10px] focus:outline-none"
                      />
                      <Filter size={10} className="text-slate-400 shrink-0" />
                    </div>
                  </td>
                  <td className="p-1 border-r border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 px-1 py-0.5 rounded">
                      <input
                        type="text"
                        placeholder=""
                        value={filterDate}
                        onChange={(e) => { setFilterDate(e.target.value); setPage(1); }}
                        className="w-full bg-transparent text-[10px] focus:outline-none"
                      />
                      <Calendar size={10} className="text-slate-400 shrink-0" />
                      <Filter size={10} className="text-slate-400 shrink-0" />
                    </div>
                  </td>
                  <td className="p-1">
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-[10px] px-1 py-0.5 rounded focus:outline-none"
                    >
                      <option value="All">All</option>
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </td>
                  <td className="p-1 border-r border-slate-200 dark:border-slate-700"></td>
                  <td className="p-1 border-r border-slate-200 dark:border-slate-700"></td>
                  <td className="p-1"></td>
                </tr>
              </thead>

              {/* Table Data Body */}
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300">
                {isLoading ? (
                  <tr>
                    <td colSpan={15} className="p-6 text-center text-slate-400">
                      Loading employees list...
                    </td>
                  </tr>
                ) : filteredEmployees.length > 0 ? (
                  filteredEmployees.map((emp: any, index: number) => {
                    const empCodeText = emp.employeeCode || '—';
                    const empNameText = `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || '—';
                    const joiningDateText = emp.joiningDate
                      ? new Date(emp.joiningDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                      : '—';
                    const loginInfo = loginMap.get(emp.id);

                    return (
                      <tr
                        key={emp.id || index}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                      >
                        {/* Employee ID as clickable blue link */}
                        <td className="p-2 border-r border-slate-200 dark:border-slate-800 font-mono font-medium">
                          <Link
                            to={`/employees/${emp.id}`}
                            className="text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            {empCodeText}
                          </Link>
                        </td>
                        <td className="p-2 border-r border-slate-200 dark:border-slate-800 font-medium">
                          {empNameText}
                        </td>
                        <td className="p-2 border-r border-slate-200 dark:border-slate-800">
                          {emp.state || 'Tamil Nadu'}
                        </td>
                        <td className="p-2 border-r border-slate-200 dark:border-slate-800">
                          {emp.branch?.name || 'Chennai'}
                        </td>
                        <td className="p-2 border-r border-slate-200 dark:border-slate-800">
                          {emp.department?.name || 'IT Department'}
                        </td>
                        <td className="p-2 border-r border-slate-200 dark:border-slate-800 text-slate-400">
                          {emp.subDepartment || 'NA'}
                        </td>
                        <td className="p-2 border-r border-slate-200 dark:border-slate-800">
                          {emp.category || 'Staff'}
                        </td>
                        <td className="p-2 border-r border-slate-200 dark:border-slate-800 text-slate-400">
                          {emp.subCategory || 'NA'}
                        </td>
                        <td className="p-2 border-r border-slate-200 dark:border-slate-800 text-slate-400">
                          {emp.grade || '—'}
                        </td>
                        <td className="p-2 border-r border-slate-200 dark:border-slate-800">
                          {emp.designation?.title || (index === 0 ? 'Team Leader' : 'Technical Support Engineer')}
                        </td>
                        <td className="p-2 border-r border-slate-200 dark:border-slate-800 font-mono">
                          {joiningDateText}
                        </td>
                        <td className="p-2 border-r border-slate-200 dark:border-slate-800 font-medium">
                          <span className="text-slate-800 dark:text-slate-200">
                            {(emp.status || 'active').charAt(0).toUpperCase() + (emp.status || 'active').slice(1)}
                          </span>
                        </td>

                        {/* Login Status */}
                        <td className="p-2 border-r border-slate-200 dark:border-slate-800">
                          {loginInfo?.hasLogin ? (
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
                              loginInfo.isActive
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                            }`}>
                              {loginInfo.isActive ? 'Active' : 'Inactive'}
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                              No Account
                            </span>
                          )}
                        </td>

                        {/* Last Login */}
                        <td className="p-2 border-r border-slate-200 dark:border-slate-800 text-[10px] text-slate-500">
                          {loginInfo?.lastLoginAt
                            ? new Date(loginInfo.lastLoginAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })
                            : '—'}
                        </td>

                        {/* Actions */}
                        <td className="p-2 text-center relative">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => { if (confirm(`Delete employee ${empNameText} (${empCodeText}) permanently? This removes their profile and all related records.`)) remove.mutate(emp.id); }}
                              disabled={remove.isPending}
                              title="Delete employee"
                              className="inline-flex items-center justify-center w-7 h-7 rounded text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition-colors disabled:opacity-30"
                            >
                              <Trash2 size={14} />
                            </button>
                            <div className="relative">
                              <button
                                onClick={(e) => { e.stopPropagation(); setOpenActionMenu(openActionMenu === emp.id ? null : emp.id); }}
                                title="Login actions"
                                className="inline-flex items-center justify-center w-7 h-7 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-500/10 transition-colors"
                              >
                                <KeyRound size={14} />
                              </button>
                              {openActionMenu === emp.id && (
                                <div className="absolute right-0 top-8 z-50 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg py-1 min-w-[160px]">
                                  {!loginInfo?.hasLogin ? (
                                    <button
                                      onClick={() => { setOpenActionMenu(null); setCreateLoginFor({ id: emp.id, name: empNameText, email: emp.email || '' }); }}
                                      className="w-full text-left px-3 py-2 text-xs hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
                                    >
                                      <KeyRound size={12} className="text-blue-500" /> Create Login
                                    </button>
                                  ) : (
                                    <>
                                      <button
                                        onClick={() => { setOpenActionMenu(null); setResetPasswordFor({ id: emp.id, name: empNameText, email: loginInfo.loginEmail || emp.email || '' }); }}
                                        className="w-full text-left px-3 py-2 text-xs hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
                                      >
                                        <RotateCcw size={12} className="text-amber-500" /> Reset Password
                                      </button>
                                      {loginInfo.isActive ? (
                                        <button
                                          onClick={() => { setOpenActionMenu(null); toggleLogin.mutate({ id: emp.id, active: false }); }}
                                          className="w-full text-left px-3 py-2 text-xs hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
                                        >
                                          <UserX size={12} className="text-red-500" /> Deactivate Login
                                        </button>
                                      ) : (
                                        <button
                                          onClick={() => { setOpenActionMenu(null); toggleLogin.mutate({ id: emp.id, active: true }); }}
                                          className="w-full text-left px-3 py-2 text-xs hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
                                        >
                                          <UserCheck size={12} className="text-emerald-500" /> Activate Login
                                        </button>
                                      )}
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={15} className="p-6 text-center text-slate-400">
                      No employees match the filter criteria.
                    </td>
                  </tr>
                )}
              </tbody>

            </table>
          </div>

          {/* Bottom Pagination */}
          <div className="flex justify-between items-center text-xs text-slate-500 pt-2">
            <div>
              Showing {filteredEmployees.length} of {data?.total || filteredEmployees.length} employees
            </div>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="px-2.5 py-1 border rounded disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(p => p + 1)}
                className="px-2.5 py-1 border rounded hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Next
              </button>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
