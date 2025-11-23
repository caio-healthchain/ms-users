import { Request, Response } from 'express';
import { userService } from '../services/user.service';
import { logger } from '../utils/logger';

export class UserController {
  /**
   * @swagger
   * /users/me:
   *   get:
   *     summary: Obter perfil do usuário autenticado
   *     description: Retorna informações completas do usuário logado incluindo hospitais e perfis
   *     tags: [Usuários]
   *     responses:
   *       200:
   *         description: Perfil do usuário
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/User'
   *       401:
   *         description: Não autenticado
   *       404:
   *         description: Usuário não encontrado
   */
  async getProfile(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.userId;

      if (!userId) {
        return res.status(401).json({
          error: 'Usuário não autenticado',
          statusCode: 401,
        });
      }

      const user = await userService.getUserById(userId);

      res.json(user);
    } catch (error: any) {
      logger.error('Erro ao buscar perfil:', error);
      res.status(404).json({
        error: 'Usuário não encontrado',
        message: error.message,
        statusCode: 404,
      });
    }
  }

  /**
   * @swagger
   * /users/me/hospitals:
   *   get:
   *     summary: Listar hospitais do usuário
   *     description: Retorna lista de hospitais que o usuário tem acesso com seus respectivos perfis
   *     tags: [Usuários]
   *     responses:
   *       200:
   *         description: Lista de hospitais
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 type: object
   *                 properties:
   *                   id:
   *                     type: string
   *                   code:
   *                     type: string
   *                   name:
   *                     type: string
   *                   subdomain:
   *                     type: string
   *                   logoUrl:
   *                     type: string
   *                   primaryColor:
   *                     type: string
   *                   profiles:
   *                     type: array
   *                     items:
   *                       $ref: '#/components/schemas/Profile'
   *       401:
   *         description: Não autenticado
   */
  async getHospitals(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.userId;

      if (!userId) {
        return res.status(401).json({
          error: 'Usuário não autenticado',
          statusCode: 401,
        });
      }

      const hospitals = await userService.getUserHospitals(userId);

      res.json(hospitals);
    } catch (error: any) {
      logger.error('Erro ao buscar hospitais:', error);
      res.status(500).json({
        error: 'Erro ao buscar hospitais',
        message: error.message,
        statusCode: 500,
      });
    }
  }

  /**
   * @swagger
   * /users/me:
   *   put:
   *     summary: Atualizar perfil do usuário
   *     description: Atualiza informações do perfil do usuário autenticado
   *     tags: [Usuários]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               name:
   *                 type: string
   *                 example: Dr. João Silva
   *               phone:
   *                 type: string
   *                 example: (11) 98765-4321
   *               avatar:
   *                 type: string
   *                 example: https://avatar.url/image.jpg
   *     responses:
   *       200:
   *         description: Perfil atualizado com sucesso
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/User'
   *       401:
   *         description: Não autenticado
   *       500:
   *         description: Erro interno do servidor
   */
  async updateProfile(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.userId;

      if (!userId) {
        return res.status(401).json({
          error: 'Usuário não autenticado',
          statusCode: 401,
        });
      }

      const { name, phone, avatar } = req.body;

      const user = await userService.updateUser(userId, {
        name,
        phone,
        avatar,
      });

      res.json(user);
    } catch (error: any) {
      logger.error('Erro ao atualizar perfil:', error);
      res.status(500).json({
        error: 'Erro ao atualizar perfil',
        message: error.message,
        statusCode: 500,
      });
    }
  }

  /**
   * @swagger
   * /users:
   *   get:
   *     summary: Listar todos os usuários (Admin)
   *     description: Lista todos os usuários do sistema com filtros opcionais
   *     tags: [Usuários]
   *     parameters:
   *       - in: query
   *         name: isActive
   *         schema:
   *           type: boolean
   *         description: Filtrar por status ativo/inativo
   *       - in: query
   *         name: hospitalId
   *         schema:
   *           type: string
   *         description: Filtrar por hospital
   *       - in: query
   *         name: profileId
   *         schema:
   *           type: string
   *         description: Filtrar por perfil
   *     responses:
   *       200:
   *         description: Lista de usuários
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/User'
   *       401:
   *         description: Não autenticado
   *       403:
   *         description: Sem permissão
   */
  async listUsers(req: Request, res: Response) {
    try {
      const { isActive, hospitalId, profileId } = req.query;

      const filters: any = {};

      if (isActive !== undefined) {
        filters.isActive = isActive === 'true';
      }

      if (hospitalId) {
        filters.hospitalId = hospitalId as string;
      }

      if (profileId) {
        filters.profileId = profileId as string;
      }

      const users = await userService.listUsers(filters);

      res.json(users);
    } catch (error: any) {
      logger.error('Erro ao listar usuários:', error);
      res.status(500).json({
        error: 'Erro ao listar usuários',
        message: error.message,
        statusCode: 500,
      });
    }
  }

  /**
   * @swagger
   * /users/{userId}/grant-access:
   *   post:
   *     summary: Conceder acesso a hospital (Admin)
   *     description: Concede acesso de um usuário a um hospital com um perfil específico
   *     tags: [Usuários]
   *     parameters:
   *       - in: path
   *         name: userId
   *         required: true
   *         schema:
   *           type: string
   *         description: ID do usuário
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - hospitalId
   *               - profileId
   *             properties:
   *               hospitalId:
   *                 type: string
   *               profileId:
   *                 type: string
   *     responses:
   *       200:
   *         description: Acesso concedido com sucesso
   *       400:
   *         description: Dados inválidos
   *       401:
   *         description: Não autenticado
   *       403:
   *         description: Sem permissão
   */
  async grantAccess(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const { hospitalId, profileId } = req.body;
      const grantedBy = (req as any).user?.userId;

      if (!grantedBy) {
        return res.status(401).json({
          error: 'Usuário não autenticado',
          statusCode: 401,
        });
      }

      if (!hospitalId || !profileId) {
        return res.status(400).json({
          error: 'Hospital e perfil são obrigatórios',
          statusCode: 400,
        });
      }

      const access = await userService.grantHospitalAccess(
        userId,
        hospitalId,
        profileId,
        grantedBy
      );

      res.json(access);
    } catch (error: any) {
      logger.error('Erro ao conceder acesso:', error);
      res.status(500).json({
        error: 'Erro ao conceder acesso',
        message: error.message,
        statusCode: 500,
      });
    }
  }

  /**
   * @swagger
   * /users/{userId}/revoke-access:
   *   post:
   *     summary: Revogar acesso a hospital (Admin)
   *     description: Revoga acesso de um usuário a um hospital
   *     tags: [Usuários]
   *     parameters:
   *       - in: path
   *         name: userId
   *         required: true
   *         schema:
   *           type: string
   *         description: ID do usuário
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - hospitalId
   *               - profileId
   *             properties:
   *               hospitalId:
   *                 type: string
   *               profileId:
   *                 type: string
   *     responses:
   *       200:
   *         description: Acesso revogado com sucesso
   *       400:
   *         description: Dados inválidos
   *       401:
   *         description: Não autenticado
   *       403:
   *         description: Sem permissão
   */
  async revokeAccess(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const { hospitalId, profileId } = req.body;
      const revokedBy = (req as any).user?.userId;

      if (!revokedBy) {
        return res.status(401).json({
          error: 'Usuário não autenticado',
          statusCode: 401,
        });
      }

      if (!hospitalId || !profileId) {
        return res.status(400).json({
          error: 'Hospital e perfil são obrigatórios',
          statusCode: 400,
        });
      }

      await userService.revokeHospitalAccess(
        userId,
        hospitalId,
        profileId,
        revokedBy
      );

      res.json({
        message: 'Acesso revogado com sucesso',
      });
    } catch (error: any) {
      logger.error('Erro ao revogar acesso:', error);
      res.status(500).json({
        error: 'Erro ao revogar acesso',
        message: error.message,
        statusCode: 500,
      });
    }
  }
}

export const userController = new UserController();
