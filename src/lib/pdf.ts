import { jsPDF } from 'jspdf';
import { ResidentialComplex } from '../types';

export interface SubscriptionReceiptData {
  complexName: string;
  complexCode: string;
  adminName: string;
  adminEmail?: string;
  plan: string;
  amount: string | number;
  periodMonths?: number;
  paymentDate?: string;
  expiresAt?: string;
  notes?: string;
  receiptNumber?: string;
}

export function generateSubscriptionReceiptPDF(data: SubscriptionReceiptData) {
  const doc = new jsPDF({
    unit: 'pt',
    format: 'a4',
  });

  const receiptNo = data.receiptNumber || `REC-${Date.now().toString().slice(-6)}`;
  const dateStr = data.paymentDate || new Date().toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  // Header Background Emerald
  doc.setFillColor(5, 150, 105); // emerald-600
  doc.rect(0, 0, doc.internal.pageSize.getWidth(), 90, 'F');

  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('CONJUNTOS APP - RECIBO DE PAGO', 40, 45);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text('Sistema de Gestión Residencial SaaS - Android & Web', 40, 65);

  // Receipt Number & Date
  doc.setTextColor(30, 41, 59); // slate-800
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`Recibo N°: ${receiptNo}`, 40, 130);
  doc.text(`Fecha de emisión: ${dateStr}`, 350, 130);

  // Separator
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setLineWidth(1);
  doc.line(40, 145, 550, 145);

  // Complex Details
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(5, 150, 105);
  doc.text('Detalles del Conjunto Residencial', 40, 175);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  doc.text(`Nombre: ${data.complexName}`, 40, 200);
  doc.text(`Código único: ${data.complexCode}`, 40, 220);
  doc.text(`Administrador: ${data.adminName} (${data.adminEmail || 'admin@conjuntos.app'})`, 40, 240);
  doc.text(`Plan contratado: ${data.plan.toUpperCase()}`, 350, 200);
  doc.text(`Estado: ACTIVO Y AL DÍA`, 350, 220);
  if (data.expiresAt) {
    doc.text(`Próximo vencimiento: ${data.expiresAt}`, 350, 240);
  }

  // Payment Breakdown Table
  doc.setFillColor(241, 245, 249); // slate-100
  doc.rect(40, 270, 510, 28, 'F');
  doc.setFont('helvetica', 'bold');
  doc.text('Concepto / Descripción', 50, 288);
  doc.text('Periodo', 320, 288);
  doc.text('Monto', 460, 288);

  const parsedAmount = typeof data.amount === 'number' ? `$${data.amount.toFixed(2)} USD` : data.amount;

  doc.setFont('helvetica', 'normal');
  doc.text(`Suscripción Plataforma SaaS (Plan ${data.plan.toUpperCase()})`, 50, 320);
  doc.text(`${data.periodMonths || 1} mes(es)`, 320, 320);
  doc.setFont('helvetica', 'bold');
  doc.text(`${parsedAmount}`, 460, 320);

  // Total Box
  doc.setDrawColor(5, 150, 105);
  doc.setFillColor(236, 253, 245); // emerald-50
  doc.roundedRect(320, 350, 230, 50, 6, 6, 'FD');
  doc.setTextColor(5, 150, 105);
  doc.setFontSize(13);
  doc.text('TOTAL PAGADO:', 335, 380);
  doc.setFontSize(16);
  doc.text(`${parsedAmount}`, 445, 380);

  // Notes
  if (data.notes) {
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'bold');
    doc.text('Notas / Observaciones:', 40, 430);
    doc.setFont('helvetica', 'normal');
    doc.text(data.notes, 40, 448);
  }

  // Footer / Signatures
  doc.setDrawColor(203, 213, 225);
  doc.line(40, 560, 220, 560);
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text('Super Admin / Facturación', 40, 575);
  doc.text('Conjuntos App Cloud Systems', 40, 588);

  doc.line(350, 560, 530, 560);
  doc.text('Administrador del Conjunto', 350, 575);
  doc.text(data.adminName || 'Admin Autorizado', 350, 588);

  // Security Seal text
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(`Comprobante generado electrónicamente. Ref: ${data.complexCode}-${Date.now()}`, 40, 680);

  // Download
  doc.save(`Recibo-${data.complexCode}-${receiptNo}.pdf`);
}

export function generatePaymentReceiptPDF(complex: ResidentialComplex, paymentInfo: {
  amount: number;
  periodMonths: number;
  notes?: string;
  receiptNumber?: string;
  adminName: string;
}) {
  generateSubscriptionReceiptPDF({
    complexName: complex.name,
    complexCode: complex.code,
    adminName: paymentInfo.adminName,
    plan: complex.plan,
    amount: paymentInfo.amount,
    periodMonths: paymentInfo.periodMonths,
    notes: paymentInfo.notes,
    receiptNumber: paymentInfo.receiptNumber,
    expiresAt: new Date(complex.current_period_end).toLocaleDateString('es-ES'),
  });
}

