import { PrismaClient } from '@prisma/client';
import jwt, { SignOptions } from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { config } from '../config';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export interface AuthRequestContext {
  ipAddress?: string;
  userAgent?: string;
}

export class AuthService {

  /**
   * Autentica usuário com credencial local do IAM custom.
   *
   * Este fluxo é a estratégia oficial do ms-users: simples, tenant-aware
   * por vínculo UserHospitalProfile e baseado em tokens JWT internos.
   */
  async authenticateWithPassword(email: string, password: string, context: AuthRequestContext = {}) {
    try {
      const normalizedEmail = email.trim().toLowerCase();
      logger.info(`Iniciando autenticação custom para: ${normalizedEmail}`);

      const user = await prisma.user.findUnique({
        where: { email: normalizedEmail },
      });

      if (!user || !user.isActive || !user.passwordHash) {
        throw new Error('Credenciais inválidas');
      }

      const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

      if (!isPasswordValid) {
        await prisma.auditLog.create({
          data: {
            userId: user.id,
            userName: user.name,
            userEmail: user.email,
            action: 'LOGIN_FAILED',
            description: 'Falha de login custom por senha inválida',
            ipAddress: context.ipAddress || 'unknown',
            userAgent: context.userAgent || 'unknown',
            metadata: { authProvider: 'custom' },
          },
        });

        throw new Error('Credenciais inválidas');
      }

      const userHospitalProfiles = await this.getActiveHospitalProfiles(user.id);
      const { accessToken, refreshToken } = this.generateTokens(user.id, user.email);

      await prisma.auditLog.create({
        data: {
          userId: user.id,
          userName: user.name,
          userEmail: user.email,
          action: 'LOGIN',
          description: 'Login custom com email e senha',
          ipAddress: context.ipAddress || 'unknown',
          userAgent: context.userAgent || 'unknown',
          metadata: { authProvider: 'custom' },
        },
      });

      return {
        accessToken,
        refreshToken,
        user: this.sanitizeUser(user),
        hospitals: userHospitalProfiles,
      };
    } catch (error: any) {
      logger.error('Erro na autenticação custom:', error);
      throw error.message === 'Credenciais inválidas'
        ? error
        : new Error('Falha na autenticação custom');
    }
  }

  /**
   * Retorna o contexto completo do usuário autenticado para o endpoint /me.
   */
  async getAuthenticatedUser(userId: string) {
    const user = await prisma.user.findFirst({
      where: {
        id: userId,
        isActive: true,
      },
    });

    if (!user) {
      throw new Error('Usuário não encontrado ou inativo');
    }

    const userHospitalProfiles = await this.getActiveHospitalProfiles(user.id);

    return {
      user: this.sanitizeUser(user),
      hospitals: userHospitalProfiles,
    };
  }

  private getActiveHospitalProfiles(userId: string) {
    return prisma.userHospitalProfile.findMany({
      where: {
        userId,
        isActive: true,
      },
      include: {
        hospital: true,
        profile: true,
      },
    });
  }

  private sanitizeUser<T extends { passwordHash?: string | null }>(user: T) {
    const { passwordHash, ...safeUser } = user;
    return safeUser;
  }
  /**
   * Gera tokens JWT para autenticação interna
   */
  private generateTokens(userId: string, email: string) {
    const accessOptions: SignOptions = { expiresIn: config.jwtExpiresIn as any };
    const refreshOptions: SignOptions = { expiresIn: config.jwtRefreshExpiresIn as any };

    const accessToken = jwt.sign(
      {
        userId,
        email,
        type: 'access',
      },
      config.jwtSecret,
      accessOptions
    );

    const refreshToken = jwt.sign(
      {
        userId,
        email,
        type: 'refresh',
      },
      config.jwtSecret,
      refreshOptions
    );

    return { accessToken, refreshToken };
  }

  /**
   * Verifica e decodifica um JWT
   */
  verifyToken(token: string) {
    try {
      const decoded = jwt.verify(token, config.jwtSecret);
      return decoded;
    } catch (error: any) {
      throw new Error('Token inválido ou expirado');
    }
  }

  /**
   * Renova access token usando refresh token
   */
  async refreshAccessToken(refreshToken: string) {
    try {
      const decoded = jwt.verify(refreshToken, config.jwtSecret) as any;

      if (decoded.type !== 'refresh') {
        throw new Error('Token inválido');
      }

      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
      });

      if (!user || !user.isActive) {
        throw new Error('Usuário não encontrado ou inativo');
      }

      const tokens = this.generateTokens(user.id, user.email);

      return tokens;
    } catch (error: any) {
      logger.error('Erro ao renovar token:', error);
      throw new Error('Token inválido ou expirado');
    }
  }

  /**
   * Faz logout do usuário (registra log de auditoria)
   */
  async logout(userId: string, token: string) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (user) {
        await prisma.auditLog.create({
          data: {
            userId: user.id,
            userName: user.name,
            userEmail: user.email,
            action: 'LOGOUT',
            description: 'Logout do sistema',
            ipAddress: 'unknown',
            userAgent: 'unknown',
            metadata: {},
          },
        });
      }

      logger.info(`Usuário ${userId} fez logout`);
    } catch (error: any) {
      logger.error('Erro ao fazer logout:', error);
      throw error;
    }
  }

  /**
   * Seleciona hospital e gera novo token com contexto
   */
  async selectHospital(userId: string, hospitalId: string) {
    try {
      // Verificar se usuário tem acesso ao hospital
      const userHospitalProfile = await prisma.userHospitalProfile.findFirst({
        where: {
          userId,
          hospitalId,
          isActive: true,
        },
        include: {
          hospital: true,
          profile: true,
        },
      });

      if (!userHospitalProfile) {
        throw new Error('Usuário não tem acesso a este hospital');
      }

      const hospital = userHospitalProfile.hospital;

      // Buscar todos os perfis do usuário neste hospital
      const profiles = await prisma.userHospitalProfile.findMany({
        where: {
          userId,
          hospitalId,
          isActive: true,
        },
        include: {
          profile: true,
        },
      });

      // Gerar novo token com contexto do hospital
      const contextOptions: SignOptions = { expiresIn: config.jwtExpiresIn as any };
      const contextToken = jwt.sign(
        {
          userId,
          hospitalId,
          hospitalCode: hospital.code,
          profiles: profiles.map((p) => ({
            id: p.profile.id,
            code: p.profile.code,
            name: p.profile.name,
            allowedModules: p.profile.allowedModules,
          })),
          type: 'context',
        },
        config.jwtSecret,
        contextOptions
      );

      // Determinar URL de redirecionamento
      const subdomain = hospital.subdomain || `${hospital.code}-lazarus`;
      const customDomain = hospital.customDomain;
      
      const redirectUrl = customDomain
        ? `https://${customDomain}/modules`
        : `https://${subdomain}.healthchainsolutions.com.br/modules`;

      // Registrar log
      await prisma.auditLog.create({
        data: {
          userId,
          userName: '',
          userEmail: '',
          action: 'SELECT_HOSPITAL',
          description: `Selecionou hospital: ${hospital.name}`,
          ipAddress: 'unknown',
          userAgent: 'unknown',
          metadata: {
            hospitalId,
            hospitalCode: hospital.code,
          },
        },
      });

      return {
        redirectUrl,
        hospital,
        profiles: profiles.map((p) => p.profile),
        contextToken,
      };
    } catch (error: any) {
      logger.error('Erro ao selecionar hospital:', error);
      throw error;
    }
  }
}

export const authService = new AuthService();
