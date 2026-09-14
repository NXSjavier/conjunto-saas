import { jsPDF } from 'jspdf';

type RGB = [number, number, number];

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
  tagline?: string;
  sections: { title: string; subtitle?: string; steps: Step[] }[];
}

const C: Record<string, RGB> = {
  emerald: [16, 185, 129],
  sky: [14, 165, 233],
  amber: [245, 158, 11],
  admin: [16, 185, 129],
  resident: [14, 165, 233],
  guard: [245, 158, 11],
  white: [255, 255, 255],
  dark: [15, 23, 42],
  navy: [30, 41, 59],
  muted: [100, 116, 139],
  light: [148, 163, 184],
  amberBg: [255, 251, 235],
  amberBorder: [253, 230, 138],
  amberText: [146, 64, 14],
};

// Segundo tono para degradados por rol
const C2: Record<string, RGB> = {
  admin: [13, 148, 136],
  resident: [37, 99, 235],
  guard: [234, 88, 12],
  emerald: [13, 148, 136],
  sky: [37, 99, 235],
  amber: [234, 88, 12],
};

async function loadLogo(): Promise<string | null> {
  try {
    const res = await fetch('/icons/icon-192.png');
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const r = new FileReader();
      r.onload = () => resolve(typeof r.result === 'string' ? r.result : null);
      r.onerror = () => resolve(null);
      r.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/** Degradado vertical simulado */
function fillGradientV(doc: jsPDF, x: number, y: number, w: number, h: number, from: RGB, to: RGB, steps = 60) {
  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1);
    doc.setFillColor(
      Math.round(from[0] + (to[0] - from[0]) * t),
      Math.round(from[1] + (to[1] - from[1]) * t),
      Math.round(from[2] + (to[2] - from[2]) * t)
    );
    doc.rect(x, y + (h * i) / steps, w, h / steps + 0.6, 'F');
  }
}

function safeColor(color: any): RGB {
  const c = Array.isArray(color) ? color : [15, 23, 42];
  const n = (v: any) => (typeof v === 'number' && isFinite(v) ? Math.max(0, Math.min(255, Math.round(v))) : 15);
  return [n(c[0]), n(c[1]), n(c[2])];
}

/** Limpia caracteres fuera de WinAnsi (emojis/flechas rompen jsPDF) */
function safeText(s: any): string {
  return String(s ?? '')
    .replace(/[💡✓✔]/g, '')
    .replace(/→/g, '->')
    .replace(/⋮/g, '...')
    .replace(/[^\x20-\xFF]/g, '');
}

function circle(doc: jsPDF, x: number, y: number, r: number, color: RGB, opacity = 1) {
  const c = safeColor(color);
  doc.setFillColor(c[0], c[1], c[2]);
  if (opacity < 1) {
    doc.setGState(new doc.GState({ opacity }));
    doc.circle(x, y, r, 'F');
    doc.setGState(new doc.GState({ opacity: 1 }));
  } else {
    doc.circle(x, y, r, 'F');
  }
}

/** Mockup de teléfono elegante con pasos reales */
function drawMockupPhone(doc: jsPDF, x: number, y: number, w: number, h: number, color: RGB, label: string, items?: string[]) {
  // Sombra
  doc.setFillColor(2, 6, 23);
  doc.setGState(new doc.GState({ opacity: 0.35 }));
  doc.roundedRect(x + 4, y + 8, w, h, 16, 16, 'F');
  doc.setGState(new doc.GState({ opacity: 1 }));
  // Marco
  doc.setFillColor(15, 23, 42);
  doc.roundedRect(x, y, w, h, 16, 16, 'F');
  // Pantalla
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(x + 5, y + 24, w - 10, h - 42, 8, 8, 'F');
  // Barra superior degradada
  fillGradientV(doc, x + 5, y + 24, w - 10, 26, color, [color[0] * 0.7, color[1] * 0.7, color[2] * 0.7].map(Math.round) as RGB, 12);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);
  doc.text(label.substring(0, 20), x + w / 2, y + 41, { align: 'center' });
  // Notch
  doc.setFillColor(15, 23, 42);
  doc.roundedRect(x + w / 2 - 14, y + 6, 28, 6, 3, 3, 'F');
  // Items
  if (items && items.length > 0) {
    let iy = y + 60;
    items.slice(0, 5).forEach((item) => {
      if (iy > y + h - 32) return;
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(x + 11, iy, w - 22, 17, 5, 5, 'F');
      doc.setFillColor(color[0], color[1], color[2]);
      doc.circle(x + 20, iy + 8.5, 3.5, 'F');
      doc.setFillColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(5);
      doc.text('✓', x + 20, iy + 10.2, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6);
      doc.setTextColor(51, 65, 85);
      doc.text(item.substring(0, 24), x + 28, iy + 11);
      iy += 22;
    });
  }
  // Home indicator
  doc.setFillColor(148, 163, 184);
  doc.roundedRect(x + w / 2 - 14, y + h - 12, 28, 3.5, 2, 2, 'F');
}

