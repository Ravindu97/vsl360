import puppeteer from 'puppeteer';
import Handlebars from 'handlebars';
import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import prisma from '../config/database';
import { env } from '../config/env';
import logger from '../utils/logger';

// Register Handlebars helpers
Handlebars.registerHelper('inc', (value: number) => value + 1);
Handlebars.registerHelper('formatDate', (date: Date | string) => {
  const d = new Date(date);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
});
Handlebars.registerHelper('formatCurrency', (amount: number | string) => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num);
});
Handlebars.registerHelper('eq', (a: unknown, b: unknown) => a === b);

type PdfRenderOptions = {
  margin?: { top: string; right: string; bottom: string; left: string };
  scale?: number;
  preferCSSPageSize?: boolean;
};

export class DocumentGeneratorService {
  private templatesDir: string;
  private outputDir: string;
  private themeImage: string | null;

  constructor() {
    this.templatesDir = path.join(__dirname, '..', 'templates');
    this.outputDir = path.join(env.UPLOAD_DIR, 'documents');
    this.themeImage = this.loadThemeImage();
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  private loadThemeImage(): string | null {
    const candidates = [
      path.join(process.cwd(), 'theme.jpg'),
      path.join(process.cwd(), 'theme.jpeg'),
      path.join(process.cwd(), 'theme.png'),
      path.join(process.cwd(), '..', 'theme.jpg'),
      path.join(process.cwd(), '..', 'theme.jpeg'),
      path.join(process.cwd(), '..', 'theme.png'),
    ];

    for (const candidate of candidates) {
      if (!fs.existsSync(candidate)) continue;

      const ext = path.extname(candidate).toLowerCase();
      const mime = ext === '.png' ? 'image/png' : 'image/jpeg';
      const image = fs.readFileSync(candidate).toString('base64');
      logger.info(`Loaded document theme image from ${candidate}`);
      return `data:${mime};base64,${image}`;
    }

    logger.warn('No theme image found for document templates (expected theme.jpg/jpeg/png).');
    return null;
  }

  private async renderPdf(html: string, filename: string, options?: PdfRenderOptions): Promise<string> {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      const outputPath = path.join(this.outputDir, filename);
      await page.pdf({
        path: outputPath,
        format: 'A4',
        margin: options?.margin ?? { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' },
        scale: options?.scale ?? 1,
        preferCSSPageSize: options?.preferCSSPageSize ?? true,
        printBackground: true,
      });
      return outputPath;
    } finally {
      await browser.close();
    }
  }

  private loadTemplate(templateName: string): HandlebarsTemplateDelegate {
    const templatePath = path.join(this.templatesDir, `${templateName}.hbs`);
    const templateSource = fs.readFileSync(templatePath, 'utf-8');
    return Handlebars.compile(templateSource);
  }

  private pickTransportLayout(transportPlan: any): {
    layoutMode: 'comfy' | 'compact' | 'ultra';
    pdf: PdfRenderOptions;
  } {
    const dayPlans = transportPlan?.dayPlans ?? [];
    const dayPlanCount = dayPlans.length;

    const textBlocks = [
      transportPlan?.vehicleNotes,
      transportPlan?.arrivalPickupNotes,
      transportPlan?.departureDropNotes,
      transportPlan?.internalNotes,
      ...dayPlans.map((d: any) => d.description),
      ...dayPlans.map((d: any) => d.notes),
      ...dayPlans.map((d: any) => d.pickupLocation),
      ...dayPlans.map((d: any) => d.dropLocation),
    ].filter(Boolean) as string[];

    const totalChars = textBlocks.reduce((sum, text) => sum + text.length, 0);
    const score = dayPlanCount * 16 + Math.ceil(totalChars / 120) * 5;

    if (score >= 95) {
      return {
        layoutMode: 'ultra',
        pdf: {
          margin: { top: '5mm', right: '5mm', bottom: '5mm', left: '5mm' },
          scale: 0.88,
          preferCSSPageSize: true,
        },
      };
    }

    if (score >= 55) {
      return {
        layoutMode: 'compact',
        pdf: {
          margin: { top: '7mm', right: '7mm', bottom: '7mm', left: '7mm' },
          scale: 0.93,
          preferCSSPageSize: true,
        },
      };
    }

    return {
      layoutMode: 'comfy',
      pdf: {
        margin: { top: '9mm', right: '9mm', bottom: '9mm', left: '9mm' },
        scale: 0.98,
        preferCSSPageSize: true,
      },
    };
  }

  private pickInvoiceLayout(invoice: any): {
    layoutMode: 'normal' | 'compact';
    pdf: PdfRenderOptions;
  } {
    const notesLength = (invoice?.paymentNotes?.length ?? 0) + (invoice?.paymentInstructions?.length ?? 0);

    // Keep invoice layout stable. Only switch to compact mode for long note content.
    if (notesLength > 220) {
      return {
        layoutMode: 'compact',
        pdf: {
          margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' },
          scale: 0.96,
          preferCSSPageSize: true,
        },
      };
    }

    return {
      layoutMode: 'normal',
      pdf: {
        margin: { top: '12mm', right: '11mm', bottom: '12mm', left: '11mm' },
        scale: 1,
        preferCSSPageSize: true,
      },
    };
  }

  private pickReservationLayout(booking: any): {
    layoutMode: 'normal' | 'compact';
    pdf: PdfRenderOptions;
  } {
    const hotels = booking?.hotelPlan ?? [];
    const hotelCount = hotels.length;

    const textBlocks = [
      booking?.specialCelebrations,
      ...hotels.map((h: any) => h.mobilityNotes),
      ...hotels.map((h: any) => h.reservationNotes),
      ...hotels.map((h: any) => h.hotelName),
      ...hotels.map((h: any) => h.roomCategory),
      ...hotels.map((h: any) => h.mealPreference),
    ].filter(Boolean) as string[];

    const totalChars = textBlocks.reduce((sum, text) => sum + text.length, 0);
    const score = hotelCount * 14 + Math.ceil(totalChars / 150) * 5;

    // Keep reservation layout stable. Compact mode is a gentle fallback for dense plans.
    if (score >= 70) {
      return {
        layoutMode: 'compact',
        pdf: {
          margin: { top: '9mm', right: '9mm', bottom: '9mm', left: '9mm' },
          scale: 0.95,
          preferCSSPageSize: true,
        },
      };
    }

    return {
      layoutMode: 'normal',
      pdf: {
        margin: { top: '11mm', right: '10mm', bottom: '11mm', left: '10mm' },
        scale: 1,
        preferCSSPageSize: true,
      },
    };
  }

  private pickItineraryLayout(booking: any): {
    layoutMode: 'normal' | 'compact';
    pdf: PdfRenderOptions;
  } {
    const hotelPlan = booking?.hotelPlan ?? [];
    const dayPlans = booking?.transportPlan?.dayPlans ?? [];
    const dayCount = booking?.numberOfDays ?? 0;

    const textBlocks = [
      booking?.generalNotes,
      booking?.specialCelebrations,
      ...hotelPlan.map((h: any) => h.hotelName),
      ...hotelPlan.map((h: any) => h.roomCategory),
      ...hotelPlan.map((h: any) => h.mealPreference),
      ...dayPlans.map((d: any) => d.description),
      ...dayPlans.map((d: any) => d.notes),
      ...dayPlans.map((d: any) => d.pickupLocation),
      ...dayPlans.map((d: any) => d.dropLocation),
    ].filter(Boolean) as string[];

    const totalChars = textBlocks.reduce((sum, text) => sum + text.length, 0);
    const score = dayCount * 12 + Math.ceil(totalChars / 170) * 5;

    // Keep itinerary styling readable. Compact mode is only for denser plans.
    if (score >= 95) {
      return {
        layoutMode: 'compact',
        pdf: {
          margin: { top: '8mm', right: '8mm', bottom: '8mm', left: '8mm' },
          scale: 0.94,
          preferCSSPageSize: true,
        },
      };
    }

    return {
      layoutMode: 'normal',
      pdf: {
        margin: { top: '10mm', right: '9mm', bottom: '10mm', left: '9mm' },
        scale: 1,
        preferCSSPageSize: true,
      },
    };
  }

  async generateInvoice(bookingId: string, generatedBy: string): Promise<string> {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { client: true, invoice: true, paxList: true },
    });

