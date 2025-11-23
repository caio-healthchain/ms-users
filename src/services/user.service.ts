import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export class UserService {
  /**
   * Buscar usuário por ID
   */
  async getUserById(userId: string) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          userHospitalProfiles: {
            where: { isActive: true },
            include: {
              hospital: true,
              profile: true,
            },
          },
        },
      });

      if (!user) {
        throw new Error('Usuário não encontrado');
      }

      return user;
    } catch (error: any) {
      logger.error('Erro ao buscar usuário:', error);
      throw new Error(`Erro ao buscar usuário: ${error.message}`);
    }
  }

  /**
   * Buscar usuário por email
   */
  async getUserByEmail(email: string) {
    try {
      const user = await prisma.user.findUnique({
        where: { email },
        include: {
          userHospitalProfiles: {
            where: { isActive: true },
            include: {
              hospital: true,
              profile: true,
            },
          },
        },
      });

      return user;
    } catch (error: any) {
      logger.error('Erro ao buscar usuário por email:', error);
      throw new Error(`Erro ao buscar usuário: ${error.message}`);
    }
  }

  /**
   * Buscar hospitais do usuário
   */
  async getUserHospitals(userId: string) {
    try {
      const userHospitalProfiles = await prisma.userHospitalProfile.findMany({
        where: {
          userId,
          isActive: true,
        },
        include: {
          hospital: true,
          profile: true,
        },
      });

      // Agrupar por hospital
      const hospitalsMap = new Map();

      userHospitalProfiles.forEach((uhp) => {
        const hospitalId = uhp.hospital.id;

        if (!hospitalsMap.has(hospitalId)) {
          hospitalsMap.set(hospitalId, {
            ...uhp.hospital,
            profiles: [],
          });
        }

        hospitalsMap.get(hospitalId).profiles.push(uhp.profile);
      });

      return Array.from(hospitalsMap.values());
    } catch (error: any) {
      logger.error('Erro ao buscar hospitais do usuário:', error);
      throw new Error(`Erro ao buscar hospitais: ${error.message}`);
    }
  }

  /**
   * Atualizar perfil do usuário
   */
  async updateUser(userId: string, data: {
    name?: string;
    phone?: string;
    avatar?: string;
  }) {
    try {
      const user = await prisma.user.update({
        where: { id: userId },
        data,
      });

      logger.info(`Usuário atualizado: ${userId}`);
      return user;
    } catch (error: any) {
      logger.error('Erro ao atualizar usuário:', error);
      throw new Error(`Erro ao atualizar usuário: ${error.message}`);
    }
  }

  /**
   * Conceder acesso de usuário a hospital com perfil
   */
  async grantHospitalAccess(
    userId: string,
    hospitalId: string,
    profileId: string,
    grantedBy: string
  ) {
    try {
      // Verificar se já existe
      const existing = await prisma.userHospitalProfile.findFirst({
        where: {
          userId,
          hospitalId,
          profileId,
        },
      });

      if (existing) {
        // Reativar se estava inativo
        if (!existing.isActive) {
          return await prisma.userHospitalProfile.update({
            where: { id: existing.id },
            data: {
              isActive: true,
              grantedBy,
              grantedAt: new Date(),
              revokedBy: null,
              revokedAt: null,
            },
          });
        }
        return existing;
      }

      // Criar novo acesso
      const access = await prisma.userHospitalProfile.create({
        data: {
          userId,
          hospitalId,
          profileId,
          grantedBy,
          isActive: true,
        },
        include: {
          user: true,
          hospital: true,
          profile: true,
        },
      });

      logger.info(`Acesso concedido: usuário ${userId} ao hospital ${hospitalId}`);
      return access;
    } catch (error: any) {
      logger.error('Erro ao conceder acesso:', error);
      throw new Error(`Erro ao conceder acesso: ${error.message}`);
    }
  }

  /**
   * Revogar acesso de usuário a hospital
   */
  async revokeHospitalAccess(
    userId: string,
    hospitalId: string,
    profileId: string,
    revokedBy: string
  ) {
    try {
      const access = await prisma.userHospitalProfile.findFirst({
        where: {
          userId,
          hospitalId,
          profileId,
          isActive: true,
        },
      });

      if (!access) {
        throw new Error('Acesso não encontrado');
      }

      await prisma.userHospitalProfile.update({
        where: { id: access.id },
        data: {
          isActive: false,
          revokedBy,
          revokedAt: new Date(),
        },
      });

      logger.info(`Acesso revogado: usuário ${userId} do hospital ${hospitalId}`);
    } catch (error: any) {
      logger.error('Erro ao revogar acesso:', error);
      throw new Error(`Erro ao revogar acesso: ${error.message}`);
    }
  }

  /**
   * Listar todos os usuários (admin)
   */
  async listUsers(filters?: {
    isActive?: boolean;
    hospitalId?: string;
    profileId?: string;
  }) {
    try {
      const where: any = {};

      if (filters?.isActive !== undefined) {
        where.isActive = filters.isActive;
      }

      if (filters?.hospitalId || filters?.profileId) {
        where.userHospitalProfiles = {
          some: {
            ...(filters.hospitalId && { hospitalId: filters.hospitalId }),
            ...(filters.profileId && { profileId: filters.profileId }),
            isActive: true,
          },
        };
      }

      const users = await prisma.user.findMany({
        where,
        include: {
          userHospitalProfiles: {
            where: { isActive: true },
            include: {
              hospital: true,
              profile: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return users;
    } catch (error: any) {
      logger.error('Erro ao listar usuários:', error);
      throw new Error(`Erro ao listar usuários: ${error.message}`);
    }
  }
}

export const userService = new UserService();
