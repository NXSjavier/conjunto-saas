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
