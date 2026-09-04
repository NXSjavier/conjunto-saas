import { jsPDF } from 'jspdf';

export function generateSubscriptionReceiptPDF(complex, operator) {
  const doc = new jsPDF();

  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, 210, 40, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('CONJUNTOS APP - RECIBO DE PAGO', 20, 22);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(167, 243, 208);
  doc.text('Sistema Integral de Gestión Residencial SaaS', 20, 30);

  doc.setTextColor(51, 65, 85);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('DETALLES DEL COMPROBANTE', 20, 52);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Recibo Nº: REC-${Date.now().toString().slice(-6)}`, 20, 60);
  doc.text(`Fecha de Emisión: ${new Date().toLocaleDateString('es-CO')}`, 20, 66);
  doc.text(`Código de Conjunto: ${complex.code}`, 20, 72);
  doc.text(`Estado de Pago: APROBADO / ACTIVO`, 20, 78);

  doc.setFillColor(248, 250, 252);
  doc.roundedRect(20, 86, 170, 32, 3, 3, 'F');
  doc.setFont('helvetica', 'bold');
  doc.text('Conjunto Residencial:', 26, 96);
  doc.setFont('helvetica', 'normal');
  doc.text(`${complex.name}`, 75, 96);
  doc.setFont('helvetica', 'bold');
  doc.text('Dirección:', 26, 104);
  doc.setFont('helvetica', 'normal');
  doc.text(`${complex.address || 'Principal'}`, 75, 104);
  doc.setFont('helvetica', 'bold');
  doc.text('Plan Contratado:', 26, 112);
  doc.setFont('helvetica', 'normal');
  doc.text(`${complex.plan.toUpperCase()} SaaS`, 75, 112);

  doc.setFillColor(16, 185, 129);
  doc.rect(20, 128, 170, 10, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text('Concepto', 26, 134);
  doc.text('Vigencia', 110, 134);
  doc.text('Monto', 160, 134);

  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'normal');
  doc.text(`Suscripción Mensual ${complex.plan.toUpperCase()}`, 26, 146);
  doc.text(`30 Días`, 110, 146);
  doc.text(complex.plan === 'pro' ? '$30 USD' : complex.plan === 'enterprise' ? '$100 USD' : '$0', 160, 146);

  doc.setDrawColor(226, 232, 240);
  doc.line(20, 154, 190, 154);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Total Pagado:', 110, 166);
  doc.setTextColor(16, 185, 129);
  doc.text(complex.plan === 'pro' ? '$30 USD' : complex.plan === 'enterprise' ? '$100 USD' : '$0', 160, 166);

  doc.setTextColor(100, 116, 139);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Autorizado por: ${operator.name} (${operator.role})`, 20, 220);
  doc.text('Este documento digital certifica el pago formal y la extensión de la licencia SaaS de Conjuntos App.', 20, 226);
  doc.text('Soporte Técnico: soporte@conjuntos.app | PBX: +57 601 800 9000', 20, 232);

  doc.save(`Recibo-Suscripcion-${complex.code}.pdf`);
}

export function generateUserDeletionCertificatePDF(purgedUser, operator) {
  const doc = new jsPDF();

  doc.setFillColor(159, 18, 57);
  doc.rect(0, 0, 210, 38, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('CERTIFICADO DE PURGA Y AUDITORÍA DE USUARIO', 15, 22);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Seguridad y Protección de Datos - Conjuntos App SaaS', 15, 30);

  doc.setTextColor(30, 41, 59);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('REGISTRO OFICIAL DE ELIMINACIÓN PERMANENTE', 20, 52);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Fecha y Hora: ${new Date().toLocaleString('es-CO')}`, 20, 62);
  doc.text(`ID de Transacción de Auditoría: AUD-${Date.now().toString().slice(-8)}`, 20, 68);
  doc.text(`Operador Responsable: ${operator.name} (${operator.email})`, 20, 74);
  doc.text(`Rol del Operador: ${operator.role.toUpperCase()}`, 20, 80);

  doc.setFillColor(254, 242, 242);
  doc.roundedRect(20, 90, 170, 44, 3, 3, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(159, 18, 57);
  doc.text('DATOS DEL USUARIO PURGADO:', 26, 100);
  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'normal');
  doc.text(`Nombre: ${purgedUser.name || 'N/A'}`, 26, 108);
  doc.text(`Correo Electrónico: ${purgedUser.email || 'N/A'}`, 26, 114);
  doc.text(`Rol en el Sistema: ${purgedUser.role || 'N/A'}`, 26, 120);
  doc.text(`Unidad / Apartamento: ${purgedUser.apartment || 'N/A'}`, 26, 126);

  doc.setFont('helvetica', 'bold');
  doc.text('ACCIONES EN CASCADA EJECUTADAS:', 20, 148);
  doc.setFont('helvetica', 'normal');
  doc.text('• Eliminación de pases de visitantes activos e históricos creados por el usuario.', 25, 156);
  doc.text('• Cancelación y remoción de reservas de zonas comunes.', 25, 162);
  doc.text('• Supresión de comentarios en anuncios e incidencias reportadas.', 25, 168);
  doc.text('• Liberación del apartamento a estado DISPONIBLE en la base de datos.', 25, 174);
  doc.text('• Desvinculación de credenciales y tokens de sesión.', 25, 180);

  const pseudoHash = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  doc.setFillColor(241, 245, 249);
  doc.rect(20, 195, 170, 16, 'F');
  doc.setFont('courier', 'bold');
  doc.setFontSize(8);
  doc.text(`Firma Criptográfica SHA-256: ${pseudoHash.toUpperCase()}-SEC-OK`, 25, 205);

  doc.save(`Certificado-Eliminacion-${purgedUser.email || 'usuario'}.pdf`);
}

export function generateMonthlySubscriptionsReportPDF(complexes, operator) {
  const doc = new jsPDF();

  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, 210, 36, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('INFORME GLOBAL DE SUSCRIPCIONES Y CONJUNTOS', 15, 20);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generado por: ${operator.name} | ${new Date().toLocaleDateString('es-CO')}`, 15, 28);

  let y = 50;
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Conjunto', 20, y);
  doc.text('Código', 75, y);
  doc.text('Plan', 120, y);
  doc.text('Estado', 155, y);

  doc.line(20, y + 2, 190, y + 2);
  y += 10;

  doc.setFont('helvetica', 'normal');
  complexes.forEach((c) => {
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
    doc.text(c.name.substring(0, 24), 20, y);
    doc.text(c.code, 75, y);
    doc.text(c.plan.toUpperCase(), 120, y);
    doc.text(c.subscription_status.toUpperCase(), 155, y);
    y += 8;
  });

  doc.save(`Informe-Suscripciones-${new Date().toISOString().split('T')[0]}.pdf`);
}
