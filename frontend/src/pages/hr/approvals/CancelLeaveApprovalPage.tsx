import { useMutation, useQueryClient } from '@tanstack/react-query';
import { leaveApi } from '../../../api/client';
import { ApprovalQueue } from '../../../features/employee/ApprovalQueue';
import { Undo2 } from 'lucide-react';
import { useToast } from '../../../components/ui/ToastProvider';

export default function CancelLeaveApprovalPage() {
  const queryClient = useQueryClient();
  const { success } = useToast();

  const approveMutation = useMutation({
    mutationFn: (id: string) => leaveApi.approveCancellation(id),
    onSuccess: () => { success('Approved!', 'Cancellation request was approved successfully.'); queryClient.invalidateQueries({ queryKey: ['cancel-leave-approvals'] }); queryClient.invalidateQueries({ queryKey: ['leave-history'] }); queryClient.invalidateQueries({ queryKey: ['leave-balances'] }); queryClient.invalidateQueries({ queryKey: ['leave-balances-dash'] }); queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] }); }
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => leaveApi.rejectCancellation(id),
    onSuccess: () => { success('Rejected!', 'Cancellation request was rejected.'); queryClient.invalidateQueries({ queryKey: ['cancel-leave-approvals'] }); queryClient.invalidateQueries({ queryKey: ['leave-history'] }); queryClient.invalidateQueries({ queryKey: ['leave-balances'] }); queryClient.invalidateQueries({ queryKey: ['leave-balances-dash'] }); queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] }); }
  });

  return (
    <ApprovalQueue
      title="Cancel Leave Approval"
      icon={Undo2}
      queryKey={['cancel-leave-approvals']}
      queryFn={async () => {
        const res = await leaveApi.listCancellationRequests();
        return res || [];
      }}
      onApprove={(id) => approveMutation.mutate(id)}
      onReject={(id) => rejectMutation.mutate(id)}
    />
  );
}
