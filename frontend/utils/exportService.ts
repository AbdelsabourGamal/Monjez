
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Document, Packer, Paragraph, TextRun, AlignmentType, Table, TableRow, TableCell, WidthType, VerticalAlign, ImageRun } from 'docx';
import { tajawalFontBase64 } from '../assets/tajawalFont';
import type { Quote, CompanyInfo, Language, QuoteCurrency } from '../types';
import { numberToWords } from './numberToWords';

const FONT_NAME = 'Tajawal';
const ARABIC_FONT_URL = "https://fonts.gstatic.com/s/tajawal/v9/Iura6YBj_oCad4k1l8Kj.ttf";

/**
 * Helper to convert Blob to Base64 string
 */
const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // Remove data url prefix if present (e.g. "data:font/ttf;base64,") to get raw base64
      const base64 = result.split(',')[1] || result;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

/**
 * Exports the contract content as a PDF file.
 * Fetches Arabic font dynamically if not present locally.
 */
export const exportPdf = async (content: string, language: Language, t: any, filename: string) => {
  try {
      const doc = new jsPDF();
      const isRtl = language === 'ar' || t.language?.startsWith('ar');
      let fontLoaded = false;

      if (isRtl) {
        let fontBase64 = tajawalFontBase64;
        
        // If local font is missing, try to fetch it
        if (!fontBase64 || fontBase64.length < 100) {
            try {
                const response = await fetch(ARABIC_FONT_URL);
                const blob = await response.blob();
                fontBase64 = await blobToBase64(blob);
            } catch (e) {
                console.warn('Failed to fetch Arabic font. Text may not render correctly.', e);
            }
        }

        if (fontBase64) {
            try {
                doc.addFileToVFS('Tajawal-Regular.ttf', fontBase64);
                doc.addFont('Tajawal-Regular.ttf', FONT_NAME, 'normal');
                doc.setFont(FONT_NAME);
                fontLoaded = true;
            } catch (e) {
                console.error("Failed to add font to VFS", e);
            }
        }
      }
      
      doc.setR2L(isRtl);

      const margin = 15;
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const usableWidth = pageWidth - margin * 2;
      const usableHeight = pageHeight - margin * 2;
      
      // Enhance text splitting for Arabic if possible, otherwise standard split
      const lines = doc.splitTextToSize(content, usableWidth);
      
      let cursorY = margin;

      lines.forEach((line: string) => {
        if (cursorY > usableHeight) {
          doc.addPage();
          cursorY = margin;
        }
        
        const xPos = isRtl ? pageWidth - margin : margin;
        doc.text(line, xPos, cursorY, { align: isRtl ? 'right' : 'left' });
        cursorY += 7; // Adjust line height
      });

      doc.save(t('export:filename.pdf', { name: filename }));
  } catch (error) {
      console.error("PDF Generation failed", error);
      alert(t('export:errors.pdfFailed'));
  }
};

/**
 * Exports the contract content as a .docx file.
 */
export const exportDocx = (content: string, language: Language, t: any, filename: string) => {
  const isRtl = language === 'ar' || t.language?.startsWith('ar');

  const paragraphs = content.split('\n').map(p => 
    new Paragraph({
      children: [
        new TextRun({
          text: p,
          font: FONT_NAME,
        }),
      ],
      alignment: isRtl ? AlignmentType.RIGHT : AlignmentType.LEFT,
      bidirectional: isRtl,
    })
  );

  const doc = new Document({
    sections: [{
      properties: {},
      children: paragraphs,
    }],
    styles: {
        default: {
            document: {
                run: {
                    font: FONT_NAME,
                },
            },
        },
    },
  });

  Packer.toBlob(doc).then(blob => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = t('export:filename.docx', { name: filename });
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });
};


// --- QUOTE EXPORT FUNCTIONS ---

const getQuoteCalculations = (quote: Quote) => {
    const subtotal = quote.items.reduce((acc, item) => acc + item.qty * item.price, 0);
    const discountAmount = subtotal * (quote.discount / 100);
    const subtotalAfterDiscount = subtotal - discountAmount;
    const taxAmount = subtotalAfterDiscount * (quote.tax / 100);
    const grandTotal = subtotalAfterDiscount + taxAmount;
    return { subtotal, discountAmount, taxAmount, grandTotal };
};

