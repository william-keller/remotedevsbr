import type { jsPDF } from "jspdf";

import { InvoiceData, calculateSubtotal, formatCurrency, formatDate } from "./invoice";

const PAGE_MARGIN = 48;
const CONTENT_TOP = 48;
const COL_GAP = 40;
const LEFT_COL_WIDTH = 230;
const RIGHT_COL_WIDTH = 227;
const BOTTOM_MARGIN = 48;

const zinc100: [number, number, number] = [244, 244, 245];
const zinc200: [number, number, number] = [228, 228, 231];
const zinc500: [number, number, number] = [113, 113, 122];
const zinc800: [number, number, number] = [39, 39, 42];
const white: [number, number, number] = [255, 255, 255];
const black: [number, number, number] = [0, 0, 0];

const isHidden = (value: string | undefined, placeholder: string) => {
  if (!value) return true;
  const trimmed = value.trim();
  return trimmed === "" || trimmed === placeholder.trim();
};

const fieldValue = (value: string | undefined, placeholder: string) => {
  if (!value) return "";
  const trimmed = value.trim();
  if (trimmed === "" || trimmed === placeholder.trim()) return "";
  return value;
};

function wrappedLines(doc: jsPDF, text: string, width: number): string[] {
  return doc.splitTextToSize(text, width) as string[];
}

function ensureSpace(doc: jsPDF, y: number, needed: number): number {
  const bottom = doc.internal.pageSize.getHeight() - BOTTOM_MARGIN;
  if (y + needed > bottom) {
    doc.addPage();
    return CONTENT_TOP;
  }
  return y;
}

function textRight(doc: jsPDF, text: string, rightX: number, y: number) {
  if (text) doc.text(text, rightX - doc.getTextWidth(text), y);
}

function drawLabelValue(doc: jsPDF, label: string, value: string, labelX: number, valueRightX: number, y: number) {
  doc.setTextColor(zinc500[0], zinc500[1], zinc500[2]);
  doc.text(label, labelX, y);
  doc.setTextColor(black[0], black[1], black[2]);
  if (value) doc.text(value, valueRightX - doc.getTextWidth(value), y);
}

function drawBlock(doc: jsPDF, label: string, value: string, x: number, width: number, y: number): number {
  const labelLine = 12;
  const valueLine = 15;
  let cursor = y;
  if (label) {
    doc.setFontSize(9);
    doc.setTextColor(zinc500[0], zinc500[1], zinc500[2]);
    doc.text(label, x, cursor + 8);
  }
  cursor += labelLine;
  if (value) {
    const lines = wrappedLines(doc, value, width);
    doc.setFontSize(11);
    doc.setTextColor(black[0], black[1], black[2]);
    for (const line of lines) {
      doc.text(line, x, cursor + 10);
      cursor += valueLine;
    }
  }
  return cursor;
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load logo image"));
    img.src = url;
  });
}

