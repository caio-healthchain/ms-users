import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

dotenv.config();
dotenv.config({ path: '.env.iam-pilot', override: false });

const prisma = new PrismaClient();

const required = (name) => {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(`Variável obrigatória ausente: ${name}`);
  }
  return value.trim();
};

const pilot = {
  id: process.env.PILOT_USER_ID?.trim() || 'user_caio_amaral_pilot_001',
  name: process.env.PILOT_USER_NAME?.trim() || 'Caio Amaral',
  email: process.env.PILOT_USER_EMAIL?.trim().toLowerCase() || 'caio.amaral',
  password: required('PILOT_USER_PASSWORD'),
  hospitalCode: process.env.PILOT_HOSPITAL_CODE?.trim() || 'h9j',
  profileCodes: (process.env.PILOT_PROFILE_CODES?.trim() || 'GERENCIAL,AUDITOR,ANALISTA')
    .split(',')
    .map((code) => code.trim().toUpperCase())
    .filter(Boolean),
  ensureSeedReferences: process.env.PILOT_ENSURE_REFERENCES?.trim().toLowerCase() !== 'false',
};

const referenceProfiles = {
  GERENCIAL: {
    id: 'profile_gerencial_001',
    name: 'Gestor/Diretor',
    description: 'Perfil para gestores e diretores hospitalares com acesso ao dashboard executivo e IA especializada',
    allowedModules: ['gerencial'],
    permissions: {
      viewDashboard: true,
      accessAI: true,
      viewReports: true,
      manageContracts: true,
    },
  },
  AUDITOR: {
    id: 'profile_auditor_002',
    name: 'Auditor Médico',
    description: 'Perfil para auditores médicos com acesso ao sistema de auditoria e enquadramento de porte',
    allowedModules: ['auditor', 'gerencial'],
    permissions: {
      viewPatients: true,
      auditProcedures: true,
      approveReject: true,
      viewReports: true,
    },
  },
  ANALISTA: {
    id: 'profile_analista_003',
    name: 'Analista de Conformidade',
    description: 'Perfil para analistas responsáveis por checklist de documentação e validação de XMLs',
    allowedModules: ['analista'],
    permissions: {
      validateXML: true,
      checkDocuments: true,
      managePendencies: true,
    },
  },
};

const referenceHospitals = {
  h9j: {
    id: 'hospital_h9j_001',
    name: 'Hospital 9 de Julho',
    cnpj: '61.600.839/0001-55',
    subdomain: 'h9j-lazarus',
    customDomain: null,
    azureTenantId: null,
    logoUrl: 'https://cdn.hospital9dejulho.com.br/logo.png',
    primaryColor: '#1E40AF',
  },
  hsl: {
    id: 'hospital_hsl_002',
    name: 'Hospital Sírio-Libanês',
    cnpj: '62.780.278/0001-00',
    subdomain: 'hsl-lazarus',
    customDomain: null,
    azureTenantId: null,
    logoUrl: 'https://cdn.hospitalsiriolibanes.org.br/logo.png',
    primaryColor: '#0F766E',
  },
  demo: {
    id: 'hospital_demo_003',
    name: 'Hospital Demo (Testes)',
    cnpj: '00.000.000/0001-00',
    subdomain: 'demo-lazarus',
    customDomain: null,
    azureTenantId: null,
    logoUrl: null,
    primaryColor: '#7C3AED',
  },
};

const mask = (value) => `${value.slice(0, 3)}***${value.slice(-3)}`;

async function ensureReferences(tx) {
  if (!pilot.ensureSeedReferences) {
    return { createdOrUpdatedHospital: false, createdOrUpdatedProfiles: [] };
  }

  const hospitalReference = referenceHospitals[pilot.hospitalCode];
  if (!hospitalReference) {
    throw new Error(`Hospital ${pilot.hospitalCode} não possui referência segura no script. Informe um hospital existente ou adicione referência explicitamente.`);
  }

  const hospital = await tx.hospital.upsert({
    where: { code: pilot.hospitalCode },
    create: {
      id: hospitalReference.id,
      code: pilot.hospitalCode,
      name: hospitalReference.name,
      cnpj: hospitalReference.cnpj,
      subdomain: hospitalReference.subdomain,
      customDomain: hospitalReference.customDomain,
      azureTenantId: hospitalReference.azureTenantId,
      logoUrl: hospitalReference.logoUrl,
      primaryColor: hospitalReference.primaryColor,
      isActive: true,
    },
    update: {
      isActive: true,
      deletedAt: null,
    },
  });

  const profiles = [];
  for (const code of pilot.profileCodes) {
    const reference = referenceProfiles[code];
    if (!reference) {
      throw new Error(`Perfil ${code} não possui referência segura no script. Informe um perfil existente ou adicione referência explicitamente.`);
    }

    profiles.push(await tx.profile.upsert({
      where: { code },
      create: {
        id: reference.id,
        code,
        name: reference.name,
        description: reference.description,
        allowedModules: reference.allowedModules,
        permissions: reference.permissions,
        isActive: true,
      },
      update: {
        isActive: true,
      },
    }));
  }

  return {
    hospital,
    profiles,
    createdOrUpdatedHospital: true,
    createdOrUpdatedProfiles: profiles.map((profile) => profile.code),
  };
}

