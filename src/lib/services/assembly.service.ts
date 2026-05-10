// ============================================================
// CoopManager - Assemblies & Voting Service (Fase I)
// ============================================================

import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { AUDIT_ACTIONS, MODULES } from '@/lib/constants';
import { createAuditLog } from './audit.service';
import {
  AssemblyStatusInput,
  AssemblyVoteStatusInput,
  CastAssemblyBallotInput,
  CreateAssemblyInput,
  CreateAssemblyVoteInput,
} from '@/lib/validations/schemas';

function toNumber(value: Prisma.Decimal | number | string | null | undefined): number {
  if (value === null || value === undefined) return 0;
  return Number(value);
}

export async function generateAssemblyCode(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `ASM-${year}-`;
  const last = await prisma.assembly.findFirst({
    where: { code: { startsWith: prefix } },
    orderBy: { code: 'desc' },
  });
  const next = last ? parseInt(last.code.split('-').pop() || '0', 10) + 1 : 1;
  return `${prefix}${String(next).padStart(4, '0')}`;
}

function voteResults(vote: {
  options: Array<{ id: string; label: string; sortOrder: number }>;
  ballots: Array<{ optionId: string; weight: Prisma.Decimal }>;
}) {
  const totalWeight = vote.ballots.reduce((sum, ballot) => sum + toNumber(ballot.weight), 0);
  return vote.options
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((option) => {
      const optionWeight = vote.ballots
        .filter((ballot) => ballot.optionId === option.id)
        .reduce((sum, ballot) => sum + toNumber(ballot.weight), 0);
      return {
        optionId: option.id,
        label: option.label,
        votes: vote.ballots.filter((ballot) => ballot.optionId === option.id).length,
        weight: optionWeight,
        percent: totalWeight > 0 ? Math.round((optionWeight / totalWeight) * 10000) / 100 : 0,
      };
    });
}

function withAssemblyStats<T extends {
  attendances: Array<{ status: string }>;
  votes: Array<{
    id: string;
    options: Array<{ id: string; label: string; sortOrder: number }>;
    ballots: Array<{ optionId: string; weight: Prisma.Decimal }>;
  }>;
}>(assembly: T) {
  const enabled = assembly.attendances.length;
  const present = assembly.attendances.filter((item) => item.status === 'PRESENTE').length;
  return {
    ...assembly,
    stats: {
      enabled,
      present,
      quorumPercent: enabled > 0 ? Math.round((present / enabled) * 10000) / 100 : 0,
      votesCount: assembly.votes.length,
    },
    votes: assembly.votes.map((vote) => ({
      ...vote,
      results: voteResults(vote),
      totalBallots: vote.ballots.length,
    })),
  };
}

