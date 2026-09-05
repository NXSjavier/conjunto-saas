import { jsPDF } from 'jspdf';

interface Step {
  title: string;
  description: string;
  tip?: string;
  color: string;
}

interface RoleGuide {
  id: string;
  label: string;
  sections: { title: string; steps: Step[] }[];
}

const roleColors: Record<string, [number, number, number]> = {
  emerald: [16, 185, 129],
  sky: [14, 165, 233],
  amber: [245, 158, 11],
};

const roleIcons: Record<string, string> = {
  admin: '🛡️',
  resident: '🏠',
  guard: '🔐',
};

export function generateGuidePDF(guide: RoleGuide) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const margin = 50;
  const contentW = W - margin * 2;
  let y = 0;

  const primaryColor = roleColors[guide.id] || [16, 185, 129];

  // --- COVER PAGE ---
  // Background gradient
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, W, H, 'F');

  // Decorative circle
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setGState(new doc.GState({ opacity: 0.15 }));
  doc.circle(W / 2, 200, 120, 'F');
  doc.circle(W - 80, 100, 60, 'F');
  doc.circle(80, H - 150, 40, 'F');
  doc.setGState(new doc.GState({ opacity: 1 }));

  // App icon
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.roundedRect(W / 2 - 35, 120, 70, 70, 15, 15, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(28);
  doc.setTextColor(255, 255, 255);
  doc.text('CA', W / 2, 165, { align: 'center' });

  // Title
  doc.setFontSize(32);
  doc.setTextColor(255, 255, 255);
  doc.text('Conjuntos App', W / 2, 240, { align: 'center' });

  doc.setFontSize(16);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(`Guía del ${guide.label}`, W / 2, 270, { align: 'center' });

  // Subtitle
  doc.setFontSize(11);
  doc.setTextColor(148, 163, 184);
  doc.text('Guía completa paso a paso para usar la plataforma', W / 2, 305, { align: 'center' });
  doc.text('www.conjuntosapp.com', W / 2, 325, { align: 'center' });

  // Role badge
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.roundedRect(W / 2 - 60, 360, 120, 35, 8, 8, 'F');
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  doc.text(`${roleIcons[guide.id] || '📋'} ${guide.label}`, W / 2, 382, { align: 'center' });

  // Footer
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  const date = new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });
  doc.text(`Versión 1.0 • ${date}`, W / 2, H - 40, { align: 'center' });
  doc.text('Conjuntos App © 2026 — Todos los derechos reservados', W / 2, H - 25, { align: 'center' });

  // --- CONTENT PAGES ---
  let stepNumber = 0;

  guide.sections.forEach((section, si) => {
    doc.addPage();
    y = 50;

    // Section header bar
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.roundedRect(margin, y, contentW, 40, 8, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.setTextColor(255, 255, 255);
    doc.text(section.title.toUpperCase(), margin + 15, y + 25);
    y += 65;

    section.steps.forEach((step) => {
      // Check page break
      if (y > H - 120) {
        doc.addPage();
        y = 50;
      }

      stepNumber++;
      const stepColor = roleColors[step.color] || primaryColor;

      // Step number circle
      doc.setFillColor(stepColor[0], stepColor[1], stepColor[2]);
      doc.circle(margin + 14, y + 14, 14, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(255, 255, 255);
      doc.text(String(stepNumber).padStart(2, '0'), margin + 14, y + 18, { align: 'center' });

      // Step title
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(30, 41, 59);
      doc.text(step.title, margin + 38, y + 12);

      // Step description
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(71, 85, 105);
      const descLines = doc.splitTextToSize(step.description, contentW - 45);
      doc.text(descLines, margin + 38, y + 28);
      y += 28 + descLines.length * 14;

      // Tip box
      if (step.tip) {
        doc.setFillColor(254, 243, 199);
        doc.roundedRect(margin + 38, y + 4, contentW - 45, 24, 4, 4, 'F');
        doc.setFont('helvetica', 'bolditalic');
        doc.setFontSize(9);
        doc.setTextColor(146, 64, 14);
        doc.text(`💡 Consejo: ${step.tip}`, margin + 46, y + 19);
        y += 35;
      }

      y += 15;
    });
  });

  // --- BACK COVER ---
  doc.addPage();
  y = 50;

  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, W, H, 'F');

  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setGState(new doc.GState({ opacity: 0.1 }));
  doc.circle(W / 2, H / 2, 150, 'F');
  doc.setGState(new doc.GState({ opacity: 1 }));

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.setTextColor(255, 255, 255);
  doc.text('¿Necesitas Ayuda?', W / 2, H / 2 - 30, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.setTextColor(148, 163, 184);
  doc.text('Contacta al administrador de tu conjunto', W / 2, H / 2, { align: 'center' });
  doc.text('o visita notre sitio web para soporte.', W / 2, H / 2 + 20, { align: 'center' });

  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.roundedRect(W / 2 - 70, H / 2 + 45, 140, 35, 8, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(255, 255, 255);
  doc.text('www.conjuntosapp.com', W / 2, H / 2 + 67, { align: 'center' });

  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text('Conjuntos App © 2026 — Gestión Residencial Inteligente', W / 2, H - 30, { align: 'center' });

  // Save
  doc.save(`ConjuntosApp-Guia-${guide.label.replace(/\s+/g, '-')}.pdf`);
}