export function generateMonthlySubscriptionsReportPDF(complexes: ResidentialComplex[]) {
  const doc = new jsPDF({
    unit: 'pt',
    format: 'a4',
  });

  // Header
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, doc.internal.pageSize.getWidth(), 80, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('CONJUNTOS APP - REPORTE MENSUAL DE SUSCRIPCIONES', 40, 45);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generado el: ${new Date().toLocaleDateString('es-ES')}`, 40, 65);

  // Table Headers
  let y = 120;
  doc.setFillColor(241, 245, 249);
  doc.rect(30, y - 15, 535, 25, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);

  doc.text('Conjunto', 35, y);
  doc.text('Código', 170, y);
  doc.text('Plan', 260, y);
  doc.text('Estado', 320, y);
  doc.text('Vence', 400, y);
  doc.text('Estado Pago', 480, y);

  y += 20;
  doc.setFont('helvetica', 'normal');

  complexes.forEach((c) => {
    if (y > 750) {
      doc.addPage();
      y = 50;
    }
    doc.text(c.name.slice(0, 22), 35, y);
    doc.text(c.code, 170, y);
    doc.text(c.plan.toUpperCase(), 260, y);
    doc.text(c.status.toUpperCase(), 320, y);
    doc.text(new Date(c.current_period_end).toLocaleDateString('es-ES'), 400, y);
    doc.text(c.subscription_status.toUpperCase(), 480, y);

    y += 18;
  });

  doc.save(`Reporte-Suscripciones-${new Date().toISOString().slice(0, 10)}.pdf`);
}

export interface UserDeletionAuditData {
  user: {
    id: string;
    name: string;
    email: string;
    role?: string;
    phone?: string;
    apartment_number?: string;
    residential_complex_id?: number | null;
    status?: string;
    created_at?: string;
  };
  complex?: ResidentialComplex | null;
  deletedApartmentsCount: number;
  deletedApartmentsDetails?: string[];
  deletedIncidentsCount: number;
  deletedReservationsCount: number;
  deletedVisitorsCount: number;
  deletedAnnouncementsCount: number;
  deletedCommentsCount: number;
  performedBy: {
    name: string;
    email: string;
    role: string;
  };
  deletionDate?: string;
  securityHash?: string;
}

/**
 * Generates an official Security Audit Certificate PDF whenever a Super Admin deletes an account
 * and completely purges all associated properties, vehicles, apartments, and logs.
 */
export function generateUserDeletionCertificatePDF(data: UserDeletionAuditData) {
  const doc = new jsPDF({
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const certId = data.securityHash || `PURGE-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
  const dateStr = data.deletionDate || new Date().toLocaleString('es-ES', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  // Top Dark Crimson / Slate Security Header
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 95, 'F');

  // Red/Rose Security Accent Strip
  doc.setFillColor(225, 29, 72); // rose-600
  doc.rect(0, 95, pageWidth, 4, 'F');

  // Header Titles
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('CERTIFICADO DE PURGA Y BORRADO DEFINITIVO DE CUENTA', 40, 42);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(244, 63, 94); // rose-500
  doc.text('AUDITORÍA DE SEGURIDAD & CUMPLIMIENTO DE DATOS (SUPER ADMIN)', 40, 62);

  doc.setTextColor(148, 163, 184); // slate-400
  doc.setFontSize(9);
  doc.text(`Ref. Seguridad: ${certId} | Timestamp: ${dateStr}`, 40, 80);

  // Performed By Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(40, 115, pageWidth - 80, 50, 6, 6, 'FD');

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Ejecutado por Autoridad Super Admin:', 52, 134);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`${data.performedBy.name} (${data.performedBy.email}) — Rol: ${data.performedBy.role.toUpperCase()}`, 52, 150);

  // Target User Identification
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('1. Datos del Usuario y Cuenta Eliminada', 40, 190);

  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(1);
  doc.line(40, 198, pageWidth - 40, 198);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);

  const leftColX = 50;
  const rightColX = 320;

  doc.setFont('helvetica', 'bold');
  doc.text('Nombre Completo:', leftColX, 220);
  doc.setFont('helvetica', 'normal');
  doc.text(data.user.name, leftColX + 110, 220);

  doc.setFont('helvetica', 'bold');
  doc.text('Correo Electrónico:', leftColX, 238);
  doc.setFont('helvetica', 'normal');
  doc.text(data.user.email, leftColX + 110, 238);

  doc.setFont('helvetica', 'bold');
  doc.text('Rol en Plataforma:', leftColX, 256);
  doc.setFont('helvetica', 'normal');
  doc.text((data.user.role || 'resident').toUpperCase(), leftColX + 110, 256);

  doc.setFont('helvetica', 'bold');
  doc.text('ID en Base de Datos:', leftColX, 274);
  doc.setFont('helvetica', 'normal');
  doc.text(data.user.id, leftColX + 110, 274);

  // Right column
  doc.setFont('helvetica', 'bold');
  doc.text('Conjunto Residencial:', rightColX, 220);
  doc.setFont('helvetica', 'normal');
  doc.text(data.complex ? `${data.complex.name} (${data.complex.code})` : 'Sin asignar / Global', rightColX + 120, 220);

  doc.setFont('helvetica', 'bold');
  doc.text('Departamento / Casa:', rightColX, 238);
  doc.setFont('helvetica', 'normal');
  doc.text(data.user.apartment_number || 'Ninguno', rightColX + 120, 238);

  doc.setFont('helvetica', 'bold');
  doc.text('Teléfono Registrado:', rightColX, 256);
  doc.setFont('helvetica', 'normal');
  doc.text(data.user.phone || 'No registrado', rightColX + 120, 256);

  doc.setFont('helvetica', 'bold');
  doc.text('Fecha de Alta Inicial:', rightColX, 274);
  doc.setFont('helvetica', 'normal');
  doc.text(data.user.created_at ? new Date(data.user.created_at).toLocaleDateString('es-ES') : '—', rightColX + 120, 274);

  // Cascading Purge Summary Table
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('2. Resumen de Registros y Propiedades Purgadas (Borrado en Cascada)', 40, 310);

  doc.line(40, 318, pageWidth - 40, 318);

  // Table header
  doc.setFillColor(241, 245, 249);
  doc.rect(40, 330, pageWidth - 80, 24, 'F');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('Módulo / Recurso', 50, 345);
  doc.text('Acción Realizada', 240, 345);
  doc.text('Registros Eliminados', 420, 345);

  let currentY = 370;
  const purgeItems = [
    {
      module: 'Casa / Departamentos',
      action: 'Liberación de propiedad y desvinculación total',
      count: `${data.deletedApartmentsCount} inmueble(s) ${data.deletedApartmentsDetails?.length ? `(${data.deletedApartmentsDetails.join(', ')})` : ''}`,
    },
    {
      module: 'Cuenta de Usuario & Auth',
      action: 'Eliminación permanente de credenciales y perfil',
      count: '1 cuenta',
    },
    {
      module: 'Bitácora de Visitas & Pases',
      action: 'Purga de accesos y códigos de invitados',
      count: `${data.deletedVisitorsCount} pases`,
    },
    {
      module: 'Incidencias & Reportes',
      action: 'Eliminación de tickets y reportes abiertos',
      count: `${data.deletedIncidentsCount} registros`,
    },
    {
      module: 'Reservas de Áreas Comunes',
      action: 'Cancelación y purga de cupos reservados',
      count: `${data.deletedReservationsCount} reservas`,
    },
    {
      module: 'Comunicados & Comentarios',
      action: 'Eliminación de publicaciones y comentarios',
      count: `${data.deletedAnnouncementsCount + data.deletedCommentsCount} elementos`,
    },
  ];

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);

  purgeItems.forEach((item) => {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(item.module, 50, currentY);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(item.action, 240, currentY);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(225, 29, 72); // rose-600
    doc.text(item.count, 420, currentY);

    // subtle line
    doc.setDrawColor(241, 245, 249);
    doc.line(40, currentY + 6, pageWidth - 40, currentY + 6);

    currentY += 24;
  });

  // Security Statement Box
  currentY += 15;
  doc.setFillColor(254, 242, 242); // rose-50
  doc.setDrawColor(254, 205, 211); // rose-200
  doc.roundedRect(40, currentY, pageWidth - 80, 58, 6, 6, 'FD');

  doc.setTextColor(159, 18, 57); // rose-800
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('DECLARACIÓN DE INTEGRIDAD Y SEGURIDAD:', 52, currentY + 20);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(190, 24, 93);
  doc.text(
    'Se certifica que la cuenta especificada y todas sus dependencias (vivienda, registros, credenciales) han sido borradas de la base de datos de manera definitiva e irreversible bajo la autorización del Super Administrador.',
    52,
    currentY + 34,
    { maxWidth: pageWidth - 104 }
  );

  // Signatures
  currentY += 95;
  doc.setDrawColor(203, 213, 225);
  doc.line(50, currentY, 230, currentY);
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text('Super Administrador Responsable', 50, currentY + 15);
  doc.text(`${data.performedBy.name} - Plataforma Global`, 50, currentY + 28);

  doc.line(330, currentY, 510, currentY);
  doc.text('Sello Criptográfico de Auditoría', 330, currentY + 15);
  doc.text(`Hash: ${certId}`, 330, currentY + 28);

  // Download PDF file
  const sanitizedName = data.user.name.replace(/\s+/g, '_').toLowerCase();
  doc.save(`Certificado_Borrado_${sanitizedName}_${Date.now().toString().slice(-4)}.pdf`);
}