export async function getAssemblies(params: { page?: number; pageSize?: number; status?: string; search?: string } = {}) {
  const page = params.page || 1;
  const pageSize = Math.min(params.pageSize || 20, 100);
  const skip = (page - 1) * pageSize;
  const where: Prisma.AssemblyWhereInput = {};
  if (params.status) where.status = params.status;
  if (params.search) {
    where.OR = [
      { code: { contains: params.search, mode: 'insensitive' } },
      { title: { contains: params.search, mode: 'insensitive' } },
    ];
  }

  const [data, total] = await Promise.all([
    prisma.assembly.findMany({
      where,
      include: {
        attendances: { select: { status: true } },
        votes: { include: { options: true, ballots: true }, orderBy: { createdAt: 'desc' } },
      },
      orderBy: { scheduledAt: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.assembly.count({ where }),
  ]);

  return { data: data.map(withAssemblyStats), total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

export async function getAssemblyById(id: string) {
  const assembly = await prisma.assembly.findUnique({
    where: { id },
    include: {
      agendaItems: { orderBy: { itemNumber: 'asc' } },
      attendances: {
        include: {
          associate: {
            include: { person: { select: { firstName: true, lastName: true, secondLastName: true, documentNumber: true } } },
          },
        },
        orderBy: { createdAt: 'asc' },
      },
      votes: {
        include: { options: true, ballots: true, agendaItem: true },
        orderBy: { createdAt: 'desc' },
      },
    },
  });
  return assembly ? withAssemblyStats(assembly) : null;
}

export async function createAssembly(input: CreateAssemblyInput, createdBy: string) {
  const code = await generateAssemblyCode();
  const assembly = await prisma.assembly.create({
    data: {
      code,
      title: input.title,
      assemblyType: input.assemblyType,
      scheduledAt: new Date(input.scheduledAt),
      location: input.location || null,
      quorumRequired: input.quorumRequired,
      description: input.description || null,
      createdBy,
      agendaItems: {
        create: input.agendaItems.map((item, index) => ({
          itemNumber: index + 1,
          title: item.title,
          description: item.description || null,
          requiresVote: item.requiresVote,
          createdBy,
        })),
      },
    },
  });

  await createAuditLog({
    userId: createdBy,
    action: AUDIT_ACTIONS.ASSEMBLY_CREATE,
    module: MODULES.ASSEMBLIES,
    entity: 'Assembly',
    entityId: assembly.id,
    dataAfter: { code, title: input.title },
    details: `Asamblea ${code} creada`,
  });

  return getAssemblyById(assembly.id);
}

export async function updateAssemblyStatus(id: string, input: AssemblyStatusInput, updatedBy: string) {
  const current = await prisma.assembly.findUnique({ where: { id } });
  if (!current) throw new Error('Asamblea no encontrada');

  const assembly = await prisma.assembly.update({
    where: { id },
    data: {
      status: input.status,
      openedAt: input.status === 'ABIERTA' ? new Date() : current.openedAt,
      closedAt: input.status === 'CERRADA' ? new Date() : current.closedAt,
      updatedBy,
    },
  });

  await createAuditLog({
    userId: updatedBy,
    action: AUDIT_ACTIONS.ASSEMBLY_STATUS_CHANGE,
    module: MODULES.ASSEMBLIES,
    entity: 'Assembly',
    entityId: id,
    dataBefore: { status: current.status },
    dataAfter: { status: assembly.status },
    details: `Asamblea ${current.code} cambio a ${assembly.status}`,
  });

  return getAssemblyById(id);
}

export async function enableActiveAssociates(assemblyId: string, createdBy: string) {
  const assembly = await prisma.assembly.findUnique({ where: { id: assemblyId } });
  if (!assembly) throw new Error('Asamblea no encontrada');
  const associates = await prisma.associate.findMany({ where: { status: 'ACTIVO' }, select: { id: true } });

  for (const associate of associates) {
    await prisma.assemblyAttendance.upsert({
      where: { assemblyId_associateId: { assemblyId, associateId: associate.id } },
      update: { status: 'HABILITADO', updatedBy: createdBy },
      create: { assemblyId, associateId: associate.id, status: 'HABILITADO', createdBy },
    });
  }

  await createAuditLog({
    userId: createdBy,
    action: AUDIT_ACTIONS.ASSEMBLY_ENABLE_ATTENDANCE,
    module: MODULES.ASSEMBLIES,
    entity: 'Assembly',
    entityId: assemblyId,
    dataAfter: { enabled: associates.length },
    details: `Asamblea ${assembly.code}: ${associates.length} asociados habilitados`,
  });

  return getAssemblyById(assemblyId);
}

export async function createAssemblyVote(assemblyId: string, input: CreateAssemblyVoteInput, createdBy: string) {
  const assembly = await prisma.assembly.findUnique({ where: { id: assemblyId } });
  if (!assembly) throw new Error('Asamblea no encontrada');
  if (assembly.status === 'CERRADA' || assembly.status === 'CANCELADA') {
    throw new Error('No se pueden crear votaciones en una asamblea cerrada o cancelada');
  }

  const vote = await prisma.assemblyVote.create({
    data: {
      assemblyId,
      agendaItemId: input.agendaItemId || null,
      title: input.title,
      description: input.description || null,
      voteType: input.voteType,
      isSecret: input.isSecret,
      createdBy,
      options: {
        create: input.options.map((label, index) => ({ label, sortOrder: index + 1 })),
      },
    },
    include: { options: true, ballots: true },
  });

  await createAuditLog({
    userId: createdBy,
    action: AUDIT_ACTIONS.ASSEMBLY_VOTE_CREATE,
    module: MODULES.ASSEMBLIES,
    entity: 'AssemblyVote',
    entityId: vote.id,
    dataAfter: { assemblyId, title: vote.title },
    details: `Votacion creada en asamblea ${assembly.code}`,
  });

  return vote;
}

export async function updateAssemblyVoteStatus(voteId: string, input: AssemblyVoteStatusInput, updatedBy: string) {
  const current = await prisma.assemblyVote.findUnique({ where: { id: voteId }, include: { assembly: true } });
  if (!current) throw new Error('Votacion no encontrada');

  const vote = await prisma.assemblyVote.update({
    where: { id: voteId },
    data: {
      status: input.status,
      openedAt: input.status === 'ABIERTA' ? new Date() : current.openedAt,
      closedAt: input.status === 'CERRADA' ? new Date() : current.closedAt,
      updatedBy,
    },
  });

  await createAuditLog({
    userId: updatedBy,
    action: AUDIT_ACTIONS.ASSEMBLY_VOTE_STATUS_CHANGE,
    module: MODULES.ASSEMBLIES,
    entity: 'AssemblyVote',
    entityId: voteId,
    dataBefore: { status: current.status },
    dataAfter: { status: vote.status },
    details: `Votacion ${current.title} cambio a ${vote.status}`,
  });

  return getAssemblyById(current.assemblyId);
}

export async function castAssemblyBallot(voteId: string, input: CastAssemblyBallotInput, castBy: string) {
  const vote = await prisma.assemblyVote.findUnique({
    where: { id: voteId },
    include: { assembly: true, options: true },
  });
  if (!vote) throw new Error('Votacion no encontrada');
  if (vote.status !== 'ABIERTA') throw new Error('La votacion no esta abierta');
  if (vote.assembly.status !== 'ABIERTA') throw new Error('La asamblea no esta abierta');
  if (!vote.options.some((option) => option.id === input.optionId)) throw new Error('Opcion no valida para esta votacion');

  const attendance = await prisma.assemblyAttendance.findUnique({
    where: { assemblyId_associateId: { assemblyId: vote.assemblyId, associateId: input.associateId } },
  });
  if (!attendance || !['HABILITADO', 'PRESENTE'].includes(attendance.status)) {
    throw new Error('El asociado no esta habilitado para votar en esta asamblea');
  }

  const ballot = await prisma.$transaction(async (tx) => {
    await tx.assemblyAttendance.update({
      where: { id: attendance.id },
      data: { status: 'PRESENTE', checkedInAt: attendance.checkedInAt || new Date(), updatedBy: castBy },
    });
    return tx.assemblyBallot.create({
      data: {
        voteId,
        optionId: input.optionId,
        associateId: input.associateId,
        weight: attendance.votingWeight,
        castBy,
      },
    });
  });

  await createAuditLog({
    userId: castBy,
    action: AUDIT_ACTIONS.ASSEMBLY_BALLOT_CAST,
    module: MODULES.ASSEMBLIES,
    entity: 'AssemblyBallot',
    entityId: ballot.id,
    dataAfter: { voteId, associateId: input.associateId },
    details: `Voto registrado en ${vote.title}`,
  });

  return getAssemblyById(vote.assemblyId);
}
