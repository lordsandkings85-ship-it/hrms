import { useMutation, useQueryClient } from '@tanstack/react-query';
import { leaveApi } from '../../../api/client';
import { ApprovalQueue } from '../../../features/employee/ApprovalQueue';
import { Calendar } from 'lucide-react';
import { useToast } from '../../../components/ui/ToastProvider';

export default function LeaveApprovalPage() {
  const queryClient = useQueryClient();
  const { success } = useToast();

  const approveMutation = useMutation({
    mutationFn: (id: string) => leaveApi.approve(id),
    onSuccess: () => { success('Approved!', 'Request was approved successfully.'); queryClient.invalidateQueries({ queryKey: ['leave-approvals'] }); }
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => leaveApi.reject(id),
    onSuccess: () => { success('Rejected!', 'Request was rejected.'); queryClient.invalidateQueries({ queryKey: ['leave-approvals'] }); }
  });

  return (
    <ApprovalQueue
      title="Leave Approval"
      icon={Calendar}
      queryKey={['leave-approvals']}
      queryFn={async () => {
        const res = await leaveApi.listAll();
        return res || [];
      }}
      onApprove={(id) => approveMutation.mutate(id)}
      onReject={(id) => rejectMutation.mutate(id)}
    />
  );
}
