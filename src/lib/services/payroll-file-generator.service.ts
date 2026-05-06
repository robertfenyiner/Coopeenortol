// ============================================================
// CoopManager - Payroll Flat File Generator Service (Fase A)
// ============================================================

import { createHash } from 'crypto';

export interface PayrollFileRow {
  lineNumber: number;
  documentType: string;
  documentNumber: string;
  associateNumber: string;
  fullName: string;
  payrollCode?: string | null;
  conceptCode: string;
  conceptType: string;
  amount: number;
}

export interface PayrollFileOptions {
  format: 'CSV' | 'TXT_FIXED';
  separator: string;
  payingEntityCode: string;
  periodYear: number;
  periodMonth: number;
}

export interface GeneratedPayrollFile {
  fileName: string;
  mimeType: string;
  content: string;
  hash: string;
  totalRecords: number;
  totalAmount: number;
}

function normalizeText(value: string, maxLength: number): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s.-]/g, '')
    .trim()
    .slice(0, maxLength);
}

function moneyToCents(amount: number): string {
  return String(Math.round(amount * 100)).padStart(12, '0');
}

function buildFileName(options: PayrollFileOptions): string {
  const period = `${options.periodYear}${String(options.periodMonth).padStart(2, '0')}`;
  const ext = options.format === 'TXT_FIXED' ? 'txt' : 'csv';
  return `LIB_${options.payingEntityCode}_${period}.${ext}`;
}

function generateCsv(rows: PayrollFileRow[], options: PayrollFileOptions): string {
  const separator = options.separator || ';';
  const header = [
    'linea',
    'tipo_documento',
    'documento',
    'codigo_asociado',
    'nombre',
    'codigo_nomina',
    'codigo_concepto',
    'tipo_concepto',
    'valor',
  ].join(separator);

  const body = rows.map((row) => [
    row.lineNumber,
    row.documentType,
    row.documentNumber,
    row.associateNumber,
    `"${normalizeText(row.fullName, 120)}"`,
    row.payrollCode || '',
    row.conceptCode,
    row.conceptType,
    row.amount.toFixed(2),
  ].join(separator));

  return [header, ...body].join('\r\n');
}

function fixed(value: string, length: number, align: 'left' | 'right' = 'left'): string {
  const normalized = normalizeText(value, length);
  return align === 'right'
    ? normalized.padStart(length, ' ').slice(-length)
    : normalized.padEnd(length, ' ').slice(0, length);
}

function generateFixedWidth(rows: PayrollFileRow[]): string {
  return rows.map((row) => [
    String(row.lineNumber).padStart(6, '0'),
    fixed(row.documentType, 2),
    fixed(row.documentNumber, 15, 'right'),
    fixed(row.associateNumber, 20),
    fixed(row.fullName, 80),
    fixed(row.payrollCode || '', 20),
    fixed(row.conceptCode, 20),
    fixed(row.conceptType, 20),
    moneyToCents(row.amount),
  ].join('')).join('\r\n');
}

export function generatePayrollFile(rows: PayrollFileRow[], options: PayrollFileOptions): GeneratedPayrollFile {
  const content = options.format === 'TXT_FIXED'
    ? generateFixedWidth(rows)
    : generateCsv(rows, options);
  const totalAmount = rows.reduce((sum, row) => sum + row.amount, 0);
  const hash = createHash('sha256').update(content, 'utf8').digest('hex');

  return {
    fileName: buildFileName(options),
    mimeType: options.format === 'TXT_FIXED' ? 'text/plain' : 'text/csv',
    content,
    hash,
    totalRecords: rows.length,
    totalAmount,
  };
}