async function main() {
  if (pilot.password.length < 12) {
    throw new Error('PILOT_USER_PASSWORD deve ter pelo menos 12 caracteres.');
  }

  const passwordHash = await bcrypt.hash(pilot.password, 12);

  const result = await prisma.$transaction(async (tx) => {
    const referenceResult = await ensureReferences(tx);

    const hospital = await tx.hospital.findFirst({
      where: {
        code: pilot.hospitalCode,
        isActive: true,
        deletedAt: null,
      },
    });

    if (!hospital) {
      throw new Error(`Hospital ativo não encontrado para code=${pilot.hospitalCode}`);
    }

    const profiles = await tx.profile.findMany({
      where: {
        code: { in: pilot.profileCodes },
        isActive: true,
      },
      orderBy: { code: 'asc' },
    });

    const foundProfileCodes = new Set(profiles.map((profile) => profile.code));
    const missingProfileCodes = pilot.profileCodes.filter((code) => !foundProfileCodes.has(code));
    if (missingProfileCodes.length > 0) {
      throw new Error(`Perfis ativos não encontrados: ${missingProfileCodes.join(', ')}`);
    }

    const user = await tx.user.upsert({
      where: { email: pilot.email },
      create: {
        id: pilot.id,
        name: pilot.name,
        email: pilot.email,
        passwordHash,
        isActive: true,
      },
      update: {
        name: pilot.name,
        passwordHash,
        isActive: true,
        deletedAt: null,
      },
    });

    const grants = [];
    for (const profile of profiles) {
      const existing = await tx.userHospitalProfile.findFirst({
        where: {
          userId: user.id,
          hospitalId: hospital.id,
          profileId: profile.id,
        },
      });

      if (existing) {
        grants.push(await tx.userHospitalProfile.update({
          where: { id: existing.id },
          data: {
            isActive: true,
            grantedBy: 'iam-create-pilot-user',
            grantedAt: new Date(),
            revokedBy: null,
            revokedAt: null,
          },
          include: { profile: true, hospital: true },
        }));
      } else {
        grants.push(await tx.userHospitalProfile.create({
          data: {
            id: `uhp_caio_amaral_${hospital.code}_${profile.code.toLowerCase()}`,
            userId: user.id,
            hospitalId: hospital.id,
            profileId: profile.id,
            isActive: true,
            grantedBy: 'iam-create-pilot-user',
          },
          include: { profile: true, hospital: true },
        }));
      }
    }

    return { user, hospital, grants, referenceResult };
  });

  console.log(JSON.stringify({
    ok: true,
    action: 'iam_pilot_user_upserted',
    referenceBootstrap: {
      enabled: pilot.ensureSeedReferences,
      hospitalCode: result.referenceResult.hospital?.code || pilot.hospitalCode,
      profileCodes: result.referenceResult.createdOrUpdatedProfiles || [],
    },
    user: {
      id: result.user.id,
      name: result.user.name,
      email: result.user.email,
      emailMasked: mask(result.user.email),
      isActive: result.user.isActive,
      hasPasswordHash: Boolean(result.user.passwordHash),
    },
    hospital: {
      id: result.hospital.id,
      code: result.hospital.code,
      name: result.hospital.name,
    },
    profiles: result.grants.map((grant) => ({
      code: grant.profile.code,
      name: grant.profile.name,
      isActive: grant.isActive,
    })),
  }, null, 2));
}

main()
  .catch((error) => {
    console.error(JSON.stringify({
      ok: false,
      action: 'iam_pilot_user_upsert_failed',
      message: error.message,
    }, null, 2));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
