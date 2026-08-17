import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { employeesApi } from '../../../api/client';
import AdvancedEmployeeForm from '../../../features/employee/AdvancedEmployeeForm';

export default function EmployeeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: emp, isLoading } = useQuery({
    queryKey: ['employee', id],
    queryFn: () => employeesApi.get(id!),
    enabled: !!id,
  });

  if (isLoading) return <div className="page-container flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div></div>;
  if (!emp) return <div className="page-container flex items-center justify-center h-64 text-red-500">Employee not found.</div>;

  const empAny = emp as any;
  const toDateString = (v: any) => {
    if (!v) return '';
    const d = new Date(v);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().slice(0, 10);
  };
  const initialData = {
    ...empAny,
    companyEmail: empAny.email || '',
    joiningDate: toDateString(empAny.joiningDate),
    dob: toDateString(empAny.dob),
    confirmationDate: toDateString(empAny.confirmationDate),
    contactInfo: empAny.contactInfo || {},
    paymentInfo: empAny.paymentInfo || {},
    adminInfo: empAny.adminInfo || {},
    personalInfo: empAny.personalInfo || {},
    familyMembers: empAny.familyMembers?.length ? empAny.familyMembers : [{ relation: '', name: '', mobile: '', occupation: '', birthDate: '' }],
    emergencyContacts: empAny.emergencyContacts?.length ? empAny.emergencyContacts : [{ name: '', address: '', mobileNo: '', telNo: '' }],
    experiences: empAny.experiences?.length ? empAny.experiences : [],
    immigrations: empAny.immigrations?.length ? empAny.immigrations : [],
    documentInfos: empAny.documentInfos?.length ? empAny.documentInfos : [],
    certifications: empAny.certifications?.length ? empAny.certifications : [],
    qualifications: empAny.qualifications?.length ? empAny.qualifications : [],
  };

  return (
    <AdvancedEmployeeForm 
      initialData={initialData} 
      onClose={() => navigate('/employees')} 
    />
  );
}
