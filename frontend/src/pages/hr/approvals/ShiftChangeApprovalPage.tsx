import { useMutation, useQueryClient } from '@tanstack/react-query';
import { shiftsApi } from '../../../api/client';
import { ApprovalQueue } from '../../../features/employee/ApprovalQueue';
import { Clock } from 'lucide-react';
import { useToast } from '../../../components/ui/ToastProvider';

export default function ShiftChangeApprovalPage() {
  const queryClient = useQueryClient();
  const { success } = useToast();

  const approveMutation = useMutation({
    mutationFn: (id: string) => shiftsApi.approveChangeRequest(id),
    onSuccess: () => { success('Approved!', 'Request was approved successfully.'); queryClient.invalidateQueries({ queryKey: ['shift-approvals'] }); }
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => shiftsApi.rejectChangeRequest(id),
    onSuccess: () => { success('Rejected!', 'Request was rejected.'); queryClient.invalidateQueries({ queryKey: ['shift-approvals'] }); }
  });

  return (
    <ApprovalQueue
      title="Shift Change Approval"
      icon={Clock}
      queryKey={['shift-approvals']}
      queryFn={async () => {
        const res = await shiftsApi.listChangeRequests();
        return res || [];
      }}
      onApprove={(id) => approveMutation.mutate(id)}
      onReject={(id) => rejectMutation.mutate(id)}
    />
  );
}
