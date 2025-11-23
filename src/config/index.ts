import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Server
  port: parseInt(process.env.PORT || '3007', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Database
  databaseUrl: process.env.DATABASE_URL || '',
  
  // JWT
  jwtSecret: process.env.JWT_SECRET || 'lazarus-secret-key-change-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  
  // Azure AD
  azureAd: {
    clientId: process.env.AZURE_CLIENT_ID || '',
    clientSecret: process.env.AZURE_CLIENT_SECRET || '',
    tenantId: process.env.AZURE_TENANT_ID || '',
    authority: process.env.AZURE_AUTHORITY || 'https://login.microsoftonline.com/',
    redirectUri: process.env.AZURE_REDIRECT_URI || 'https://lazarus.healthchainsolutions.com.br/auth/callback',
  },
  
  // CORS
  corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:5173', 'https://lazarus.healthchainsolutions.com.br'],
  
  // API Base URLs
  apiBaseUrl: process.env.API_BASE_URL || 'https://lazarusapi.azure-api.net',
  hospitalServiceUrl: process.env.HOSPITAL_SERVICE_URL || 'https://lazarusapi.azure-api.net/hospitals',
  
  // Swagger
  swagger: {
    title: 'Lazarus Users API',
    description: 'API de gerenciamento de usuários e autenticação Azure AD SSO',
    version: '1.0.0',
    basePath: '/users',
  },
  
  // Rate Limiting
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100, // limite de requisições por janela
  },
};
