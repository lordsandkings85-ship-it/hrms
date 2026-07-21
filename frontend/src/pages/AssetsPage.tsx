import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Laptop, Plus, UserCheck, RefreshCw, Package } from 'lucide-react';
import { assetsApi, employeesApi } from '../api/client';
import { PageHeader } from '../components/ui/PageHeader';

export default function AssetsPage() {
  const queryClient = useQueryClient();
  const [newAssetType, setNewAssetType] = useState('laptop');
  const [newAssetIdentifier, setNewAssetIdentifier] = useState('');
  const [assigneeMap, setAssigneeMap] = useState<Record<string, string>>({}); // assetId -> employeeId

  // Fetch employees
  const { data: employees } = useQuery({
    queryKey: ['employees-list-all'],
    queryFn: () => employeesApi.list({ page: 1 }),
  });

  // Fetch company assets
  const { data: assets, isLoading } = useQuery({
    queryKey: ['assets-list'],
    queryFn: () => assetsApi.list(),
  });

  // Create Asset
  const createAssetMutation = useMutation({
    mutationFn: assetsApi.create,
    onSuccess: () => {
      alert('Asset registered!');
      setNewAssetIdentifier('');
      queryClient.invalidateQueries({ queryKey: ['assets-list'] });
    },
  });

  // Assign Asset
  const assignMutation = useMutation({
    mutationFn: (data: { assetId: string; employeeId: string }) =>
      assetsApi.assign(data.assetId, data.employeeId),
    onSuccess: () => {
      alert('Asset assigned successfully!');
      queryClient.invalidateQueries({ queryKey: ['assets-list'] });
    },
  });

  // Return Asset
  const returnMutation = useMutation({
    mutationFn: (data: { assetId: string; assignmentId: string }) =>
      assetsApi.returnAsset(data.assetId, data.assignmentId),
    onSuccess: () => {
      alert('Asset returned back to inventory');
      queryClient.invalidateQueries({ queryKey: ['assets-list'] });
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAssetIdentifier.trim()) return;
    createAssetMutation.mutate({ type: newAssetType, identifier: newAssetIdentifier });
  };

  const handleAssign = (assetId: string) => {
    const empId = assigneeMap[assetId];
    if (!empId) return alert('Select an employee to assign this asset');
    assignMutation.mutate({ assetId, employeeId: empId });
  };

  const handleReturn = (asset: any) => {
    // Find active assignment
    const active = asset.assignments?.find((a: any) => !a.returnedAt);
    if (!active) return alert('No active assignment record found');
    returnMutation.mutate({ assetId: asset.id, assignmentId: active.id });
  };

  return (
    <div className="page-container max-w-7xl space-y-6">
      <div className="animate-slideUp mb-2">
        <PageHeader
          title="Asset Management"
          subtitle="Track company assets, assign to employees, and manage returns."
          icon={Package}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Create Asset form */}
        <div className="section-card p-6 h-fit">
          <h2 className="text-sm font-semibold uppercase tracking-wider mb-4 flex items-center gap-2">
            <Plus className="text-ledger" size={18} /> Register Asset
          </h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-xs text-muted mb-1">Asset Category</label>
              <select
                value={newAssetType}
                onChange={(e) => setNewAssetType(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-line bg-white text-sm"
              >
                <option value="laptop">Laptop / Workstation</option>
                <option value="mobile">Mobile Device</option>
                <option value="sim">SIM Card</option>
                <option value="id_card">Office ID Access Card</option>
                <option value="vehicle">Company Vehicle</option>
                <option value="software_license">SaaS Seat License</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-muted mb-1">Asset Serial / Identifier</label>
              <input
                type="text"
                placeholder="e.g. SL-LP-0294, serial-id, MAC, license-key"
                value={newAssetIdentifier}
                onChange={(e) => setNewAssetIdentifier(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-line bg-white text-sm font-mono"
                required
              />
            </div>

            <button
              type="submit"
              disabled={createAssetMutation.isPending}
              className="w-full bg-ledger text-paper rounded-md py-2.5 text-sm font-medium hover:bg-ledgerDark"
            >
              Add to Inventory
            </button>
          </form>
        </div>

        {/* Assets List */}
        <div className="lg:col-span-2 bg-white border border-line rounded-lg overflow-hidden h-fit">
          <div className="px-6 py-4 border-b border-line">
            <h3 className="text-sm font-semibold">Hardware &amp; License Inventory</h3>
          </div>
          {isLoading && <div className="p-6 text-sm text-muted">Loading inventory...</div>}
          {!isLoading && (!assets || assets.length === 0) && (
            <div className="p-6 text-sm text-muted">No assets registered yet in this workspace.</div>
          )}
          <div className="divide-y divide-line">
            {assets?.map((asset: any) => {
              const activeAssignment = asset.assignments?.find((a: any) => !a.returnedAt);
              // Find matching employee name if assigned
              const assigneeName = activeAssignment
                ? employees?.items.find((emp) => emp.id === activeAssignment.employeeId)
                : null;

              return (
                <div key={asset.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-paper/40">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-paper rounded border border-line text-ledger">
                      <Laptop size={18} />
                    </div>
                    <div>
                      <div className="text-sm font-medium flex items-center gap-2">
                        <span className="capitalize">{asset.type}</span>
                        <span className="text-xs font-mono bg-paper px-1.5 py-0.5 rounded border border-line">{asset.identifier}</span>
                      </div>
                      <div className="text-xs text-muted mt-1">
                        Status: <span className={`font-semibold ${asset.status === 'available' ? 'text-ledger' : 'text-rust'}`}>{asset.status}</span>
                        {assigneeName && (
                          <span className="text-ink ml-1.5">
                            &bull; Assigned to <span className="font-semibold">{assigneeName.firstName} {assigneeName.lastName}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end md:self-auto">
                    {asset.status === 'available' ? (
                      <div className="flex items-center gap-2">
                        <select
                          value={assigneeMap[asset.id] || ''}
                          onChange={(e) => setAssigneeMap({ ...assigneeMap, [asset.id]: e.target.value })}
                          className="px-2 py-1 rounded border border-line bg-white text-xs"
                        >
                          <option value="">-- Choose User --</option>
                          {employees?.items.map((emp) => (
                            <option key={emp.id} value={emp.id}>
                              {emp.firstName} {emp.lastName}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => handleAssign(asset.id)}
                          className="flex items-center gap-1 bg-ink text-paper text-xs px-2.5 py-1.5 rounded hover:bg-ink/90"
                        >
                          <UserCheck size={12} /> Assign
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleReturn(asset)}
                        className="flex items-center gap-1 border border-line text-ink text-xs px-2.5 py-1.5 rounded hover:bg-paper/60"
                      >
                        <RefreshCw size={12} /> Return Inventory
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

