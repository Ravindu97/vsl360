import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import PDFDocument from 'pdfkit';
import { Prisma } from '@prisma/client';
import prisma from '../config/database';
import { env } from '../config/env';
import logger from '../utils/logger';

type PdfDoc = InstanceType<typeof PDFDocument>;

type TableColumn = {
  header: string;
  width: number;
  align?: 'left' | 'center' | 'right';
};

type InvoiceCostBreakdown = {
  adults: number;
  children: number;
  infants: number;
  adultUnits: number;
  childUnits: number;
  totalUnits: number;
  adultRate: number;
  childRate: number;
  infantRate: number;
  adultSubtotal: number;
  childSubtotal: number;
  infantSubtotal: number;
  computedTotal: number;
};

type ItineraryPlanDayInput = {
  dayNumber: number;
  dateLabel?: string;
  destinationId?: string;
  morningActivityId?: string;
  afternoonActivityId?: string;
  eveningActivityId?: string;
  notes?: string;
};

const computeInvoiceCostBreakdown = (booking: any): InvoiceCostBreakdown => {
  const costPerPerson = Number(booking.invoice.costPerPerson);
  const adults = (booking.client ? 1 : 0) + booking.paxList.filter((p: any) => p.type === 'ADULT').length;
  const children = booking.paxList.filter((p: any) => p.type === 'CHILD').length;
  const infants = booking.paxList.filter((p: any) => p.type === 'INFANT').length;

  const adultUnits = adults;
  const childUnits = children * 0.5;
  const totalUnits = adultUnits + childUnits;

  const adultRate = costPerPerson;
  const childRate = costPerPerson * 0.5;
  const infantRate = 0;

  const adultSubtotal = adults * adultRate;
  const childSubtotal = children * childRate;
  const infantSubtotal = infants * infantRate;
  const computedTotal = adultSubtotal + childSubtotal + infantSubtotal;

  return {
    adults,
    children,
    infants,
    adultUnits,
    childUnits,
    totalUnits,
    adultRate,
    childRate,
    infantRate,
    adultSubtotal,
    childSubtotal,
    infantSubtotal,
    computedTotal,
  };
};

const isPolicyBasedInvoiceTotal = (invoiceTotal: number, computedTotal: number): boolean => {
  return Math.abs(Math.round(invoiceTotal * 100) - Math.round(computedTotal * 100)) <= 1;
};

