import puppeteer from 'puppeteer';
import Handlebars from 'handlebars';
import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import prisma from '../config/database';
import { DocumentType } from '@prisma/client';
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

export class DocumentGeneratorService {
  private templatesDir: string;
  private outputDir: string;

  constructor() {
    this.templatesDir = path.join(__dirname, '..', 'templates');
    this.outputDir = path.join(env.UPLOAD_DIR, 'documents');
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  private async renderPdf(html: string, filename: string): Promise<string> {
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
        margin: { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' },
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

  async generateInvoice(bookingId: string, generatedBy: string): Promise<string> {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { client: true, invoice: true, paxList: true },
    });

    if (!booking || !booking.invoice || !booking.client) {
      throw new Error('Booking, client, or invoice data not found');
    }

    const template = this.loadTemplate('invoice');
    const html = template({
      booking,
      client: booking.client,
      invoice: booking.invoice,
      paxCount: booking.paxList.length + 1, // +1 for main guest
    });

    const filename = `invoice_${booking.bookingId}_${randomUUID().slice(0, 8)}.pdf`;
    const filePath = await this.renderPdf(html, filename);

    await prisma.generatedDocument.create({
      data: {
        bookingId,
        type: DocumentType.INVOICE,
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

    const template = this.loadTemplate('transport');
    const html = template({
      booking,
      client: booking.client,
      transport: booking.transportPlan,
    });

    const filename = `transport_${booking.bookingId}_${randomUUID().slice(0, 8)}.pdf`;
    const filePath = await this.renderPdf(html, filename);

    await prisma.generatedDocument.create({
      data: {
        bookingId,
        type: DocumentType.TRANSPORT_DETAILS,
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

    const adults = booking.paxList.filter((p) => p.type === 'ADULT').length + 1;
    const children = booking.paxList.filter((p) => p.type === 'CHILD').length;
    const infants = booking.paxList.filter((p) => p.type === 'INFANT').length;

    const template = this.loadTemplate('reservation');
    const html = template({
      booking,
      client: booking.client,
      hotels: booking.hotelPlan,
      adults,
      children,
      infants,
      totalGuests: adults + children + infants,
    });

    const filename = `reservation_${booking.bookingId}_${randomUUID().slice(0, 8)}.pdf`;
    const filePath = await this.renderPdf(html, filename);

    await prisma.generatedDocument.create({
      data: {
        bookingId,
        type: DocumentType.HOTEL_RESERVATION,
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
      const hotel = booking.hotelPlan.find((h) => h.nightNumber === i);
      const dayPlan = booking.transportPlan?.dayPlans.find((d) => d.dayNumber === i);
      days.push({
        dayNumber: i,
        hotel: hotel || null,
        transport: dayPlan || null,
      });
    }

    const template = this.loadTemplate('itinerary');
    const html = template({
      booking,
      client: booking.client,
      days,
      transport: booking.transportPlan,
    });

    const filename = `itinerary_${booking.bookingId}_${randomUUID().slice(0, 8)}.pdf`;
    const filePath = await this.renderPdf(html, filename);

    await prisma.generatedDocument.create({
      data: {
        bookingId,
        type: DocumentType.FULL_ITINERARY,
        filePath,
        generatedBy,
      },
    });

    logger.info(`Full itinerary generated for booking ${booking.bookingId}`);
    return filePath;
  }
}

export const documentGeneratorService = new DocumentGeneratorService();
