// ============================================================
// CoopManager - Report Export Service (Fase G)
// ============================================================

import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { AUDIT_ACTIONS, MODULES } from '@/lib/constants';
import { createAuditLog } from './audit.service';
import { ReportExportInput, TaxCertificateInput } from '@/lib/validations/schemas';

type ReportFormat = 'csv' | 'excel' | 'pdf';
type ReportValue = string | number;
type ReportRow = Record<string, ReportValue>;

type GeneratedFile = {
  fileName: string;
  mimeType: string;
  content: string | Uint8Array<ArrayBuffer>;
};

type ReportDefinition = {
  title: string;
  filePrefix: string;
  columns: string[];
  rows: ReportRow[];
};

function toNumber(value: Prisma.Decimal | number | string | null | undefined): number {
  if (value === null || value === undefined) return 0;
  return Number(value);
}

function formatDate(value: Date | string | null | undefined): string {
  if (!value) return '';
  return new Date(value).toLocaleDateString('es-CO');
}

function formatCurrency(value: Prisma.Decimal | number | string | null | undefined): string {
  return toNumber(value).toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fullName(person: { firstName: string; lastName: string; secondLastName?: string | null }): string {
  return `${person.firstName} ${person.lastName} ${person.secondLastName || ''}`.trim();
}

function dateRange(input: { dateFrom?: string | null; dateTo?: string | null }) {
  const range: { gte?: Date; lte?: Date } = {};
  if (input.dateFrom) range.gte = new Date(`${input.dateFrom}T00:00:00`);
  if (input.dateTo) range.lte = new Date(`${input.dateTo}T23:59:59`);
  return Object.keys(range).length > 0 ? range : undefined;
}

function escapeCsv(value: ReportValue): string {
  return `"${String(value).replace(/"/g, '""')}"`;
}

function escapeXml(value: ReportValue): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function pdfSafe(value: ReportValue): string {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, '')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

function generateCsv(definition: ReportDefinition): string {
  const lines = [
    definition.columns.map(escapeCsv).join(';'),
    ...definition.rows.map((row) => definition.columns.map((column) => escapeCsv(row[column] ?? '')).join(';')),
  ];
  return `\uFEFF${lines.join('\r\n')}\r\n`;
}

function generateExcelXml(definition: ReportDefinition): string {
  const headerCells = definition.columns
    .map((column) => `<Cell><Data ss:Type="String">${escapeXml(column)}</Data></Cell>`)
    .join('');
  const rows = definition.rows
    .map((row) => {
      const cells = definition.columns
        .map((column) => {
          const value = row[column] ?? '';
          const type = typeof value === 'number' ? 'Number' : 'String';
          return `<Cell><Data ss:Type="${type}">${escapeXml(value)}</Data></Cell>`;
        })
        .join('');
      return `<Row>${cells}</Row>`;
    })
    .join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Worksheet ss:Name="Reporte">
  <Table>
   <Row>${headerCells}</Row>
   ${rows}
  </Table>
 </Worksheet>
</Workbook>`;
}

function generatePdf(definition: ReportDefinition): Uint8Array<ArrayBuffer> {
  const lines = [
    definition.title,
    `Generado: ${formatDate(new Date())}`,
    '',
    definition.columns.join(' | '),
    ...definition.rows.map((row) => definition.columns.map((column) => String(row[column] ?? '')).join(' | ')),
  ];

  const pages: string[] = [];
  for (let i = 0; i < lines.length; i += 42) {
    const pageLines = lines.slice(i, i + 42);
    const commands = ['BT', '/F1 10 Tf', '50 790 Td'];
    pageLines.forEach((line, index) => {
      if (index > 0) commands.push('0 -17 Td');
      commands.push(`(${pdfSafe(line).slice(0, 125)}) Tj`);
    });
    commands.push('ET');
    pages.push(commands.join('\n'));
  }

  const objects: string[] = [''];
  const pageObjectIds: number[] = [];
  objects.push('<< /Type /Catalog /Pages 2 0 R >>');
  objects.push('');

  pages.forEach((content) => {
    const contentObjectId = objects.length;
    objects.push(`<< /Length ${Buffer.byteLength(content, 'latin1')} >>\nstream\n${content}\nendstream`);
    const pageObjectId = objects.length;
    pageObjectIds.push(pageObjectId);
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] /Resources << /Font << /F1 ${objects.length + 1} 0 R >> >> /Contents ${contentObjectId} 0 R >>`);
    objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  });

  objects[2] = `<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageObjectIds.length} >>`;

  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  for (let id = 1; id < objects.length; id += 1) {
    offsets[id] = Buffer.byteLength(pdf, 'latin1');
    pdf += `${id} 0 obj\n${objects[id]}\nendobj\n`;
  }
  const xrefOffset = Buffer.byteLength(pdf, 'latin1');
  pdf += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  for (let id = 1; id < objects.length; id += 1) {
    pdf += `${String(offsets[id]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Uint8Array.from(Buffer.from(pdf, 'latin1'));
}

function buildGeneratedFile(definition: ReportDefinition, format: ReportFormat): GeneratedFile {
  const date = new Date().toISOString().slice(0, 10);
  if (format === 'csv') {
    return {
      fileName: `${definition.filePrefix}_${date}.csv`,
      mimeType: 'text/csv; charset=utf-8',
      content: generateCsv(definition),
    };
  }
  if (format === 'excel') {
    return {
      fileName: `${definition.filePrefix}_${date}.xls`,
      mimeType: 'application/vnd.ms-excel; charset=utf-8',
      content: generateExcelXml(definition),
    };
  }
  return {
    fileName: `${definition.filePrefix}_${date}.pdf`,
    mimeType: 'application/pdf',
    content: generatePdf(definition),
  };
}

async function buildAssociatesReport(input: ReportExportInput): Promise<ReportDefinition> {
  const where: Prisma.AssociateWhereInput = {};
  if (input.status) where.status = input.status;

  const rows = await prisma.associate.findMany({
    where,
    include: { person: true },
    orderBy: { associateNumber: 'asc' },
    take: 10000,
  });

  const columns = ['No. Asociado', 'Documento', 'Nombre', 'Email', 'Telefono', 'Estado', 'Fecha Registro'];
  return {
    title: 'Reporte de Asociados',
    filePrefix: 'reporte_asociados',
    columns,
    rows: rows.map((row) => ({
      'No. Asociado': row.associateNumber,
      Documento: `${row.person.documentType} ${row.person.documentNumber}`,
      Nombre: fullName(row.person),
      Email: row.person.email || '',
      Telefono: row.person.mobilePhone || row.person.phone || '',
      Estado: row.status,
      'Fecha Registro': formatDate(row.createdAt),
    })),
  };
}

async function buildContributionsReport(input: ReportExportInput): Promise<ReportDefinition> {
  const where: Prisma.ContributionWhereInput = {};
  if (input.type) where.type = input.type;
  const range = dateRange(input);
  if (range) where.createdAt = range;

  const rows = await prisma.contribution.findMany({
    where,
    include: { associate: { include: { person: true } } },
    orderBy: { createdAt: 'desc' },
    take: 10000,
  });

  const columns = ['Fecha', 'No. Asociado', 'Nombre', 'Tipo', 'Monto', 'Metodo Pago', 'Referencia', 'Estado'];
  return {
    title: 'Reporte de Aportes',
    filePrefix: 'reporte_aportes',
    columns,
    rows: rows.map((row) => ({
      Fecha: formatDate(row.createdAt),
      'No. Asociado': row.associate.associateNumber,
      Nombre: fullName(row.associate.person),
      Tipo: row.type,
      Monto: formatCurrency(row.amount),
      'Metodo Pago': row.paymentMethod || '',
      Referencia: row.reference || '',
      Estado: row.status,
    })),
  };
}

async function buildCreditsReport(input: ReportExportInput): Promise<ReportDefinition> {
  const where: Prisma.CreditWhereInput = {};
  if (input.report === 'overdue') where.status = 'VENCIDO';
  if (input.status) where.status = input.status;

  const rows = await prisma.credit.findMany({
    where,
    include: { associate: { include: { person: true } } },
    orderBy: { createdAt: 'desc' },
    take: 10000,
  });

  const columns = ['No. Credito', 'No. Asociado', 'Nombre', 'Linea', 'Estado', 'Monto Aprobado', 'Saldo', 'Tasa', 'Plazo'];
  return {
    title: input.report === 'overdue' ? 'Reporte de Cartera Vencida' : 'Reporte de Creditos',
    filePrefix: input.report === 'overdue' ? 'reporte_cartera_vencida' : 'reporte_creditos',
    columns,
    rows: rows.map((row) => ({
      'No. Credito': row.creditNumber,
      'No. Asociado': row.associate.associateNumber,
      Nombre: fullName(row.associate.person),
      Linea: row.creditLine,
      Estado: row.status,
      'Monto Aprobado': formatCurrency(row.approvedAmount || row.requestedAmount),
      Saldo: formatCurrency(row.outstandingBalance),
      Tasa: `${formatCurrency(row.interestRate)}%`,
      Plazo: `${row.termMonths} meses`,
    })),
  };
}

async function buildReportDefinition(input: ReportExportInput): Promise<ReportDefinition> {
  if (input.report === 'associates') return buildAssociatesReport(input);
  if (input.report === 'contributions') return buildContributionsReport(input);
  return buildCreditsReport(input);
}

export async function generateReportExport(input: ReportExportInput, userId: string): Promise<GeneratedFile> {
  const definition = await buildReportDefinition(input);
  const file = buildGeneratedFile(definition, input.format);

  await createAuditLog({
    userId,
    action: AUDIT_ACTIONS.REPORT_EXPORT,
    module: MODULES.REPORTS,
    entity: 'Report',
    entityId: input.report,
    dataAfter: { report: input.report, format: input.format, rows: definition.rows.length },
    details: `Reporte ${input.report} exportado en formato ${input.format}`,
  });

  return file;
}

export async function generateTaxCertificate(input: TaxCertificateInput, userId: string): Promise<GeneratedFile> {
  const associate = await prisma.associate.findUnique({
    where: { id: input.associateId },
    include: { person: true },
  });
  if (!associate) throw new Error('Asociado no encontrado');

  const from = new Date(`${input.year}-01-01T00:00:00`);
  const to = new Date(`${input.year}-12-31T23:59:59`);

  const [contributions, payments, cdatMovements] = await Promise.all([
    prisma.contribution.aggregate({
      where: { associateId: associate.id, status: 'APLICADO', createdAt: { gte: from, lte: to } },
      _sum: { amount: true },
    }),
    prisma.creditPayment.aggregate({
      where: { credit: { associateId: associate.id }, paymentDate: { gte: from, lte: to } },
      _sum: { interestPaid: true, lateFee: true },
    }),
    prisma.cdatMovement.aggregate({
      where: { investment: { associateId: associate.id }, performedAt: { gte: from, lte: to } },
      _sum: { interestAmount: true, withholdingAmount: true },
    }),
  ]);

  const contributionAmount = toNumber(contributions._sum.amount);
  const creditInterestPaid = toNumber(payments._sum.interestPaid) + toNumber(payments._sum.lateFee);
  const cdatInterest = toNumber(cdatMovements._sum.interestAmount);
  const withholding = toNumber(cdatMovements._sum.withholdingAmount);

  const columns = ['Concepto', 'Valor'];
  const definition: ReportDefinition = {
    title: `Certificado Tributario ${input.year}`,
    filePrefix: `certificado_tributario_${associate.associateNumber}_${input.year}`,
    columns,
    rows: [
      { Concepto: 'Asociado', Valor: fullName(associate.person) },
      { Concepto: 'Documento', Valor: `${associate.person.documentType} ${associate.person.documentNumber}` },
      { Concepto: 'No. Asociado', Valor: associate.associateNumber },
      { Concepto: 'Ano gravable', Valor: input.year },
      { Concepto: 'Aportes sociales pagados', Valor: formatCurrency(contributionAmount) },
      { Concepto: 'Intereses pagados por creditos', Valor: formatCurrency(creditInterestPaid) },
      { Concepto: 'Rendimientos CDAT causados', Valor: formatCurrency(cdatInterest) },
      { Concepto: 'Retenciones practicadas', Valor: formatCurrency(withholding) },
    ],
  };

  await createAuditLog({
    userId,
    action: AUDIT_ACTIONS.TAX_CERTIFICATE_GENERATE,
    module: MODULES.REPORTS,
    entity: 'Associate',
    entityId: associate.id,
    dataAfter: { year: input.year, format: input.format },
    details: `Certificado tributario ${input.year} generado para ${associate.associateNumber}`,
  });

  return buildGeneratedFile(definition, input.format);
}
