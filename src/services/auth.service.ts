import { ConfidentialClientApplication, AuthorizationCodeRequest } from '@azure/msal-node';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

// Configuração do MSAL (Microsoft Authentication Library)
const msalConfig = {
  auth: {
    clientId: config.azureAd.clientId,
    authority: `${config.azureAd.authority}${config.azureAd.tenantId}`,
    clientSecret: config.azureAd.clientSecret,
  },
};

const cca = new ConfidentialClientApplication(msalConfig);

export class AuthService {
  /**
   * Autentica usuário via Azure AD usando código de autorização
   */
  async authenticateWithAzureAd(authCode: string) {
    try {
      logger.info('Iniciando autenticação Azure AD');

      // Trocar código por token
      const tokenRequest: AuthorizationCodeRequest = {
        code: authCode,
        scopes: ['User.Read', 'openid', 'profile', 'email'],
        redirectUri: config.azureAd.redirectUri,
      };

      const response = await cca.acquireTokenByCode(tokenRequest);

      if (!response || !response.account) {
        throw new Error('Falha ao obter token do Azure AD');
      }

      const { account, accessToken: azureAccessToken } = response;

      logger.info(`Usuário autenticado: ${account.username}`);

      // Buscar ou criar usuário no banco
      let user = await prisma.user.findUnique({
        where: { azureAdId: account.homeAccountId },
      });

      if (!user) {
        // Criar novo usuário
        user = await prisma.user.create({
          data: {
            name: account.name || account.username,
            email: account.username,
            azureAdId: account.homeAccountId,
            azureAdTenantId: account.tenantId,
            isActive: true,
          },
        });

        logger.info(`Novo usuário criado: ${user.id}`);
      } else {
        // Atualizar última autenticação
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            updatedAt: new Date(),
          },
        });
      }

      // Buscar hospitais e perfis do usuário
      const userHospitalProfiles = await prisma.userHospitalProfile.findMany({
        where: {
          userId: user.id,
          isActive: true,
        },
        include: {
          hospital: true,
          profile: true,
        },
      });

      // Gerar tokens JWT internos
      const { accessToken, refreshToken } = this.generateTokens(user.id, user.email);

      // Registrar log de auditoria
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          userName: user.name,
          userEmail: user.email,
          action: 'LOGIN',
          description: 'Login via Azure AD SSO',
          ipAddress: 'unknown', // Será preenchido pelo controller
          userAgent: 'unknown', // Será preenchido pelo controller
          metadata: {
            azureAdId: user.azureAdId,
            tenantId: user.azureAdTenantId,
          },
        },
      });

      return {
        user,
        accessToken,
        refreshToken,
        hospitals: userHospitalProfiles,
      };
    } catch (error: any) {
      logger.error('Erro na autenticação Azure AD:', error);
      throw new Error(`Erro na autenticação: ${error.message}`);
    }
  }

  /**
   * Gera tokens JWT (access e refresh)
   */
  generateTokens(userId: string, email: string) {
    const accessToken = jwt.sign(
      { userId, email, type: 'access' },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn } as jwt.SignOptions
    );

    const refreshToken = jwt.sign(
      { userId, email, type: 'refresh' },
      config.jwtSecret,
      { expiresIn: config.jwtRefreshExpiresIn } as jwt.SignOptions
    );

    return { accessToken, refreshToken };
  }

  /**
   * Verifica e decodifica token JWT
   */
  verifyToken(token: string) {
    try {
      return jwt.verify(token, config.jwtSecret) as {
        userId: string;
        email: string;
        type: 'access' | 'refresh';
      };
    } catch (error) {
      throw new Error('Token inválido ou expirado');
    }
  }

  /**
   * Renova access token usando refresh token
   */
  async refreshAccessToken(refreshToken: string) {
    try {
      const decoded = this.verifyToken(refreshToken);

      if (decoded.type !== 'refresh') {
        throw new Error('Token inválido');
      }

      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
      });

      if (!user || !user.isActive) {
        throw new Error('Usuário não encontrado ou inativo');
      }

      const { accessToken, refreshToken: newRefreshToken } = this.generateTokens(
        user.id,
        user.email
      );

      return { accessToken, refreshToken: newRefreshToken };
    } catch (error: any) {
      logger.error('Erro ao renovar token:', error);
      throw new Error(`Erro ao renovar token: ${error.message}`);
    }
  }

  /**
   * Seleciona hospital e cria sessão
   */
  async selectHospital(userId: string, hospitalId: string, ipAddress: string, userAgent: string) {
    try {
      // Verificar se usuário tem acesso ao hospital
      const userHospitalProfiles = await prisma.userHospitalProfile.findMany({
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

      if (userHospitalProfiles.length === 0) {
        throw new Error('Usuário não tem acesso a este hospital');
      }

      const hospital = userHospitalProfiles[0].hospital;
      const profiles = userHospitalProfiles.map((uhp) => uhp.profile);

      // Gerar novo token com contexto do hospital
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) throw new Error('Usuário não encontrado');

      const accessToken = jwt.sign(
        {
          userId: user.id,
          email: user.email,
          hospitalId: hospital.id,
          hospitalCode: hospital.code,
          profiles: profiles.map((p) => p.code),
          type: 'access',
        },
        config.jwtSecret,
        { expiresIn: config.jwtExpiresIn } as jwt.SignOptions
      );

      // Criar sessão
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      await prisma.userSession.create({
        data: {
          userId: user.id,
          hospitalId: hospital.id,
          accessToken,
          expiresAt,
          ipAddress,
          userAgent,
          isActive: true,
        },
      });

      // Registrar log
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          userName: user.name,
          userEmail: user.email,
          action: 'ACCESS_HOSPITAL',
          description: `Acesso ao hospital: ${hospital.name}`,
          hospitalId: hospital.id,
          ipAddress,
          userAgent,
          metadata: {
            hospitalCode: hospital.code,
            profiles: profiles.map((p) => p.code),
          },
        },
      });

      // Construir URL de redirecionamento
      const redirectUrl = hospital.customDomain
        ? `https://${hospital.customDomain}/modules`
        : `https://${hospital.subdomain}.healthchainsolutions.com.br/modules`;

      return {
        accessToken,
        redirectUrl,
        hospital,
        profiles,
      };
    } catch (error: any) {
      logger.error('Erro ao selecionar hospital:', error);
      throw new Error(`Erro ao selecionar hospital: ${error.message}`);
    }
  }

  /**
   * Logout do usuário
   */
  async logout(userId: string, accessToken: string) {
    try {
      // Desativar sessão
      await prisma.userSession.updateMany({
        where: {
          userId,
          accessToken,
        },
        data: {
          isActive: false,
        },
      });

      // Registrar log
      const user = await prisma.user.findUnique({ where: { id: userId } });
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

      logger.info(`Logout realizado: ${userId}`);
    } catch (error: any) {
      logger.error('Erro ao fazer logout:', error);
      throw new Error(`Erro ao fazer logout: ${error.message}`);
    }
  }
}

export const authService = new AuthService();
