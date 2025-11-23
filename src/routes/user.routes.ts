import { Router } from 'express';
import { userController } from '../controllers/user.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Usuários
 *   description: Gerenciamento de usuários e acessos
 */

// Todas as rotas requerem autenticação
router.use(authMiddleware);

// Rotas do próprio usuário
router.get('/me', userController.getProfile.bind(userController));
router.put('/me', userController.updateProfile.bind(userController));
router.get('/me/hospitals', userController.getHospitals.bind(userController));

// Rotas administrativas
router.get('/', userController.listUsers.bind(userController));
router.post('/:userId/grant-access', userController.grantAccess.bind(userController));
router.post('/:userId/revoke-access', userController.revokeAccess.bind(userController));

export default router;
