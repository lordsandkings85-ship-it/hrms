import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';

export interface AccessTokenPayload {
  sub: string;
  companyId: string;
  activeCompanyId?: string;
  companyIds?: string[];
  email: string;
  roleId?: string;
  /** Server-side session id (see UserSession). */
  jti?: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_ACCESS_SECRET,
    });
  }

  /**
   * Every authenticated request is checked against server-side state so that
   * blocking an account (or revoking a session) takes effect immediately,
   * instead of waiting for the access token to expire.
   */
  async validate(payload: AccessTokenPayload) {
    // Tokens minted before the session registry existed cannot be revoked;
    // force a fresh login rather than honouring them.
    if (!payload.jti) {
      throw new UnauthorizedException({
        code: 'SESSION_REVOKED',
        message: 'This session has been signed out. Please login again.',
      });
    }

    const [user, session] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: {
          securityBlocked: true,
          isSuperAdmin: true,
          companyId: true,
          roleId: true,
        },
      }),
      this.prisma.userSession.findUnique({
        where: { id: payload.jti },
        select: { status: true, userId: true },
      }),
    ]);

    if (!user) {
      throw new UnauthorizedException({ code: 'SESSION_REVOKED', message: 'User no longer exists' });
    }
    if (user.securityBlocked) {
      throw new UnauthorizedException({
        code: 'ACCOUNT_BLOCKED',
        message:
          'Your account has been blocked by the Workora security policy. Please contact your administrator to restore access.',
      });
    }
    if (!session || session.status !== 'ACTIVE' || session.userId !== payload.sub) {
      throw new UnauthorizedException({
        code: 'SESSION_REVOKED',
        message: 'This session has been signed out. Please login again.',
      });
    }

    return {
      userId: payload.sub,
      companyId: payload.companyId,
      activeCompanyId: payload.activeCompanyId ?? payload.companyId,
      companyIds: payload.companyIds ?? [payload.companyId],
      email: payload.email,
      roleId: payload.roleId,
      isSuperAdmin: user.isSuperAdmin,
      sessionId: payload.jti,
    };
  }
}
