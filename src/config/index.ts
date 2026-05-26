import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Server
  port: parseInt(process.env.PORT || '3015', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Database
  databaseUrl: process.env.DATABASE_URL || '',
  
  // JWT
  jwtSecret: process.env.JWT_SECRET || 'lazarus-secret-key-change-in-production',
  jwtExpiresIn: (process.env.JWT_EXPIRES_IN || '24h') as string,
  jwtRefreshExpiresIn: (process.env.JWT_REFRESH_EXPIRES_IN || '7d') as string,
  
  // CORS
  corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:5173', 'https://lazarus.healthchainsolutions.com.br'],
  
  // API Base URLs
  apiBaseUrl: process.env.API_BASE_URL || 'https://lazarusapi.azure-api.net',
  hospitalServiceUrl: process.env.HOSPITAL_SERVICE_URL || 'https://lazarusapi.azure-api.net/hospitals',
  
  // Swagger
  swagger: {
    title: 'Lazarus Users API',
    description: 'API de gerenciamento de usuários e autenticação custom IAM/JWT',
    version: '1.0.0',
    basePath: '/users',
  },
  
  // Rate Limiting
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100, // limite de requisições por janela
  },
};
