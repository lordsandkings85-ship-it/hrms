import { isApprover } from './approver';

describe('isApprover (strict HR/approval principal)', () => {
  it('returns true for super admins regardless of grants', () => {
    expect(isApprover({ isSuperAdmin: true, roleIsSystem: false }, [])).toBe(true);
  });

  it('returns true for system roles', () => {
    expect(isApprover({ isSuperAdmin: false, roleIsSystem: true }, [])).toBe(true);
  });

  it('returns true for ALL:ALL grant', () => {
    expect(
      isApprover({ isSuperAdmin: false, roleIsSystem: false }, [{ module: 'ALL', action: 'ALL' }]),
    ).toBe(true);
  });

  it('returns true for leave:approve', () => {
    expect(
      isApprover({ isSuperAdmin: false, roleIsSystem: false }, [{ module: 'leave', action: 'approve' }]),
    ).toBe(true);
  });

  it('returns true for attendance:approve', () => {
    expect(
      isApprover(
        { isSuperAdmin: false, roleIsSystem: false },
        [{ module: 'attendance', action: 'approve' }],
      ),
    ).toBe(true);
  });

  it('returns false for a NON-approval grant only (e.g. project:view)', () => {
    expect(
      isApprover({ isSuperAdmin: false, roleIsSystem: false }, [{ module: 'projects', action: 'view' }]),
    ).toBe(false);
  });

  it('returns false for zero grants (plain employee)', () => {
    expect(isApprover({ isSuperAdmin: false, roleIsSystem: false }, [])).toBe(false);
  });

  it('returns false for leave:view (viewing is not approving)', () => {
    expect(
      isApprover({ isSuperAdmin: false, roleIsSystem: false }, [{ module: 'leave', action: 'view' }]),
    ).toBe(false);
  });
});
