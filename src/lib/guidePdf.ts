import { jsPDF } from 'jspdf';

interface Step {
  title: string;
  description: string;
  tip?: string;
  color: string;
  mockup?: { type: string; label: string; items?: string[] };
}

interface RoleGuide {
  id: string;
  label: string;
  sections: { title: string; steps: Step[] }[];
}

const C: Record<string, [number, number, number]> = {
  emerald: [16, 185, 129],
  sky: [14, 165, 233],
  amber: [245, 158, 11],
  slate: [30, 41, 59],
  muted: [100, 116, 139],
  light: [248, 250, 252],
  white: [255, 255, 255],
  dark: [15, 23, 42],
  amberLight: [254, 243, 199],
  amberText: [146, 64, 14],
  greenBg: [240, 253, 244],
  greenBorder: [187, 247, 208],
};

function drawMockupPhone(doc: jsPDF, x: number, y: number, w: number, h: number, color: [number, number, number], label: string, items?: string[]) {
  // Phone frame
  doc.setFillColor(30, 41, 59);
  doc.roundedRect(x, y, w, h, 12, 12, 'F');
  // Screen
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(x + 4, y + 20, w - 8, h - 36, 4, 4, 'F');
  // Status bar
  doc.setFillColor(color[0], color[1], color[2]);
  doc.roundedRect(x + 4, y + 20, w - 8, 16, 4, 4, 'F');
  doc.rect(x + 4, y + 28, w - 8, 8, 'F');
  // Label in status bar
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6);
  doc.setTextColor(255, 255, 255);
  doc.text(label, x + w / 2, y + 31, { align: 'center' });
  // Notch
  doc.setFillColor(30, 41, 59);
  doc.circle(x + w / 2, y + 5, 4, 'F');
  // Home indicator
  doc.setFillColor(30, 41, 59);
  doc.roundedRect(x + w / 2 - 12, y + h - 8, 24, 3, 2, 2, 'F');
  // Content items
  if (items && items.length > 0) {
    let iy = y + 42;
    items.forEach((item, i) => {
      if (iy > y + h - 16) return;
      // Row background
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(x + 8, iy, w - 16, 14, 3, 3, 'F');
      // Color dot
      doc.setFillColor(color[0], color[1], color[2]);
      doc.circle(x + 16, iy + 7, 3, 'F');
      // Text
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5);
      doc.setTextColor(51, 65, 85);
      doc.text(item.substring(0, 22), x + 22, iy + 9);
      iy += 18;
    });
  }
}