const formatCurrencyCalc = (amount: number, currency: Quote['currency'], t: any) => {
    const lang = t.language?.startsWith('ar') ? 'ar' : 'en';
    const fractionDigits = (currency === 'KWD' || currency === 'BHD' || currency === 'OMR' || currency === 'JOD') ? 3 : 2;
    const locale = lang === 'ar' ? 'ar-EG' : 'en-US';
    
    const formattedAmount = new Intl.NumberFormat(locale, {
        style: 'decimal',
        minimumFractionDigits: fractionDigits,
        maximumFractionDigits: fractionDigits,
    }).format(amount);

    const symbol = t(`common:currencySymbols.${currency}`) || currency;
    
    return lang === 'ar' ? `${formattedAmount} ${symbol}` : `${symbol} ${formattedAmount}`;
};

/**
 * Exports a quote to a professionally formatted PDF document.
 */
export const exportQuotePdf = async (quote: Quote, companyInfo: CompanyInfo, language: Language, t: any) => {
    try {
        const doc = new jsPDF();
        const isRtl = language === 'ar' || t.language?.startsWith('ar');
        let fontLoaded = false;

        if (isRtl) {
            let fontBase64 = tajawalFontBase64;
            if (!fontBase64 || fontBase64.length < 100) {
                try {
                    const response = await fetch(ARABIC_FONT_URL);
                    const blob = await response.blob();
                    fontBase64 = await blobToBase64(blob);
                } catch (e) {
                    console.warn('Failed to fetch Arabic font.', e);
                }
            }

            if (fontBase64) {
                try {
                    doc.addFileToVFS('Tajawal-Regular.ttf', fontBase64);
                    doc.addFont('Tajawal-Regular.ttf', FONT_NAME, 'normal');
                    doc.setFont(FONT_NAME);
                    fontLoaded = true;
                } catch (e) {
                    console.error("Failed to add font to VFS", e);
                }
            }
        }
        
        doc.setR2L(isRtl);

        const margin = 15;
        const pageWidth = doc.internal.pageSize.getWidth();
        let y = 20;

        // --- Header ---
        doc.setFillColor(44, 62, 80); // Slate-800
        doc.rect(0, 0, pageWidth, 30, 'F');
        doc.setTextColor(255, 255, 255);
        
        const titleKey = quote.isInvoice ? 'export:invoice.title' : 'export:quote.title';
        doc.text(t(titleKey), pageWidth / 2, 18, { align: 'center' });
        y = 45;

        // --- Company & Quote Info ---
        const xLeft = isRtl ? pageWidth - margin : margin;
        const xRight = isRtl ? margin : pageWidth - margin;
        const alignLeft = isRtl ? 'right' : 'left';
        const alignRight = isRtl ? 'left' : 'right';

        if (companyInfo.logo) {
            try {
                if (companyInfo.logo.startsWith('data:image')) {
                    doc.addImage(companyInfo.logo, 'PNG', xRight - 20, y - 5, 20, 20);
                }
            } catch (e) {
                console.error("Failed to add logo to PDF:", e);
            }
        }

        doc.setTextColor(0, 0, 0);
        doc.setFontSize(14);
        doc.text(companyInfo.name, xRight, y, { align: alignRight });
        doc.setFontSize(9);
        doc.setTextColor(100, 100, 100);
        doc.text(companyInfo.address, xRight, y + 5, { align: alignRight });
        doc.text(companyInfo.phone, xRight, y + 9, { align: alignRight });

        doc.setFontSize(10);
        const noLabelKey = quote.isInvoice ? 'quotes:invoiceNo' : 'quotes:quoteNo';
        doc.text(`${t(noLabelKey)} ${quote.id}`, xLeft, y, { align: alignLeft });

        y += 20;
        doc.setDrawColor(200, 200, 200);
        doc.line(margin, y, pageWidth - margin, y);
        y += 10;
        
        // --- Client & Dates ---
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        doc.text(t('quotes:to'), xLeft, y, { align: alignLeft });
        doc.setFontSize(12);
        doc.text(quote.client.name, xLeft, y + 6, { align: alignLeft });
        doc.setFontSize(9);
        doc.setTextColor(100, 100, 100);
        doc.text(quote.client.address, xLeft, y + 11, { align: alignLeft });
        doc.text(quote.client.phone, xLeft, y + 15, { align: alignLeft });

        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        doc.text(`${t('quotes:date')} ${quote.issueDate}`, xRight, y + 6, { align: alignRight });
        
        if (quote.validityType === 'temporary') {
            doc.text(`${t('quotes:validUntil')} ${quote.expiryDate}`, xRight, y + 11, { align: alignRight });
        } else {
            doc.text(`${t('quotes:quoteValidity')}: ${t('quotes:openValidity')}`, xRight, y + 11, { align: alignRight });
        }

        y += 30;

        // --- Items Table ---
        const tableFont = (isRtl && fontLoaded) ? FONT_NAME : 'helvetica';
        
        autoTable(doc, {
            startY: y,
            head: [[t('quotes:item'), t('quotes:qty'), t('quotes:unitPrice'), t('quotes:total')]],
            body: quote.items.map(item => [
                item.description || t('quotes:itemDescriptionPlaceholder'),
                item.qty,
                formatCurrencyCalc(item.price, quote.currency, t),
                formatCurrencyCalc(item.qty * item.price, quote.currency, t)
            ]),
            theme: 'grid',
            styles: { font: tableFont, halign: isRtl ? 'right' : 'left' },
            headStyles: { fillColor: [241, 245, 249] /* Slate-100 */, textColor: [51, 65, 85] },
            columnStyles: {
                0: { cellWidth: 80 },
                1: { halign: 'center' },
                2: { halign: isRtl ? 'left' : 'right' },
                3: { halign: isRtl ? 'left' : 'right' },
            }
        });
        
        // @ts-ignore
        y = (doc as any).lastAutoTable.finalY + 15;


        // --- Totals ---
        const { subtotal, discountAmount, taxAmount, grandTotal } = getQuoteCalculations(quote);
        const totalsX = pageWidth / 2;
        const totalsXLabel = isRtl ? totalsX + 55 : totalsX - 10;
        const totalsXValue = isRtl ? totalsX - 10 : totalsX + 55;
        const totalsAlign = isRtl ? 'left' : 'right';

        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text(t('quotes:subtotal'), totalsXLabel, y, { align: alignRight });
        doc.text(formatCurrencyCalc(subtotal, quote.currency, t), totalsXValue, y, { align: totalsAlign });
        y += 7;
        doc.text(`${t('quotes:discount')} (${quote.discount}%)`, totalsXLabel, y, { align: alignRight });
        doc.text(`-${formatCurrencyCalc(discountAmount, quote.currency, t)}`, totalsXValue, y, { align: totalsAlign });
        y += 7;
        doc.text(`${t('quotes:tax')} (${quote.tax}%)`, totalsXLabel, y, { align: alignRight });
        doc.text(formatCurrencyCalc(taxAmount, quote.currency, t), totalsXValue, y, { align: totalsAlign });
        y += 5;
        doc.setDrawColor(200, 200, 200);
        doc.line(totalsX - 15, y, pageWidth - margin, y);
        y += 7;
        doc.setFontSize(12);
        doc.setTextColor(0,0,0);
        doc.text(t('quotes:grandTotal'), totalsXLabel, y, { align: alignRight });
        doc.text(formatCurrencyCalc(grandTotal, quote.currency, t), totalsXValue, y, { align: totalsAlign });
        y += 10;

        // --- Amount in Words ---
        doc.setFontSize(9);
        doc.setTextColor(100, 100, 100);
        const amountInWords = numberToWords(grandTotal, quote.currency, t);
        const splitWords = doc.splitTextToSize(amountInWords, pageWidth - totalsX + 15 - margin);
        doc.text(`${t('quotes:amountInWords')}\n${splitWords}`, totalsX - 15, y, { align: alignLeft });

        const filenameKey = quote.isInvoice ? 'export:filename.invoice' : 'export:filename.quote';
        doc.save(t('export:filename.pdf', { name: t(filenameKey, { id: quote.id }) }));
    } catch (error) {
        console.error("Quote PDF Export Failed:", error);
        alert(t('export:errors.fontFailed'));
    }
}

