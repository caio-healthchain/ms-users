import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const targetEmail = (process.env.IAM_PILOT_EMAIL || 'admin@lazarus.com').trim().toLowerCase();

try {
  const [userCount, activeUsersWithPassword, hospitals, profiles, pilot] = await Promise.all([
    prisma.user.count({ where: { isActive: true } }),
    prisma.user.count({ where: { isActive: true, passwordHash: { not: null } } }),
    prisma.hospital.findMany({ where: { isActive: true }, select: { id: true, code: true, name: true }, orderBy: { code: 'asc' } }),
    prisma.profile.findMany({ where: { isActive: true }, select: { id: true, code: true, name: true }, orderBy: { code: 'asc' } }),
    prisma.user.findUnique({
      where: { email: targetEmail },
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
        passwordHash: true,
        userHospitalProfiles: {
          where: { isActive: true },
          select: {
            hospital: { select: { id: true, code: true, name: true } },
            profile: { select: { id: true, code: true, name: true, allowedModules: true } },
          },
          orderBy: [{ hospital: { code: 'asc' } }, { profile: { code: 'asc' } }],
        },
      },
    }),
  ]);

  const result = {
    targetEmail,
    userCount,
    activeUsersWithPassword,
    activeHospitals: hospitals.map(({ id, ...safe }) => safe),
    activeProfiles: profiles.map(({ id, ...safe }) => safe),
    pilot: pilot
      ? {
          id: pilot.id,
          name: pilot.name,
          email: pilot.email,
          isActive: pilot.isActive,
          hasPasswordHash: Boolean(pilot.passwordHash),
          accessCount: pilot.userHospitalProfiles.length,
          accesses: pilot.userHospitalProfiles.map((access) => ({
            hospital: access.hospital.code,
            hospitalName: access.hospital.name,
            profile: access.profile.code,
            profileName: access.profile.name,
            allowedModules: access.profile.allowedModules,
          })),
        }
      : null,
  };

  console.log(JSON.stringify(result, null, 2));
} finally {
  await prisma.$disconnect();
}
