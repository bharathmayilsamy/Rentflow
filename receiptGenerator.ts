import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { RentPayment, Tenant, Property } from '../types';
import { formatDate } from './helpers';

const cur = (n: number) => `Rs ${n.toLocaleString('en-IN')}`;

export const generateReceipt = (payment: RentPayment, tenant: Tenant, property: Property | undefined) => {
  const doc = new jsPDF();
  const pw = doc.internal.pageSize.getWidth();

  // Header bar
  doc.setFillColor(30, 41, 59);
  doc.rect(0, 0, pw, 40, 'F');
  doc.setFontSize(22); doc.setTextColor(255, 255, 255); doc.text('V-DO', 14, 20);
  doc.setFontSize(9); doc.text('Property Management, Perfected', 14, 28);
  doc.setFontSize(14); doc.text('PAYMENT RECEIPT', pw - 14, 20, { align: 'right' });
  doc.setFontSize(9); doc.text(payment.receiptNo || '-', pw - 14, 28, { align: 'right' });

  // Receipt details box
  const y = 50;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, y, pw - 28, 28, 3, 3, 'F');
  doc.setFontSize(10); doc.setTextColor(100, 116, 139);
  doc.text('Date', 20, y + 10); doc.text('Amount', pw / 3, y + 10); doc.text('Method', (pw / 3) * 2, y + 10);
  doc.setFontSize(13); doc.setTextColor(30, 41, 59);
  doc.text(formatDate(payment.date), 20, y + 22);
  doc.text(cur(payment.amount), pw / 3, y + 22);
  doc.text(payment.method, (pw / 3) * 2, y + 22);

  // Status badge
  doc.setFillColor(22, 163, 74);
  doc.roundedRect(pw - 50, y + 4, 36, 10, 2, 2, 'F');
  doc.setFontSize(8); doc.setTextColor(255, 255, 255); doc.text('PAID', pw - 32, y + 11, { align: 'center' });

  // Tenant & Property info
  const y2 = y + 38;
  doc.setFontSize(11); doc.setTextColor(30, 41, 59); doc.text('Received From', 14, y2);
  autoTable(doc, {
    startY: y2 + 4,
    body: [
      ['Tenant', tenant.name],
      ['Phone', tenant.phone || '-'],
      ['Property', property?.name || '-'],
      ['Room', tenant.room || '-'],
      ['Rent Period', formatDate(payment.dueDate)],
      ['Monthly Rent', cur(tenant.rent)],
    ],
    theme: 'plain' as const,
    styles: { fontSize: 10, cellPadding: 3 },
    columnStyles: { 0: { fontStyle: 'bold' as const, cellWidth: 40, textColor: [100, 116, 139] as [number, number, number] } },
  });

  // Payment breakdown
  const y3 = (doc as any).lastAutoTable.finalY + 8;
  doc.setFontSize(11); doc.text('Payment Details', 14, y3);
  autoTable(doc, {
    startY: y3 + 4,
    head: [['Description', 'Amount']],
    body: [
      ['Rent Payment', cur(payment.amount)],
      ['Due Amount', cur(payment.dueAmount)],
      ['Balance', cur(Math.max(0, payment.dueAmount - payment.amount))],
    ],
    theme: 'grid' as const,
    headStyles: { fillColor: [99, 102, 241] as [number, number, number], textColor: [255, 255, 255] as [number, number, number], fontSize: 9, fontStyle: 'bold' as const },
    bodyStyles: { fontSize: 9 },
    alternateRowStyles: { fillColor: [248, 250, 252] as [number, number, number] },
    styles: { lineColor: [226, 232, 240] as [number, number, number], lineWidth: 0.2 },
  });

  // Total box
  const y4 = (doc as any).lastAutoTable.finalY + 6;
  doc.setFillColor(99, 102, 241);
  doc.roundedRect(pw / 2, y4, pw / 2 - 14, 16, 2, 2, 'F');
  doc.setFontSize(11); doc.setTextColor(255, 255, 255);
  doc.text(`Total Paid: ${cur(payment.amount)}`, pw - 20, y4 + 10, { align: 'right' });

  // Footer
  const ph = doc.internal.pageSize.getHeight();
  doc.setDrawColor(226, 232, 240); doc.line(14, ph - 30, pw - 14, ph - 30);
  doc.setFontSize(8); doc.setTextColor(100, 116, 139);
  doc.text('This is a computer-generated receipt.', 14, ph - 22);
  doc.text('V-DO | Property Management, Perfected', 14, ph - 16);
  doc.text(`Receipt No: ${payment.receiptNo || '-'}`, pw - 14, ph - 16, { align: 'right' });

  doc.save(`Receipt-${payment.receiptNo || 'payment'}.pdf`);
};
