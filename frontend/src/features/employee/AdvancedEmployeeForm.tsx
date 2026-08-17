import React, { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { employeesApi, organizationApi } from '../../api/client';
import { Save, RefreshCw } from 'lucide-react';
import { useToast } from '../../components/ui/ToastProvider';
import { useNavigate } from 'react-router-dom';

interface AdvancedEmployeeFormProps {
  onClose: () => void;
  initialData?: any; // To allow editing later
}

const TABS = [
  'Contact', 'Payment', 'Admin', 'Personal', 'Family', 
  'Emergency', 'Experience', 'WeekOff', 'Qualification', 
  'Certificate', 'Document', 'Immigration'
];

const calculateExperience = (joiningDateStr: string | null | undefined) => {
  if (!joiningDateStr) return { years: 0, months: 0 };
  const joinDate = new Date(joiningDateStr);
  const today = new Date();
  
  if (isNaN(joinDate.getTime()) || today < joinDate) return { years: 0, months: 0 };

  let years = today.getFullYear() - joinDate.getFullYear();
  let months = today.getMonth() - joinDate.getMonth();

  if (months < 0) {
    years--;
    months += 12;
  }
  
  if (today.getDate() < joinDate.getDate()) {
      months--;
      if (months < 0) {
          years--;
          months += 12;
      }
  }
  return { years, months };
};

export default function AdvancedEmployeeForm({ onClose, initialData }: AdvancedEmployeeFormProps) {
  const queryClient = useQueryClient();
  const { error: toastError } = useToast();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('Contact');
  const [saving, setSaving] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);

  // Fetch dynamic data for dropdowns
  const { data: departments = [] } = useQuery({ queryKey: ['departments'], queryFn: () => organizationApi.listDepartments() });
  const { data: branches = [] } = useQuery({ queryKey: ['branches'], queryFn: () => organizationApi.listBranches() });
  const { data: designations = [] } = useQuery({ queryKey: ['designations'], queryFn: () => organizationApi.listDesignations() });

  // Main state holding everything
  const [formData, setFormData] = useState<any>(initialData || {
    // Contact / Basic Info
    employeeCode: '',
    firstName: '',
    lastName: '',
    companyEmail: '',
    status: 'active',
    isExEmployee: false,
    
    // Nested sections
    paymentInfo: {},
    adminInfo: {},
    personalInfo: {},
    familyMembers: [{ relation: '', name: '', mobile: '', occupation: '', birthDate: '' }],
    emergencyContacts: [{ name: '', address: '', mobileNo: '', telNo: '' }],
    experiences: [],
    immigrations: [],
    documentInfos: [],
    certifications: [],
    qualifications: [],
  });

  const updateSection = (section: string, field: string, value: any) => {
    setFormData((prev: any) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const updateRoot = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  const mutation = useMutation({
    mutationFn: (data: any) => initialData?.id ? employeesApi.update(initialData.id, data) : employeesApi.create(data),
    onSuccess: async () => {
      queryClient.removeQueries({ queryKey: ['employees'] });
      if (initialData?.id) {
        queryClient.removeQueries({ queryKey: ['employee', initialData.id] });
        await queryClient.invalidateQueries({ queryKey: ['my-profile', initialData.id] });
        await queryClient.invalidateQueries({ queryKey: ['employee-detail', initialData.id] });
        await queryClient.invalidateQueries({ queryKey: ['employees-list'] });
      }
      onClose();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => employeesApi.remove(initialData.id),
    onSuccess: async () => {
      queryClient.removeQueries({ queryKey: ['employees'] });
      onClose();
    },
    onError: (error: any) => {
      console.error(error);
      toastError('Failed to delete employee. ' + (error?.response?.data?.message || error.message || ''));
    }
  });

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to permanently delete this employee? All related data will be deleted.')) {
      deleteMutation.mutate();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const findId = (items: any[], nameKey: string, value: any) => {
      if (!value) return undefined;
      if (items && items.length > 0) {
        const found = items.find(item => (item[nameKey] || '').toLowerCase() === String(value).toLowerCase());
        return found?.id;
      }
      if (typeof value === 'string' && value.length > 20) return value;
      return undefined;
    };

    const branchName = branches.find(b => b.id === formData.branchId)?.name ||
      departments.find(d => d.id === formData.branchId)?.name;

    const payload: any = {
      employeeCode: formData.employeeCode || `EMP${Date.now()}`,
      firstName: formData.firstName || 'Unknown',
      middleName: formData.middleName,
      lastName: formData.lastName || '.',
      email: formData.companyEmail || (initialData?.id ? undefined : `emp${Date.now()}@company.com`),
      dob: formData.dob || undefined,
      joiningDate: formData.joiningDate || undefined,
      state: formData.state,
      branchId: formData.branchId?.length > 20 ? formData.branchId : undefined,
      departmentId: formData.departmentId?.length > 20 ? formData.departmentId : undefined,
      subDepartment: formData.subDepartment,
      subDepartment1: formData.subDepartment1,
      subDepartment2: formData.subDepartment2,
      category: formData.category,
      subCategory: formData.subCategory,
      designationId: formData.designationId?.length > 20 ? formData.designationId : undefined,
      grade: formData.grade,
      reportingManager: formData.reportingManager,
      reportingManager2: formData.reportingManager2,
      probation: typeof formData.probation === 'boolean' ? (formData.probation ? 'Yes' : 'No') : formData.probation,
      experience: `${calculateExperience(formData.joiningDate).years} year ${calculateExperience(formData.joiningDate).months} Month`,
      status: formData.isExEmployee ? 'ex-employee' : (formData.status || 'active'),
      workingDaysPerWeek: formData.workingDaysPerWeek,

      contactInfo: formData.contactInfo,
      paymentInfo: formData.paymentInfo,
      adminInfo: formData.adminInfo,
      personalInfo: formData.personalInfo,
      familyMembers: formData.familyMembers?.filter((f: any) => f.relation || f.name),
      emergencyContacts: formData.emergencyContacts?.filter((e: any) => e.name || e.mobileNo),
      experiences: formData.experiences?.filter((e: any) => e.organization || e.designation),
      immigrations: formData.immigrations?.filter((i: any) => i.documentNumber || i.type),
      documentInfos: formData.documentInfos?.filter((d: any) => d.documentName),
      certifications: formData.certifications?.filter((c: any) => c.certification),
      qualifications: formData.qualifications?.filter((q: any) => q.qualification),
    };

    mutation.mutate(payload, {
      onSettled: () => setSaving(false)
    });
  };

  const handleReset = () => {
    if (initialData) {
      setFormData(initialData);
      return;
    }
    setFormData({
      employeeCode: '', firstName: '', middleName: '', lastName: '',
      companyEmail: '', status: 'active', isExEmployee: false,
      paymentInfo: {}, adminInfo: {}, personalInfo: {},
      contactInfo: {},
      familyMembers: [{ relation: '', name: '', mobile: '', occupation: '', birthDate: '' }],
      emergencyContacts: [{ name: '', address: '', mobileNo: '', telNo: '' }],
      experiences: [], immigrations: [], documentInfos: [],
      certifications: [], qualifications: [],
    });
  };

  const handleContactChange = (field: string, value: any) => {
    setFormData((prev: any) => ({
      ...prev,
      contactInfo: { ...(prev.contactInfo || {}), [field]: value }
    }));
  };

  const renderContactTab = () => (
    <div className="p-4 bg-gray-50 border-t">
      <h3 className="text-lg font-normal text-slate-700 mb-4">Contact Information</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
        
        {/* CURRENT ADDRESS */}
        <div className="space-y-4">
          <h4 className="text-xs font-bold uppercase underline underline-offset-4 decoration-gray-300">Current</h4>
          <div className="grid grid-cols-[120px_1fr] items-start gap-2">
            <span className="text-xs text-gray-600">Address<span className="text-red-500">*</span></span>
            <textarea 
              value={formData.contactInfo?.currentAddress || ''} 
              onChange={e => handleContactChange('currentAddress', e.target.value)}
              className="border p-2 rounded text-xs w-full h-16"
            />
          </div>
          <div className="grid grid-cols-[120px_1fr] items-center gap-2">
            <span className="text-xs text-gray-600">Country</span>
            <select value={formData.contactInfo?.currentCountry || ''} onChange={e => handleContactChange('currentCountry', e.target.value)} className="border p-2 rounded text-xs w-full">
              <option value="">Select</option>
              <option value="India">India</option>
            </select>
          </div>
          <div className="grid grid-cols-[120px_1fr] items-center gap-2">
            <span className="text-xs text-gray-600">District</span>
            <input type="text" value={formData.contactInfo?.currentDistrict || ''} onChange={e => handleContactChange('currentDistrict', e.target.value)} placeholder="Enter District Name" className="border p-2 rounded text-xs w-full" />
          </div>
          <div className="grid grid-cols-[120px_1fr] items-center gap-2">
            <span className="text-xs text-gray-600">Taluka</span>
            <input type="text" value={formData.contactInfo?.currentTaluka || ''} onChange={e => handleContactChange('currentTaluka', e.target.value)} placeholder="Enter Taluka Name" className="border p-2 rounded text-xs w-full" />
          </div>
          <div className="grid grid-cols-[120px_1fr] items-center gap-2">
            <span className="text-xs text-gray-600">Post</span>
            <input type="text" value={formData.contactInfo?.currentPost || ''} onChange={e => handleContactChange('currentPost', e.target.value)} placeholder="Enter Post Name" className="border p-2 rounded text-xs w-full" />
          </div>
          <div className="grid grid-cols-[120px_1fr] items-center gap-2">
            <span className="text-xs text-gray-600">Phone No</span>
            <input type="text" value={formData.contactInfo?.currentPhoneNo || ''} onChange={e => handleContactChange('currentPhoneNo', e.target.value)} className="border p-2 rounded text-xs w-full" />
          </div>
          <div className="grid grid-cols-[120px_1fr] items-center gap-2">
            <span className="text-xs text-gray-600">Personal Email</span>
            <input type="email" value={formData.contactInfo?.currentPersonalEmail || ''} onChange={e => handleContactChange('currentPersonalEmail', e.target.value)} className="border p-2 rounded text-xs w-full" />
          </div>
        </div>

        <div className="space-y-4 pt-8">
          <div className="grid grid-cols-[120px_1fr] items-center gap-2">
            <span className="text-xs text-gray-600">State<span className="text-red-500">*</span></span>
            <select value={formData.contactInfo?.currentState || ''} onChange={e => handleContactChange('currentState', e.target.value)} className="border p-2 rounded text-xs w-full">
              <option value="">Select</option>
              <option value="Andhra Pradesh">Andhra Pradesh</option>
              <option value="Arunachal Pradesh">Arunachal Pradesh</option>
              <option value="Assam">Assam</option>
              <option value="Bihar">Bihar</option>
              <option value="Chhattisgarh">Chhattisgarh</option>
              <option value="Goa">Goa</option>
              <option value="Gujarat">Gujarat</option>
              <option value="Haryana">Haryana</option>
              <option value="Himachal Pradesh">Himachal Pradesh</option>
              <option value="Jharkhand">Jharkhand</option>
              <option value="Karnataka">Karnataka</option>
              <option value="Kerala">Kerala</option>
              <option value="Madhya Pradesh">Madhya Pradesh</option>
              <option value="Maharashtra">Maharashtra</option>
              <option value="Manipur">Manipur</option>
              <option value="Meghalaya">Meghalaya</option>
              <option value="Mizoram">Mizoram</option>
              <option value="Nagaland">Nagaland</option>
              <option value="Odisha">Odisha</option>
              <option value="Punjab">Punjab</option>
              <option value="Rajasthan">Rajasthan</option>
              <option value="Sikkim">Sikkim</option>
              <option value="Tamil Nadu">Tamil Nadu</option>
              <option value="Telangana">Telangana</option>
              <option value="Tripura">Tripura</option>
              <option value="Uttar Pradesh">Uttar Pradesh</option>
              <option value="Uttarakhand">Uttarakhand</option>
              <option value="West Bengal">West Bengal</option>
              <option value="Andaman and Nicobar Islands">Andaman and Nicobar Islands</option>
              <option value="Chandigarh">Chandigarh</option>
              <option value="Dadra and Nagar Haveli and Daman and Diu">Dadra and Nagar Haveli and Daman and Diu</option>
              <option value="Delhi">Delhi</option>
              <option value="Jammu and Kashmir">Jammu and Kashmir</option>
              <option value="Ladakh">Ladakh</option>
              <option value="Lakshadweep">Lakshadweep</option>
              <option value="Puducherry">Puducherry</option>
            </select>
          </div>
          <div className="grid grid-cols-[120px_1fr] items-center gap-2">
            <span className="text-xs text-gray-600">City</span>
            <input type="text" value={formData.contactInfo?.currentCity || ''} onChange={e => handleContactChange('currentCity', e.target.value)} className="border p-2 rounded text-xs w-full" />
          </div>
          <div className="grid grid-cols-[120px_1fr] items-center gap-2">
            <span className="text-xs text-gray-600">Village</span>
            <input type="text" value={formData.contactInfo?.currentVillage || ''} onChange={e => handleContactChange('currentVillage', e.target.value)} className="border p-2 rounded text-xs w-full" />
          </div>
          <div className="grid grid-cols-[120px_1fr] items-center gap-2">
            <span className="text-xs text-gray-600">Post Code</span>
            <input type="text" value={formData.contactInfo?.currentPostCode || ''} onChange={e => handleContactChange('currentPostCode', e.target.value)} className="border p-2 rounded text-xs w-full" />
          </div>
          <div className="grid grid-cols-[120px_1fr] items-center gap-2">
            <span className="text-xs text-gray-600">Mobile No</span>
            <input type="text" value={formData.contactInfo?.currentMobileNo || ''} onChange={e => handleContactChange('currentMobileNo', e.target.value)} className="border p-2 rounded text-xs w-full" />
          </div>
        </div>

        {/* PERMANENT ADDRESS */}
        <div className="col-span-1 md:col-span-2 pt-4 border-t border-gray-200 mt-2">
          <div className="mb-4">
            <h4 className="text-xs font-bold uppercase underline underline-offset-4 decoration-gray-300 mb-1">Permanent</h4>
            <label className="flex items-center gap-2 text-[10px] text-gray-600">
              <input 
                type="checkbox" 
                checked={formData.contactInfo?.isPermanentSameAsCurrent ?? true} 
                onChange={e => handleContactChange('isPermanentSameAsCurrent', e.target.checked)} 
              />
              As Above
            </label>
          </div>
          
          {!(formData.contactInfo?.isPermanentSameAsCurrent ?? true) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
              <div className="space-y-4">
                <div className="grid grid-cols-[120px_1fr] items-start gap-2">
                  <span className="text-xs text-gray-600">Address<span className="text-red-500">*</span></span>
                  <textarea 
                    value={formData.contactInfo?.permanentAddress || ''} 
                    onChange={e => handleContactChange('permanentAddress', e.target.value)}
                    className="border p-2 rounded text-xs w-full h-16"
                  />
                </div>
                <div className="grid grid-cols-[120px_1fr] items-center gap-2">
                  <span className="text-xs text-gray-600">Country</span>
                  <select value={formData.contactInfo?.permanentCountry || ''} onChange={e => handleContactChange('permanentCountry', e.target.value)} className="border p-2 rounded text-xs w-full">
                    <option value="">Select</option>
                    <option value="India">India</option>
                  </select>
                </div>
                <div className="grid grid-cols-[120px_1fr] items-center gap-2">
                  <span className="text-xs text-gray-600">District</span>
                  <input type="text" value={formData.contactInfo?.permanentDistrict || ''} onChange={e => handleContactChange('permanentDistrict', e.target.value)} className="border p-2 rounded text-xs w-full" />
                </div>
                <div className="grid grid-cols-[120px_1fr] items-center gap-2">
                  <span className="text-xs text-gray-600">Taluka</span>
                  <input type="text" value={formData.contactInfo?.permanentTaluka || ''} onChange={e => handleContactChange('permanentTaluka', e.target.value)} className="border p-2 rounded text-xs w-full" />
                </div>
                <div className="grid grid-cols-[120px_1fr] items-center gap-2">
                  <span className="text-xs text-gray-600">Post</span>
                  <input type="text" value={formData.contactInfo?.permanentPost || ''} onChange={e => handleContactChange('permanentPost', e.target.value)} className="border p-2 rounded text-xs w-full" />
                </div>
                <div className="grid grid-cols-[120px_1fr] items-center gap-2">
                  <span className="text-xs text-gray-600">Phone No</span>
                  <input type="text" value={formData.contactInfo?.permanentPhoneNo || ''} onChange={e => handleContactChange('permanentPhoneNo', e.target.value)} className="border p-2 rounded text-xs w-full" />
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-[120px_1fr] items-center gap-2">
                  <span className="text-xs text-gray-600">State<span className="text-red-500">*</span></span>
                  <select value={formData.contactInfo?.permanentState || ''} onChange={e => handleContactChange('permanentState', e.target.value)} className="border p-2 rounded text-xs w-full">
                    <option value="">Select</option>
                    <option value="Andhra Pradesh">Andhra Pradesh</option>
                    <option value="Arunachal Pradesh">Arunachal Pradesh</option>
                    <option value="Assam">Assam</option>
                    <option value="Bihar">Bihar</option>
                    <option value="Chhattisgarh">Chhattisgarh</option>
                    <option value="Goa">Goa</option>
                    <option value="Gujarat">Gujarat</option>
                    <option value="Haryana">Haryana</option>
                    <option value="Himachal Pradesh">Himachal Pradesh</option>
                    <option value="Jharkhand">Jharkhand</option>
                    <option value="Karnataka">Karnataka</option>
                    <option value="Kerala">Kerala</option>
                    <option value="Madhya Pradesh">Madhya Pradesh</option>
                    <option value="Maharashtra">Maharashtra</option>
                    <option value="Manipur">Manipur</option>
                    <option value="Meghalaya">Meghalaya</option>
                    <option value="Mizoram">Mizoram</option>
                    <option value="Nagaland">Nagaland</option>
                    <option value="Odisha">Odisha</option>
                    <option value="Punjab">Punjab</option>
                    <option value="Rajasthan">Rajasthan</option>
                    <option value="Sikkim">Sikkim</option>
                    <option value="Tamil Nadu">Tamil Nadu</option>
                    <option value="Telangana">Telangana</option>
                    <option value="Tripura">Tripura</option>
                    <option value="Uttar Pradesh">Uttar Pradesh</option>
                    <option value="Uttarakhand">Uttarakhand</option>
                    <option value="West Bengal">West Bengal</option>
                    <option value="Andaman and Nicobar Islands">Andaman and Nicobar Islands</option>
                    <option value="Chandigarh">Chandigarh</option>
                    <option value="Dadra and Nagar Haveli and Daman and Diu">Dadra and Nagar Haveli and Daman and Diu</option>
                    <option value="Delhi">Delhi</option>
                    <option value="Jammu and Kashmir">Jammu and Kashmir</option>
                    <option value="Ladakh">Ladakh</option>
                    <option value="Lakshadweep">Lakshadweep</option>
                    <option value="Puducherry">Puducherry</option>
                  </select>
                </div>
                <div className="grid grid-cols-[120px_1fr] items-center gap-2">
                  <span className="text-xs text-gray-600">City</span>
                  <input type="text" value={formData.contactInfo?.permanentCity || ''} onChange={e => handleContactChange('permanentCity', e.target.value)} className="border p-2 rounded text-xs w-full" />
                </div>
                <div className="grid grid-cols-[120px_1fr] items-center gap-2">
                  <span className="text-xs text-gray-600">Village</span>
                  <input type="text" value={formData.contactInfo?.permanentVillage || ''} onChange={e => handleContactChange('permanentVillage', e.target.value)} className="border p-2 rounded text-xs w-full" />
                </div>
                <div className="grid grid-cols-[120px_1fr] items-center gap-2">
                  <span className="text-xs text-gray-600">Post Code</span>
                  <input type="text" value={formData.contactInfo?.permanentPostCode || ''} onChange={e => handleContactChange('permanentPostCode', e.target.value)} className="border p-2 rounded text-xs w-full" />
                </div>
                <div className="grid grid-cols-[120px_1fr] items-center gap-2">
                  <span className="text-xs text-gray-600">Mobile No</span>
                  <input type="text" value={formData.contactInfo?.permanentMobileNo || ''} onChange={e => handleContactChange('permanentMobileNo', e.target.value)} className="border p-2 rounded text-xs w-full" />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderPaymentTab = () => (
    <div className="p-4">
      <h3 className="text-lg font-medium text-gray-700 mb-4">Payment Information</h3>
      <div className="grid grid-cols-2 gap-y-4 gap-x-8 max-w-3xl">
        <div className="grid grid-cols-3 items-center gap-2">
          <label className="text-xs text-gray-600 col-span-1">Payment Method *</label>
          <select className="col-span-2 border rounded px-2 py-1 text-sm" value={formData.paymentInfo?.paymentMethod || ''} onChange={e => updateSection('paymentInfo', 'paymentMethod', e.target.value)}>
            <option value="">-- SELECT --</option>
            <option value="Bank Transfer">Bank Transfer</option>
            <option value="Cash">Cash</option>
            <option value="Cheque">Cheque</option>
          </select>
        </div>
        <div className="grid grid-cols-3 items-center gap-2">
          <label className="text-xs text-gray-600 col-span-1">Payee Name</label>
          <input type="text" className="col-span-2 border rounded px-2 py-1 text-sm bg-white" value={formData.paymentInfo?.payeeName || ''} onChange={e => updateSection('paymentInfo', 'payeeName', e.target.value)} />
        </div>
        <div className="grid grid-cols-3 items-center gap-2">
          <label className="text-xs text-gray-600 col-span-1">Bank Name</label>
          <select className="col-span-2 border rounded px-2 py-1 text-sm" value={formData.paymentInfo?.bankName || ''} onChange={e => updateSection('paymentInfo', 'bankName', e.target.value)}>
             <option value="">-- SELECT --</option>
             <option value="BOB">BOB</option>
             <option value="HDFC">HDFC</option>
             <option value="SBI">SBI</option>
          </select>
        </div>
        <div className="grid grid-cols-3 items-center gap-2">
          <label className="text-xs text-gray-600 col-span-1">Branch Code</label>
          <input type="text" className="col-span-2 border rounded px-2 py-1 text-sm bg-white" value={formData.paymentInfo?.branchCode || ''} onChange={e => updateSection('paymentInfo', 'branchCode', e.target.value)} />
        </div>
        <div className="grid grid-cols-3 items-center gap-2">
          <label className="text-xs text-gray-600 col-span-1">Branch Name</label>
          <input type="text" className="col-span-2 border rounded px-2 py-1 text-sm bg-white" value={formData.paymentInfo?.branchName || ''} onChange={e => updateSection('paymentInfo', 'branchName', e.target.value)} />
        </div>
        <div className="grid grid-cols-3 items-center gap-2">
          <label className="text-xs text-gray-600 col-span-1">Branch Phone</label>
          <input type="text" className="col-span-2 border rounded px-2 py-1 text-sm bg-white" value={formData.paymentInfo?.branchPhone || ''} onChange={e => updateSection('paymentInfo', 'branchPhone', e.target.value)} />
        </div>
        <div className="grid grid-cols-3 items-center gap-2">
          <label className="text-xs text-gray-600 col-span-1">Account Type</label>
          <select className="col-span-2 border rounded px-2 py-1 text-sm" value={formData.paymentInfo?.accountType || ''} onChange={e => updateSection('paymentInfo', 'accountType', e.target.value)}>
             <option value="">-- SELECT --</option>
             <option value="Savings">Savings</option>
             <option value="Current">Current</option>
          </select>
        </div>
        <div className="grid grid-cols-3 items-center gap-2">
          <label className="text-xs text-gray-600 col-span-1">Account No</label>
          <input type="text" className="col-span-2 border rounded px-2 py-1 text-sm bg-white" value={formData.paymentInfo?.accountNo || ''} onChange={e => updateSection('paymentInfo', 'accountNo', e.target.value)} />
        </div>
        <div className="grid grid-cols-3 items-center gap-2">
          <label className="text-xs text-gray-600 col-span-1">IFSC Code</label>
          <input type="text" className="col-span-2 border rounded px-2 py-1 text-sm bg-white" value={formData.paymentInfo?.ifscCode || ''} onChange={e => updateSection('paymentInfo', 'ifscCode', e.target.value)} />
        </div>
      </div>
    </div>
  );

  const renderAdminTab = () => (
    <div className="p-4">
      <h3 className="text-lg font-medium text-gray-700 mb-4">Administrative Information</h3>
      <div className="grid grid-cols-2 gap-x-8 gap-y-3">
        {/* Left Column */}
        <div className="space-y-3">
          <div className="grid grid-cols-2 items-center gap-2">
            <label className="text-xs text-gray-600">Salary On *</label>
            <select className="border rounded px-2 py-1 text-sm" value={formData.adminInfo?.salaryOn || ''} onChange={e => updateSection('adminInfo', 'salaryOn', e.target.value)}>
              <option value="">-- SELECT --</option>
              <option value="Monthly">Monthly</option>
              <option value="Daily">Daily</option>
            </select>
          </div>
          <div className="grid grid-cols-2 items-center gap-2">
            <label className="text-xs text-gray-600">PT Applicable</label>
            <input type="checkbox" checked={formData.adminInfo?.ptApplicable || false} onChange={e => updateSection('adminInfo', 'ptApplicable', e.target.checked)} />
          </div>
          <div className="grid grid-cols-2 items-center gap-2">
            <label className="text-xs text-gray-600">ESIC Applicable</label>
            <input type="checkbox" checked={formData.adminInfo?.esicApplicable || false} onChange={e => updateSection('adminInfo', 'esicApplicable', e.target.checked)} />
          </div>
          <div className="grid grid-cols-2 items-center gap-2">
            <label className="text-xs text-gray-600">ESI No.</label>
            <input type="text" placeholder="Enter ESI No." className="border rounded px-2 py-1 text-sm" value={formData.adminInfo?.esiNo || ''} onChange={e => updateSection('adminInfo', 'esiNo', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 items-center gap-2">
            <label className="text-xs text-gray-600">PF As Per Govt</label>
            <input type="checkbox" checked={formData.adminInfo?.pfAsPerGovt || false} onChange={e => updateSection('adminInfo', 'pfAsPerGovt', e.target.checked)} />
          </div>
          <div className="grid grid-cols-2 items-center gap-2">
            <label className="text-xs text-gray-600">PF On Total Basic</label>
            <input type="checkbox" checked={formData.adminInfo?.pfOnTotalBasic || false} onChange={e => updateSection('adminInfo', 'pfOnTotalBasic', e.target.checked)} />
          </div>
          <div className="grid grid-cols-2 items-center gap-2">
            <label className="text-xs text-gray-600">OT Applicable (₹)</label>
            <select className="border rounded px-2 py-1 text-sm" value={formData.adminInfo?.otApplicable || ''} onChange={e => updateSection('adminInfo', 'otApplicable', e.target.value)}>
               <option value="">-- SELECT --</option>
               <option value="Yes">Yes</option>
               <option value="No">No</option>
            </select>
          </div>
          <div className="grid grid-cols-2 items-center gap-2">
            <label className="text-xs text-gray-600">RFID Card No.</label>
            <input type="text" className="border rounded px-2 py-1 text-sm" value={formData.adminInfo?.rfidCardNo || ''} onChange={e => updateSection('adminInfo', 'rfidCardNo', e.target.value)} />
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-3">
          <div className="grid grid-cols-2 items-center gap-2">
            <label className="text-xs text-gray-600">TDS Applicable</label>
            <input type="checkbox" checked={formData.adminInfo?.tdsApplicable || false} onChange={e => updateSection('adminInfo', 'tdsApplicable', e.target.checked)} />
          </div>
          <div className="grid grid-cols-2 items-center gap-2">
            <label className="text-xs text-gray-600">VPF Percentage</label>
            <input type="text" placeholder="Enter VPF Percentage" className="border rounded px-2 py-1 text-sm" value={formData.adminInfo?.vpfPercentage || ''} onChange={e => updateSection('adminInfo', 'vpfPercentage', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 items-center gap-2">
            <label className="text-xs text-gray-600">PF No.</label>
            <input type="text" placeholder="Enter PF No." className="border rounded px-2 py-1 text-sm" value={formData.adminInfo?.pfNo || ''} onChange={e => updateSection('adminInfo', 'pfNo', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 items-center gap-2">
            <label className="text-xs text-gray-600">UAN</label>
            <input type="text" placeholder="Enter UAN" className="border rounded px-2 py-1 text-sm" value={formData.adminInfo?.uan || ''} onChange={e => updateSection('adminInfo', 'uan', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 items-center gap-2">
            <label className="text-xs text-gray-600">Gratuity Applicable</label>
            <input type="checkbox" checked={formData.adminInfo?.gratuityApplicable || false} onChange={e => updateSection('adminInfo', 'gratuityApplicable', e.target.checked)} />
          </div>
          <div className="grid grid-cols-2 items-center gap-2">
            <label className="text-xs text-gray-600">Gratuity No.</label>
            <input type="text" placeholder="Enter Gratuity No." className="border rounded px-2 py-1 text-sm" value={formData.adminInfo?.gratuityNo || ''} onChange={e => updateSection('adminInfo', 'gratuityNo', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 items-center gap-2">
            <label className="text-xs text-gray-600">Aadhaar Card No.</label>
            <input type="text" placeholder="Enter Aadhaar Card No." className="border rounded px-2 py-1 text-sm" value={formData.adminInfo?.aadhaarCardNo || ''} onChange={e => updateSection('adminInfo', 'aadhaarCardNo', e.target.value)} />
          </div>
        </div>
      </div>
    </div>
  );

  const renderPersonalTab = () => (
    <div className="p-4">
      <h3 className="text-lg font-medium text-gray-700 mb-4">Personal Information</h3>
      <div className="grid grid-cols-2 gap-x-8 gap-y-3">
        <div className="space-y-3">
          <div className="grid grid-cols-3 items-center gap-2">
            <label className="text-xs text-gray-600 col-span-1">Gender</label>
            <select className="col-span-2 border rounded px-2 py-1 text-sm" value={formData.personalInfo?.gender || ''} onChange={e => updateSection('personalInfo', 'gender', e.target.value)}>
              <option value="">--Select--</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div className="grid grid-cols-3 items-center gap-2">
            <label className="text-xs text-gray-600 col-span-1">Marital Status</label>
            <select className="col-span-2 border rounded px-2 py-1 text-sm" value={formData.personalInfo?.maritalStatus || ''} onChange={e => updateSection('personalInfo', 'maritalStatus', e.target.value)}>
              <option value="">--SELECT--</option>
              <option value="Single">Single</option>
              <option value="Married">Married</option>
            </select>
          </div>
          <div className="grid grid-cols-3 items-center gap-2">
            <label className="text-xs text-gray-600 col-span-1">Driving License No</label>
            <input type="text" placeholder="Enter Driving License No" className="col-span-2 border rounded px-2 py-1 text-sm" value={formData.personalInfo?.drivingLicenseNo || ''} onChange={e => updateSection('personalInfo', 'drivingLicenseNo', e.target.value)} />
          </div>
          <div className="grid grid-cols-3 items-center gap-2">
            <label className="text-xs text-gray-600 col-span-1">Nationality</label>
            <input type="text" placeholder="Enter Nationality" className="col-span-2 border rounded px-2 py-1 text-sm" value={formData.personalInfo?.nationality || ''} onChange={e => updateSection('personalInfo', 'nationality', e.target.value)} />
          </div>
          <div className="grid grid-cols-3 items-center gap-2">
            <label className="text-xs text-gray-600 col-span-1">PAN No</label>
            <input type="text" placeholder="Enter PAN No" className="col-span-2 border rounded px-2 py-1 text-sm" value={formData.personalInfo?.panNo || ''} onChange={e => updateSection('personalInfo', 'panNo', e.target.value)} />
          </div>
        </div>
        
        <div className="space-y-3">
          <div className="grid grid-cols-3 items-center gap-2">
            <label className="text-xs text-gray-600 col-span-1">Blood Group</label>
            <select className="col-span-2 border rounded px-2 py-1 text-sm" value={formData.personalInfo?.bloodGroup || ''} onChange={e => updateSection('personalInfo', 'bloodGroup', e.target.value)}>
              <option value="">--SELECT--</option>
              <option value="A+">A+</option>
              <option value="O+">O+</option>
              <option value="B+">B+</option>
              <option value="AB+">AB+</option>
            </select>
          </div>
          <div className="grid grid-cols-3 items-center gap-2">
            <label className="text-xs text-gray-600 col-span-1">Height (Ft)</label>
            <input type="text" placeholder="Enter Height in Ft" className="col-span-2 border rounded px-2 py-1 text-sm" value={formData.personalInfo?.height || ''} onChange={e => updateSection('personalInfo', 'height', e.target.value)} />
          </div>
          <div className="grid grid-cols-3 items-center gap-2">
            <label className="text-xs text-gray-600 col-span-1">Weight (Kg)</label>
            <input type="text" placeholder="Enter Weight in Kg" className="col-span-2 border rounded px-2 py-1 text-sm" value={formData.personalInfo?.weight || ''} onChange={e => updateSection('personalInfo', 'weight', e.target.value)} />
          </div>
          <div className="grid grid-cols-3 items-center gap-2">
            <label className="text-xs text-gray-600 col-span-1">Religion</label>
            <input type="text" placeholder="Enter Religion" className="col-span-2 border rounded px-2 py-1 text-sm" value={formData.personalInfo?.religion || ''} onChange={e => updateSection('personalInfo', 'religion', e.target.value)} />
          </div>
        </div>
      </div>
    </div>
  );

  const renderFamilyTab = () => (
    <div className="p-4">
      <h3 className="text-lg font-medium text-gray-700 mb-4">Family Detail</h3>
      {formData.familyMembers.map((member: any, idx: number) => (
        <div key={idx} className="grid grid-cols-2 gap-x-8 gap-y-3 mb-6 p-4 border rounded bg-gray-50">
          <div className="space-y-3">
            <div className="grid grid-cols-3 items-center gap-2">
              <label className="text-xs text-gray-600 col-span-1">Relation *</label>
              <input type="text" placeholder="Enter Relation" className="col-span-2 border rounded px-2 py-1 text-sm" value={member.relation} onChange={e => {
                const newFam = [...formData.familyMembers];
                newFam[idx].relation = e.target.value;
                updateRoot('familyMembers', newFam);
              }} />
            </div>
            <div className="grid grid-cols-3 items-center gap-2">
              <label className="text-xs text-gray-600 col-span-1">Name *</label>
              <input type="text" placeholder="Enter Name" className="col-span-2 border rounded px-2 py-1 text-sm" value={member.name} onChange={e => {
                const newFam = [...formData.familyMembers];
                newFam[idx].name = e.target.value;
                updateRoot('familyMembers', newFam);
              }} />
            </div>
            <div className="grid grid-cols-3 items-center gap-2">
              <label className="text-xs text-gray-600 col-span-1">Mobile</label>
              <input type="text" placeholder="Enter Mobile" className="col-span-2 border rounded px-2 py-1 text-sm" value={member.mobile} onChange={e => {
                const newFam = [...formData.familyMembers];
                newFam[idx].mobile = e.target.value;
                updateRoot('familyMembers', newFam);
              }} />
            </div>
          </div>
          <div className="space-y-3">
            <div className="grid grid-cols-3 items-center gap-2">
              <label className="text-xs text-gray-600 col-span-1">Occupation</label>
              <input type="text" placeholder="Enter Occupation" className="col-span-2 border rounded px-2 py-1 text-sm" value={member.occupation} onChange={e => {
                const newFam = [...formData.familyMembers];
                newFam[idx].occupation = e.target.value;
                updateRoot('familyMembers', newFam);
              }} />
            </div>
          </div>
        </div>
      ))}
      <button type="button" className="text-teal-600 text-sm flex items-center gap-1" onClick={() => updateRoot('familyMembers', [...formData.familyMembers, { relation: '', name: '', mobile: '', occupation: '', birthDate: '' }])}>
         + Add Family Member
      </button>
    </div>
  );

  const renderEmergencyTab = () => (
    <div className="p-4">
      <h3 className="text-lg font-medium text-gray-700 mb-4">Emergency Contact</h3>
      {formData.emergencyContacts.map((contact: any, idx: number) => (
        <div key={idx} className="grid grid-cols-2 gap-x-8 gap-y-3 mb-6 p-4 border rounded bg-gray-50">
          <div className="space-y-3">
            <div className="grid grid-cols-3 items-center gap-2">
              <label className="text-xs text-gray-600 col-span-1">Name *</label>
              <input type="text" placeholder="Enter Name" className="col-span-2 border rounded px-2 py-1 text-sm" value={contact.name} onChange={e => {
                const newContacts = [...formData.emergencyContacts];
                newContacts[idx].name = e.target.value;
                updateRoot('emergencyContacts', newContacts);
              }} />
            </div>
            <div className="grid grid-cols-3 items-center gap-2">
              <label className="text-xs text-gray-600 col-span-1">Address</label>
              <textarea placeholder="Enter Address" className="col-span-2 border rounded px-2 py-1 text-sm h-20" value={contact.address} onChange={e => {
                const newContacts = [...formData.emergencyContacts];
                newContacts[idx].address = e.target.value;
                updateRoot('emergencyContacts', newContacts);
              }} />
            </div>
            <div className="grid grid-cols-3 items-center gap-2">
              <label className="text-xs text-gray-600 col-span-1">Mobile No. *</label>
              <input type="text" placeholder="Enter Mobile No" className="col-span-2 border rounded px-2 py-1 text-sm" value={contact.mobileNo} onChange={e => {
                const newContacts = [...formData.emergencyContacts];
                newContacts[idx].mobileNo = e.target.value;
                updateRoot('emergencyContacts', newContacts);
              }} />
            </div>
          </div>
        </div>
      ))}
      <button type="button" className="text-teal-600 text-sm flex items-center gap-1" onClick={() => updateRoot('emergencyContacts', [...formData.emergencyContacts, { name: '', address: '', mobileNo: '', telNo: '' }])}>
         + Add Emergency Contact
      </button>
    </div>
  );

  const renderExperienceTab = () => (
    <div className="p-4">
      <h3 className="text-lg font-medium text-gray-700 mb-4">Experience Information</h3>
      {formData.experiences.length === 0 ? (
        <div className="text-center text-gray-500 py-10 bg-gray-50 mb-4">No record(s) to display!</div>
      ) : (
        formData.experiences.map((exp: any, idx: number) => (
          <div key={idx} className="grid grid-cols-2 gap-x-8 gap-y-3 mb-6 p-4 border rounded bg-gray-50 relative">
            <button type="button" className="absolute top-2 right-2 text-red-500 text-xs" onClick={() => updateRoot('experiences', formData.experiences.filter((_: any, i: number) => i !== idx))}>Remove</button>
            <div className="space-y-3">
              <div className="grid grid-cols-3 items-center gap-2">
                <label className="text-xs text-gray-600 col-span-1">Organization <span className="text-red-500">*</span></label>
                <input type="text" className="col-span-2 border rounded px-2 py-1 text-sm" value={exp.organization} onChange={e => {
                  const arr = [...formData.experiences]; arr[idx].organization = e.target.value; updateRoot('experiences', arr);
                }} />
              </div>
              <div className="grid grid-cols-3 items-center gap-2">
                <label className="text-xs text-gray-600 col-span-1">Start Date <span className="text-red-500">*</span></label>
                <input type="date" className="col-span-2 border rounded px-2 py-1 text-sm" value={exp.startDate} onChange={e => {
                  const arr = [...formData.experiences]; arr[idx].startDate = e.target.value; updateRoot('experiences', arr);
                }} />
              </div>
              <div className="grid grid-cols-3 items-center gap-2">
                <label className="text-xs text-gray-600 col-span-1">Last Salary</label>
                <input type="text" placeholder="Enter Last Salary Amount" className="col-span-2 border rounded px-2 py-1 text-sm" value={exp.lastSalary || ''} onChange={e => {
                  const arr = [...formData.experiences]; arr[idx].lastSalary = e.target.value; updateRoot('experiences', arr);
                }} />
              </div>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-3 items-center gap-2">
                <label className="text-xs text-gray-600 col-span-1">Designation <span className="text-red-500">*</span></label>
                <input type="text" placeholder="Enter Designation" className="col-span-2 border rounded px-2 py-1 text-sm" value={exp.designation} onChange={e => {
                  const arr = [...formData.experiences]; arr[idx].designation = e.target.value; updateRoot('experiences', arr);
                }} />
              </div>
              <div className="grid grid-cols-3 items-center gap-2">
                <label className="text-xs text-gray-600 col-span-1">End Date <span className="text-red-500">*</span></label>
                <input type="date" className="col-span-2 border rounded px-2 py-1 text-sm" value={exp.endDate} onChange={e => {
                  const arr = [...formData.experiences]; arr[idx].endDate = e.target.value; updateRoot('experiences', arr);
                }} />
              </div>
              <div className="grid grid-cols-3 items-center gap-2">
                <label className="text-xs text-gray-600 col-span-1">Reason of leaving</label>
                <input type="text" placeholder="Enter Reason of leaving" className="col-span-2 border rounded px-2 py-1 text-sm" value={exp.reasonForLeaving || ''} onChange={e => {
                  const arr = [...formData.experiences]; arr[idx].reasonForLeaving = e.target.value; updateRoot('experiences', arr);
                }} />
              </div>
            </div>
          </div>
        ))
      )}
      <button type="button" className="bg-teal-500 text-white px-4 py-1 text-sm rounded hover:bg-teal-600 mr-2" onClick={() => updateRoot('experiences', [...formData.experiences, { organization: '', designation: '', startDate: '', endDate: '', lastSalary: '', reasonForLeaving: '' }])}>
        Add New
      </button>
    </div>
  );

  const renderImmigrationTab = () => (
    <div className="p-4">
      <h3 className="text-lg font-medium text-gray-700 mb-4">Immigration Information</h3>
      {formData.immigrations.length === 0 ? (
        <div className="text-center text-gray-500 py-10 bg-gray-50 mb-4">No record(s) to display!</div>
      ) : (
        formData.immigrations.map((item: any, idx: number) => (
          <div key={idx} className="grid grid-cols-2 gap-x-8 gap-y-3 mb-6 p-4 border rounded bg-gray-50 relative">
            <button type="button" className="absolute top-2 right-2 text-red-500 text-xs" onClick={() => updateRoot('immigrations', formData.immigrations.filter((_: any, i: number) => i !== idx))}>Remove</button>
            <div className="space-y-3">
              <div className="grid grid-cols-3 items-center gap-2">
                <label className="text-xs text-gray-600 col-span-1">Type</label>
                <select className="col-span-2 border rounded px-2 py-1 text-sm" value={item.type} onChange={e => {
                  const arr = [...formData.immigrations]; arr[idx].type = e.target.value; updateRoot('immigrations', arr);
                }}>
                  <option value="Passport">Passport</option>
                  <option value="Visa">Visa</option>
                </select>
              </div>
              <div className="grid grid-cols-3 items-center gap-2">
                <label className="text-xs text-gray-600 col-span-1">Citizenship</label>
                <input type="text" className="col-span-2 border rounded px-2 py-1 text-sm" value={item.citizenship || ''} onChange={e => {
                  const arr = [...formData.immigrations]; arr[idx].citizenship = e.target.value; updateRoot('immigrations', arr);
                }} />
              </div>
              <div className="grid grid-cols-3 items-center gap-2">
                <label className="text-xs text-gray-600 col-span-1">Issued Date <span className="text-red-500">*</span></label>
                <input type="date" className="col-span-2 border rounded px-2 py-1 text-sm" value={item.issuedDate} onChange={e => {
                  const arr = [...formData.immigrations]; arr[idx].issuedDate = e.target.value; updateRoot('immigrations', arr);
                }} />
              </div>
              <div className="grid grid-cols-3 items-start gap-2">
                <label className="text-xs text-gray-600 col-span-1">Comments</label>
                <textarea placeholder="Enter Comments" className="col-span-2 border rounded px-2 py-1 text-sm h-16" value={item.comments || ''} onChange={e => {
                  const arr = [...formData.immigrations]; arr[idx].comments = e.target.value; updateRoot('immigrations', arr);
                }} />
              </div>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-3 items-center gap-2 mt-8">
                <label className="text-xs text-gray-600 col-span-1">Number <span className="text-red-500">*</span></label>
                <input type="text" placeholder="Enter Number" className="col-span-2 border rounded px-2 py-1 text-sm" value={item.documentNumber} onChange={e => {
                  const arr = [...formData.immigrations]; arr[idx].documentNumber = e.target.value; updateRoot('immigrations', arr);
                }} />
              </div>
              <div className="grid grid-cols-3 items-center gap-2">
                <label className="text-xs text-gray-600 col-span-1">Expiry Date <span className="text-red-500">*</span></label>
                <input type="date" className="col-span-2 border rounded px-2 py-1 text-sm" value={item.expiryDate} onChange={e => {
                  const arr = [...formData.immigrations]; arr[idx].expiryDate = e.target.value; updateRoot('immigrations', arr);
                }} />
              </div>
            </div>
          </div>
        ))
      )}
      <button type="button" className="bg-teal-500 text-white px-4 py-1 text-sm rounded hover:bg-teal-600 mr-2" onClick={() => updateRoot('immigrations', [...formData.immigrations, { type: 'Passport', documentNumber: '', citizenship: '', issuedDate: '', expiryDate: '', comments: '' }])}>
        Add New
      </button>
    </div>
  );

  const renderDocumentTab = () => (
    <div className="p-4">
      <h3 className="text-lg font-medium text-gray-700 mb-4">Employee Document Information</h3>
      {formData.documentInfos.length === 0 ? (
        <div className="text-center text-gray-500 py-10 bg-gray-50 mb-4">No record(s) to display!</div>
      ) : (
        formData.documentInfos.map((doc: any, idx: number) => (
          <div key={idx} className="grid grid-cols-1 gap-y-3 mb-6 p-4 border rounded bg-gray-50 relative max-w-xl">
            <button type="button" className="absolute top-2 right-2 text-red-500 text-xs" onClick={() => updateRoot('documentInfos', formData.documentInfos.filter((_: any, i: number) => i !== idx))}>Remove</button>
            <div className="grid grid-cols-[150px_1fr] items-center gap-2">
              <label className="text-xs text-gray-600">Document Name <span className="text-red-500">*</span></label>
              <input type="text" className="border rounded px-2 py-1 text-sm" value={doc.documentName} onChange={e => {
                const arr = [...formData.documentInfos]; arr[idx].documentName = e.target.value; updateRoot('documentInfos', arr);
              }} />
            </div>
            <div className="grid grid-cols-[150px_1fr] items-center gap-2">
              <label className="text-xs text-gray-600">Document File <span className="text-red-500">*</span></label>
              <div className="flex items-center gap-2">
                <input type="file" className="text-sm" onChange={(e) => {
                  // Mock file upload to string for now
                  if (e.target.files?.length) {
                    const arr = [...formData.documentInfos]; 
                    arr[idx].documentFile = e.target.files[0].name; 
                    updateRoot('documentInfos', arr);
                  }
                }} />
                {doc.documentFile && <span className="text-xs text-teal-600">{doc.documentFile}</span>}
              </div>
            </div>
          </div>
        ))
      )}
      <button type="button" className="bg-teal-500 text-white px-4 py-1 text-sm rounded hover:bg-teal-600 mr-2" onClick={() => updateRoot('documentInfos', [...formData.documentInfos, { documentName: '', documentFile: '' }])}>
        Add New
      </button>
    </div>
  );

  const renderCertificateTab = () => (
    <div className="p-4">
      <h3 className="text-lg font-medium text-gray-700 mb-4">Certification Information</h3>
      {formData.certifications.length === 0 ? (
        <div className="text-center text-gray-500 py-10 bg-gray-50 mb-4">No record(s) to display!</div>
      ) : (
        formData.certifications.map((cert: any, idx: number) => (
          <div key={idx} className="grid grid-cols-2 gap-x-8 gap-y-3 mb-6 p-4 border rounded bg-gray-50 relative">
            <button type="button" className="absolute top-2 right-2 text-red-500 text-xs" onClick={() => updateRoot('certifications', formData.certifications.filter((_: any, i: number) => i !== idx))}>Remove</button>
            <div className="space-y-3">
              <div className="grid grid-cols-[120px_1fr] items-center gap-2">
                <label className="text-xs text-gray-600">Certification <span className="text-red-500">*</span></label>
                <input type="text" placeholder="Enter Certification Name" className="border rounded px-2 py-1 text-sm" value={cert.certification} onChange={e => {
                  const arr = [...formData.certifications]; arr[idx].certification = e.target.value; updateRoot('certifications', arr);
                }} />
              </div>
              <div className="grid grid-cols-[120px_1fr] items-center gap-2">
                <label className="text-xs text-gray-600">Certified By <span className="text-red-500">*</span></label>
                <input type="text" placeholder="Enter Certified By" className="border rounded px-2 py-1 text-sm" value={cert.certifiedBy} onChange={e => {
                  const arr = [...formData.certifications]; arr[idx].certifiedBy = e.target.value; updateRoot('certifications', arr);
                }} />
              </div>
              <div className="grid grid-cols-[120px_1fr] items-center gap-2">
                <label className="text-xs text-gray-600">Year</label>
                <input type="text" placeholder="Enter Passing Year" className="border rounded px-2 py-1 text-sm" value={cert.year || ''} onChange={e => {
                  const arr = [...formData.certifications]; arr[idx].year = e.target.value; updateRoot('certifications', arr);
                }} />
              </div>
              <div className="grid grid-cols-[120px_1fr] items-center gap-2">
                <label className="text-xs text-gray-600">Score</label>
                <input type="text" placeholder="Enter Score" className="border rounded px-2 py-1 text-sm" value={cert.score || ''} onChange={e => {
                  const arr = [...formData.certifications]; arr[idx].score = e.target.value; updateRoot('certifications', arr);
                }} />
              </div>
            </div>
          </div>
        ))
      )}
      <button type="button" className="bg-teal-500 text-white px-4 py-1 text-sm rounded hover:bg-teal-600 mr-2" onClick={() => updateRoot('certifications', [...formData.certifications, { certification: '', certifiedBy: '', year: '', score: '' }])}>
        Add New
      </button>
    </div>
  );

  const renderQualificationTab = () => (
    <div className="p-4">
      <h3 className="text-lg font-medium text-gray-700 mb-4">Qualification Information</h3>
      {formData.qualifications.length === 0 ? (
        <div className="text-center text-gray-500 py-10 bg-gray-50 mb-4">No record(s) to display!</div>
      ) : (
        formData.qualifications.map((qual: any, idx: number) => (
          <div key={idx} className="grid grid-cols-2 gap-x-8 gap-y-3 mb-6 p-4 border rounded bg-gray-50 relative">
            <button type="button" className="absolute top-2 right-2 text-red-500 text-xs" onClick={() => updateRoot('qualifications', formData.qualifications.filter((_: any, i: number) => i !== idx))}>Remove</button>
            <div className="space-y-3">
              <div className="grid grid-cols-3 items-center gap-2">
                <label className="text-xs text-gray-600 col-span-1">Qualification <span className="text-red-500">*</span></label>
                <input type="text" placeholder="Enter Qualification" className="col-span-2 border rounded px-2 py-1 text-sm" value={qual.qualification} onChange={e => {
                  const arr = [...formData.qualifications]; arr[idx].qualification = e.target.value; updateRoot('qualifications', arr);
                }} />
              </div>
              <div className="grid grid-cols-3 items-center gap-2">
                <label className="text-xs text-gray-600 col-span-1">Bord/Uni <span className="text-red-500">*</span></label>
                <input type="text" placeholder="Enter Bord/Uni. Name" className="col-span-2 border rounded px-2 py-1 text-sm" value={qual.boardUniversity} onChange={e => {
                  const arr = [...formData.qualifications]; arr[idx].boardUniversity = e.target.value; updateRoot('qualifications', arr);
                }} />
              </div>
              <div className="grid grid-cols-3 items-center gap-2">
                <label className="text-xs text-gray-600 col-span-1">Subject</label>
                <input type="text" placeholder="Enter Subject" className="col-span-2 border rounded px-2 py-1 text-sm" value={qual.subject || ''} onChange={e => {
                  const arr = [...formData.qualifications]; arr[idx].subject = e.target.value; updateRoot('qualifications', arr);
                }} />
              </div>
              <div className="grid grid-cols-3 items-center gap-2">
                <label className="text-xs text-gray-600 col-span-1">Score <span className="text-red-500">*</span></label>
                <input type="text" placeholder="Enter Score" className="col-span-2 border rounded px-2 py-1 text-sm" value={qual.score} onChange={e => {
                  const arr = [...formData.qualifications]; arr[idx].score = e.target.value; updateRoot('qualifications', arr);
                }} />
              </div>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-3 items-center gap-2 mt-8">
                <label className="text-xs text-gray-600 col-span-1">School/College</label>
                <input type="text" placeholder="Enter School/College Name" className="col-span-2 border rounded px-2 py-1 text-sm" value={qual.schoolCollege || ''} onChange={e => {
                  const arr = [...formData.qualifications]; arr[idx].schoolCollege = e.target.value; updateRoot('qualifications', arr);
                }} />
              </div>
              <div className="grid grid-cols-3 items-center gap-2">
                <label className="text-xs text-gray-600 col-span-1">Passing Year <span className="text-red-500">*</span></label>
                <input type="text" placeholder="Enter Passing Year" className="col-span-2 border rounded px-2 py-1 text-sm" value={qual.passingYear} onChange={e => {
                  const arr = [...formData.qualifications]; arr[idx].passingYear = e.target.value; updateRoot('qualifications', arr);
                }} />
              </div>
              <div className="grid grid-cols-3 items-start gap-2">
                <label className="text-xs text-gray-600 col-span-1">Description</label>
                <textarea placeholder="Enter Description" className="col-span-2 border rounded px-2 py-1 text-sm h-16" value={qual.description || ''} onChange={e => {
                  const arr = [...formData.qualifications]; arr[idx].description = e.target.value; updateRoot('qualifications', arr);
                }} />
              </div>
            </div>
          </div>
        ))
      )}
      <button type="button" className="bg-teal-500 text-white px-4 py-1 text-sm rounded hover:bg-teal-600 mr-2" onClick={() => updateRoot('qualifications', [...formData.qualifications, { qualification: '', boardUniversity: '', subject: '', score: '', schoolCollege: '', passingYear: '', description: '' }])}>
        Add New
      </button>
    </div>
  );

  const renderWeekOffTab = () => (
    <div className="p-4">
      <h3 className="text-lg font-medium text-gray-700 mb-4">Week Off Information</h3>
      <div className="grid grid-cols-2 gap-x-8 gap-y-3 mb-6 p-4 border rounded bg-gray-50">
        <div className="space-y-3">
          <div className="grid grid-cols-3 items-center gap-2">
            <label className="text-xs text-gray-600 col-span-1">Working Days Per Week <span className="text-red-500">*</span></label>
            <input type="number" min="1" max="7" className="col-span-2 border rounded px-2 py-1 text-sm" value={formData.workingDaysPerWeek || 5} onChange={e => {
              updateRoot('workingDaysPerWeek', parseInt(e.target.value) || 5);
            }} />
          </div>
          <div className="grid grid-cols-3 items-center gap-2">
            <label className="text-xs text-gray-600 col-span-1">Primary Week Off</label>
            <select className="col-span-2 border rounded px-2 py-1 text-sm" value={formData.primaryWeekOff || 'Sunday'} onChange={e => updateRoot('primaryWeekOff', e.target.value)}>
              <option value="Sunday">Sunday</option>
              <option value="Monday">Monday</option>
              <option value="Tuesday">Tuesday</option>
              <option value="Wednesday">Wednesday</option>
              <option value="Thursday">Thursday</option>
              <option value="Friday">Friday</option>
              <option value="Saturday">Saturday</option>
            </select>
          </div>
          <div className="grid grid-cols-3 items-center gap-2">
            <label className="text-xs text-gray-600 col-span-1">Secondary Week Off</label>
            <select className="col-span-2 border rounded px-2 py-1 text-sm" value={formData.secondaryWeekOff || 'Saturday'} onChange={e => updateRoot('secondaryWeekOff', e.target.value)}>
              <option value="">None</option>
              <option value="Sunday">Sunday</option>
              <option value="Monday">Monday</option>
              <option value="Tuesday">Tuesday</option>
              <option value="Wednesday">Wednesday</option>
              <option value="Thursday">Thursday</option>
              <option value="Friday">Friday</option>
              <option value="Saturday">Saturday</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'Contact': return renderContactTab();
      case 'Payment': return renderPaymentTab();
      case 'Admin': return renderAdminTab();
      case 'Personal': return renderPersonalTab();
      case 'Family': return renderFamilyTab();
      case 'Emergency': return renderEmergencyTab();
      case 'Experience': return renderExperienceTab();
      case 'WeekOff': return renderWeekOffTab();
      case 'Immigration': return renderImmigrationTab();
      case 'Document': return renderDocumentTab();
      case 'Certificate': return renderCertificateTab();
      case 'Qualification': return renderQualificationTab();
      default: return <div className="p-10 text-center text-gray-500">Form for {activeTab} is under construction. Please use other tabs.</div>;
    }
  };

  const { years: expYears, months: expMonths } = calculateExperience(formData.joiningDate);

  return (
    <div className="h-[90vh] overflow-y-auto bg-gray-50 p-4">
      <div className="bg-white border rounded shadow-sm flex flex-col min-h-max">
        
        {/* TOP SECTION: Employee Master */}
        <div className="p-4 bg-gray-50 border-b relative">
          <h2 className="text-gray-500 font-medium mb-4">Employee Master</h2>
          
          <form id="master-form" onSubmit={handleSubmit} className="grid grid-cols-2 gap-x-8 gap-y-3 max-w-5xl">
            {/* Left Col */}
            <div className="space-y-3">
              <div className="grid grid-cols-3 items-center gap-2">
                <label className="text-xs text-gray-600 col-span-1">Employee No</label>
                <input type="text" className="col-span-2 border rounded px-2 py-1 text-sm bg-gray-100" value={formData.employeeCode || ''} onChange={e => updateRoot('employeeCode', e.target.value)} />
              </div>
              <div className="grid grid-cols-3 items-center gap-2">
                <label className="text-xs text-gray-600 col-span-1">First Name <span className="text-red-500">*</span></label>
                <input type="text" required className="col-span-2 border rounded px-2 py-1 text-sm" value={formData.firstName || ''} onChange={e => updateRoot('firstName', e.target.value)} />
              </div>
              <div className="grid grid-cols-3 items-center gap-2">
                <label className="text-xs text-gray-600 col-span-1">Middle Name</label>
                <input type="text" className="col-span-2 border rounded px-2 py-1 text-sm" value={formData.middleName || ''} onChange={e => updateRoot('middleName', e.target.value)} />
              </div>
              <div className="grid grid-cols-3 items-center gap-2">
                <label className="text-xs text-gray-600 col-span-1">Last Name <span className="text-red-500">*</span></label>
                <input type="text" required className="col-span-2 border rounded px-2 py-1 text-sm" value={formData.lastName || ''} onChange={e => updateRoot('lastName', e.target.value)} />
              </div>
              <div className="grid grid-cols-3 items-center gap-2">
                <label className="text-xs text-gray-600 col-span-1">Date of Joining <span className="text-red-500">*</span></label>
                <input type="date" className="col-span-2 border rounded px-2 py-1 text-sm" value={formData.joiningDate || ''} onChange={e => updateRoot('joiningDate', e.target.value)} />
              </div>
              <div className="grid grid-cols-3 items-center gap-2">
                <label className="text-xs text-gray-600 col-span-1">Date of Birth <span className="text-red-500">*</span></label>
                <input type="date" className="col-span-2 border rounded px-2 py-1 text-sm" value={formData.dob || ''} onChange={e => updateRoot('dob', e.target.value)} />
              </div>
              <div className="grid grid-cols-3 items-center gap-2 mt-4">
                <label className="text-xs text-gray-600 col-span-1">State <span className="text-red-500">*</span></label>
                <select required className="col-span-2 border rounded px-2 py-1 text-sm" value={formData.state || ''} onChange={e => updateRoot('state', e.target.value)}>
                   <option value="">Select</option>
                   <option value="Andhra Pradesh">Andhra Pradesh</option>
                   <option value="Arunachal Pradesh">Arunachal Pradesh</option>
                   <option value="Assam">Assam</option>
                   <option value="Bihar">Bihar</option>
                   <option value="Chhattisgarh">Chhattisgarh</option>
                   <option value="Goa">Goa</option>
                   <option value="Gujarat">Gujarat</option>
                   <option value="Haryana">Haryana</option>
                   <option value="Himachal Pradesh">Himachal Pradesh</option>
                   <option value="Jharkhand">Jharkhand</option>
                   <option value="Karnataka">Karnataka</option>
                   <option value="Kerala">Kerala</option>
                   <option value="Madhya Pradesh">Madhya Pradesh</option>
                   <option value="Maharashtra">Maharashtra</option>
                   <option value="Manipur">Manipur</option>
                   <option value="Meghalaya">Meghalaya</option>
                   <option value="Mizoram">Mizoram</option>
                   <option value="Nagaland">Nagaland</option>
                   <option value="Odisha">Odisha</option>
                   <option value="Punjab">Punjab</option>
                   <option value="Rajasthan">Rajasthan</option>
                   <option value="Sikkim">Sikkim</option>
                   <option value="Tamil Nadu">Tamil Nadu</option>
                   <option value="Telangana">Telangana</option>
                   <option value="Tripura">Tripura</option>
                   <option value="Uttar Pradesh">Uttar Pradesh</option>
                   <option value="Uttarakhand">Uttarakhand</option>
                   <option value="West Bengal">West Bengal</option>
                   <option value="Andaman and Nicobar Islands">Andaman and Nicobar Islands</option>
                   <option value="Chandigarh">Chandigarh</option>
                   <option value="Dadra and Nagar Haveli and Daman and Diu">Dadra and Nagar Haveli and Daman and Diu</option>
                   <option value="Delhi">Delhi</option>
                   <option value="Jammu and Kashmir">Jammu and Kashmir</option>
                   <option value="Ladakh">Ladakh</option>
                   <option value="Lakshadweep">Lakshadweep</option>
                   <option value="Puducherry">Puducherry</option>
                </select>
              </div>
               <div className="grid grid-cols-3 items-center gap-2">
                 <label className="text-xs text-gray-600 col-span-1">Department <span className="text-red-500">*</span></label>
                 <select required className="col-span-2 border rounded px-2 py-1 text-sm" value={formData.departmentId || ''} onChange={e => updateRoot('departmentId', e.target.value)}>
                    <option value="">Select Department</option>
                    {departments.map((dept: any) => <option key={dept.id} value={dept.id}>{dept.name}</option>)}
                 </select>
               </div>
              <div className="grid grid-cols-3 items-center gap-2">
                <label className="text-xs text-gray-600 col-span-1">Sub Department1 <span className="text-red-500">*</span></label>
                <select className="col-span-2 border rounded px-2 py-1 text-sm" value={formData.subDepartment1 || ''} onChange={e => updateRoot('subDepartment1', e.target.value)}>
                   <option value="">NA</option>
                </select>
              </div>
              <div className="grid grid-cols-3 items-center gap-2">
                <label className="text-xs text-gray-600 col-span-1">Category <span className="text-red-500">*</span></label>
                <select className="col-span-2 border rounded px-2 py-1 text-sm" value={formData.category || ''} onChange={e => updateRoot('category', e.target.value)}>
                   <option value="">Staff</option>
                </select>
              </div>
               <div className="grid grid-cols-3 items-center gap-2">
                 <label className="text-xs text-gray-600 col-span-1">Designation <span className="text-red-500">*</span></label>
                 <select required className="col-span-2 border rounded px-2 py-1 text-sm" value={formData.designationId || ''} onChange={e => updateRoot('designationId', e.target.value)}>
                    <option value="">Select Designation</option>
                    {designations.map((desig: any) => <option key={desig.id} value={desig.id}>{desig.title}</option>)}
                 </select>
               </div>
              <div className="grid grid-cols-3 items-center gap-2">
                <label className="text-xs text-gray-600 col-span-1">Reporting Manager</label>
                <input type="text" placeholder="Enter Employee Code OR Name" className="col-span-2 border rounded px-2 py-1 text-sm" value={formData.reportingManager || ''} onChange={e => updateRoot('reportingManager', e.target.value)} />
              </div>
               <div className="grid grid-cols-3 items-center gap-2">
                 <label className="text-xs text-gray-600 col-span-1">Probation</label>
                 <div className="col-span-2 flex items-center gap-2">
                   <input type="checkbox" checked={formData.probation || false} onChange={e => updateRoot('probation', e.target.checked)} />
                   <button type="button" onClick={() => setManageOpen(o => !o)} className="bg-teal-500 text-white text-xs px-2 py-1 rounded">Manage</button>
                 </div>
                 {manageOpen && (
                   <div className="col-span-3 flex items-center gap-3 pl-2 pb-2 text-xs text-gray-600">
                     <span>Status: {formData.probation ? 'On probation' : 'Not on probation'}</span>
                     <button type="button" onClick={() => { updateRoot('probation', true); setManageOpen(false); }} className="px-2 py-0.5 bg-teal-500 text-white rounded text-xs">Start Probation</button>
                     <button type="button" onClick={() => { updateRoot('probation', false); setManageOpen(false); }} className="px-2 py-0.5 bg-gray-300 text-gray-700 rounded text-xs">End Probation</button>
                   </div>
                 )}
               </div>
              <div className="grid grid-cols-3 items-center gap-2">
                <label className="text-xs text-gray-600 col-span-1">Company Email</label>
                <input type="email" className="col-span-2 border rounded px-2 py-1 text-sm" value={formData.companyEmail || ''} onChange={e => updateRoot('companyEmail', e.target.value)} />
              </div>
            </div>

            {/* Right Col */}
            <div className="space-y-3 relative">
              <div className="absolute right-0 top-0">
                 <label className="flex items-center gap-2 text-xs text-gray-600">
                                       <input type="checkbox" checked={formData.isExEmployee || false} onChange={e => updateRoot('isExEmployee', e.target.checked)} /> Ex employee
                 </label>
              </div>
              <div className="h-40"></div> {/* Spacer to align with State field below dates */}

               <div className="grid grid-cols-3 items-center gap-2">
                 <label className="text-xs text-gray-600 col-span-1">Branch <span className="text-red-500">*</span></label>
                 <select required className="col-span-2 border rounded px-2 py-1 text-sm" value={formData.branchId || ''} onChange={e => updateRoot('branchId', e.target.value)}>
                    <option value="">-- SELECT --</option>
                    {branches.map((branch: any) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
                 </select>
               </div>
              <div className="grid grid-cols-3 items-center gap-2">
                <label className="text-xs text-gray-600 col-span-1">Sub Department <span className="text-red-500">*</span></label>
                <select className="col-span-2 border rounded px-2 py-1 text-sm" value={formData.subDepartment || ''} onChange={e => updateRoot('subDepartment', e.target.value)}>
                   <option value="">NA</option>
                </select>
              </div>
              <div className="grid grid-cols-3 items-center gap-2">
                <label className="text-xs text-gray-600 col-span-1">Sub Department2 <span className="text-red-500">*</span></label>
                <select className="col-span-2 border rounded px-2 py-1 text-sm" value={formData.subDepartment2 || ''} onChange={e => updateRoot('subDepartment2', e.target.value)}>
                   <option value="">NA</option>
                </select>
              </div>
              <div className="grid grid-cols-3 items-center gap-2">
                <label className="text-xs text-gray-600 col-span-1">Sub Category <span className="text-red-500">*</span></label>
                <select className="col-span-2 border rounded px-2 py-1 text-sm" value={formData.subCategory || ''} onChange={e => updateRoot('subCategory', e.target.value)}>
                   <option value="">NA</option>
                </select>
              </div>
              <div className="grid grid-cols-3 items-center gap-2">
                <label className="text-xs text-gray-600 col-span-1">Grade/Cadre <span className="text-red-500">*</span></label>
                <select className="col-span-2 border rounded px-2 py-1 text-sm" value={formData.grade || ''} onChange={e => updateRoot('grade', e.target.value)}>
                   <option value="">NA</option>
                </select>
              </div>
              <div className="grid grid-cols-3 items-center gap-2">
                <label className="text-xs text-gray-600 col-span-1">Reporting Manager 2</label>
                <input type="text" placeholder="Enter Employee Code OR Name" className="col-span-2 border rounded px-2 py-1 text-sm" value={formData.reportingManager2 || ''} onChange={e => updateRoot('reportingManager2', e.target.value)} />
              </div>
              <div className="grid grid-cols-3 items-center gap-2">
                <label className="text-xs text-gray-600 col-span-1">Experience</label>
                <div className="col-span-2 text-sm text-gray-600">[ {expYears} ] year [ {expMonths} ] Month</div>
              </div>
              <div className="grid grid-cols-3 items-center gap-2">
                <label className="text-xs text-gray-600 col-span-1">Status <span className="text-red-500">*</span></label>
                <select className="col-span-2 border rounded px-2 py-1 text-sm" value={formData.status || 'active'} onChange={e => updateRoot('status', e.target.value)}>
                   <option value="active">Active</option>
                   <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
          </form>

          {/* Master Form Action Buttons */}
          <div className="flex justify-end gap-2 mt-4">
            <button type="submit" form="master-form" disabled={saving} className="px-4 py-1.5 text-xs font-medium text-white bg-teal-500 hover:bg-teal-600 rounded shadow-sm">
              Submit
            </button>
            <button type="button" onClick={handleReset} className="px-4 py-1.5 text-xs font-medium text-gray-700 bg-gray-200 hover:bg-gray-300 rounded shadow-sm">
              Reset
            </button>
            <button type="button" onClick={() => initialData?.id && navigate(`/employees/${initialData.id}/salary-structure`)} disabled={!initialData?.id} title={initialData?.id ? 'View this employee in the Salary Structure database' : 'Save the employee first to open its salary structure'} className="px-4 py-1.5 text-xs font-medium text-white bg-teal-500 hover:bg-teal-600 rounded shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
              Go to Salary Structure
            </button>
            {initialData?.id && (
              <button 
                type="button" 
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                className="px-4 py-1.5 text-xs font-medium text-white bg-red-500 hover:bg-red-600 rounded shadow-sm ml-2"
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete Employee'}
              </button>
            )}
          </div>
        </div>

        {/* TABS HEADER */}
        <div className="flex bg-gray-200 border-b overflow-x-auto no-scrollbar">
          {TABS.map(tab => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 text-xs font-medium whitespace-nowrap ${activeTab === tab ? 'bg-teal-500 text-white' : 'text-gray-600 hover:bg-gray-300'}`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* TABS CONTENT */}
        <div className="bg-gray-50">
          <form onSubmit={e => e.preventDefault()} className="flex flex-col">
            <div className="">
              {renderTabContent()}
            </div>
            
            {/* Tab specific Submit/Reset */}
            <div className="p-4 flex justify-end gap-2 border-t bg-gray-50">
               <button type="button" onClick={handleSubmit} className="px-4 py-1.5 text-xs font-medium text-white bg-teal-500 hover:bg-teal-600 rounded shadow-sm">
                 Submit
               </button>
               <button type="button" onClick={handleReset} className="px-4 py-1.5 text-xs font-medium text-gray-700 bg-gray-200 hover:bg-gray-300 rounded shadow-sm">
                 Reset
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
}