    if (!booking || !booking.invoice || !booking.client) {
      throw new Error('Booking, client, or invoice data not found');
    }

    const layout = this.pickInvoiceLayout(booking.invoice);

    const template = this.loadTemplate('invoice');
    const html = template({
      themeImage: this.themeImage,
      layoutMode: layout.layoutMode,
      booking,
      client: booking.client,
      invoice: booking.invoice,
      paxCount: booking.paxList.length + 1, // +1 for main guest
    });

    const filename = `invoice_${booking.bookingId}_${randomUUID().slice(0, 8)}.pdf`;
    const filePath = await this.renderPdf(html, filename, layout.pdf);

    await prisma.generatedDocument.create({
      data: {
        bookingId,
        type: 'INVOICE',
        filePath,
        generatedBy,
      },
    });

    logger.info(`Invoice generated for booking ${booking.bookingId}`);
    return filePath;
  }

  async generateTransportDetails(bookingId: string, generatedBy: string): Promise<string> {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        client: true,
        transportPlan: { include: { dayPlans: { orderBy: { dayNumber: 'asc' } } } },
      },
    });

    if (!booking || !booking.transportPlan || !booking.client) {
      throw new Error('Booking, client, or transport data not found');
    }

    const layout = this.pickTransportLayout(booking.transportPlan);

    const template = this.loadTemplate('transport');
    const html = template({
      themeImage: this.themeImage,
      layoutMode: layout.layoutMode,
      booking,
      client: booking.client,
      transport: booking.transportPlan,
    });

    const filename = `transport_${booking.bookingId}_${randomUUID().slice(0, 8)}.pdf`;
    const filePath = await this.renderPdf(html, filename, layout.pdf);

    await prisma.generatedDocument.create({
      data: {
        bookingId,
        type: 'TRANSPORT_DETAILS',
        filePath,
        generatedBy,
      },
    });

    logger.info(`Transport document generated for booking ${booking.bookingId}`);
    return filePath;
  }

  async generateHotelReservation(bookingId: string, generatedBy: string): Promise<string> {
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

    const adults = booking.paxList.filter((p: any) => p.type === 'ADULT').length + 1;
    const children = booking.paxList.filter((p: any) => p.type === 'CHILD').length;
    const infants = booking.paxList.filter((p: any) => p.type === 'INFANT').length;
    const layout = this.pickReservationLayout(booking);

    const template = this.loadTemplate('reservation');
    const html = template({
      themeImage: this.themeImage,
      layoutMode: layout.layoutMode,
      booking,
      client: booking.client,
      hotels: booking.hotelPlan,
      adults,
      children,
      infants,
      totalGuests: adults + children + infants,
    });

    const filename = `reservation_${booking.bookingId}_${randomUUID().slice(0, 8)}.pdf`;
    const filePath = await this.renderPdf(html, filename, layout.pdf);

    await prisma.generatedDocument.create({
      data: {
        bookingId,
        type: 'HOTEL_RESERVATION',
        filePath,
        generatedBy,
      },
    });

    logger.info(`Hotel reservation document generated for booking ${booking.bookingId}`);
    return filePath;
  }

  async generateItinerary(bookingId: string, generatedBy: string): Promise<string> {
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

    // Merge hotel and transport into day-by-day view
    const days = [];
    for (let i = 1; i <= booking.numberOfDays; i++) {
      const hotel = booking.hotelPlan.find((h: any) => h.nightNumber === i);
      const dayPlan = booking.transportPlan?.dayPlans.find((d: any) => d.dayNumber === i);
      days.push({
        dayNumber: i,
        hotel: hotel || null,
        transport: dayPlan || null,
      });
    }

    const layout = this.pickItineraryLayout(booking);

    const template = this.loadTemplate('itinerary');
    const html = template({
      themeImage: this.themeImage,
      layoutMode: layout.layoutMode,
      booking,
      client: booking.client,
      days,
      transport: booking.transportPlan,
    });

    const filename = `itinerary_${booking.bookingId}_${randomUUID().slice(0, 8)}.pdf`;
    const filePath = await this.renderPdf(html, filename, layout.pdf);

    await prisma.generatedDocument.create({
      data: {
        bookingId,
        type: 'FULL_ITINERARY',
        filePath,
        generatedBy,
      },
    });

    logger.info(`Full itinerary generated for booking ${booking.bookingId}`);
    return filePath;
  }
}

export const documentGeneratorService = new DocumentGeneratorService();
