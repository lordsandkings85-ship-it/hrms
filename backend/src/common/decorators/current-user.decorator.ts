import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface AuthUser {
  userId: string;
  companyId: string;
  activeCompanyId?: string;
  companyIds?: string[];
  email: string;
  roleId?: string;
  /** Populated by JwtStrategy from the database (never trusted from the token). */
  isSuperAdmin?: boolean;
  /** Id of the server-side session row (JWT `jti`). */
  sessionId?: string;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
