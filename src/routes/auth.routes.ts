import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Autenticação
 *   description: Endpoints de autenticação Azure AD SSO
 */

// Rotas públicas (sem autenticação)
router.post('/azure/callback', authController.azureCallback.bind(authController));
router.post('/refresh', authController.refresh.bind(authController));

// Rotas protegidas (requerem autenticação)
router.post('/select-hospital', authMiddleware, authController.selectHospital.bind(authController));
router.post('/logout', authMiddleware, authController.logout.bind(authController));
router.get('/me', authMiddleware, authController.me.bind(authController));

export default router;
