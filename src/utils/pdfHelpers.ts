import jsPDF from 'jspdf';
import { formatDate } from './helpers';

export const cur = (n: number) => `Rs ${n.toLocaleString('en-IN')}`;
export const cl = (s: string) => s.replace(/[^\x00-\x7F]/g, '');

const HEAD: [number, number, number] = [99, 102, 241];
const GREEN: [number, number, number] = [22, 163, 74];
const GRAY: [number, number, number] = [100, 116, 139];

export { HEAD, GREEN, GRAY };
export const RED: [number, number, number] = [220, 38, 38];

export const addHeader = (doc: jsPDF, title: string, subtitle?: string) => {
  const pw = doc.internal.pageSize.getWidth();
  doc.setFillColor(99, 102, 241);
  doc.rect(0, 0, pw, 32, 'F');
  doc.setFontSize(20); doc.setTextColor(255, 255, 255); doc.text('RentFlow', 14, 18);
  doc.setFontSize(10); doc.text('Property Management', 14, 26);
  doc.setFontSize(9); doc.text(formatDate(new Date().toISOString().split('T')[0]), pw - 14, 18, { align: 'right' });
  doc.setFontSize(16); doc.setTextColor(30, 41, 59); doc.text(cl(title), 14, 46);
  if (subtitle) { doc.setFontSize(10); doc.setTextColor(...GRAY); doc.text(cl(subtitle), 14, 54); }
};

export const addSection = (doc: jsPDF, y: number, title: string, color: [number, number, number] = HEAD): number => {
  doc.setFillColor(...color); doc.rect(14, y - 1, 4, 8, 'F');
  doc.setFontSize(12); doc.setTextColor(30, 41, 59); doc.text(title, 22, y + 5);
  return y + 12;
};

export const addSummaryBox = (doc: jsPDF, y: number, items: [string, string][]): number => {
  const pw = doc.internal.pageSize.getWidth();
  const colW = (pw - 28) / 3;
  items.forEach((item, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = 14 + col * colW;
    const yPos = y + row * 22;
    doc.setFillColor(248, 250, 252); doc.roundedRect(x, yPos, colW - 4, 18, 2, 2, 'F');
    doc.setFontSize(8); doc.setTextColor(...GRAY); doc.text(item[0], x + 4, yPos + 7);
    doc.setFontSize(11); doc.setTextColor(30, 41, 59); doc.text(item[1], x + 4, yPos + 14);
  });
  return y + Math.ceil(items.length / 3) * 22 + 6;
};

export const addFooter = (doc: jsPDF) => {
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setDrawColor(226, 232, 240); doc.line(14, ph - 16, pw - 14, ph - 16);
    doc.setFontSize(7); doc.setTextColor(...GRAY);
    doc.text(`Page ${i} of ${pages}`, 14, ph - 10);
    doc.text('RentFlow - Property Management System', pw - 14, ph - 10, { align: 'right' });
  }
};

export const tblStyle = (color: [number, number, number] = HEAD) => ({
  theme: 'grid' as const,
  headStyles: { fillColor: color, textColor: [255, 255, 255] as [number, number, number], fontSize: 8, fontStyle: 'bold' as const, cellPadding: 3 },
  bodyStyles: { fontSize: 8, cellPadding: 2.5 },
  alternateRowStyles: { fillColor: [248, 250, 252] as [number, number, number] },
  styles: { lineColor: [226, 232, 240] as [number, number, number], lineWidth: 0.2 },
});
