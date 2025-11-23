import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import { config } from './config';
import { swaggerSpec } from './config/swagger';
import { logger } from './utils/logger';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';

const app = express();

// Middlewares de segurança
app.use(helmet());
app.use(compression());

// CORS
app.use(
  cors({
    origin: config.corsOrigins,
    credentials: true,
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: 'Muitas requisições deste IP, tente novamente mais tarde.',
});
app.use('/api/', limiter);

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Swagger documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Lazarus Users API',
}));

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'ms-users',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);

// Root endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({
    service: 'Lazarus Users API',
    version: '1.0.0',
    description: 'API de gerenciamento de usuários e autenticação Azure AD SSO',
    documentation: '/api-docs',
    health: '/health',
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Endpoint não encontrado',
    path: req.path,
    statusCode: 404,
  });
});

// Error handler
app.use((err: any, req: Request, res: Response, next: any) => {
  logger.error('Erro não tratado:', err);
  
  res.status(err.statusCode || 500).json({
    error: err.message || 'Erro interno do servidor',
    statusCode: err.statusCode || 500,
  });
});

// Start server
const PORT = config.port;

app.listen(PORT, () => {
  logger.info(`🚀 ms-users rodando na porta ${PORT}`);
  logger.info(`📚 Documentação disponível em http://localhost:${PORT}/api-docs`);
  logger.info(`🏥 Ambiente: ${config.nodeEnv}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM recebido, encerrando servidor...');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT recebido, encerrando servidor...');
  process.exit(0);
});

export default app;
