// ============================================================
// CoopManager - Associate Service (Fase 2)
// ============================================================

import prisma from '@/lib/prisma';
import { AUDIT_ACTIONS, MODULES } from '@/lib/constants';
import { createAuditLog } from './audit.service';
import { CreateAssociateInput, UpdateAssociateInput, BeneficiaryInput } from '@/lib/validations/schemas';

// ------------------------------------------------------------
// Generar número de asociado correlativo
// ------------------------------------------------------------
export async function generateAssociateNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `ASO-${year}-`;

  const lastAssociate = await prisma.associate.findFirst({
    where: { associateNumber: { startsWith: prefix } },
    orderBy: { associateNumber: 'desc' },
  });

  let nextNumber = 1;
  if (lastAssociate) {
    const lastNum = parseInt(lastAssociate.associateNumber.split('-').pop() || '0', 10);
    nextNumber = lastNum + 1;
  }

  return `${prefix}${String(nextNumber).padStart(4, '0')}`;
}

// ------------------------------------------------------------
// Obtener lista de asociados con búsqueda y paginación
// ------------------------------------------------------------
export async function getAssociates(params: {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
}) {
  const page = params.page || 1;
  const pageSize = Math.min(params.pageSize || 20, 100);
  const skip = (page - 1) * pageSize;

  const where: Record<string, unknown> = {};

  if (params.status) {
    where.status = params.status;
  }

  if (params.search) {
    where.OR = [
      { associateNumber: { contains: params.search, mode: 'insensitive' } },
      { person: { firstName: { contains: params.search, mode: 'insensitive' } } },
      { person: { lastName: { contains: params.search, mode: 'insensitive' } } },
      { person: { documentNumber: { contains: params.search, mode: 'insensitive' } } },
    ];
  }

  const [data, total] = await Promise.all([
    prisma.associate.findMany({
      where,
      include: {
        person: {
          select: {
            id: true,
            documentType: true,
            documentNumber: true,
            firstName: true,
            lastName: true,
            secondLastName: true,
            email: true,
            phone: true,
            mobilePhone: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.associate.count({ where }),
  ]);

  return {
    data,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

// ------------------------------------------------------------
// Obtener un asociado por ID con todo su detalle
// ------------------------------------------------------------
export async function getAssociateById(id: string) {
  return prisma.associate.findUnique({
    where: { id },
    include: {
      person: true,
      beneficiaries: {
        where: { isActive: true },
        orderBy: { createdAt: 'asc' },
      },
      documents: {
        orderBy: { uploadedAt: 'desc' },
      },
      history: {
        orderBy: { performedAt: 'desc' },
        take: 50,
      },
    },
  });
}

// ------------------------------------------------------------
// Crear asociado (persona + asociado + beneficiarios)
// ------------------------------------------------------------
export async function createAssociate(input: CreateAssociateInput, createdBy: string) {
  // Verificar que el documento no exista ya
  const existingPerson = await prisma.person.findUnique({
    where: { documentNumber: input.documentNumber },
  });
  if (existingPerson) {
    throw new Error('Ya existe una persona registrada con ese número de documento');
  }

  const associateNumber = await generateAssociateNumber();

  const associate = await prisma.$transaction(async (tx) => {
    // 1. Crear persona
    const person = await tx.person.create({
      data: {
        documentType: input.documentType,
        documentNumber: input.documentNumber,
        firstName: input.firstName,
        lastName: input.lastName,
        secondLastName: input.secondLastName || null,
        gender: input.gender || null,
        birthDate: input.birthDate ? new Date(input.birthDate) : null,
        maritalStatus: input.maritalStatus || null,
        email: input.email || null,
        phone: input.phone || null,
        mobilePhone: input.mobilePhone || null,
        address: input.address || null,
        city: input.city || null,
        department: input.department || null,
        housingType: input.housingType || null,
        occupation: input.occupation || null,
        employer: input.employer || null,
        jobTitle: input.jobTitle || null,
        monthlyIncome: input.monthlyIncome || null,
        createdBy,
        updatedBy: createdBy,
      },
    });

    // 2. Crear asociado
    const newAssociate = await tx.associate.create({
      data: {
        personId: person.id,
        associateNumber,
        status: 'PENDIENTE',
        observations: input.observations || null,
        createdBy,
        updatedBy: createdBy,
      },
    });

    // 3. Crear beneficiarios si vienen
    if (input.beneficiaries && input.beneficiaries.length > 0) {
      await tx.beneficiary.createMany({
        data: input.beneficiaries.map((b) => ({
          associateId: newAssociate.id,
          fullName: b.fullName,
          relationship: b.relationship,
          percentage: b.percentage,
          phone: b.phone || null,
        })),
      });
    }

    // 4. Crear historial de creación
    await tx.associateHistory.create({
      data: {
        associateId: newAssociate.id,
        action: 'CREACION',
        newStatus: 'PENDIENTE',
        details: `Asociado ${associateNumber} registrado: ${input.firstName} ${input.lastName}`,
        performedBy: createdBy,
      },
    });

    return newAssociate;
  });

  await createAuditLog({
    userId: createdBy,
    action: AUDIT_ACTIONS.CREATE,
    module: MODULES.ASSOCIATES,
    entity: 'Associate',
    entityId: associate.id,
    dataAfter: {
      associateNumber,
      documentNumber: input.documentNumber,
      firstName: input.firstName,
      lastName: input.lastName,
    },
    details: `Asociado creado: ${associateNumber} - ${input.firstName} ${input.lastName}`,
  });

  return associate;
}

// ------------------------------------------------------------
// Actualizar un asociado (persona + datos de asociado)
// ------------------------------------------------------------
export async function updateAssociate(id: string, input: UpdateAssociateInput, updatedBy: string) {
  const existing = await prisma.associate.findUnique({
    where: { id },
    include: { person: true },
  });
  if (!existing) {
    throw new Error('Asociado no encontrado');
  }

  // Verificar documento si cambia
  if (input.documentNumber && input.documentNumber !== existing.person.documentNumber) {
    const docTaken = await prisma.person.findUnique({ where: { documentNumber: input.documentNumber } });
    if (docTaken) {
      throw new Error('Ya existe una persona con ese número de documento');
    }
  }

  await prisma.$transaction(async (tx) => {
    // 1. Actualizar persona
    const personData: Record<string, unknown> = { updatedBy };
    if (input.documentType !== undefined) personData.documentType = input.documentType;
    if (input.documentNumber !== undefined) personData.documentNumber = input.documentNumber;
    if (input.firstName !== undefined) personData.firstName = input.firstName;
    if (input.lastName !== undefined) personData.lastName = input.lastName;
    if (input.secondLastName !== undefined) personData.secondLastName = input.secondLastName;
    if (input.gender !== undefined) personData.gender = input.gender;
    if (input.birthDate !== undefined) personData.birthDate = input.birthDate ? new Date(input.birthDate) : null;
    if (input.maritalStatus !== undefined) personData.maritalStatus = input.maritalStatus;
    if (input.email !== undefined) personData.email = input.email || null;
    if (input.phone !== undefined) personData.phone = input.phone;
    if (input.mobilePhone !== undefined) personData.mobilePhone = input.mobilePhone;
    if (input.address !== undefined) personData.address = input.address;
    if (input.city !== undefined) personData.city = input.city;
    if (input.department !== undefined) personData.department = input.department;
    if (input.housingType !== undefined) personData.housingType = input.housingType;
    if (input.occupation !== undefined) personData.occupation = input.occupation;
    if (input.employer !== undefined) personData.employer = input.employer;
    if (input.jobTitle !== undefined) personData.jobTitle = input.jobTitle;
    if (input.monthlyIncome !== undefined) personData.monthlyIncome = input.monthlyIncome;

    await tx.person.update({
      where: { id: existing.personId },
      data: personData,
    });

    // 2. Actualizar datos del asociado
    const associateData: Record<string, unknown> = { updatedBy };
    if (input.observations !== undefined) associateData.observations = input.observations;

    await tx.associate.update({
      where: { id },
      data: associateData,
    });

    // 3. Registrar en historial
    await tx.associateHistory.create({
      data: {
        associateId: id,
        action: 'ACTUALIZACION',
        details: `Datos actualizados por el usuario`,
        performedBy: updatedBy,
      },
    });
  });

  await createAuditLog({
    userId: updatedBy,
    action: AUDIT_ACTIONS.UPDATE,
    module: MODULES.ASSOCIATES,
    entity: 'Associate',
    entityId: id,
    dataBefore: { firstName: existing.person.firstName, lastName: existing.person.lastName },
    dataAfter: input,
    details: `Asociado actualizado: ${existing.associateNumber}`,
  });

  return getAssociateById(id);
}

// ------------------------------------------------------------
// Cambiar estado de un asociado
// ------------------------------------------------------------
export async function changeAssociateStatus(
  id: string,
  status: string,
  reason: string | null | undefined,
  performedBy: string
) {
  const existing = await prisma.associate.findUnique({
    where: { id },
    include: { person: true },
  });
  if (!existing) {
    throw new Error('Asociado no encontrado');
  }

  const previousStatus = existing.status;

  await prisma.$transaction(async (tx) => {
    const updateData: Record<string, unknown> = {
      status,
      updatedBy: performedBy,
    };

    // Si se activa, establecer fecha de admisión
    if (status === 'ACTIVO' && !existing.admissionDate) {
      updateData.admissionDate = new Date();
    }

    // Si se retira, establecer fecha y razón
    if (status === 'RETIRADO') {
      updateData.withdrawalDate = new Date();
      updateData.withdrawalReason = reason || null;
    }

    await tx.associate.update({
      where: { id },
      data: updateData,
    });

    await tx.associateHistory.create({
      data: {
        associateId: id,
        action: 'CAMBIO_ESTADO',
        previousStatus,
        newStatus: status,
        details: reason || `Estado cambiado de ${previousStatus} a ${status}`,
        performedBy,
      },
    });
  });

  // Determinar acción de auditoría
  let auditAction: string = AUDIT_ACTIONS.STATUS_CHANGE;
  if (status === 'ACTIVO' && previousStatus === 'PENDIENTE') auditAction = AUDIT_ACTIONS.ADMISSION;
  if (status === 'RETIRADO') auditAction = AUDIT_ACTIONS.WITHDRAWAL;
  if (status === 'SUSPENDIDO') auditAction = AUDIT_ACTIONS.SUSPENSION;
  if (status === 'ACTIVO' && previousStatus !== 'PENDIENTE') auditAction = AUDIT_ACTIONS.REACTIVATION;

  await createAuditLog({
    userId: performedBy,
    action: auditAction,
    module: MODULES.ASSOCIATES,
    entity: 'Associate',
    entityId: id,
    dataBefore: { status: previousStatus },
    dataAfter: { status },
    details: `${existing.associateNumber}: ${previousStatus} → ${status}`,
  });

  return getAssociateById(id);
}

// ------------------------------------------------------------
// Agregar beneficiario
// ------------------------------------------------------------
export async function addBeneficiary(associateId: string, input: BeneficiaryInput, performedBy: string) {
  const associate = await prisma.associate.findUnique({ where: { id: associateId } });
  if (!associate) throw new Error('Asociado no encontrado');

  // Verificar que la suma de porcentajes no exceda 100
  const existingBeneficiaries = await prisma.beneficiary.findMany({
    where: { associateId, isActive: true },
  });
  const totalPercentage = existingBeneficiaries.reduce(
    (sum, b) => sum + Number(b.percentage),
    0
  );
  if (totalPercentage + input.percentage > 100) {
    throw new Error(`La suma de porcentajes excedería 100% (actual: ${totalPercentage}%)`);
  }

  const beneficiary = await prisma.beneficiary.create({
    data: {
      associateId,
      fullName: input.fullName,
      relationship: input.relationship,
      percentage: input.percentage,
      phone: input.phone || null,
    },
  });

  await createAuditLog({
    userId: performedBy,
    action: AUDIT_ACTIONS.CREATE,
    module: MODULES.ASSOCIATES,
    entity: 'Beneficiary',
    entityId: beneficiary.id,
    dataAfter: input,
    details: `Beneficiario agregado: ${input.fullName} (${input.percentage}%)`,
  });

  return beneficiary;
}

// ------------------------------------------------------------
// Eliminar (desactivar) beneficiario
// ------------------------------------------------------------
export async function removeBeneficiary(beneficiaryId: string, performedBy: string) {
  const beneficiary = await prisma.beneficiary.findUnique({ where: { id: beneficiaryId } });
  if (!beneficiary) throw new Error('Beneficiario no encontrado');

  await prisma.beneficiary.update({
    where: { id: beneficiaryId },
    data: { isActive: false },
  });

  await createAuditLog({
    userId: performedBy,
    action: AUDIT_ACTIONS.DELETE,
    module: MODULES.ASSOCIATES,
    entity: 'Beneficiary',
    entityId: beneficiaryId,
    details: `Beneficiario eliminado: ${beneficiary.fullName}`,
  });
}
