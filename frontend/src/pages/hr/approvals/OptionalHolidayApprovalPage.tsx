import { useMutation, useQueryClient } from '@tanstack/react-query';
import { employeeServicesApi } from '../../../api/client';
import { ApprovalQueue } from '../../../features/employee/ApprovalQueue';
import { CalendarDays } from 'lucide-react';
import { useToast } from '../../../components/ui/ToastProvider';

export default function OptionalHolidayApprovalPage() {
  const queryClient = useQueryClient();
  const { success } = useToast();

  const approveMutation = useMutation({
    mutationFn: (id: string) => employeeServicesApi.approveOptionalHoliday(id),
    onSuccess: () => { success('Approved!', 'Request was approved successfully.'); queryClient.invalidateQueries({ queryKey: ['optional-holiday-approvals'] }); }
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => employeeServicesApi.rejectOptionalHoliday(id),
    onSuccess: () => { success('Rejected!', 'Request was rejected.'); queryClient.invalidateQueries({ queryKey: ['optional-holiday-approvals'] }); }
  });

  return (
    <ApprovalQueue
      title="Optional Holiday Approval"
      icon={CalendarDays}
      queryKey={['optional-holiday-approvals']}
      queryFn={async () => {
        const res = await employeeServicesApi.listOptionalHolidaysAll();
        return res || [];
      }}
      onApprove={(id) => approveMutation.mutate(id)}
      onReject={(id) => rejectMutation.mutate(id)}
    />
  );
}
