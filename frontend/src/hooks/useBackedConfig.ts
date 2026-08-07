import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { configApi } from '../api/client';
import { loadLocal, saveLocal } from '../utils/localStore';

export function useBackedConfig<T>(storageKey: string, backendKey: string, fallback: T) {
  const [value, setValue] = useState<T>(() => loadLocal(storageKey, fallback));
  const queryClient = useQueryClient();

  useEffect(() => {
    let active = true;
    configApi
      .list()
      .then((settings) => {
        if (!active) return;
        const found = (settings || []).find((s: any) => s.key === backendKey);
        if (found?.value !== undefined && found?.value !== null) {
          setValue(found.value as T);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [backendKey]);

  const persistMutation = useMutation({
    mutationFn: (next: T) => configApi.upsert(backendKey, next),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['settings-config'] }),
  });

  const set = (next: T) => {
    setValue(next);
    saveLocal(storageKey, next);
    persistMutation.mutate(next);
  };

  return [value, set, persistMutation.isPending] as const;
}
