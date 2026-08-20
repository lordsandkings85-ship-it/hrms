import { useQuery } from '@tanstack/react-query';
import { employeesApi } from '../../../api/client';
import { useAuthStore } from '../../../store/useAuthStore';
import { Spinner } from '../../../components/ui/Spinner';
import { PageHeader } from '../../../components/ui/PageHeader';
import { 
  User, Briefcase, Mail, Phone, Calendar, ShieldCheck, 
  MapPin, Landmark, Users, Award, FileText, Info, Building, Edit3
} from 'lucide-react';
import { useState } from 'react';
import { getServerNow } from '../../../utils/serverTime';
import { EditProfileModal } from '../../../features/employee/EditProfileModal';

export default function MyProfilePage() {
  const { user } = useAuthStore();
  const empId = user?.employee?.id;
  const [activeTab, setActiveTab] = useState<'overview' | 'personal' | 'contact' | 'statutory'>('overview');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const { data: emp, isLoading } = useQuery({
    queryKey: ['my-profile', empId],
    queryFn: () => employeesApi.get(empId!),
    enabled: !!empId,
  });

  if (isLoading) {
    return (
      <div className="page-container flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!emp) {
    return (
      <div className="page-container">
        <div className="bg-rose-500/5 dark:bg-rose-950/20 text-rose-500 dark:text-rose-400 p-4 rounded-xl border border-rose-500/10">
          Profile data not found. Please contact support.
        </div>
      </div>
    );
  }

  const managerName = emp.manager 
    ? `${emp.manager.firstName} ${emp.manager.lastName}`
    : '—';

  const formatAddress = (addr: any) => {
    if (!addr) return '—';
    const parts = [
      addr.address,
      addr.village,
      addr.taluka,
      addr.city,
      addr.district,
      addr.state,
      addr.country,
      addr.postCode
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : '—';
  };

  const currentAddress = emp.contactInfo ? {
    address: emp.contactInfo.currentAddress,
    village: emp.contactInfo.currentVillage,
    taluka: emp.contactInfo.currentTaluka,
    city: emp.contactInfo.currentCity,
    district: emp.contactInfo.currentDistrict,
    state: emp.contactInfo.currentState,
    country: emp.contactInfo.currentCountry,
    postCode: emp.contactInfo.currentPostCode,
  } : null;

  const dobValue = (emp as any).dob || emp.personalInfo?.dob || null;

  const activeShift = (emp as any)?.shiftAssignment
    ?.find((sa: any) => !sa.effectiveTo || new Date(sa.effectiveTo) > getServerNow())
    ?.shift;
  const shiftLabel = activeShift
    ? `${activeShift.name || 'Shift'}${activeShift.startTime ? ` (${activeShift.startTime}${activeShift.endTime ? ' - ' + activeShift.endTime : ''})` : ''}`
    : '—';

  const experienceData = emp.joiningDate ? (() => {
    const start = new Date(emp.joiningDate);
    const end = getServerNow();
    let diff = end.getTime() - start.getTime();
    if (diff < 0) return '0 Months';
    const years = Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
    diff -= years * (1000 * 60 * 60 * 24 * 365.25);
    const months = Math.floor(diff / (1000 * 60 * 60 * 24 * 30.4375));
    return `${years > 0 ? years + ' Year(s) ' : ''}${months} Month(s)`;
  })() : '—';

  return (
    <div className="page-container space-y-6 max-w-6xl animate-fade">
      
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white font-display">
            My Employee Passport
          </h1>
          <p className="text-xs text-slate-400 font-medium">
            Secured corporate employee master identity & statutory record.
          </p>
        </div>
        <button onClick={() => setIsEditModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm">
          <Edit3 size={15} /> Edit Contact Info
        </button>
      </div>

      {/* Corporate Passport ID Card Banner */}
      <div 
        className="relative overflow-hidden rounded-2xl p-6 md:p-8 shadow-md border border-indigo-950/20 text-white flex flex-col md:flex-row gap-6 items-center md:items-start group transition-all duration-300"
        style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #311042 100%)'
        }}
      >
        {/* Futuristic Grid / Mesh Accents */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-500/10 via-transparent to-transparent pointer-events-none" />
        <div className="absolute inset-0 opacity-5 bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:14px_24px] pointer-events-none" />

        {/* Profile Avatar Wrapper with Gradient Ring */}
        <div className="relative shrink-0 group">
          <div className="absolute -inset-1 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 opacity-75 blur-sm group-hover:opacity-100 transition-opacity duration-300" />
          <div className="relative w-24 h-24 rounded-2xl bg-slate-900 flex items-center justify-center text-white text-3xl font-black font-display shadow-2xl shrink-0 select-none border border-slate-700/50">
            {emp.firstName[0]}{emp.lastName?.[0] ?? ''}
          </div>
        </div>

        {/* Passport details */}
        <div className="flex-1 text-center md:text-left space-y-4 relative z-10 w-full">
          <div>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
              <h2 className="text-2xl font-black tracking-tight text-white font-display">
                {emp.firstName} {emp.lastName}
              </h2>
              <span className="text-[9px] uppercase font-black tracking-widest px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                {emp.status}
              </span>
            </div>
            <p className="text-sm font-bold text-slate-350 mt-1 flex items-center justify-center md:justify-start gap-1.5">
              <Building size={14} className="text-indigo-400" />
              <span>{emp.designation?.title ?? 'Associate'}</span>
              <span className="text-slate-500">•</span>
              <span>{emp.department?.name ?? 'General'}</span>
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-slate-800/80 text-left">
            <div>
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Employee Code</p>
              <p className="text-xs font-mono font-bold text-slate-200 mt-1">{emp.employeeCode}</p>
            </div>
            <div>
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Date of Joining</p>
              <p className="text-xs font-bold text-slate-200 mt-1">
                {emp.joiningDate ? new Date(emp.joiningDate).toLocaleDateString('en-IN') : '—'}
              </p>
            </div>
            <div>
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Tenure</p>
              <p className="text-xs font-bold text-slate-200 mt-1">{experienceData}</p>
            </div>
            <div>
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Work Location</p>
              <p className="text-xs font-bold text-slate-200 mt-1">{(emp as any).branch?.name ?? 'HQ - Bangalore'}</p>
            </div>

          </div>
        </div>
      </div>

      {/* Interactive Tabs Menu */}
      <div className="border-b border-slate-200 dark:border-slate-800 flex gap-1 overflow-x-auto shrink-0 pb-px">
        {[
          { id: 'overview', label: 'Corporate Overview', icon: Briefcase },
          { id: 'personal', label: 'Personal & Dependents', icon: User },
          { id: 'contact', label: 'Contact Registry', icon: MapPin },
          { id: 'statutory', label: 'Statutory & Payroll', icon: Landmark }
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-5 py-3 text-xs font-bold border-b-2 transition-all duration-200 shrink-0 ${
                active 
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 font-extrabold' 
                  : 'border-transparent text-slate-450 dark:text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Icon size={14} className={active ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}
      <div className="grid grid-cols-1 gap-6 animate-fade">

        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Professional Details */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs space-y-4">
              <h3 className="text-xs font-bold text-slate-850 dark:text-slate-100 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-3 uppercase tracking-wider">
                <Briefcase size={15} className="text-indigo-600 dark:text-indigo-400" />
                <span>Professional Details</span>
              </h3>
              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Designation</span>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{emp.designation?.title ?? '—'}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Department</span>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{emp.department?.name ?? '—'}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Reporting Manager</span>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{managerName}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Shift</span>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{shiftLabel}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Working Days / Week</span>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{emp.workingDaysPerWeek ?? 5} Days</p>
                </div>
              </div>
            </div>

            {/* Employment Status Profile */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs space-y-4">
              <h3 className="text-xs font-bold text-slate-850 dark:text-slate-100 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-3 uppercase tracking-wider">
                <Award size={15} className="text-indigo-600 dark:text-indigo-400" />
                <span>Career Profile</span>
              </h3>
              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Joining Date</span>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    {emp.joiningDate ? new Date(emp.joiningDate).toLocaleDateString('en-IN') : '—'}
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Tenure</span>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{experienceData}</p>
                </div>
                <div className="space-y-1 col-span-2">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Official Email</span>
                  <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 break-all">{emp.email}</p>
                </div>
              </div>
            </div>

          </div>
        )}

        {activeTab === 'personal' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Personal Info */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs space-y-4">
              <h3 className="text-xs font-bold text-slate-850 dark:text-slate-100 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-3 uppercase tracking-wider">
                <User size={15} className="text-indigo-600 dark:text-indigo-400" />
                <span>Bio Information</span>
              </h3>
              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Date of Birth</span>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    {dobValue ? new Date(dobValue).toLocaleDateString('en-IN') : '—'}
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Gender</span>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{emp.personalInfo?.gender ?? '—'}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Marital Status</span>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{emp.personalInfo?.maritalStatus ?? '—'}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Blood Group</span>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 font-mono">{emp.personalInfo?.bloodGroup ?? '—'}</p>
                </div>
              </div>
            </div>

            {/* Family Dependents */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs space-y-4">
              <h3 className="text-xs font-bold text-slate-850 dark:text-slate-100 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-3 uppercase tracking-wider">
                <Users size={15} className="text-indigo-600 dark:text-indigo-400" />
                <span>Family / Dependents</span>
              </h3>
              {emp.familyMembers && emp.familyMembers.length > 0 ? (
                <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
                  {emp.familyMembers.map((member: any, i: number) => (
                    <div key={i} className="p-3 border border-slate-100 dark:border-slate-800/80 rounded-lg flex items-center justify-between text-xs bg-slate-50/50 dark:bg-slate-900/50">
                      <div>
                        <p className="font-bold text-slate-800 dark:text-slate-200">{member.name}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{member.relation} · DOB: {member.birthDate ? new Date(member.birthDate).toLocaleDateString('en-IN') : '—'}</p>
                      </div>
                      <p className="font-mono text-slate-500">{member.mobile || '—'}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 py-6 text-center italic">No family details provided.</p>
              )}
            </div>

          </div>
        )}

        {activeTab === 'contact' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Contact Details */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs space-y-4">
              <h3 className="text-xs font-bold text-slate-850 dark:text-slate-100 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-3 uppercase tracking-wider">
                <Phone size={15} className="text-indigo-600 dark:text-indigo-400" />
                <span>Contact Info</span>
              </h3>
              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Mobile Number</span>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 font-mono">{emp.contactInfo?.currentMobileNo ?? '—'}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Personal Email</span>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 break-all">{emp.contactInfo?.currentPersonalEmail ?? '—'}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Alternate Phone</span>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{emp.contactInfo?.currentPhoneNo ?? '—'}</p>
                </div>
              </div>

              {/* Emergency Contacts */}
              <div className="mt-5 pt-5 border-t border-slate-100 dark:border-slate-800 space-y-3">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Emergency Registry</h4>
                {emp.emergencyContacts && emp.emergencyContacts.length > 0 ? (
                  emp.emergencyContacts.map((contact: any, i: number) => (
                    <div key={i} className="p-3 bg-rose-500/5 dark:bg-rose-950/10 border border-rose-500/10 rounded-lg text-xs space-y-1">
                      <p className="font-bold text-slate-800 dark:text-slate-200">{contact.name}</p>
                      {contact.address && <p className="text-slate-500 mt-0.5">{contact.address}</p>}
                      <p className="font-mono text-slate-600 dark:text-slate-400 mt-1">Mobile: {contact.mobileNo || '—'} · Tel: {contact.telNo || '—'}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-450 italic">No emergency contacts listed.</p>
                )}
              </div>
            </div>

            {/* Address Info */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs space-y-5">
              <h3 className="text-xs font-bold text-slate-850 dark:text-slate-100 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-3 uppercase tracking-wider">
                <MapPin size={15} className="text-indigo-600 dark:text-indigo-400" />
                <span>Addresses</span>
              </h3>
              <div className="space-y-4">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Current Address</span>
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-350 leading-relaxed bg-slate-50/50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                    {emp.contactInfo ? formatAddress(currentAddress) : '—'}
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Permanent Address</span>
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-350 leading-relaxed bg-slate-50/50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                    {emp.contactInfo?.isPermanentSameAsCurrent 
                      ? 'Same as Current Address' 
                      : (emp.contactInfo ? formatAddress({
                          address: emp.contactInfo.permanentAddress,
                          village: emp.contactInfo.permanentVillage,
                          taluka: emp.contactInfo.permanentTaluka,
                          city: emp.contactInfo.permanentCity,
                          district: emp.contactInfo.permanentDistrict,
                          state: emp.contactInfo.permanentState,
                          country: emp.contactInfo.permanentCountry,
                          postCode: emp.contactInfo.permanentPostCode
                        }) : '—')}
                  </p>
                </div>
              </div>
            </div>

          </div>
        )}

        {activeTab === 'statutory' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Financial and Payment Details */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs space-y-4">
              <h3 className="text-xs font-bold text-slate-850 dark:text-slate-100 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-3 uppercase tracking-wider">
                <Landmark size={15} className="text-indigo-600 dark:text-indigo-400" />
                <span>Payment & Bank Details</span>
              </h3>
              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Account Number</span>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 font-mono">{emp.paymentInfo?.accountNo || (emp as any).bankAccountNumber || '—'}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">IFSC Code</span>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 font-mono">{emp.paymentInfo?.ifscCode || emp.bankIfsc || '—'}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Bank Name</span>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{emp.paymentInfo?.bankName || '—'}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Branch Name</span>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{emp.paymentInfo?.branchName || '—'}</p>
                </div>
              </div>
            </div>

            {/* Statutory Compliance IDs */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs space-y-4">
              <h3 className="text-xs font-bold text-slate-850 dark:text-slate-100 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-3 uppercase tracking-wider">
                <ShieldCheck size={15} className="text-indigo-600 dark:text-indigo-400" />
                <span>Statutory & Compliance</span>
              </h3>
              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Universal Account No (UAN)</span>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 font-mono">{emp.uan || '—'}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">PF Number</span>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 font-mono">{emp.pfNumber || '—'}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">ESIC Number</span>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 font-mono">{emp.esic || '—'}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">PAN Card No</span>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 font-mono">{emp.pan || '—'}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Aadhaar Card No</span>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 font-mono">{emp.aadhaar || '—'}</p>
                </div>
              </div>
            </div>

          </div>
        )}

      </div>

      {isEditModalOpen && emp && (
        <EditProfileModal 
          isOpen={isEditModalOpen} 
          onClose={() => setIsEditModalOpen(false)} 
          employee={emp as any} 
        />
      )}
    </div>
  );
}
