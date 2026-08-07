import { useMutation, useQueryClient } from '@tanstack/react-query';
import { travelApi } from '../../../api/client';
import { ApprovalQueue } from '../../../features/employee/ApprovalQueue';
import { Plane } from 'lucide-react';
import { useToast } from '../../../components/ui/ToastProvider';

export default function TravelClaimApprovalPage() {
  const queryClient = useQueryClient();
  const { success } = useToast();

  const approveMutation = useMutation({
    mutationFn: (id: string) => travelApi.updateStatus(id, 'approved'),
    onSuccess: () => { success('Approved!', 'Request was approved successfully.'); queryClient.invalidateQueries({ queryKey: ['travel-approvals'] }); }
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => travelApi.updateStatus(id, 'rejected'),
    onSuccess: () => { success('Rejected!', 'Request was rejected.'); queryClient.invalidateQueries({ queryKey: ['travel-approvals'] }); }
  });

  return (
    <ApprovalQueue
      title="Travel Claim Approval"
      icon={Plane}
      queryKey={['travel-approvals']}
      queryFn={async () => {
        const res = await travelApi.listForCompany();
        return res || [];
      }}
      onApprove={(id) => approveMutation.mutate(id)}
      onReject={(id) => rejectMutation.mutate(id)}
    />
  );
}