/**
 * Exports a quote to a professionally formatted .docx file.
 */
export const exportQuoteDocx = async (quote: Quote, companyInfo: CompanyInfo, language: Language, t: any) => {
    const isRtl = language === 'ar' || t.language?.startsWith('ar');
    const { subtotal, discountAmount, taxAmount, grandTotal } = getQuoteCalculations(quote);

    const base64ToBuffer = (base64: string) => {
        try {
            const binaryString = atob(base64.split(',')[1]);
            const len = binaryString.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            return bytes.buffer;
        } catch (e) {
            console.error("Failed to convert base64 logo to buffer", e);
            return new Uint8Array(0).buffer;
        }
    };
    
    const doc = new Document({
        sections: [{
            children: [
                // Header
                new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    columnWidths: [75, 25],
                    borders: { top: { style: "none" }, bottom: { style: "none" }, left: { style: "none" }, right: { style: "none" } },
                    rows: [
                        new TableRow({
                            children: [
                                new TableCell({
                                    children: [
                                        new Paragraph({ 
                                            text: `${t(quote.isInvoice ? 'quotes:invoiceNo' : 'quotes:quoteNo')} ${quote.id}`, 
                                            alignment: isRtl ? AlignmentType.RIGHT : AlignmentType.LEFT, 
                                            bidirectional: isRtl 
                                        }),
                                    ],
                                    verticalAlign: VerticalAlign.TOP,
                                }),
                                new TableCell({
                                    children: [
                                        ...(companyInfo.logo && companyInfo.logo.startsWith('data:image') ? [new Paragraph({ children: [new ImageRun({ data: base64ToBuffer(companyInfo.logo), transformation: { width: 75, height: 75 } })], alignment: isRtl ? AlignmentType.LEFT : AlignmentType.RIGHT })] : []),
                                        new Paragraph({ text: companyInfo.name, alignment: isRtl ? AlignmentType.LEFT : AlignmentType.RIGHT, style: "strong", bidirectional: isRtl }),
                                        new Paragraph({ text: companyInfo.address, alignment: isRtl ? AlignmentType.LEFT : AlignmentType.RIGHT, bidirectional: isRtl }),
                                        new Paragraph({ text: companyInfo.phone, alignment: isRtl ? AlignmentType.LEFT : AlignmentType.RIGHT, bidirectional: isRtl }),
                                    ],
                                    verticalAlign: VerticalAlign.TOP,
                                }),
                            ]
                        })
                    ]
                }),
                new Paragraph({ text: "", spacing: { after: 200 } }),
                // Client Info
                new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    columnWidths: [50, 50],
                    borders: { top: { style: "single" }, bottom: { style: "single" }, left: { style: "none" }, right: { style: "none" } },
                    rows: [
                        new TableRow({
                            children: [
                                new TableCell({
                                    children: [
                                        new Paragraph({ text: t('quotes:to'), style: "strong", bidirectional: isRtl }),
                                        new Paragraph({ text: quote.client.name, bidirectional: isRtl }),
                                        new Paragraph({ text: quote.client.address, bidirectional: isRtl }),
                                        new Paragraph({ text: quote.client.phone, bidirectional: isRtl }),
                                    ],
                                }),
                                new TableCell({
                                    children: [
                                        new Paragraph({ text: `${t('quotes:date')} ${quote.issueDate}`, alignment: isRtl ? AlignmentType.LEFT : AlignmentType.RIGHT, bidirectional: isRtl }),
                                        quote.validityType === 'temporary'
                                        ? new Paragraph({ text: `${t('quotes:validUntil')} ${quote.expiryDate}`, alignment: isRtl ? AlignmentType.LEFT : AlignmentType.RIGHT, bidirectional: isRtl })
                                        : new Paragraph({ text: `${t('quotes:quoteValidity')}: ${t('quotes:openValidity')}`, alignment: isRtl ? AlignmentType.LEFT : AlignmentType.RIGHT, bidirectional: isRtl }),
                                    ],
                                }),
                            ]
                        })
                    ]
                }),
                new Paragraph({ text: "", spacing: { after: 400 } }),
                // Items Table
                new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    rows: [
                        new TableRow({
                            children: [
                                new TableCell({ children: [new Paragraph({ text: t('quotes:item'), style: "strong", bidirectional: isRtl })], width: { size: 50, type: WidthType.PERCENTAGE } }),
                                new TableCell({ children: [new Paragraph({ text: t('quotes:qty'), style: "strong", bidirectional: isRtl, alignment: AlignmentType.CENTER })] }),
                                new TableCell({ children: [new Paragraph({ text: t('quotes:unitPrice'), style: "strong", bidirectional: isRtl, alignment: isRtl ? AlignmentType.LEFT : AlignmentType.RIGHT })] }),
                                new TableCell({ children: [new Paragraph({ text: t('quotes:total'), style: "strong", bidirectional: isRtl, alignment: isRtl ? AlignmentType.LEFT : AlignmentType.RIGHT })] }),
                            ],
                            tableHeader: true,
                        }),
                        ...quote.items.map(item => new TableRow({
                            children: [
                                new TableCell({ children: [new Paragraph({ text: item.description || t('quotes:itemDescriptionPlaceholder'), bidirectional: isRtl })] }),
                                new TableCell({ children: [new Paragraph({ text: String(item.qty), bidirectional: isRtl, alignment: AlignmentType.CENTER })] }),
                                new TableCell({ children: [new Paragraph({ text: formatCurrencyCalc(item.price, quote.currency, t), bidirectional: isRtl, alignment: isRtl ? AlignmentType.LEFT : AlignmentType.RIGHT })] }),
                                new TableCell({ children: [new Paragraph({ text: formatCurrencyCalc(item.qty * item.price, quote.currency, t), bidirectional: isRtl, alignment: isRtl ? AlignmentType.LEFT : AlignmentType.RIGHT })] }),
                            ]
                        })),
                    ],
                }),
                new Paragraph({ text: "", spacing: { after: 400 } }),
                // Totals
                new Table({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    alignment: isRtl ? AlignmentType.LEFT : AlignmentType.RIGHT,
                    rows: [
                         new TableRow({ children: [new TableCell({ children: [new Paragraph({ text: t('quotes:subtotal'), bidirectional: isRtl })] }), new TableCell({ children: [new Paragraph({ text: formatCurrencyCalc(subtotal, quote.currency, t), bidirectional: isRtl, alignment: isRtl ? AlignmentType.LEFT : AlignmentType.RIGHT })] })] }),
                         new TableRow({ children: [new TableCell({ children: [new Paragraph({ text: `${t('quotes:discount')} (${quote.discount}%)`, bidirectional: isRtl })] }), new TableCell({ children: [new Paragraph({ text: `-${formatCurrencyCalc(discountAmount, quote.currency, t)}`, bidirectional: isRtl, alignment: isRtl ? AlignmentType.LEFT : AlignmentType.RIGHT })] })] }),
                         new TableRow({ children: [new TableCell({ children: [new Paragraph({ text: `${t('quotes:tax')} (${quote.tax}%)`, bidirectional: isRtl })] }), new TableCell({ children: [new Paragraph({ text: formatCurrencyCalc(taxAmount, quote.currency, t), bidirectional: isRtl, alignment: isRtl ? AlignmentType.LEFT : AlignmentType.RIGHT })] })] }),
                         new TableRow({ children: [new TableCell({ children: [new Paragraph({ text: t('quotes:grandTotal'), style: "strong", bidirectional: isRtl })] }), new TableCell({ children: [new Paragraph({ text: formatCurrencyCalc(grandTotal, quote.currency, t), style: "strong", bidirectional: isRtl, alignment: isRtl ? AlignmentType.LEFT : AlignmentType.RIGHT })] })] }),
                    ]
                }),
                new Paragraph({ text: t('quotes:amountInWords'), style: "strong", alignment: isRtl ? AlignmentType.RIGHT : AlignmentType.LEFT, bidirectional: isRtl, spacing: { before: 200 } }),
                new Paragraph({ text: numberToWords(grandTotal, quote.currency, t), alignment: isRtl ? AlignmentType.RIGHT : AlignmentType.LEFT, bidirectional: isRtl }),
            ]
        }],
        styles: { default: { document: { run: { font: FONT_NAME } } } }
    });

    Packer.toBlob(doc).then(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const filenameKey = quote.isInvoice ? 'export:filename.invoice' : 'export:filename.quote';
        a.download = t('export:filename.docx', { name: t(filenameKey, { id: quote.id }) });
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });
};
