import { ConfidentialClientApplication, AuthorizationCodeRequest } from '@azure/msal-node';
import { PrismaClient } from '@prisma/client';
import jwt, { SignOptions } from 'jsonwebtoken';
import axios from 'axios';
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
   * Autentica usuário via Azure AD usando access token já obtido
   */
  async authenticateWithAzureToken(azureAccessToken: string, azureIdToken?: string) {
    try {
      logger.info('Iniciando autenticação com Azure AD Token');

      // Validar token e obter informações do usuário do Microsoft Graph
      const graphResponse = await axios.get('https://graph.microsoft.com/v1.0/me', {
        headers: {
          Authorization: `Bearer ${azureAccessToken}`,
        },
      });

      const azureUser = graphResponse.data;

      logger.info(`Usuário autenticado: ${azureUser.mail || azureUser.userPrincipalName}`);

      // Buscar ou criar usuário no banco
      let user = await prisma.user.findUnique({
        where: { azureAdId: azureUser.id },
      });

      if (!user) {
        // Criar novo usuário
        user = await prisma.user.create({
          data: {
            name: azureUser.displayName || azureUser.mail || azureUser.userPrincipalName,
            email: azureUser.mail || azureUser.userPrincipalName,
            azureAdId: azureUser.id,
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
          },
        },
      });

      return {
        accessToken,
        refreshToken,
        user,
        hospitals: userHospitalProfiles,
      };
    } catch (error: any) {
      logger.error('Erro na autenticação Azure AD:', error);
      throw new Error(`Falha na autenticação: ${error.message}`);
    }
  }

  /**
   * Autentica usuário via Azure AD usando código de autorização (método antigo)
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
        accessToken,
        refreshToken,
        user,
        hospitals: userHospitalProfiles,
      };
    } catch (error: any) {
      logger.error('Erro na autenticação Azure AD:', error);
      throw new Error(`Falha na autenticação: ${error.message}`);
    }
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
