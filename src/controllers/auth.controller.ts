import { Request, Response } from 'express';
import { authService } from '../services/auth.service';
import { logger } from '../utils/logger';

export class AuthController {

  /**
   * @swagger
   * /users/auth/login:
   *   post:
   *     summary: Login custom com email e senha
   *     description: Autentica o usuário pelo IAM custom do Lazarus usando credenciais locais e tokens JWT internos.
   *     tags: [Autenticação]
   *     security: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/CustomLoginRequest'
   *     responses:
   *       200:
   *         description: Login realizado com sucesso
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/AuthResponse'
   *       400:
   *         description: Email ou senha não informados
   *       401:
   *         description: Credenciais inválidas
   *       500:
   *         description: Erro interno do servidor
   */
  async customLogin(req: Request, res: Response) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          error: 'Email e senha são obrigatórios',
          statusCode: 400,
        });
      }

      const result = await authService.authenticateWithPassword(email, password, {
        ipAddress: req.ip || req.socket.remoteAddress || 'unknown',
        userAgent: req.get('user-agent') || 'unknown',
      });

      logger.info(`Login custom bem-sucedido: ${result.user.email}`);

      res.json({
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        expiresIn: 86400,
        user: {
          id: result.user.id,
          name: result.user.name,
          email: result.user.email,
          avatar: result.user.avatar,
        },
        hospitals: result.hospitals.map((uhp) => ({
          hospital: uhp.hospital,
          profile: uhp.profile,
        })),
      });
    } catch (error: any) {
      const isInvalidCredentials = error.message === 'Credenciais inválidas';
      logger.error('Erro no login custom:', error);
      res.status(isInvalidCredentials ? 401 : 500).json({
        error: isInvalidCredentials ? 'Credenciais inválidas' : 'Erro na autenticação',
        message: isInvalidCredentials ? 'Email ou senha inválidos' : error.message,
        statusCode: isInvalidCredentials ? 401 : 500,
      });
    }
  }

  /**
   * @swagger
   * /users/auth/refresh:
   *   post:
   *     summary: Renovar access token
   *     description: Renova o access token usando o refresh token
   *     tags: [Autenticação]
   *     security: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - refreshToken
   *             properties:
   *               refreshToken:
   *                 type: string
   *                 description: Refresh token obtido no login
   *     responses:
   *       200:
   *         description: Token renovado com sucesso
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 accessToken:
   *                   type: string
   *                 refreshToken:
   *                   type: string
   *       400:
   *         description: Refresh token inválido
   *       500:
   *         description: Erro interno do servidor
   */
  async refresh(req: Request, res: Response) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({
          error: 'Refresh token não fornecido',
          statusCode: 400,
        });
      }

      const result = await authService.refreshAccessToken(refreshToken);

      res.json(result);
    } catch (error: any) {
      logger.error('Erro ao renovar token:', error);
      res.status(400).json({
        error: 'Token inválido',
        message: error.message,
        statusCode: 400,
      });
    }
  }

  /**
   * @swagger
   * /users/auth/select-hospital:
   *   post:
   *     summary: Selecionar hospital
   *     description: Seleciona um hospital e retorna URL de redirecionamento com novo token
   *     tags: [Autenticação]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/SelectHospitalRequest'
   *     responses:
   *       200:
   *         description: Hospital selecionado com sucesso
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/SelectHospitalResponse'
   *       400:
   *         description: Hospital inválido ou usuário sem acesso
   *       401:
   *         description: Não autenticado
   *       500:
   *         description: Erro interno do servidor
   */
  async selectHospital(req: Request, res: Response) {
    try {
      const { hospitalId } = req.body;
      const userId = (req as any).user?.userId;

      if (!userId) {
        return res.status(401).json({
          error: 'Usuário não autenticado',
          statusCode: 401,
        });
      }

      if (!hospitalId) {
        return res.status(400).json({
          error: 'Hospital não fornecido',
          statusCode: 400,
        });
      }

      const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';
      const userAgent = req.get('user-agent') || 'unknown';

      const result = await authService.selectHospital(
        userId,
        hospitalId
      );

      res.json(result);
    } catch (error: any) {
      logger.error('Erro ao selecionar hospital:', error);
      res.status(400).json({
        error: 'Erro ao selecionar hospital',
        message: error.message,
        statusCode: 400,
      });
    }
  }

  /**
   * @swagger
   * /auth/logout:
   *   post:
   *     summary: Logout
   *     description: Desativa a sessão do usuário
   *     tags: [Autenticação]
   *     responses:
   *       200:
   *         description: Logout realizado com sucesso
   *       401:
   *         description: Não autenticado
   *       500:
   *         description: Erro interno do servidor
   */
  async logout(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.userId;
      const token = req.headers.authorization?.replace('Bearer ', '');

      if (!userId || !token) {
        return res.status(401).json({
          error: 'Usuário não autenticado',
          statusCode: 401,
        });
      }

      await authService.logout(userId, token);

      res.json({
        message: 'Logout realizado com sucesso',
      });
    } catch (error: any) {
      logger.error('Erro ao fazer logout:', error);
      res.status(500).json({
        error: 'Erro ao fazer logout',
        message: error.message,
        statusCode: 500,
      });
    }
  }

  /**
   * @swagger
   * /auth/me:
   *   get:
   *     summary: Obter dados do usuário autenticado
   *     description: Retorna informações do usuário logado
   *     tags: [Autenticação]
   *     responses:
   *       200:
   *         description: Dados do usuário
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 user:
   *                   $ref: '#/components/schemas/User'
   *                 hospitalId:
   *                   type: string
   *                 hospitalCode:
   *                   type: string
   *                 profiles:
   *                   type: array
   *                   items:
   *                     type: string
   *       401:
   *         description: Não autenticado
   */
  async me(req: Request, res: Response) {
    try {
      const userData = (req as any).user;

      if (!userData) {
        return res.status(401).json({
          error: 'Usuário não autenticado',
          statusCode: 401,
        });
      }

      const result = await authService.getAuthenticatedUser(userData.userId);

      res.json({
        user: result.user,
        hospitals: result.hospitals.map((uhp) => ({
          hospital: uhp.hospital,
          profile: uhp.profile,
        })),
        tokenContext: {
          hospitalId: userData.hospitalId,
          hospitalCode: userData.hospitalCode,
          profiles: userData.profiles,
        },
      });
    } catch (error: any) {
      logger.error('Erro ao obter dados do usuário:', error);
      res.status(500).json({
        error: 'Erro ao obter dados',
        message: error.message,
        statusCode: 500,
      });
    }
  }
}

export const authController = new AuthController();