const parsePositiveInt = (value: string | undefined, fallback: number): number => {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export class DocumentGeneratorService {
  private outputDir: string;
  private activeJobs = 0;
  private readonly maxConcurrentJobs: number;
  private readonly cleanupDays: number;
  private readonly queue: Array<() => void> = [];
  private readonly brandLogoPath: string | null;
  private readonly invoiceLogoPath: string | null;
  private readonly coverTexturePath: string | null;
  private readonly displayFontPath: string | null;
  private readonly bodyFontPath: string | null;
  private readonly bodyBoldFontPath: string | null;

  constructor() {
    this.outputDir = path.join(env.UPLOAD_DIR, 'documents');
    this.maxConcurrentJobs = parsePositiveInt(process.env.PDF_MAX_CONCURRENT_JOBS, env.PDF_MAX_CONCURRENT_JOBS);
    this.cleanupDays = parsePositiveInt(process.env.PDF_CLEANUP_DAYS, env.PDF_CLEANUP_DAYS);
    this.brandLogoPath = this.findAssetPath('logo.png');
    this.invoiceLogoPath = this.findAssetPath('logo-02.png') || this.brandLogoPath;
    this.coverTexturePath = this.findAssetPath('Template.png') || this.findAssetPath('1.jpg');
    this.displayFontPath = this.findAssetPath('Alegros-Regular.ttf') || this.findAssetPath('Alegros.otf');
    this.bodyFontPath = this.findAssetPath('Mundial-Regular.ttf') || this.findAssetPath('Mundial.otf');
    this.bodyBoldFontPath = this.findAssetPath('Mundial-Bold.ttf') || this.findAssetPath('Mundial-Bold.otf');

    if (env.PDF_RENDERER_TYPE.toLowerCase() !== 'pdfkit') {
      logger.warn(`Unsupported PDF_RENDERER_TYPE=${env.PDF_RENDERER_TYPE}; falling back to pdfkit`);
    }

    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }

    void this.cleanupStaleDocuments();
  }

  private findAssetPath(fileName: string): string | null {
    const assetsRoot = path.join(process.cwd(), '..', 'assets');
    const frontendPublicAssets = path.join(process.cwd(), 'frontend', 'public', 'assets');
    const parentFrontendPublicAssets = path.join(process.cwd(), '..', 'frontend', 'public', 'assets');
    const candidates = [
      path.join(process.cwd(), 'assets', fileName),
      path.join(assetsRoot, fileName),
      path.join(frontendPublicAssets, fileName),
      path.join(parentFrontendPublicAssets, fileName),
      path.join(process.cwd(), 'assets', fileName.toLowerCase()),
      path.join(assetsRoot, fileName.toLowerCase()),
      path.join(frontendPublicAssets, fileName.toLowerCase()),
      path.join(parentFrontendPublicAssets, fileName.toLowerCase()),
    ];

    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) return candidate;
    }
    return null;
  }

  private applyFontPack(doc: PdfDoc): void {
    try {
      if (this.displayFontPath) doc.registerFont('BrandDisplay', this.displayFontPath);
      if (this.bodyFontPath) doc.registerFont('BrandBody', this.bodyFontPath);
      if (this.bodyBoldFontPath) doc.registerFont('BrandBodyBold', this.bodyBoldFontPath);
    } catch (error) {
      logger.warn(`Failed to register custom font pack: ${String(error)}`);
    }
  }

  private fontDisplay(doc: PdfDoc): PdfDoc {
    return this.displayFontPath ? doc.font('BrandDisplay') : doc.font('Helvetica-Bold');
  }

  private fontBody(doc: PdfDoc, bold = false): PdfDoc {
    if (bold) {
      if (this.bodyBoldFontPath) return doc.font('BrandBodyBold');
      return doc.font('Helvetica-Bold');
    }
    if (this.bodyFontPath) return doc.font('BrandBody');
    return doc.font('Helvetica');
  }

  private drawPageTexture(doc: PdfDoc, opacity = 0.08): void {
    if (!this.coverTexturePath) return;
    const width = doc.page.width;
    const height = doc.page.height;
    doc.save();
    doc.opacity(opacity);
    doc.image(this.coverTexturePath, 0, 0, { width, height });
    doc.opacity(1);
    doc.restore();
  }

  private formatDate(date: Date | string | null | undefined): string {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  private formatCurrency(amount: number | string, currency?: string): string {
    const num = typeof amount === 'string' ? Number.parseFloat(amount) : amount;
    const currencyCode = currency || 'USD';
    const locale = currencyCode === 'EUR' ? 'de-DE' : currencyCode === 'INR' ? 'en-IN' : 'en-US';
    return new Intl.NumberFormat(locale, { style: 'currency', currency: currencyCode }).format(num || 0);
  }

  private formatMealPlanCode(mealPlan: string): string {
    if (!mealPlan) return '-';
    const lower = mealPlan.toLowerCase().trim();
    if (lower === 'bb' || (lower.includes('bed') && lower.includes('breakfast'))) return 'BB';
    if (lower === 'hb' || lower.includes('half board')) return 'HB';
    if (lower === 'fb' || lower.includes('full board')) return 'FB';
    if (lower === 'ro' || lower.includes('room only')) return 'RO';
    return mealPlan;
  }

  private extractLocation(hotelName: string): string {
    const locations: Record<string, string> = {
      kandy: 'Kandy',
      colombo: 'Colombo',
      galle: 'Galle',
      'nuwara eliya': 'Nuwara Eliya',
      ella: 'Ella',
      yala: 'Yala',
      sigiriya: 'Sigiriya',
      dambulla: 'Dambulla',
      trincomalee: 'Trincomalee',
      bentota: 'Bentota',
      mirissa: 'Mirissa',
      unawatuna: 'Unawatuna',
      anuradhapura: 'Anuradhapura',
      polonnaruwa: 'Polonnaruwa',
      hikkaduwa: 'Hikkaduwa',
      negombo: 'Negombo',
      jaffna: 'Jaffna',
      'arugam bay': 'Arugam Bay',
      habarana: 'Habarana',
      pasikuda: 'Pasikuda',
      weligama: 'Weligama',
      tangalle: 'Tangalle',
      kitulgala: 'Kitulgala',
      hatton: 'Hatton',
      nallathanniya: 'Nallathanniya',
      tissamaharama: 'Tissamaharama',
      udawalawe: 'Udawalawe',
      wilpattu: 'Wilpattu',
      kalpitiya: 'Kalpitiya',
      pinnawala: 'Pinnawala',
      ratnapura: 'Ratnapura',
      badulla: 'Badulla',
      matale: 'Matale',
      mahaweli: 'Kandy',
      jetwing: 'Yala',
      radisson: 'Galle',
    };
    const lower = (hotelName || '').toLowerCase();
    for (const [key, value] of Object.entries(locations)) {
      if (lower.includes(key)) return value;
    }
    return hotelName || '-';
  }

  private async acquireSlot(): Promise<void> {
    if (this.activeJobs < this.maxConcurrentJobs) {
      this.activeJobs += 1;
      return;
    }

    await new Promise<void>((resolve) => {
      this.queue.push(() => {
        this.activeJobs += 1;
        resolve();
      });
    });
  }

  private releaseSlot(): void {
    this.activeJobs = Math.max(0, this.activeJobs - 1);
    const next = this.queue.shift();
    if (next) next();
  }

  private async withPdfSlot<T>(job: () => Promise<T>): Promise<T> {
    await this.acquireSlot();
    try {
      return await job();
    } finally {
      this.releaseSlot();
    }
  }

  private ensureSpace(doc: PdfDoc, requiredHeight = 70): void {
    const bottom = doc.page.height - doc.page.margins.bottom;
    if (doc.y + requiredHeight > bottom) {
      doc.addPage();
    }
  }

  private drawHeader(doc: PdfDoc, title: string, subtitle: string, useInvoiceLogo = false): void {
    const left = doc.page.margins.left;
    const right = doc.page.width - doc.page.margins.right;
    const logoPath = useInvoiceLogo ? this.invoiceLogoPath : this.brandLogoPath;

    this.drawPageTexture(doc, 0.05);
    doc.save();
    doc.rect(0, 0, doc.page.width, 118).fill('#ffffff').fillOpacity(0.9);
    doc.restore();

    if (logoPath) {
      doc.image(logoPath, left, 28, { fit: [120, 44] });
    } else {
      this.fontDisplay(doc).fontSize(20).fillColor('#8b6a42').text('VSL 360', left, 32);
    }

    this.fontBody(doc, true).fontSize(11).fillColor('#3b3230').text('Visit Sri Lanka 360 (Pvt) Ltd', right - 230, 30, {
      width: 230,
      align: 'right',
    });
    this.fontBody(doc).fontSize(9).fillColor('#6f6a66').text('1/111, De Mel Road, Moratuwa, 10400', right - 230, 45, {
      width: 230,
      align: 'right',
    });

    doc.moveTo(left, 82).lineTo(right, 82).lineWidth(2).stroke('#b08d57');
    this.fontDisplay(doc).fontSize(26).fillColor('#3b3230').text(title, left, 90);
    this.fontBody(doc).fontSize(10).fillColor('#6f6a66').text(subtitle, left, 126);
    doc.fillColor('#000000');
    doc.y = 148;
  }

  private drawSectionBar(doc: PdfDoc, title: string): void {
    this.ensureSpace(doc, 36);
    const left = doc.page.margins.left;
    const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const top = doc.y;
    doc.save();
    doc.roundedRect(left, top, width, 24, 4).fill('#3b3230');
    doc.restore();
    this.fontBody(doc, true).fontSize(10.5).fillColor('#ffffff').text(title, left + 12, top + 7);
    doc.fillColor('#000000');
    doc.y = top + 31;
  }

  private drawInfoGrid(doc: PdfDoc, entries: Array<{ label: string; value: string }>, columns = 2): void {
    const left = doc.page.margins.left;
    const totalWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const gap = 12;
    const colWidth = (totalWidth - gap * (columns - 1)) / columns;

    for (let i = 0; i < entries.length; i += columns) {
      this.ensureSpace(doc, 32);
      const row = entries.slice(i, i + columns);
      const top = doc.y;
      row.forEach((entry, idx) => {
        const x = left + idx * (colWidth + gap);
        this.fontBody(doc, true).fontSize(8.5).fillColor('#7b746e').text(entry.label.toUpperCase(), x, top, { width: colWidth });
        this.fontBody(doc).fontSize(10.5).fillColor('#2f2a28').text(entry.value || '-', x, top + 11, { width: colWidth });
      });
      doc.y = top + 30;
    }
    doc.fillColor('#000000');
  }

  private drawTable(doc: PdfDoc, columns: TableColumn[], rows: string[][]): void {
    const left = doc.page.margins.left;
    const totalWidth = columns.reduce((sum, column) => sum + column.width, 0);

    this.ensureSpace(doc, 38);
    let y = doc.y;
    doc.save();
    doc.rect(left, y, totalWidth, 26).fill('#3b3230');
    doc.restore();

    let x = left;
    columns.forEach((column) => {
      this.fontBody(doc, true).fontSize(9.5).fillColor('#ffffff').text(column.header, x + 8, y + 8, {
        width: column.width - 16,
        align: column.align || 'left',
      });
      x += column.width;
    });

    y += 26;
    rows.forEach((row, rowIndex) => {
      this.ensureSpace(doc, 26);
      const bg = rowIndex % 2 === 0 ? '#f6f3ef' : '#ffffff';
      doc.save();
      doc.rect(left, y, totalWidth, 24).fill(bg).stroke('#d9d3cc');
      doc.restore();

      let cellX = left;
      row.forEach((value, colIndex) => {
        const column = columns[colIndex];
        this.fontBody(doc).fontSize(10).fillColor('#2f2a28').text(value || '-', cellX + 8, y + 7, {
          width: column.width - 16,
          align: column.align || 'left',
        });
        cellX += column.width;
      });
      y += 24;
      doc.y = y;
    });

    doc.fillColor('#000000');
  }

  private drawClosingFooter(doc: PdfDoc): void {
    this.ensureSpace(doc, 72);
    doc.moveDown(0.8);
    const left = doc.page.margins.left;
    const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const top = doc.y;
    doc.save();
    doc.roundedRect(left, top, width, 40, 6).fill('#8b6a42');
    doc.restore();
    this.fontBody(doc).fontSize(9).fillColor('#ffffff').text('☎ +94727715854   ✉ infovsl360@gmail.com   🌐 visitsrilanka360.com', left, top + 14, {
      width,
      align: 'center',
    });
    doc.fillColor('#7e7770').font('Helvetica-Oblique').fontSize(8.5).text('This is a computer generated document. Does not require a signature.', left, top + 48, {
      width,
      align: 'center',
    });
    doc.fillColor('#000000');
    doc.y = top + 64;
  }

  private drawAmountHero(doc: PdfDoc, title: string, amount: string, subline: string): void {
    this.ensureSpace(doc, 84);
    const left = doc.page.margins.left;
    const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const top = doc.y;

    doc.save();
    doc.roundedRect(left, top, width, 68, 8).fill('#f3eee7').stroke('#d6c6b2');
    doc.rect(left, top, 8, 68).fill('#8b6a42');
    doc.restore();

    this.fontBody(doc, true).fontSize(10.5).fillColor('#6f5a45').text(title.toUpperCase(), left + 20, top + 12);
    this.fontDisplay(doc).fontSize(26).fillColor('#2f2a28').text(amount, left + 20, top + 26);
    this.fontBody(doc).fontSize(9.5).fillColor('#7c746d').text(subline, left + 20, top + 54);
    doc.fillColor('#000000');
    doc.y = top + 80;
  }

  private drawNoteCard(doc: PdfDoc, heading: string, lines: string[], tone: 'warm' | 'neutral' = 'neutral'): void {
    if (lines.length === 0) return;
    const estimatedHeight = 40 + lines.length * 16;
    this.ensureSpace(doc, estimatedHeight + 10);

    const left = doc.page.margins.left;
    const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const top = doc.y;
    const background = tone === 'warm' ? '#f8f2e8' : '#f5f5f5';
    const border = tone === 'warm' ? '#d4b88f' : '#d9d9d9';
    const accent = tone === 'warm' ? '#b08d57' : '#7b7b7b';

    doc.save();
    doc.roundedRect(left, top, width, estimatedHeight, 6).fill(background).stroke(border);
    doc.rect(left, top, 6, estimatedHeight).fill(accent);
    doc.restore();

    this.fontBody(doc, true).fontSize(10.5).fillColor('#3b3230').text(heading, left + 16, top + 11);
    let y = top + 28;
    lines.forEach((line) => {
      this.fontBody(doc).fontSize(10).fillColor('#59544f').text(`• ${line}`, left + 16, y, { width: width - 28 });
      y += 16;
    });
    doc.fillColor('#000000');
    doc.y = top + estimatedHeight + 8;
  }

  private async writePdf(filename: string, writer: (doc: PdfDoc) => void): Promise<string> {
    const outputPath = path.join(this.outputDir, filename);

    await new Promise<void>((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 44 });
      const stream = fs.createWriteStream(outputPath);
      this.applyFontPack(doc);

      stream.on('finish', resolve);
      stream.on('error', reject);
      doc.on('error', reject);

      doc.pipe(stream);
      writer(doc);
      doc.end();
    });

    return outputPath;
  }

  private async cleanupStaleDocuments(): Promise<void> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - this.cleanupDays);

    const staleDocs = await prisma.generatedDocument.findMany({
      where: { createdAt: { lt: cutoff } },
      select: { id: true, filePath: true },
      take: 500,
    });

    if (staleDocs.length === 0) return;

    const removableIds: string[] = [];
    for (const doc of staleDocs) {
      if (doc.filePath && fs.existsSync(doc.filePath)) {
        try {
          fs.unlinkSync(doc.filePath);
        } catch (error) {
          logger.warn(`Failed to delete old generated file ${doc.filePath}: ${String(error)}`);
          continue;
        }
      }
      removableIds.push(doc.id);
    }

    if (removableIds.length) {
      await prisma.generatedDocument.deleteMany({ where: { id: { in: removableIds } } });
      logger.info(`Cleaned ${removableIds.length} stale generated documents`);
    }
  }

  private getGuestSummary(booking: any): { adults: number; children: number; infants: number; totalGuests: number } {
    const adults = booking.paxList.filter((p: any) => p.type === 'ADULT').length + 1;
    const children = booking.paxList.filter((p: any) => p.type === 'CHILD').length;
    const infants = booking.paxList.filter((p: any) => p.type === 'INFANT').length;

    return { adults, children, infants, totalGuests: adults + children + infants };
  }

  async generateInvoice(bookingId: string, generatedBy: string): Promise<string> {
    return this.withPdfSlot(async () => {
      const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: { client: true, invoice: true, paxList: true },
      });

      if (!booking || !booking.invoice || !booking.client) {
        throw new Error('Booking, client, or invoice data not found');
      }

      const costBreakdown = computeInvoiceCostBreakdown(booking);
      const invoiceTotal = Number(booking.invoice.totalAmount);
      const amountPaid = Number((booking.invoice as any).amountPaid ?? (booking.invoice as any).advancePaid ?? 0);
      const balance = Math.max(0, invoiceTotal - amountPaid);
      const showPolicyBreakdown = isPolicyBasedInvoiceTotal(invoiceTotal, costBreakdown.computedTotal);
      const tourInclusionsList = booking.invoice.tourInclusions
        ? booking.invoice.tourInclusions
            .split('\n')
            .map((line: string) => line.trim())
            .filter(Boolean)
        : [];
      const currencyCode = booking.client.preferredCurrency ?? 'USD';

      const filename = `invoice_${booking.bookingId}_${randomUUID().slice(0, 8)}.pdf`;
      const filePath = await this.writePdf(filename, (doc) => {
        this.drawHeader(doc, 'Invoice', `Booking ${booking.bookingId}`, true);

        this.drawSectionBar(doc, 'Billed To and Invoice Details');
        this.drawInfoGrid(doc, [
          { label: 'Billed To', value: `${booking.client.firstName} ${booking.client.lastName}`.trim() },
          { label: 'Invoice No', value: (booking.invoice as any).invoiceNumber || '-' },
          { label: 'Language', value: booking.client.languagePreference || '-' },
          { label: 'Invoice Date', value: this.formatDate((booking.invoice as any).invoiceDate) },
          { label: 'Phone', value: booking.client.contactNumber || '-' },
          { label: 'Booking Ref', value: booking.bookingId },
        ]);

        this.drawSectionBar(doc, 'Description');
        this.fontBody(doc, true).fontSize(11).fillColor('#3b3230').text('Description');
        this.fontBody(doc).fontSize(10).fillColor('#59544f').text(
          booking.invoice.paymentNotes || `Advance payment for upcoming ${booking.numberOfDays} Days tour in Sri Lanka`
        );
        doc.fillColor('#000000');
        doc.moveDown(0.5);

        this.drawSectionBar(doc, 'Billing Overview');
        this.drawInfoGrid(doc, [
          { label: 'Client Name', value: `${booking.client.firstName} ${booking.client.lastName}`.trim() },
          { label: 'Email', value: booking.client.email || '-' },
          { label: 'Travel Date', value: this.formatDate(booking.arrivalDate) },
          { label: 'No. of Days', value: String(booking.numberOfDays) },
          { label: 'Currency', value: currencyCode },
          { label: 'Status', value: booking.invoice.status || '-' },
        ]);

        this.drawAmountHero(
          doc,
          'Total Due',
          this.formatCurrency(balance || invoiceTotal, currencyCode),
          amountPaid > 0
            ? `Total ${this.formatCurrency(invoiceTotal, currencyCode)} | Paid ${this.formatCurrency(amountPaid, currencyCode)}`
            : `Total ${this.formatCurrency(invoiceTotal, currencyCode)}`
        );

        this.drawSectionBar(doc, 'Cost Summary');
        this.drawTable(
          doc,
          [
            { header: 'Description', width: 290 },
            { header: 'Amount', width: 150, align: 'right' },
          ],
          [
            ['Cost Per Person', this.formatCurrency(booking.invoice.costPerPerson, currencyCode)],
            ['Total Amount', this.formatCurrency(invoiceTotal, currencyCode)],
            ['Amount Paid', this.formatCurrency(amountPaid, currencyCode)],
            ['Balance Due', this.formatCurrency(balance, currencyCode)],
          ]
        );

        if (showPolicyBreakdown) {
          this.drawSectionBar(doc, 'Guest Cost Breakdown');
          this.drawTable(
            doc,
            [
              { header: 'Guest Type', width: 120 },
              { header: 'Units', width: 80, align: 'center' },
              { header: 'Rate', width: 120, align: 'right' },
              { header: 'Subtotal', width: 120, align: 'right' },
            ],
            [
              ['Adults', String(costBreakdown.adults), this.formatCurrency(costBreakdown.adultRate, currencyCode), this.formatCurrency(costBreakdown.adultSubtotal, currencyCode)],
              ['Children', String(costBreakdown.children), this.formatCurrency(costBreakdown.childRate, currencyCode), this.formatCurrency(costBreakdown.childSubtotal, currencyCode)],
              ['Infants', String(costBreakdown.infants), this.formatCurrency(costBreakdown.infantRate, currencyCode), this.formatCurrency(costBreakdown.infantSubtotal, currencyCode)],
            ]
          );
        }

        if (tourInclusionsList.length > 0) {
          this.drawSectionBar(doc, 'Tour Inclusions');
          for (const item of tourInclusionsList) {
            this.ensureSpace(doc, 22);
            doc.font('Helvetica').fontSize(10.2).fillColor('#2f2a28').text(`• ${item}`);
          }
          doc.fillColor('#000000');
        }

        if (booking.invoice.paymentInstructions || booking.invoice.paymentNotes) {
          const paymentLines: string[] = [];
          if (booking.invoice.paymentInstructions) paymentLines.push(booking.invoice.paymentInstructions);
          if (booking.invoice.paymentNotes) paymentLines.push(booking.invoice.paymentNotes);
          this.drawNoteCard(doc, 'Payment Terms and Notes', paymentLines, 'warm');
        }

        this.ensureSpace(doc, 48);
        this.fontBody(doc, true).fontSize(12).fillColor('#3b3230').text('Thank you for choosing VSL 360 Pvt Ltd', { align: 'center' });
        this.fontBody(doc).fontSize(10).fillColor('#66605a').text(
          'For any inquiries or clarifications, feel free to contact us.',
          { align: 'center' }
        );
        doc.fillColor('#000000');

        this.drawClosingFooter(doc);
      });

      await prisma.generatedDocument.create({
        data: {
          bookingId,
          type: 'INVOICE',
          filePath,
          generatedBy,
        },
      });

      logger.info(`Invoice generated for booking ${booking.bookingId}`);
      void this.cleanupStaleDocuments();
      return filePath;
    });
  }

  async generateTransportDetails(bookingId: string, generatedBy: string): Promise<string> {
    return this.withPdfSlot(async () => {
      const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: {
          client: true,
          paxList: true,
          transportPlan: { include: { dayPlans: { orderBy: { dayNumber: 'asc' } } } },
        },
      });

      if (!booking || !booking.transportPlan || !booking.client) {
        throw new Error('Booking, client, or transport data not found');
      }

      const filename = `transport_${booking.bookingId}_${randomUUID().slice(0, 8)}.pdf`;
      const filePath = await this.writePdf(filename, (doc) => {
        this.drawHeader(doc, 'Transport Details', `Internal transfer plan for booking ${booking.bookingId}`);

        this.fontDisplay(doc).fontSize(20).fillColor('#3b3230').text(`Dear ${booking.client.firstName} ${booking.client.lastName}`.trim());
        this.fontBody(doc).fontSize(10).fillColor('#59544f').text(
          'We are pleased to confirm your transport arrangements for your upcoming tour in Sri Lanka. Below are the detailed transport plans for your journey.'
        );
        doc.fillColor('#000000');
        doc.moveDown(0.6);

        this.drawSectionBar(doc, 'Tour Overview');
        const guest = this.getGuestSummary(booking);
        this.drawInfoGrid(doc, [
          { label: 'Client Name', value: `${booking.client.firstName} ${booking.client.lastName}`.trim() },
          { label: 'Country', value: booking.client.citizenship || '-' },
          { label: 'Language', value: booking.client.languagePreference || '-' },
          { label: 'Arrival', value: this.formatDate(booking.arrivalDate) },
          { label: 'Departure', value: this.formatDate(booking.departureDate) },
          { label: 'Total Guests', value: String(guest.totalGuests) },
          { label: 'Vehicle', value: booking.transportPlan.vehicleModel || booking.transportPlan.vehicleType || '-' },
          { label: 'Driver', value: booking.transportPlan.driverName || '-' },
          { label: 'Driver Language', value: booking.transportPlan.driverLanguage || '-' },
          { label: 'Wheelchair', value: booking.transportPlan.wheelchairRequired ? 'Required' : 'Not Required' },
        ]);

        this.drawSectionBar(doc, 'Arrival and Departure');
        this.drawTable(
          doc,
          [
            { header: 'Leg', width: 130 },
            { header: 'Location', width: 170 },
            { header: 'Notes', width: 140 },
          ],
          [
            ['Arrival Pickup', booking.transportPlan.arrivalPickupLocation || '-', booking.transportPlan.arrivalPickupNotes || '-'],
            ['Departure Drop', booking.transportPlan.departureDropLocation || '-', booking.transportPlan.departureDropNotes || '-'],
          ]
        );

        this.drawSectionBar(doc, 'Day by Day Movements');
        this.drawTable(
          doc,
          [
            { header: 'Day', width: 50, align: 'center' },
            { header: 'Pickup', width: 130 },
            { header: 'Drop', width: 130 },
            { header: 'Description', width: 130 },
          ],
          booking.transportPlan.dayPlans.map((dayPlan: any) => [
            String(dayPlan.dayNumber),
            dayPlan.pickupLocation || '-',
            dayPlan.dropLocation || '-',
            dayPlan.description || dayPlan.notes || '-',
          ])
        );

        if (booking.transportPlan.vehicleNotes || booking.transportPlan.internalNotes) {
          this.drawSectionBar(doc, 'Additional Notes');
          if (booking.transportPlan.vehicleNotes) {
            this.fontBody(doc, true).fontSize(10).text('Vehicle Notes');
            this.fontBody(doc).fontSize(10).fillColor('#59544f').text(booking.transportPlan.vehicleNotes);
            doc.moveDown(0.4);
          }
          if (booking.transportPlan.internalNotes) {
            this.fontBody(doc, true).fontSize(10).text('Internal Notes');
            this.fontBody(doc).fontSize(10).fillColor('#59544f').text(booking.transportPlan.internalNotes);
          }
          doc.fillColor('#000000');
        }

        this.drawNoteCard(doc, 'Closing', [
          'We look forward to welcoming you to Sri Lanka and ensuring a safe, comfortable, and memorable journey.',
          'Please do not hesitate to contact us if you need any further assistance.',
          'Warm regards, Pawara Soysa - Managing Director, Visit Sri Lanka 360',
        ]);

        this.drawClosingFooter(doc);
      });

      await prisma.generatedDocument.create({
        data: {
          bookingId,
          type: 'TRANSPORT_DETAILS',
          filePath,
          generatedBy,
        },
      });

      logger.info(`Transport document generated for booking ${booking.bookingId}`);
      void this.cleanupStaleDocuments();
      return filePath;
    });
  }

  async generateHotelReservation(bookingId: string, generatedBy: string): Promise<string> {
    return this.withPdfSlot(async () => {
      const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: {
          client: true,
          paxList: true,
          hotelPlan: { orderBy: { nightNumber: 'asc' } },
        },
      });

      if (!booking || !booking.client || booking.hotelPlan.length === 0) {
        throw new Error('Booking, client, or hotel data not found');
      }

      const filename = `reservation_${booking.bookingId}_${randomUUID().slice(0, 8)}.pdf`;
      const filePath = await this.writePdf(filename, (doc) => {
        this.drawHeader(doc, 'Luxury Stay Reservation', `Booking ${booking.bookingId}`);

        this.drawNoteCard(
          doc,
          'Curated Travel Experience',
          ['Crafted for a seamless stay across Sri Lanka, with comfort, local character, and thoughtful details in every night of your journey.'],
          'warm'
        );

        const guest = this.getGuestSummary(booking);
        this.drawSectionBar(doc, 'Guest Information');
        this.drawInfoGrid(doc, [
          { label: 'Client Name', value: `${booking.client.firstName} ${booking.client.lastName}`.trim() },
          { label: 'Contact', value: booking.client.contactNumber || '-' },
          { label: 'Travel Dates', value: `${this.formatDate(booking.arrivalDate)} - ${this.formatDate(booking.departureDate)}` },
          { label: 'Booking ID', value: booking.bookingId },
          { label: 'Adults', value: String(guest.adults) },
          { label: 'Children', value: String(guest.children) },
          { label: 'Infants', value: String(guest.infants) },
        ]);

        this.drawSectionBar(doc, 'Night by Night Hotel Plan');
        this.drawTable(
          doc,
          [
            { header: 'Night', width: 55, align: 'center' },
            { header: 'Hotel', width: 155 },
            { header: 'Room', width: 90 },
            { header: 'Meal', width: 55, align: 'center' },
            { header: 'Rooms', width: 55, align: 'center' },
            { header: 'Status', width: 80, align: 'center' },
          ],
          booking.hotelPlan.map((hotel: any) => [
            String(hotel.nightNumber),
            hotel.hotelName || '-',
            hotel.roomCategory || '-',
            this.formatMealPlanCode(hotel.mealPlan || ''),
            String(hotel.numberOfRooms || 1),
            hotel.confirmationStatus === 'CONFIRMED' ? 'Confirmed' : 'Pending',
          ])
        );

        const noteRows = booking.hotelPlan
          .flatMap((hotel: any) => [
            hotel.mobilityNotes ? `Night ${hotel.nightNumber} Mobility: ${hotel.mobilityNotes}` : '',
            hotel.reservationNotes ? `Night ${hotel.nightNumber} Notes: ${hotel.reservationNotes}` : '',
          ])
          .filter(Boolean);

        if (noteRows.length || booking.specialCelebrations) {
          this.drawSectionBar(doc, 'Special Notes');
          noteRows.forEach((note) => {
            this.fontBody(doc).fontSize(9.8).fillColor('#59544f').text(`• ${note}`);
          });
          if (booking.specialCelebrations) {
            doc.moveDown(0.3);
            this.fontBody(doc, true).fontSize(10).fillColor('#3b3230').text('Special Celebrations');
            this.fontBody(doc).fontSize(9.8).fillColor('#59544f').text(booking.specialCelebrations);
          }
          doc.fillColor('#000000');
        }

        this.fontBody(doc).fontSize(10).fillColor('#5f6875').text('VSL 360 Tour Operations | Hotel Reservation Document', { align: 'center' });
        this.fontBody(doc, true).fontSize(9.5).fillColor('#204050').text('Experience Sri Lanka Completely', { align: 'center' });
        doc.fillColor('#000000');

        this.drawClosingFooter(doc);
      });

      await prisma.generatedDocument.create({
        data: {
          bookingId,
          type: 'HOTEL_RESERVATION',
          filePath,
          generatedBy,
        },
      });

      logger.info(`Hotel reservation document generated for booking ${booking.bookingId}`);
      void this.cleanupStaleDocuments();
      return filePath;
    });
  }

  async generateItinerary(
    bookingId: string,
    generatedBy: string,
    planDaysInput?: ItineraryPlanDayInput[]
  ): Promise<{ filePath: string; docId: string }> {
    return this.withPdfSlot(async () => {
      const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: {
          client: true,
          paxList: true,
          hotelPlan: { orderBy: { nightNumber: 'asc' } },
          transportPlan: { include: { dayPlans: { orderBy: { dayNumber: 'asc' } } } },
        },
      });

      if (!booking || !booking.client) {
        throw new Error('Booking or client data not found');
      }

      const planDays = Array.isArray(planDaysInput)
        ? planDaysInput
            .filter((day) => Number.isInteger(day?.dayNumber))
            .map((day) => ({
              dayNumber: Number(day.dayNumber),
              dateLabel: day.dateLabel,
              destinationId: day.destinationId,
              morningActivityId: day.morningActivityId,
              afternoonActivityId: day.afternoonActivityId,
              eveningActivityId: day.eveningActivityId,
              notes: day.notes,
            }))
            .filter((day) => day.dayNumber >= 1 && day.dayNumber <= booking.numberOfDays)
        : [];

      const destinationIds = Array.from(new Set(planDays.map((day) => day.destinationId).filter(Boolean) as string[]));
      const activityIds = Array.from(
        new Set(
          planDays
            .flatMap((day) => [day.morningActivityId, day.afternoonActivityId, day.eveningActivityId])
            .filter(Boolean) as string[]
        )
      );

      const destinations = destinationIds.length
        ? await prisma.$queryRaw<Array<{ id: string; name: string; slug: string }>>`
            SELECT id, name, slug
            FROM destinations
            WHERE id IN (${Prisma.join(destinationIds)})
          `
        : [];

      const activities = activityIds.length
        ? await prisma.$queryRaw<Array<{ id: string; title: string; description: string }>>`
            SELECT id, title, description
            FROM destination_activities
            WHERE id IN (${Prisma.join(activityIds)})
          `
        : [];

      const destinationMap = new Map(destinations.map((destination) => [destination.id, destination]));
      const activityMap = new Map(activities.map((activity) => [activity.id, activity]));

      const days = [];
      for (let i = 1; i <= booking.numberOfDays; i += 1) {
        const hotel = booking.hotelPlan.find((h: any) => h.nightNumber === i);
        const dayPlan = booking.transportPlan?.dayPlans.find((d: any) => d.dayNumber === i);
        const itineraryPlan = planDays.find((day) => day.dayNumber === i);
        const destination = itineraryPlan?.destinationId ? destinationMap.get(itineraryPlan.destinationId) : null;
        const morning = itineraryPlan?.morningActivityId ? activityMap.get(itineraryPlan.morningActivityId) : null;
        const afternoon = itineraryPlan?.afternoonActivityId ? activityMap.get(itineraryPlan.afternoonActivityId) : null;
        const evening = itineraryPlan?.eveningActivityId ? activityMap.get(itineraryPlan.eveningActivityId) : null;

        days.push({
          dayNumber: i,
          hotel: hotel || null,
          transport: dayPlan || null,
          itinerary: itineraryPlan
            ? {
                dateLabel: itineraryPlan.dateLabel,
                destinationName: destination?.name || null,
                morningActivityTitle: morning?.title || null,
                afternoonActivityTitle: afternoon?.title || null,
                eveningActivityTitle: evening?.title || null,
                notes: itineraryPlan.notes || null,
              }
            : null,
        });
      }

      const filename = `itinerary_${booking.bookingId}_${randomUUID().slice(0, 8)}.pdf`;
      const filePath = await this.writePdf(filename, (doc) => {
        this.drawHeader(doc, 'Your Tour Itinerary', `${this.formatDate(booking.arrivalDate)} to ${this.formatDate(booking.departureDate)}`);

        const guest = this.getGuestSummary(booking);
        this.drawAmountHero(
          doc,
          'Journey Snapshot',
          `${booking.numberOfDays} Days`,
          `${guest.totalGuests} Guests | ${booking.hotelPlan.length} Hotel Nights`
        );

        this.drawSectionBar(doc, 'Trip Overview');
        this.drawInfoGrid(doc, [
          { label: 'Group Name', value: `${booking.client.firstName} ${booking.client.lastName}`.trim() },
          { label: 'No Of Pax', value: `${guest.adults} Adults, ${guest.children} Children, ${guest.infants} Infants` },
          { label: 'No of Rooms', value: String(booking.hotelPlan.reduce((sum: number, h: any) => sum + Number(h.numberOfRooms || 1), 0)) },
          { label: 'Meal Plan', value: booking.hotelPlan[0]?.mealPlan || 'As Confirmed' },
          { label: 'Travel Dates', value: `${this.formatDate(booking.arrivalDate)} to ${this.formatDate(booking.departureDate)}` },
          { label: 'Reservation No', value: booking.bookingId },
          { label: 'Pick Up Point', value: booking.transportPlan?.arrivalPickupLocation || 'Airport Arrival Lobby' },
          { label: 'Transfer Type', value: booking.transportPlan?.vehicleModel || booking.transportPlan?.vehicleType || 'Private Transfer' },
        ]);

        this.drawSectionBar(doc, 'Flight Details');
        this.drawTable(
          doc,
          [
            { header: 'Arrival', width: 90, align: 'center' },
            { header: 'Flight', width: 120, align: 'center' },
            { header: 'Time', width: 60, align: 'center' },
            { header: 'Departure', width: 90, align: 'center' },
            { header: 'Flight', width: 120, align: 'center' },
            { header: 'Time', width: 60, align: 'center' },
          ],
          [[
            this.formatDate(booking.arrivalDate),
            'As Per Ticket',
            (booking as any).arrivalTime || '-',
            this.formatDate(booking.departureDate),
            'As Per Ticket',
            (booking as any).departureTime || '-',
          ]]
        );

        if (booking.transportPlan) {
          this.drawSectionBar(doc, 'Transport Details');
          this.drawInfoGrid(doc, [
            { label: 'Arrival Point', value: booking.transportPlan.arrivalPickupLocation || 'To Be Confirmed' },
            { label: 'Arrival Time', value: booking.transportPlan.arrivalPickupTime || 'To Be Confirmed' },
            { label: 'Driver', value: booking.transportPlan.driverName || 'Assigned Closer To Arrival' },
            { label: 'Departure Point', value: booking.transportPlan.departureDropLocation || 'To Be Confirmed' },
            { label: 'Departure Time', value: booking.transportPlan.departureDropTime || 'To Be Confirmed' },
            { label: 'Vehicle', value: booking.transportPlan.vehicleModel || booking.transportPlan.vehicleType || 'Private Transfer' },
          ]);
        }

        this.drawSectionBar(doc, 'Accommodation');
        this.drawTable(
          doc,
          [
            { header: 'Night', width: 70, align: 'center' },
            { header: 'Hotel', width: 200 },
            { header: 'Room', width: 110 },
            { header: 'Meal', width: 80, align: 'center' },
          ],
          booking.hotelPlan.map((hotel: any) => [
            `${hotel.nightNumber} Night`,
            hotel.hotelName || '-',
            hotel.roomCategory || '-',
            hotel.mealPlan || 'As Confirmed',
          ])
        );

        this.drawSectionBar(doc, 'Daily Schedule');
        this.drawTable(
          doc,
          [
            { header: 'Day', width: 40, align: 'center' },
            { header: 'Date', width: 80, align: 'center' },
            { header: 'Destination', width: 110 },
            { header: 'Hotel', width: 120 },
            { header: 'Transfer', width: 90 },
          ],
          days.map((day: any) => [
            String(day.dayNumber),
            day.itinerary?.dateLabel || '-',
            day.itinerary?.destinationName || this.extractLocation(day.hotel?.hotelName || ''),
            day.hotel?.hotelName || '-',
            day.transport ? `${day.transport.pickupLocation || '-'} -> ${day.transport.dropLocation || '-'}` : '-',
          ])
        );

        for (const day of days) {
          const dayNotes: string[] = [];
          if (day.itinerary?.morningActivityTitle) dayNotes.push(`Morning: ${day.itinerary.morningActivityTitle}`);
          if (day.itinerary?.afternoonActivityTitle) dayNotes.push(`Afternoon: ${day.itinerary.afternoonActivityTitle}`);
          if (day.itinerary?.eveningActivityTitle) dayNotes.push(`Evening: ${day.itinerary.eveningActivityTitle}`);
          if (day.itinerary?.notes) dayNotes.push(`Notes: ${day.itinerary.notes}`);
          if (dayNotes.length === 0) continue;

          this.drawNoteCard(
            doc,
            `Day ${day.dayNumber} - ${day.itinerary?.destinationName || this.extractLocation(day.hotel?.hotelName || '')}`,
            dayNotes,
            'warm'
          );
        }

        this.drawSectionBar(doc, 'We look forward to hosting you again.');
        this.fontBody(doc).fontSize(9.8).fillColor('#2f3644').text(
          `On behalf of VSL360, we sincerely thank you for choosing us for your memorable ${booking.numberOfDays}-day journey through Sri Lanka. We are truly honoured to have been a part of your travel experience, and we hope that every moment left you with beautiful memories.`,
          { align: 'justify' }
        );
        doc.moveDown(0.4);
        this.fontBody(doc).fontSize(9.8).fillColor('#2f3644').text(
          'It was our pleasure to showcase the rich culture, stunning landscapes, and warm hospitality of Sri Lanka. We are committed to providing travellers like you with authentic, well-curated, and seamless experiences, and your trust in us means everything.',
          { align: 'justify' }
        );
        doc.moveDown(0.4);
        this.fontBody(doc).fontSize(9.8).fillColor('#2f3644').text(
          'We wish you safe travels onward and hope to welcome you back to Sri Lanka again someday. Until then, may your heart remain full of the sights, sounds, and spirit of this beautiful island.',
          { align: 'justify' }
        );
        doc.fillColor('#000000');

        this.drawClosingFooter(doc);
      });

      const itineraryDocument = await prisma.generatedDocument.create({
        data: {
          bookingId,
          type: 'FULL_ITINERARY',
          filePath,
          generatedBy,
        },
      });

      logger.info(`Full itinerary generated for booking ${booking.bookingId}`);
      void this.cleanupStaleDocuments();
      return { filePath, docId: itineraryDocument.id };
    });
  }

  async generateTravelConfirmation(bookingId: string, generatedBy: string): Promise<string> {
    return this.withPdfSlot(async () => {
      const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: {
          client: true,
          paxList: true,
          hotelPlan: { orderBy: { nightNumber: 'asc' } },
          transportPlan: true,
        },
      });

      if (!booking || !booking.client || booking.hotelPlan.length === 0) {
        throw new Error('Booking, client, or hotel data not found');
      }

      const arrivalDate = new Date(booking.arrivalDate);
      const days = booking.hotelPlan.map((hotel: any, idx: number) => {
        const date = new Date(arrivalDate);
        date.setDate(date.getDate() + idx);
        return {
          dayNumber: idx + 1,
          date,
          location: this.extractLocation(hotel.hotelName),
          hotelName: hotel.hotelName,
          roomCategory: hotel.roomCategory || '-',
        };
      });

      const filename = `travel_confirmation_${booking.bookingId}_${randomUUID().slice(0, 8)}.pdf`;
      const filePath = await this.writePdf(filename, (doc) => {
        this.drawHeader(doc, 'Travel Confirmation', `Reference ${booking.bookingId}`);

        this.fontDisplay(doc).fontSize(20).fillColor('#3b3230').text(`Dear ${booking.client.firstName} ${booking.client.lastName}`.trim());
        this.fontBody(doc).fontSize(10).fillColor('#59544f').text(
          'We are pleased to confirm your hotel bookings for your upcoming group tour in Sri Lanka. Below is your detailed hotel itinerary.'
        );
        doc.fillColor('#000000');
        doc.moveDown(0.6);

        const guest = this.getGuestSummary(booking);
        this.drawSectionBar(doc, 'Guest and Travel Info');
        this.drawInfoGrid(doc, [
          { label: 'Client Name', value: `${booking.client.firstName} ${booking.client.lastName}`.trim() },
          { label: 'Country', value: booking.client.citizenship || '-' },
          { label: 'Language', value: booking.client.languagePreference || '-' },
          { label: 'Guests', value: `${guest.totalGuests} (${guest.adults}A/${guest.children}C/${guest.infants}I)` },
          { label: 'Arrival Date', value: this.formatDate(booking.arrivalDate) },
          { label: 'Departure Date', value: this.formatDate(booking.departureDate) },
          { label: 'Vehicle', value: booking.transportPlan?.vehicleType || '-' },
          { label: 'Pickup', value: booking.transportPlan?.arrivalPickupLocation || '-' },
          { label: 'Rooms', value: String(booking.hotelPlan.reduce((sum: number, h: any) => sum + Number(h.numberOfRooms || 1), 0)) },
          { label: 'Meal Plan', value: booking.hotelPlan[0]?.mealPlan || '-' },
        ]);

        this.drawSectionBar(doc, 'Hotel Route Summary');
        this.drawTable(
          doc,
          [
            { header: 'Day', width: 55, align: 'center' },
            { header: 'Date', width: 90, align: 'center' },
            { header: 'Location', width: 110 },
            { header: 'Hotel', width: 145 },
            { header: 'Room', width: 80 },
          ],
          days.map((day: any) => [
            String(day.dayNumber),
            this.formatDate(day.date),
            day.location,
            day.hotelName,
            day.roomCategory,
          ])
        );

        this.drawSectionBar(doc, 'Transport Confirmation');
        this.drawTable(
          doc,
          [
            { header: 'Arrival Pickup', width: 220 },
            { header: 'Departure Drop', width: 220 },
          ],
          [[booking.transportPlan?.arrivalPickupLocation || '-', booking.transportPlan?.departureDropLocation || '-']]
        );

        this.drawNoteCard(doc, 'Meal Plan Codes', ['BB = Bed and Breakfast', 'HB = Half Board', 'FB = Full Board, Room Only']);
        this.drawNoteCard(doc, 'Closing', [
          'We look forward to welcoming you to Sri Lanka and ensuring a safe, comfortable, and memorable journey.',
          'Please do not hesitate to contact us if you need any further assistance.',
          'Warm regards, Pawara Soysa - Managing Director, Visit Sri Lanka 360',
        ]);

        this.drawClosingFooter(doc);
      });

      await prisma.generatedDocument.create({
        data: {
          bookingId,
          type: 'TRAVEL_CONFIRMATION',
          filePath,
          generatedBy,
        },
      });

      logger.info(`Travel confirmation generated for booking ${booking.bookingId}`);
      void this.cleanupStaleDocuments();
      return filePath;
    });
  }
}

export const documentGeneratorService = new DocumentGeneratorService();