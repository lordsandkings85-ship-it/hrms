import { useMutation, useQueryClient } from '@tanstack/react-query';
import { employeeServicesApi } from '../../../api/client';
import { ApprovalQueue } from '../../../features/employee/ApprovalQueue';
import { Timer } from 'lucide-react';
import { useToast } from '../../../components/ui/ToastProvider';

export default function OvertimeApprovalPage() {
  const queryClient = useQueryClient();
  const { success } = useToast();

  const approveMutation = useMutation({
    mutationFn: (id: string) => employeeServicesApi.approveOvertime(id),
    onSuccess: () => { success('Approved!', 'Request was approved successfully.'); queryClient.invalidateQueries({ queryKey: ['overtime-approvals'] }); queryClient.invalidateQueries({ queryKey: ['employee-overtime-logs'] }); }
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => employeeServicesApi.rejectOvertime(id),
    onSuccess: () => { success('Rejected!', 'Request was rejected.'); queryClient.invalidateQueries({ queryKey: ['overtime-approvals'] }); queryClient.invalidateQueries({ queryKey: ['employee-overtime-logs'] }); }
  });

  return (
    <ApprovalQueue
      title="Overtime Approval"
      icon={Timer}
      queryKey={['overtime-approvals']}
      queryFn={async () => {
        const res = await employeeServicesApi.listOvertimeAll();
        return res || [];
      }}
      onApprove={(id) => approveMutation.mutate(id)}
      onReject={(id) => rejectMutation.mutate(id)}
    />
  );
}