/** Tarjeta de paso con altura dinámica y tip completo */
function drawStepCard(doc: jsPDF, x: number, y: number, w: number, stepNum: number, title: string, desc: string, color: RGB, tip?: string): number {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  const descLines = doc.splitTextToSize(desc, w - 72);
  const shownDesc = descLines.slice(0, 3);
  let tipLines: string[] = [];
  if (tip) {
    doc.setFontSize(8);
    tipLines = doc.splitTextToSize(tip, w - 92);
  }
  const tipH = tip ? tipLines.length * 11 + 18 : 0;
  const cardH = 30 + shownDesc.length * 13 + tipH + 14;

  // Sombra + tarjeta
  doc.setFillColor(226, 232, 240);
  doc.roundedRect(x + 2, y + 2, w, cardH, 10, 10, 'F');
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(x, y, w, cardH, 10, 10, 'F');
  // Barra lateral
  doc.setFillColor(color[0], color[1], color[2]);
  doc.roundedRect(x, y, 6, cardH, 4, 4, 'F');
  doc.rect(x + 3, y + 6, 3, cardH - 12, 'F');
  // Número
  doc.setFillColor(color[0], color[1], color[2]);
  doc.circle(x + 30, y + 24, 13, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text(String(stepNum).padStart(2, '0'), x + 30, y + 28, { align: 'center' });
  // Título
  doc.setFontSize(12.5);
  doc.setTextColor(15, 23, 42);
  doc.text(title, x + 52, y + 22);
  // Descripción
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(71, 85, 105);
  doc.text(shownDesc, x + 52, y + 38);
  let cy = y + 38 + shownDesc.length * 13 + 6;
  // Tip completo
  if (tip) {
    doc.setFillColor(C.amberBg[0], C.amberBg[1], C.amberBg[2]);
    doc.roundedRect(x + 52, cy, w - 64, tipH, 6, 6, 'F');
    doc.setDrawColor(C.amberBorder[0], C.amberBorder[1], C.amberBorder[2]);
    doc.setLineWidth(0.75);
    doc.roundedRect(x + 52, cy, w - 64, tipH, 6, 6, 'D');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(C.amberText[0], C.amberText[1], C.amberText[2]);
    doc.text('💡 TIP', x + 60, cy + 13);
    doc.setFont('helvetica', 'normal');
    doc.text(tipLines, x + 60, cy + 25);
  }
  return cardH;
}

/** Tarjeta de métrica */
function drawMetricCard(doc: jsPDF, x: number, y: number, w: number, h: number, big: string, label: string, color: RGB) {
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(x, y, w, h, 10, 10, 'F');
  doc.setFillColor(color[0], color[1], color[2]);
  doc.roundedRect(x, y, w, 5, 4, 4, 'F');
  doc.rect(x, y + 3, w, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(30);
  doc.setTextColor(color[0], color[1], color[2]);
  doc.text(big, x + w / 2, y + 48, { align: 'center' });
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text(label, x + w / 2, y + 64, { align: 'center' });
}

export async function generateGuidePDF(guide: RoleGuide): Promise<void> {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const mx = 45;
  const cw = W - mx * 2;
  const pc = C[guide.id] || C.emerald;
  const pc2 = C2[guide.id] || C2.emerald;
  // Parche: sanitiza todo texto antes de dibujar (emojis/flechas rompen jsPDF)
  const rawText = (doc as any).text.bind(doc);
  (doc as any).text = (t: any, x: number, y: number, opts?: any) => {
    const clean = (v: any): any =>
      Array.isArray(v) ? v.map(clean) : typeof v === 'string' ? safeText(v) : v;
    return rawText(clean(t), x, y, opts);
  };

  const logo = await loadLogo();

  const totalSteps = guide.sections.reduce((a, s) => a + s.steps.length, 0);
  const dateStr = new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });
  let stepNum = 0;

  const drawFooter = (label: string) => {
    doc.setDrawColor(pc[0], pc[1], pc[2]);
    doc.setLineWidth(1.5);
    doc.line(0, H - 30, W, H - 30);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text('Residex · Guía de uso', mx, H - 17);
    doc.text(label, W - mx, H - 17, { align: 'right' });
  };

  const drawTopBar = (label: string) => {
    fillGradientV(doc, 0, 0, W, 40, pc, pc2, 24);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text('Residex', mx, 24);
    doc.setFont('helvetica', 'normal');
    doc.text(label, W - mx, 24, { align: 'right' });
  };

  // ==================== PORTADA ====================
  {
    // Fondo degradado superior + base oscura
    fillGradientV(doc, 0, 0, W, 430, pc, pc2, 70);
    doc.setFillColor(C.dark[0], C.dark[1], C.dark[2]);
    doc.rect(0, 430, W, H - 430, 'F');
    circle(doc, W - 30, 70, 110, C.white, 0.1);
    circle(doc, 40, 200, 70, C.white, 0.08);
    circle(doc, W / 2 + 130, 330, 45, C.white, 0.1);
    circle(doc, W / 2 - 150, 470, 80, pc, 0.12);

    // Logo en tarjeta blanca
    const ly = 78;
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(W / 2 - 52, ly, 104, 104, 22, 22, 'F');
    if (logo) {
      try { doc.addImage(logo, 'PNG', W / 2 - 44, ly + 8, 88, 88); } catch { /* fallback */ }
    } else {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(30);
      doc.setTextColor(pc[0], pc[1], pc[2]);
      doc.text('CA', W / 2, ly + 62, { align: 'center' });
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.text('C O N J U N T O S   A P P', W / 2, 222, { align: 'center' });
    doc.setFontSize(44);
    doc.text('Guía de uso', W / 2, 268, { align: 'center' });
    // Subrayado
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(W / 2 - 55, 282, 110, 3, 1.5, 1.5, 'F');
    // Rol
    doc.setFontSize(17);
    doc.text(guide.label, W / 2, 312, { align: 'center' });
    if (guide.tagline) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      doc.text(guide.tagline, W / 2, 332, { align: 'center' });
    }
    // Chips
    const chips = [`${guide.sections.length} capítulos`, `${totalSteps} pasos`, '5 minutos'];
    chips.forEach((c, i) => {
      const fx = W / 2 - 150 + i * 155;
      doc.setFillColor(255, 255, 255);
      doc.setGState(new doc.GState({ opacity: 0.22 }));
      doc.roundedRect(fx, 356, 140, 30, 15, 15, 'F');
      doc.setGState(new doc.GState({ opacity: 1 }));
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(255, 255, 255);
      doc.text(c, fx + 70, 375, { align: 'center' });
    });

    // Mockup con los primeros pasos
    drawMockupPhone(doc, W / 2 - 52, 408, 104, 200, pc, guide.label,
      guide.sections[0]?.steps.slice(0, 4).map((s) => s.title) || []);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(`Versión 1.0  ·  ${dateStr}`, W / 2, H - 42, { align: 'center' });
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(148, 163, 184);
    doc.text('conjuntos-app-pwa.vercel.app', W / 2, H - 26, { align: 'center' });
  }

  // ==================== MÉTRICAS ====================
  doc.addPage();
  drawTopBar('La app en números');
  {
    let y = 66;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(15, 23, 42);
    doc.text('La app en números', mx, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text('Todo lo que esta guía te enseña, de un vistazo', mx, y + 18);
    y += 34;

    const gw = (cw - 12) / 2;
    const cards: Array<[string, string]> = [
      [String(totalSteps), 'pasos guiados'],
      [String(guide.sections.length), 'capítulos'],
      ['24/7', 'notificaciones push'],
      ['3', 'roles: admin · residente · guarda'],
    ];
    cards.forEach(([big, label], i) => {
      const cx = mx + (i % 2) * (gw + 12);
      const cy = y + Math.floor(i / 2) * 96;
      drawMetricCard(doc, cx, cy, gw, 84, big, label, pc);
    });
    y += 2 * 96 + 12;

    // Barras por capítulo
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(15, 23, 42);
    doc.text('Lo que aprenderás', mx, y);
    y += 16;
    const maxSteps = Math.max(1, ...guide.sections.map((s) => s.steps.length));
    guide.sections.forEach((s, si) => {
      // Fila
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(mx, y, cw, 44, 8, 8, 'F');
      // Número
      doc.setFillColor(pc[0], pc[1], pc[2]);
      doc.circle(mx + 24, y + 22, 11, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(255, 255, 255);
      doc.text(String(si + 1), mx + 24, y + 25.5, { align: 'center' });
      // Título
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text(s.title, mx + 44, y + 19);
      // Barra
      const bw = cw - 200;
      doc.setFillColor(226, 232, 240);
      doc.roundedRect(mx + 44, y + 26, bw, 8, 4, 4, 'F');
      doc.setFillColor(pc[0], pc[1], pc[2]);
      const fillW = Math.max(14, (s.steps.length / maxSteps) * bw);
      doc.roundedRect(mx + 44, y + 26, fillW, 8, 4, 4, 'F');
      // Conteo
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text(`${s.steps.length} pasos`, mx + cw - 14, y + 27, { align: 'right' });
      y += 52;
    });
    drawFooter('Métricas');
  }

  // ==================== ÍNDICE ====================
  doc.addPage();
  drawTopBar('Contenido');
  {
    let y = 66;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(15, 23, 42);
    doc.text('Contenido', mx, y);
    y += 10;
    doc.setFillColor(pc[0], pc[1], pc[2]);
    doc.roundedRect(mx, y, 56, 3, 1.5, 1.5, 'F');
    y += 26;

    guide.sections.forEach((section, si) => {
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(mx, y, cw, 52, 10, 10, 'F');
      doc.setFillColor(pc[0], pc[1], pc[2]);
      doc.roundedRect(mx, y, 5, 52, 3, 3, 'F');
      doc.rect(mx + 2, y + 4, 3, 44, 'F');
      // Número grande
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(26);
      doc.setTextColor(pc[0], pc[1], pc[2]);
      doc.text(String(si + 1).padStart(2, '0'), mx + 22, y + 36);
      // Título + subtítulo
      doc.setFontSize(12.5);
      doc.setTextColor(15, 23, 42);
      doc.text(section.title, mx + 62, y + 23);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text(`${section.subtitle || ''} · ${section.steps.length} pasos`, mx + 62, y + 38);
      // Flecha
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(203, 213, 225);
      doc.text('›', mx + cw - 20, y + 32);
      y += 62;
    });
    drawFooter('Contenido');
  }

  // ==================== CAPÍTULOS ====================
  guide.sections.forEach((section, si) => {
    doc.addPage();
    drawTopBar(`Capítulo ${si + 1}`);
    let y = 62;

    // Encabezado de capítulo con número gigante
    fillGradientV(doc, mx, y, cw, 64, pc, pc2, 30);
    // Número gigante fantasma
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(54);
    doc.setTextColor(255, 255, 255);
    doc.setGState(new doc.GState({ opacity: 0.25 }));
    doc.text(String(si + 1).padStart(2, '0'), mx + cw - 18, y + 52, { align: 'right' });
    doc.setGState(new doc.GState({ opacity: 1 }));
    doc.setFontSize(10);
    doc.text(`CAPÍTULO ${si + 1}`, mx + 16, y + 22);
    doc.setFontSize(17);
    doc.text(section.title, mx + 16, y + 44);
    y += 82;

    section.steps.forEach((step) => {
      stepNum++;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      const descLines = doc.splitTextToSize(step.description, cw - 72);
      let tipH = 0;
      if (step.tip) {
        doc.setFontSize(8);
        tipH = doc.splitTextToSize(step.tip, cw - 92).length * 11 + 18;
      }
      const neededH = 30 + Math.min(3, descLines.length) * 13 + tipH + 14;
      if (y + neededH > H - 56) {
        doc.addPage();
        drawTopBar(`${section.title} (cont.)`);
        y = 62;
      }
      const sc = C[step.color] || pc;
      const cardH = drawStepCard(doc, mx, y, cw, stepNum, step.title, step.description, sc, step.tip);
      y += cardH + 12;
    });

    // Mini mockup del capítulo al final si hay espacio
    if (y + 150 < H - 50) {
      drawMockupPhone(doc, W / 2 - 45, y + 6, 90, 140, pc, section.title,
        section.steps.map((s) => s.title));
    }
    drawFooter(`Capítulo ${si + 1}: ${section.title}`);
  });

  // ==================== LO ESENCIAL ====================
  doc.addPage();
  drawTopBar('No olvides');
  {
    let y = 66;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(15, 23, 42);
    doc.text('No olvides lo esencial', mx, y);
    y += 26;
    const tips = [
      { t: 'Notificaciones activadas', d: 'Sin el permiso de notificaciones no llegan visitas ni avisos. Actívalas desde el banner verde de la app.' },
      { t: 'Instala la app', d: 'Desde Chrome: menú ⋮ → Instalar app. Funciona a pantalla completa, como una app nativa.' },
      { t: 'Cuida tu cuenta', d: 'Nunca compartas tu contraseña. Cierra sesión si usas un equipo prestado.' },
    ];
    tips.forEach((tip, i) => {
      const colors: RGB[] = [pc, C2[guide.id] || pc, [245, 158, 11]];
      const c = colors[i % 3];
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(mx, y, cw, 92, 10, 10, 'F');
      doc.setFillColor(c[0], c[1], c[2]);
      doc.circle(mx + 30, y + 30, 15, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(255, 255, 255);
      doc.text('✓', mx + 30, y + 35, { align: 'center' });
      doc.setFontSize(12.5);
      doc.setTextColor(15, 23, 42);
      doc.text(tip.t, mx + 54, y + 26);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(71, 85, 105);
      doc.text(doc.splitTextToSize(tip.d, cw - 70), mx + 54, y + 44);
      y += 104;
    });
    drawFooter('Consejos');
  }

  // ==================== CONTRAPORTADA ====================
  doc.addPage();
  {
    doc.setFillColor(C.dark[0], C.dark[1], C.dark[2]);
    doc.rect(0, 0, W, H, 'F');
    circle(doc, W / 2, H / 2 - 40, 190, pc, 0.07);
    fillGradientV(doc, 0, 0, W, 6, pc, pc2, 12);

    if (logo) {
      try {
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(W / 2 - 42, H / 2 - 190, 84, 84, 18, 18, 'F');
        doc.addImage(logo, 'PNG', W / 2 - 35, H / 2 - 183, 70, 70);
      } catch { /* noop */ }
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(30);
    doc.setTextColor(255, 255, 255);
    doc.text('¿Necesitas ayuda?', W / 2, H / 2 - 70, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    doc.setTextColor(148, 163, 184);
    doc.text('Contacta al administrador de tu conjunto', W / 2, H / 2 - 40, { align: 'center' });
    doc.text('para soporte personalizado.', W / 2, H / 2 - 20, { align: 'center' });

    doc.setFillColor(pc[0], pc[1], pc[2]);
    doc.roundedRect(W / 2 - 90, H / 2 + 6, 180, 40, 10, 10, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.text('conjuntos-app-pwa.vercel.app', W / 2, H / 2 + 31, { align: 'center' });

    const feats = ['Gestión residencial', 'Control de acceso', 'Tiempo real'];
    feats.forEach((f, i) => {
      const fx = W / 2 - 150 + i * 155;
      doc.setFillColor(pc[0], pc[1], pc[2]);
      doc.setGState(new doc.GState({ opacity: 0.16 }));
      doc.roundedRect(fx, H / 2 + 66, 140, 30, 15, 15, 'F');
      doc.setGState(new doc.GState({ opacity: 1 }));
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(pc[0], pc[1], pc[2]);
      doc.text(f, fx + 70, H / 2 + 85, { align: 'center' });
    });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(`Residex · Guía del ${guide.label} · ${dateStr}`, W / 2, H - 26, { align: 'center' });
  }

  // Números de página reales
  const totalPages = doc.getNumberOfPages();
  for (let p = 2; p <= totalPages - 1; p++) {
    doc.setPage(p);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(`Página ${p} de ${totalPages}`, W - mx, H - 17, { align: 'right' });
  }

  doc.save(`Residex-Guia-${guide.label.replace(/\s+/g, '-')}.pdf`);
}
