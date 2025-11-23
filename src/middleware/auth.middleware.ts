import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import { logger } from '../utils/logger';

/**
 * Middleware para verificar autenticação JWT
 */
export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Token não fornecido',
        statusCode: 401,
      });
    }

    const token = authHeader.replace('Bearer ', '');

    try {
      const decoded = authService.verifyToken(token);
      
      // Anexar dados do usuário à requisição
      (req as any).user = decoded;
      
      next();
    } catch (error) {
      return res.status(401).json({
        error: 'Token inválido ou expirado',
        statusCode: 401,
      });
    }
  } catch (error: any) {
    logger.error('Erro no middleware de autenticação:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: error.message,
      statusCode: 500,
    });
  }
};

/**
 * Middleware opcional - não retorna erro se não autenticado
 */
export const optionalAuthMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '');

      try {
        const decoded = authService.verifyToken(token);
        (req as any).user = decoded;
      } catch (error) {
        // Ignora erro - autenticação opcional
      }
    }

    next();
  } catch (error: any) {
    logger.error('Erro no middleware de autenticação opcional:', error);
    next();
  }
};
