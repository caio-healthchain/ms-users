import swaggerJsdoc from 'swagger-jsdoc';
import { config } from './index';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: config.swagger.title,
      version: config.swagger.version,
      description: config.swagger.description,
      contact: {
        name: 'HealthChain Solutions',
        email: 'suporte@healthchainsolutions.com.br',
      },
    },
    servers: [
      {
        url: `http://localhost:${config.port}`,
        description: 'Servidor de Desenvolvimento',
      },
      {
        url: `${config.apiBaseUrl}/users`,
        description: 'Servidor de Produção (Azure APIM)',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Token JWT obtido após autenticação Azure AD',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'clu1234567890' },
            name: { type: 'string', example: 'Dr. João Silva' },
            email: { type: 'string', example: 'joao.silva@hospital.com.br' },
            cpf: { type: 'string', example: '123.456.789-00' },
            phone: { type: 'string', example: '(11) 98765-4321' },
            avatar: { type: 'string', example: 'https://avatar.url/image.jpg' },
            azureAdId: { type: 'string', example: 'azure-ad-object-id' },
            isActive: { type: 'boolean', example: true },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        Profile: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'clu1234567890' },
            code: { type: 'string', enum: ['GERENCIAL', 'AUDITOR', 'ANALISTA'], example: 'AUDITOR' },
            name: { type: 'string', example: 'Auditor Médico' },
            description: { type: 'string', example: 'Perfil para auditores médicos' },
            allowedModules: {
              type: 'array',
              items: { type: 'string' },
              example: ['auditor', 'gerencial'],
            },
            permissions: { type: 'object', example: { canApprove: true, canReject: true } },
            isActive: { type: 'boolean', example: true },
          },
        },
        Hospital: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'clu1234567890' },
            code: { type: 'string', example: 'h9j' },
            name: { type: 'string', example: 'Hospital 9 de Julho' },
            cnpj: { type: 'string', example: '12.345.678/0001-90' },
            subdomain: { type: 'string', example: 'h9j-lazarus' },
            customDomain: { type: 'string', example: 'lazarus.h9j.com.br' },
            logoUrl: { type: 'string', example: 'https://cdn.hospital.com/logo.png' },
            primaryColor: { type: 'string', example: '#1E40AF' },
            isActive: { type: 'boolean', example: true },
          },
        },
        UserHospitalProfile: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            userId: { type: 'string' },
            hospitalId: { type: 'string' },
            profileId: { type: 'string' },
            user: { $ref: '#/components/schemas/User' },
            hospital: { $ref: '#/components/schemas/Hospital' },
            profile: { $ref: '#/components/schemas/Profile' },
            isActive: { type: 'boolean' },
            grantedAt: { type: 'string', format: 'date-time' },
          },
        },
        AzureAuthRequest: {
          type: 'object',
          required: ['code'],
          properties: {
            code: {
              type: 'string',
              description: 'Código de autorização retornado pelo Azure AD',
              example: 'azure-auth-code-123',
            },
          },
        },
        AzureAuthResponse: {
          type: 'object',
          properties: {
            accessToken: { type: 'string', description: 'Token JWT para acesso à API' },
            refreshToken: { type: 'string', description: 'Token para renovação' },
            expiresIn: { type: 'number', example: 86400 },
            user: { $ref: '#/components/schemas/User' },
            hospitals: {
              type: 'array',
              items: { $ref: '#/components/schemas/UserHospitalProfile' },
              description: 'Lista de hospitais e perfis do usuário',
            },
          },
        },
        SelectHospitalRequest: {
          type: 'object',
          required: ['hospitalId'],
          properties: {
            hospitalId: {
              type: 'string',
              description: 'ID do hospital selecionado',
              example: 'clu1234567890',
            },
          },
        },
        SelectHospitalResponse: {
          type: 'object',
          properties: {
            redirectUrl: {
              type: 'string',
              example: 'https://h9j-lazarus.healthchainsolutions.com.br/modules',
            },
            hospital: { $ref: '#/components/schemas/Hospital' },
            profiles: {
              type: 'array',
              items: { $ref: '#/components/schemas/Profile' },
            },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string', example: 'Erro ao processar requisição' },
            message: { type: 'string', example: 'Detalhes do erro' },
            statusCode: { type: 'number', example: 400 },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ['./src/routes/*.ts', './src/controllers/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