function drawStepCard(doc: jsPDF, x: number, y: number, w: number, stepNum: number, title: string, desc: string, color: [number, number, number], tip?: string) {
  const cardH = tip ? 90 : 70;
  // Card shadow
  doc.setFillColor(226, 232, 240);
  doc.roundedRect(x + 2, y + 2, w, cardH, 8, 8, 'F');
  // Card
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(x, y, w, cardH, 8, 8, 'F');
  // Left color bar
  doc.setFillColor(color[0], color[1], color[2]);
  doc.roundedRect(x, y, 5, cardH, 3, 3, 'F');
  doc.rect(x + 2, y, 3, cardH, 'F');
  // Step number badge
  doc.setFillColor(color[0], color[1], color[2]);
  doc.circle(x + 24, y + 20, 12, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text(String(stepNum).padStart(2, '0'), x + 24, y + 24, { align: 'center' });
  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(30, 41, 59);
  doc.text(title, x + 44, y + 18);
  // Description
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  const lines = doc.splitTextToSize(desc, w - 56);
  doc.text(lines.slice(0, 2), x + 44, y + 34);
  // Tip
  if (tip) {
    doc.setFillColor(254, 243, 199);
    doc.roundedRect(x + 44, y + 54, w - 56, 22, 4, 4, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(146, 64, 14);
    doc.text(`TIP: ${tip.substring(0, 60)}`, x + 50, y + 68);
  }
  return cardH;
}

export function generateGuidePDF(guide: RoleGuide) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const mx = 45;
  const cw = W - mx * 2;
  const pc = C[guide.id] || C.emerald;
  let y = 0;
  let totalPages = 0;
  let stepNum = 0;

  // Helper: page header
  const drawHeader = (pageLabel: string) => {
    doc.setFillColor(pc[0], pc[1], pc[2]);
    doc.rect(0, 0, W, 36, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text('CONJUNTOS APP', mx, 23);
    doc.setFont('helvetica', 'normal');
    doc.text(pageLabel, W - mx, 23, { align: 'right' });
    // Bottom line
    doc.setDrawColor(pc[0], pc[1], pc[2]);
    doc.setLineWidth(1.5);
    doc.line(0, H - 30, W, H - 30);
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text('Conjuntos App — Guia de Uso', mx, H - 18);
    doc.text(`Pagina ${totalPages}`, W - mx, H - 18, { align: 'right' });
  };

  // ==================== COVER ====================
  doc.addPage();
  totalPages++;
  // Dark bg
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, W, H, 'F');
  // Decorative shapes
  doc.setFillColor(pc[0], pc[1], pc[2]);
  doc.setGState(new doc.GState({ opacity: 0.08 }));
  doc.circle(W / 2, 180, 160, 'F');
  doc.circle(W - 40, 60, 80, 'F');
  doc.circle(50, H - 100, 60, 'F');
  doc.circle(W / 2 + 100, H - 200, 40, 'F');
  doc.setGState(new doc.GState({ opacity: 1 }));
  // Top accent line
  doc.setFillColor(pc[0], pc[1], pc[2]);
  doc.rect(0, 0, W, 6, 'F');
  // Logo circle
  doc.setFillColor(pc[0], pc[1], pc[2]);
  doc.circle(W / 2, 140, 48, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(30);
  doc.setTextColor(255, 255, 255);
  doc.text('CA', W / 2, 150, { align: 'center' });
  // Title
  doc.setFontSize(38);
  doc.setTextColor(255, 255, 255);
  doc.text('Conjuntos App', W / 2, 230, { align: 'center' });
  // Subtitle line
  doc.setFillColor(pc[0], pc[1], pc[2]);
  doc.roundedRect(W / 2 - 60, 245, 120, 2, 1, 1, 'F');
  // Role
  doc.setFontSize(18);
  doc.setTextColor(pc[0], pc[1], pc[2]);
  doc.text(`Guia del ${guide.label}`, W / 2, 275, { align: 'center' });
  // Description
  doc.setFontSize(11);
  doc.setTextColor(148, 163, 184);
  doc.text('Guia completa paso a paso con instrucciones', W / 2, 310, { align: 'center' });
  doc.text('y ejemplos visuales para usar la plataforma.', W / 2, 328, { align: 'center' });
  // Feature boxes
  const features = ['Paso a Paso', 'Consejos Utiles', 'Ejemplos Visuales'];
  features.forEach((f, i) => {
    const fx = W / 2 - 130 + i * 130;
    doc.setFillColor(pc[0], pc[1], pc[2]);
    doc.setGState(new doc.GState({ opacity: 0.15 }));
    doc.roundedRect(fx, 360, 110, 30, 6, 6, 'F');
    doc.setGState(new doc.GState({ opacity: 1 }));
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(pc[0], pc[1], pc[2]);
    doc.text(f, fx + 55, 379, { align: 'center' });
  });
  // Phone mockup on cover
  drawMockupPhone(doc, W / 2 - 40, 410, 80, 140, pc, guide.label,
    guide.sections[0]?.steps.slice(0, 4).map(s => s.title) || []);
  // Version & date
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  const date = new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });
  doc.text(`Version 1.0  |  ${date}`, W / 2, H - 40, { align: 'center' });
  doc.setTextColor(71, 85, 105);
  doc.text('www.conjuntosapp.com', W / 2, H - 25, { align: 'center' });

  // ==================== TABLE OF CONTENTS ====================
  doc.addPage();
  totalPages++;
  drawHeader('Tabla de Contenido');
  y = 60;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(30, 41, 59);
  doc.text('Tabla de Contenido', mx, y);
  y += 8;

  doc.setFillColor(pc[0], pc[1], pc[2]);
  doc.roundedRect(mx, y, 60, 3, 2, 2, 'F');
  y += 25;

  let tocPage = 3;
  guide.sections.forEach((section, si) => {
    // Section row
    doc.setFillColor(pc[0], pc[1], pc[2]);
    doc.roundedRect(mx, y, 24, 24, 5, 5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text(String(si + 1), mx + 12, y + 16, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(30, 41, 59);
    doc.text(section.title, mx + 34, y + 16);

    // Dots
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.5);
    const dotsStart = mx + 34 + doc.getTextWidth(section.title) + 8;
    const dotsEnd = W - mx - 20;
    for (let dx = dotsStart; dx < dotsEnd; dx += 6) {
      doc.circle(dx, y + 16, 0.5, 'F');
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`${section.steps.length} pasos`, W - mx, y + 16, { align: 'right' });
    y += 36;

    tocPage++;
  });

  // ==================== CONTENT PAGES ====================
  guide.sections.forEach((section, si) => {
    doc.addPage();
    totalPages++;
    drawHeader(section.title);
    y = 56;

    // Section title bar
    doc.setFillColor(pc[0], pc[1], pc[2]);
    doc.roundedRect(mx, y, cw, 36, 6, 6, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(255, 255, 255);
    doc.text(`SECCION ${si + 1}: ${section.title.toUpperCase()}`, mx + 14, y + 23);
    y += 52;

    section.steps.forEach((step) => {
      stepNum++;
      const neededH = step.tip ? 100 : 80;
      if (y + neededH > H - 50) {
        doc.addPage();
        totalPages++;
        drawHeader(section.title);
        y = 56;
      }

      const sc = C[step.color] || pc;
      const cardH = drawStepCard(doc, mx, y, cw, stepNum, step.title, step.description, sc, step.tip);
      y += cardH + 10;

      // Draw mockup if exists
      if (step.mockup && y + 120 < H - 50) {
        drawMockupPhone(doc, W / 2 - 35, y, 70, 110, pc, step.mockup.label, step.mockup.items);
        y += 125;
      }
    });
  });

  // ==================== BACK COVER ====================
  doc.addPage();
  totalPages++;
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, W, H, 'F');
  // Decorative
  doc.setFillColor(pc[0], pc[1], pc[2]);
  doc.setGState(new doc.GState({ opacity: 0.06 }));
  doc.circle(W / 2, H / 2, 200, 'F');
  doc.setGState(new doc.GState({ opacity: 1 }));
  // Top accent
  doc.setFillColor(pc[0], pc[1], pc[2]);
  doc.rect(0, 0, W, 6, 'F');
  // Content
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(28);
  doc.setTextColor(255, 255, 255);
  doc.text('Necesitas Ayuda?', W / 2, H / 2 - 50, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.setTextColor(148, 163, 184);
  doc.text('Contacta al administrador de tu conjunto', W / 2, H / 2 - 20, { align: 'center' });
  doc.text('para soporte personalizado.', W / 2, H / 2, { align: 'center' });
  // Button
  doc.setFillColor(pc[0], pc[1], pc[2]);
  doc.roundedRect(W / 2 - 80, H / 2 + 25, 160, 38, 8, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(255, 255, 255);
  doc.text('www.conjuntosapp.com', W / 2, H / 2 + 49, { align: 'center' });
  // Features
  const backFeatures = ['Gestion Residencial', 'Control de Acceso', 'Comunicacion en Tiempo Real'];
  backFeatures.forEach((f, i) => {
    const fx = W / 2 - 140 + i * 140;
    doc.setFillColor(pc[0], pc[1], pc[2]);
    doc.setGState(new doc.GState({ opacity: 0.15 }));
    doc.roundedRect(fx, H / 2 + 85, 120, 28, 6, 6, 'F');
    doc.setGState(new doc.GState({ opacity: 1 }));
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(pc[0], pc[1], pc[2]);
    doc.text(f, fx + 60, H / 2 + 103, { align: 'center' });
  });
  // Footer
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text('Conjuntos App 2026 — Todos los derechos reservados', W / 2, H - 25, { align: 'center' });

  // Update page numbers on all pages
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
  }

  doc.save(`ConjuntosApp-Guia-${guide.label.replace(/\s+/g, '-')}.pdf`);
}
