import { SetMetadata } from '@nestjs/common';

export interface RequiredPermission {
  module: string;
  action: 'view' | 'create' | 'edit' | 'delete' | 'approve' | 'export';
}

export const PERMISSIONS_KEY = 'permissions';

/**
 * Usage: @Permissions({ module: 'employees', action: 'create' })
 */
export const Permissions = (...permissions: RequiredPermission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