export async function buildInvoicePdf(data: InvoiceData, t: (key: string) => string, locale: string): Promise<jsPDF> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });

  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - PAGE_MARGIN * 2;
  const innerRight = pageWidth - PAGE_MARGIN;
  const rightColX = PAGE_MARGIN + LEFT_COL_WIDTH + COL_GAP;

  let leftY = CONTENT_TOP;
  let rightY = CONTENT_TOP;

  if (data.logoDataUrl) {
    try {
      const mime = data.logoDataUrl.split(";")[0].split(":")[1] ?? "";
      const format = mime.split("/")[1]?.toUpperCase();
      const safeFormat =
        format === "JPG" ? "JPEG" : format === "PNG" || format === "WEBP" || format === "BMP" ? format : undefined;
      if (safeFormat) {
        const img = await loadImage(data.logoDataUrl);
        const maxW = LEFT_COL_WIDTH;
        const maxH = 95;
        const ratio = Math.min(maxW / img.width, maxH / img.height);
        const w = img.width * ratio;
        const h = img.height * ratio;
        doc.addImage(data.logoDataUrl, safeFormat, PAGE_MARGIN, leftY, w, h);
        leftY += h + 16;
      } else {
        leftY += 16;
      }
    } catch {
      leftY += 16;
    }
  }

  const leftLabelT = t("invoice.from");
  if (!isHidden(data.fromText, t("invoice.fromPlaceholder"))) {
    leftY = drawBlock(doc, leftLabelT, fieldValue(data.fromText, t("invoice.fromPlaceholder")), PAGE_MARGIN, LEFT_COL_WIDTH, leftY + 4) + 4;
  }

  leftY += 4;
  const billToLabel = t("invoice.billTo");
  const shipToLabel = t("invoice.shipTo");
  const colW = (LEFT_COL_WIDTH - 12) / 2;
  const billToBottom = drawBlock(doc, billToLabel, fieldValue(data.billToText, t("invoice.billToPlaceholder")), PAGE_MARGIN, colW, leftY);
  const shipToBottom = drawBlock(doc, shipToLabel, fieldValue(data.shipToText, t("invoice.shipToPlaceholder")), PAGE_MARGIN + colW + 12, colW, leftY);
  leftY = Math.max(billToBottom, shipToBottom);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(34);
  doc.setTextColor(black[0], black[1], black[2]);
  doc.text(t("invoice.title"), innerRight - doc.getTextWidth(t("invoice.title")), rightY + 26);
  rightY += 34;

  if (data.invoiceNumber) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(18);
    doc.setTextColor(zinc500[0], zinc500[1], zinc500[2]);
    doc.text(`# ${data.invoiceNumber}`, innerRight - doc.getTextWidth(`# ${data.invoiceNumber}`), rightY + 18);
    rightY += 22;
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);

  if (!isHidden(data.date, t("invoice.datePlaceholder"))) {
    drawLabelValue(doc, `${t("invoice.date")}:`, formatDate(data.rawDate, locale) || data.date, rightColX, innerRight, rightY + 10);
    rightY += 16;
  }
  if (!isHidden(data.paymentTerms, t("invoice.paymentTermsPlaceholder"))) {
    drawLabelValue(doc, `${t("invoice.paymentTerms")}:`, fieldValue(data.paymentTerms, t("invoice.paymentTermsPlaceholder")), rightColX, innerRight, rightY + 10);
    rightY += 16;
  }
  if (!isHidden(data.dueDate, t("invoice.datePlaceholder"))) {
    drawLabelValue(doc, `${t("invoice.dueDate")}:`, formatDate(data.rawDueDate, locale) || data.dueDate, rightColX, innerRight, rightY + 10);
    rightY += 16;
  }
  if (!isHidden(data.poNumber, t("invoice.poNumberPlaceholder"))) {
    drawLabelValue(doc, `${t("invoice.poNumber")}:`, fieldValue(data.poNumber, t("invoice.poNumberPlaceholder")), rightColX, innerRight, rightY + 10);
    rightY += 16;
  }

  rightY = ensureSpace(doc, rightY, 44);
  const boxHeight = 30;
  doc.setFillColor(zinc100[0], zinc100[1], zinc100[2]);
  doc.roundedRect(rightColX, rightY + 2, RIGHT_COL_WIDTH, boxHeight, 6, 6, "F");
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(black[0], black[1], black[2]);
  doc.text(t("invoice.balanceDue"), rightColX + 12, rightY + 22);
  const balanceText = formatCurrency(calculateSubtotal(data.items), data.currency, locale);
  doc.text(balanceText, innerRight - doc.getTextWidth(balanceText) - 12, rightY + 22);
  rightY += boxHeight + 8;

  const headerBottom = Math.max(leftY, rightY);

  const colAmount = 90;
  const colRate = 82.5;
  const colQty = 67.5;
  const descWidth = contentWidth - colAmount - colRate - colQty;
  const qtyRight = PAGE_MARGIN + descWidth + colQty;
  const rateRight = qtyRight + colRate;
  const amountRight = innerRight;

  let y = ensureSpace(doc, headerBottom + 24, 40);

  const drawTableHeader = (rowY: number) => {
    doc.setFillColor(zinc800[0], zinc800[1], zinc800[2]);
    doc.roundedRect(PAGE_MARGIN, rowY, contentWidth, 22, 6, 6, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(white[0], white[1], white[2]);
    doc.text(t("invoice.item"), PAGE_MARGIN + 12, rowY + 15);
    textRight(doc, t("invoice.quantity"), qtyRight - 12, rowY + 15);
    textRight(doc, t("invoice.rate"), rateRight - 12, rowY + 15);
    textRight(doc, t("invoice.amount"), amountRight - 12, rowY + 15);
  };

  drawTableHeader(y);
  y += 22;

  for (const item of data.items) {
    const desc = fieldValue(item.description, t("invoice.itemPlaceholder"));
    const lines = wrappedLines(doc, desc, descWidth - 24);
    const rowHeight = Math.max(lines.length * 13 + 10, 20);
    y = ensureSpace(doc, y, rowHeight + 2);
    if (y === CONTENT_TOP) {
      drawTableHeader(y);
      y += 22;
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(black[0], black[1], black[2]);
    let textY = y + 13;
    for (const line of lines) {
      doc.text(line, PAGE_MARGIN + 12, textY);
      textY += 13;
    }
    doc.setTextColor(black[0], black[1], black[2]);
    textRight(doc, String(item.quantity || 0), qtyRight - 12, y + 13);
    textRight(doc, formatCurrency(item.rate || 0, data.currency, locale), rateRight - 12, y + 13);
    textRight(doc, formatCurrency((Number(item.quantity) || 0) * (Number(item.rate) || 0), data.currency, locale), amountRight - 12, y + 13);
    doc.setDrawColor(zinc200[0], zinc200[1], zinc200[2]);
    doc.setLineWidth(0.75);
    doc.line(PAGE_MARGIN, y + rowHeight, innerRight, y + rowHeight);
    y += rowHeight;
  }

  y = ensureSpace(doc, y + 24, 34);
  const totalsWidth = 217.5;
  const totalsX = innerRight - totalsWidth;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(zinc500[0], zinc500[1], zinc500[2]);
  doc.text(`${t("invoice.subtotal")}:`, totalsX, y + 12);
  doc.setTextColor(black[0], black[1], black[2]);
  const subtotalText = formatCurrency(calculateSubtotal(data.items), data.currency, locale);
  doc.text(subtotalText, innerRight - doc.getTextWidth(subtotalText), y + 12);
  y += 16;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(zinc500[0], zinc500[1], zinc500[2]);
  doc.text(`${t("invoice.total")}:`, totalsX, y + 16);
  doc.setTextColor(black[0], black[1], black[2]);
  const totalText = formatCurrency(calculateSubtotal(data.items), data.currency, locale);
  doc.text(totalText, innerRight - doc.getTextWidth(totalText), y + 16);
  y += 24;

  const showNotes = !isHidden(data.notes, t("invoice.notesPlaceholder"));
  const showTerms = !isHidden(data.terms, t("invoice.termsPlaceholder"));
  if (showNotes || showTerms) {
    y = ensureSpace(doc, y, 24);
    const blockWidth = 390;
    if (showNotes) {
      y = drawBlock(doc, `${t("invoice.notes")}:`, fieldValue(data.notes, t("invoice.notesPlaceholder")), PAGE_MARGIN, blockWidth, y + 4) + 12;
    }
    if (showTerms) {
      y = drawBlock(doc, `${t("invoice.terms")}:`, fieldValue(data.terms, t("invoice.termsPlaceholder")), PAGE_MARGIN, blockWidth, y + 4) + 12;
    }
  }

  return doc;
}

export function invoicePdfName(data: InvoiceData): string {
  return `Invoice ${data.invoiceNumber || "1"}.pdf`;
}
