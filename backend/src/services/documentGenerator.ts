import puppeteer from 'puppeteer';
import Handlebars from 'handlebars';
import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';
import prisma from '../config/database';
import { env } from '../config/env';
import logger from '../utils/logger';
import { getLegsForPlan, legTemplateLabels } from './distanceService';
import type { ItineraryPlanDay } from '../types/itineraryPlan';

// Register Handlebars helpers
Handlebars.registerHelper('inc', (value: number) => value + 1);
Handlebars.registerHelper('formatDate', (date: Date | string) => {
  const d = new Date(date);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
});
Handlebars.registerHelper('formatDateColombo', (date: Date | string) => {
  const d = new Date(date);
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Colombo',
  });
});
Handlebars.registerHelper('formatCurrency', (amount: number | string, currency?: string) => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (!Number.isFinite(num)) return String(amount);
  const currencyCode = (typeof currency === 'string' ? currency : 'USD').toUpperCase();
  const locale = currencyCode === 'EUR' ? 'de-DE' : currencyCode === 'INR' ? 'en-IN' : 'en-US';
  // Use currency code for rupee currencies to avoid missing symbol glyphs in headless PDF fonts.
  const forceCodeDisplay = currencyCode === 'LKR' || currencyCode === 'INR';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currencyCode,
    currencyDisplay: forceCodeDisplay ? 'code' : 'symbol',
  }).format(num);
});
Handlebars.registerHelper('eq', (a: unknown, b: unknown) => a === b);
Handlebars.registerHelper('titleCase', (value: unknown) => {
  if (typeof value !== 'string') return value;
  return value
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
});

Handlebars.registerHelper('padZero', (value: number) => {
  return String(value).padStart(2, '0');
});

Handlebars.registerHelper('guestBreakdown', (adults: number, children: number, infants: number) => {
  const parts: string[] = [];
  if (adults > 0) parts.push(`Adult${adults > 1 ? 's' : ''}`);
  if (children > 0) parts.push(`${String(children).padStart(2, '0')} Child${children > 1 ? 'ren' : ''}`);
  if (infants > 0) parts.push(`${String(infants).padStart(2, '0')} Infant${infants > 1 ? 's' : ''}`);
  return parts.join(', ');
});

Handlebars.registerHelper('roomSummary', (hotels: any[]) => {
  if (!hotels || hotels.length === 0) return '—';
  // Deduplicate: sum rooms by category
  const map = new Map<string, number>();
  for (const h of hotels) {
    const cat = h.roomCategory || 'Room';
    const rooms = h.numberOfRooms || 1;
    map.set(cat, Math.max(map.get(cat) || 0, rooms));
  }
  const parts: string[] = [];
  for (const [cat, count] of map) {
    parts.push(`${String(count).padStart(2, '0')} ${cat}${count > 1 ? 's' : ''}`);
  }
  return parts.join(', ');
});

Handlebars.registerHelper('mealPlanSummary', (hotels: any[]) => {
  if (!hotels || hotels.length === 0) return '—';
  const codeMap: Record<string, string> = {
    'bb': 'BB', 'hb': 'HB', 'fb': 'FB', 'ro': 'RO',
  };
  const unique = new Set<string>();
  for (const h of hotels) {
    const raw = (h.mealPlan || '').trim().toLowerCase();
    unique.add(codeMap[raw] || h.mealPlan || '—');
  }
  return Array.from(unique).join(', ');
});

type PdfRenderOptions = {
  margin?: { top: string; right: string; bottom: string; left: string };
  scale?: number;
  preferCSSPageSize?: boolean;
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

const toFiniteNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : fallback;
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value.replace(/,/g, '').trim());
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  if (value && typeof value === 'object') {
    if ('toNumber' in value && typeof (value as { toNumber?: unknown }).toNumber === 'function') {
      const parsed = (value as { toNumber: () => number }).toNumber();
      return Number.isFinite(parsed) ? parsed : fallback;
    }
    if ('toString' in value && typeof (value as { toString?: unknown }).toString === 'function') {
      const parsed = Number.parseFloat((value as { toString: () => string }).toString());
      return Number.isFinite(parsed) ? parsed : fallback;
    }
  }
  return fallback;
};

const policyTierForPax = (p: { age?: number | null; type: string }): 'infant' | 'child' | 'adult' => {
  if (p.age != null && Number.isFinite(Number(p.age))) {
    const age = Number(p.age);
    if (age <= 5) return 'infant';
    if (age <= 11) return 'child';
    return 'adult';
  }
  if (p.type === 'INFANT') return 'infant';
  if (p.type === 'CHILD') return 'child';
  return 'adult';
};

const computeInvoiceCostBreakdown = (booking: any): InvoiceCostBreakdown => {
  const costPerPerson = toFiniteNumber(booking.invoice.costPerPerson);
  let adults = booking.client ? 1 : 0;
  let children = 0;
  let infants = 0;
  for (const p of booking.paxList ?? []) {
    const tier = policyTierForPax(p);
    if (tier === 'adult') adults += 1;
    else if (tier === 'child') children += 1;
    else infants += 1;
  }

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

const EMOJI_REGEX = /[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}]/gu;
const EMOJI_JOINERS_REGEX = /[\u200D\uFE0F]/g;

const sanitizeTextContent = (value: string | null | undefined): string => {
  if (typeof value !== 'string') return '';
  return value
    .replace(EMOJI_REGEX, '')
    .replace(EMOJI_JOINERS_REGEX, '')
    .trim();
};

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  if (!value || typeof value !== 'object') return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

const sanitizeTemplateData = <T>(value: T): T => {
  if (typeof value === 'string') return sanitizeTextContent(value) as T;
  if (Array.isArray(value)) return value.map((item) => sanitizeTemplateData(item)) as T;
  if (isPlainObject(value)) {
    const sanitizedEntries = Object.entries(value).map(([key, item]) => [key, sanitizeTemplateData(item)]);
    return Object.fromEntries(sanitizedEntries) as T;
  }
  return value;
};

export class DocumentGeneratorService {
  private templatesDir: string;
  private outputDir: string;
  private themeImage: string | null;
  private itineraryCoverImage: string | null;
  private brandLogoImage: string | null;
  private invoiceLogoImage: string | null;

  constructor() {
    this.templatesDir = path.join(__dirname, '..', 'templates');
    this.outputDir = path.join(env.UPLOAD_DIR, 'documents');
    this.themeImage = this.loadThemeImage();
    this.itineraryCoverImage = this.loadAssetImage('Template.png');
    this.brandLogoImage = this.loadAssetImage('logo.png');
    this.invoiceLogoImage = this.loadAssetImage('logo-02.png');
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  private getImageMime(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    if (ext === '.png') return 'image/png';
    if (ext === '.avif') return 'image/avif';
    return 'image/jpeg';
  }

  private encodeImage(filePath: string): string {
    const image = fs.readFileSync(filePath).toString('base64');
    return `data:${this.getImageMime(filePath)};base64,${image}`;
  }

  private loadAssetImage(fileName: string): string | null {
    const configuredPath =
      (fileName === 'logo-02.png' && env.DOCUMENT_INVOICE_LOGO_PATH) ||
      (fileName === 'theme.jpg' && env.DOCUMENT_THEME_PATH) ||
      (fileName === 'theme.jpeg' && env.DOCUMENT_THEME_PATH) ||
      (fileName === 'theme.png' && env.DOCUMENT_THEME_PATH) ||
      env.DOCUMENT_LOGO_PATH;

    const configuredCandidates = configuredPath
      ? [configuredPath, path.resolve(configuredPath), path.join(process.cwd(), configuredPath)]
      : [];
    const assetsRoot = path.join(process.cwd(), '..', 'assets');
    const frontendPublicAssets = path.join(process.cwd(), 'frontend', 'public', 'assets');
    const parentFrontendPublicAssets = path.join(process.cwd(), '..', 'frontend', 'public', 'assets');
    const uploadAssets = path.join(env.UPLOAD_DIR, 'assets');
    const uploadDocumentsAssets = path.join(env.UPLOAD_DIR, 'documents', 'assets');
    const candidates = [
      ...configuredCandidates,
      path.join(process.cwd(), 'assets', fileName),
      path.join(assetsRoot, fileName),
      path.join(process.cwd(), 'dist', 'assets', fileName),
      path.join(frontendPublicAssets, fileName),
      path.join(parentFrontendPublicAssets, fileName),
      path.join(uploadAssets, fileName),
      path.join(uploadDocumentsAssets, fileName),
      path.join(process.cwd(), 'assets', fileName.toLowerCase()),
      path.join(assetsRoot, fileName.toLowerCase()),
      path.join(process.cwd(), 'dist', 'assets', fileName.toLowerCase()),
      path.join(frontendPublicAssets, fileName.toLowerCase()),
      path.join(parentFrontendPublicAssets, fileName.toLowerCase()),
      path.join(uploadAssets, fileName.toLowerCase()),
      path.join(uploadDocumentsAssets, fileName.toLowerCase()),
      path.join(process.cwd(), 'assets', fileName.toUpperCase()),
      path.join(assetsRoot, fileName.toUpperCase()),
      path.join(process.cwd(), 'dist', 'assets', fileName.toUpperCase()),
      path.join(frontendPublicAssets, fileName.toUpperCase()),
      path.join(parentFrontendPublicAssets, fileName.toUpperCase()),
      path.join(uploadAssets, fileName.toUpperCase()),
      path.join(uploadDocumentsAssets, fileName.toUpperCase()),
    ];

    for (const candidate of candidates) {
      if (!fs.existsSync(candidate)) continue;
      logger.info(`Loaded document asset image from ${candidate}`);
      return this.encodeImage(candidate);
    }

    logger.warn(`Asset image not found: ${fileName}`);
    return null;
  }

  private loadThemeImage(): string | null {
    if (env.DOCUMENT_THEME_PATH) {
      const configured = [env.DOCUMENT_THEME_PATH, path.resolve(env.DOCUMENT_THEME_PATH), path.join(process.cwd(), env.DOCUMENT_THEME_PATH)];
      for (const candidate of configured) {
        if (!fs.existsSync(candidate)) continue;
        logger.info(`Loaded document theme image from configured path ${candidate}`);
        return this.encodeImage(candidate);
      }
      logger.warn(`Configured DOCUMENT_THEME_PATH was not found: ${env.DOCUMENT_THEME_PATH}`);
    }

    const candidates = [
      path.join(process.cwd(), 'theme.jpg'),
      path.join(process.cwd(), 'theme.jpeg'),
      path.join(process.cwd(), 'theme.png'),
      path.join(process.cwd(), '..', 'theme.jpg'),
      path.join(process.cwd(), '..', 'theme.jpeg'),
      path.join(process.cwd(), '..', 'theme.png'),
      path.join(env.UPLOAD_DIR, 'assets', 'theme.jpg'),
      path.join(env.UPLOAD_DIR, 'assets', 'theme.jpeg'),
      path.join(env.UPLOAD_DIR, 'assets', 'theme.png'),
    ];

    for (const candidate of candidates) {
      if (!fs.existsSync(candidate)) continue;

      logger.info(`Loaded document theme image from ${candidate}`);
      return this.encodeImage(candidate);
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
    const denseByNights = hotelPlan.length >= 8;

    // Keep itinerary styling readable. Compact mode for denser plans,
    // including medium+ itineraries by night count.
    if (score >= 95 || denseByNights) {
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
    const costBreakdown = computeInvoiceCostBreakdown(booking);
    const hasChildOrInfant =
      costBreakdown.children > 0 ||
      costBreakdown.infants > 0 ||
      (booking.paxList ?? []).some((p: { type?: string }) => p.type === 'CHILD' || p.type === 'INFANT');
    const showPolicyBreakdown = hasChildOrInfant;
    const sanitizedPaymentNotes = sanitizeTextContent(booking.invoice.paymentNotes);

    const template = this.loadTemplate('invoice');
    const generatedAt = new Date();
    const tourInclusionsList = booking.invoice.tourInclusions
      ? booking.invoice.tourInclusions.split('\n').map((l: string) => l.trim()).filter(Boolean)
      : [];

    const templateData = sanitizeTemplateData({
      themeImage: this.themeImage,
      brandLogoImage: this.invoiceLogoImage || this.brandLogoImage || env.DOCUMENT_INVOICE_LOGO_URL || env.DOCUMENT_LOGO_URL || null,
      layoutMode: layout.layoutMode,
      booking,
      client: booking.client,
      invoice: booking.invoice,
      generatedAt,
      sanitizedPaymentNotes,
      currencyCode: booking.client.preferredCurrency ?? 'USD',
      paxCount: booking.paxList.length + 1, // +1 for main guest
      costBreakdown,
      showPolicyBreakdown,
      tourInclusionsList,
    });
    const html = template(templateData);

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
        paxList: true,
        transportPlan: { include: { dayPlans: { orderBy: { dayNumber: 'asc' } } } },
      },
    });

    if (!booking || !booking.transportPlan || !booking.client) {
      throw new Error('Booking, client, or transport data not found');
    }

    const adults = booking.paxList.filter((p: any) => p.type === 'ADULT').length + 1;
    const children = booking.paxList.filter((p: any) => p.type === 'CHILD').length;
    const infants = booking.paxList.filter((p: any) => p.type === 'INFANT').length;

    const layout = this.pickTransportLayout(booking.transportPlan);

    const template = this.loadTemplate('transport');
    const templateData = sanitizeTemplateData({
      brandLogoImage: this.invoiceLogoImage || this.brandLogoImage || env.DOCUMENT_INVOICE_LOGO_URL || env.DOCUMENT_LOGO_URL || null,
      layoutMode: layout.layoutMode,
      booking,
      client: booking.client,
      transport: booking.transportPlan,
      adults,
      children,
      infants,
      totalGuests: adults + children + infants,
    });
    const html = template(templateData);

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
    const templateData = sanitizeTemplateData({
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
    const html = template(templateData);

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

  async generateItinerary(
    bookingId: string,
    generatedBy: string,
    planDaysInput?: ItineraryPlanDay[]
  ): Promise<{ filePath: string; docId: string }> {
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

    const destinationIds = Array.from(
      new Set(planDays.map((day) => day.destinationId).filter(Boolean) as string[])
    );

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

    const planLegs = planDays.length > 0 ? await getLegsForPlan(planDays) : [];
    const legByToDay = new Map(planLegs.map((leg) => [leg.toDayNumber, leg]));

    // Merge hotel, transport, and itinerary plan into day-by-day view
    const days = [];
    for (let i = 1; i <= booking.numberOfDays; i++) {
      const hotel = booking.hotelPlan.find((h: any) => h.nightNumber === i);
      const dayPlan = booking.transportPlan?.dayPlans.find((d: any) => d.dayNumber === i);
      const itineraryPlan = planDays.find((day) => day.dayNumber === i);
      const destination = itineraryPlan?.destinationId
        ? destinationMap.get(itineraryPlan.destinationId)
        : null;
      const morning = itineraryPlan?.morningActivityId
        ? activityMap.get(itineraryPlan.morningActivityId)
        : null;
      const afternoon = itineraryPlan?.afternoonActivityId
        ? activityMap.get(itineraryPlan.afternoonActivityId)
        : null;
      const evening = itineraryPlan?.eveningActivityId
        ? activityMap.get(itineraryPlan.eveningActivityId)
        : null;
      const planActivities = [
        morning
          ? {
              slot: 'Morning',
              title: morning.title,
              description: morning.description,
              duration: 'Morning Session',
            }
          : null,
        afternoon
          ? {
              slot: 'Afternoon',
              title: afternoon.title,
              description: afternoon.description,
              duration: 'Afternoon Session',
            }
          : null,
        evening
          ? {
              slot: 'Evening',
              title: evening.title,
              description: evening.description,
              duration: 'Evening Session',
            }
          : null,
      ].filter(Boolean);

      const planLeg = legByToDay.get(i);
      const leg = planLeg
        ? (() => {
            const { distanceLabel, durationLabel } = legTemplateLabels(planLeg);
            return {
              distanceLabel,
              durationLabel,
              summary: planLeg.displayLabel,
              fromName: planLeg.fromDestinationName,
              toName: planLeg.toDestinationName,
            };
          })()
        : null;

      days.push({
        dayNumber: i,
        hotel: hotel || null,
        transport: dayPlan || null,
        leg,
        itinerary: itineraryPlan
          ? {
              dateLabel: itineraryPlan.dateLabel,
              destinationName: destination?.name || null,
              destinationSlug: destination?.slug || null,
              morningActivityTitle: morning?.title || null,
              afternoonActivityTitle: afternoon?.title || null,
              eveningActivityTitle: evening?.title || null,
              notes: itineraryPlan.notes || null,
              activities: planActivities,
            }
          : null,
      });
    }

    const adults = booking.paxList.filter((p: any) => p.type === 'ADULT').length + 1;
    const children = booking.paxList.filter((p: any) => p.type === 'CHILD').length;
    const infants = booking.paxList.filter((p: any) => p.type === 'INFANT').length;

    const layout = this.pickItineraryLayout(booking);

    const template = this.loadTemplate('itinerary');
    const templateData = sanitizeTemplateData({
      themeImage: this.themeImage,
      coverTemplateImage: this.itineraryCoverImage,
      brandLogoImage: this.brandLogoImage || env.DOCUMENT_LOGO_URL || null,
      layoutMode: layout.layoutMode,
      booking,
      client: booking.client,
      hotels: booking.hotelPlan,
      adults,
      children,
      infants,
      roomNights: booking.hotelPlan.length,
      totalGuests: adults + children + infants,
      days,
      transport: booking.transportPlan,
      hasItineraryPlan: planDays.length > 0,
    });
    const html = template(templateData);

    const filename = `itinerary_${booking.bookingId}_${randomUUID().slice(0, 8)}.pdf`;
    const filePath = await this.renderPdf(html, filename, layout.pdf);

    const doc = await prisma.generatedDocument.create({
      data: {
        bookingId,
        type: 'FULL_ITINERARY',
        filePath,
        generatedBy,
      },
    });

    logger.info(`Full itinerary generated for booking ${booking.bookingId}`);
    return { filePath, docId: doc.id };
  }

  private pickTravelConfirmationLayout(booking: any): {
    layoutMode: 'normal' | 'compact';
    pdf: PdfRenderOptions;
  } {
    const hotelCount = booking?.hotelPlan?.length ?? 0;

    if (hotelCount >= 10) {
      return {
        layoutMode: 'compact',
        pdf: {
          margin: { top: '9mm', right: '10mm', bottom: '9mm', left: '10mm' },
          scale: 0.95,
          preferCSSPageSize: true,
        },
      };
    }

    return {
      layoutMode: 'normal',
      pdf: {
        margin: { top: '12mm', right: '12mm', bottom: '12mm', left: '12mm' },
        scale: 1,
        preferCSSPageSize: true,
      },
    };
  }

  async generateTravelConfirmation(bookingId: string, generatedBy: string): Promise<string> {
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

    const adults = booking.paxList.filter((p: any) => p.type === 'ADULT').length + 1;
    const children = booking.paxList.filter((p: any) => p.type === 'CHILD').length;
    const infants = booking.paxList.filter((p: any) => p.type === 'INFANT').length;

    // Build day-by-day rows from hotel plan
    const arrivalDate = new Date(booking.arrivalDate);
    const days = booking.hotelPlan.map((h: any, idx: number) => {
      const date = new Date(arrivalDate);
      date.setDate(date.getDate() + idx);
      return {
        dayNumber: idx + 1,
        date,
        location: (h.location && String(h.location).trim()) || this.extractLocation(h.hotelName),
        hotelName: h.hotelName,
        roomCategory: h.roomCategory || '—',
      };
    });

    const layout = this.pickTravelConfirmationLayout(booking);

    const template = this.loadTemplate('travelConfirmation');
    const templateData = sanitizeTemplateData({
      brandLogoImage: this.invoiceLogoImage || this.brandLogoImage || env.DOCUMENT_INVOICE_LOGO_URL || env.DOCUMENT_LOGO_URL || null,
      layoutMode: layout.layoutMode,
      booking,
      client: booking.client,
      hotels: booking.hotelPlan,
      transport: booking.transportPlan,
      adults,
      children,
      infants,
      totalGuests: adults + children + infants,
      days,
    });
    const html = template(templateData);

    const filename = `travel_confirmation_${booking.bookingId}_${randomUUID().slice(0, 8)}.pdf`;
    const filePath = await this.renderPdf(html, filename, layout.pdf);

    await prisma.generatedDocument.create({
      data: {
        bookingId,
        type: 'TRAVEL_CONFIRMATION',
        filePath,
        generatedBy,
      },
    });

    logger.info(`Travel confirmation generated for booking ${booking.bookingId}`);
    return filePath;
  }

  private extractLocation(hotelName: string): string {
    // Common Sri Lankan location keywords; try to extract from hotel name
    const locations: Record<string, string> = {
      'kandy': 'Kandy',
      'colombo': 'Colombo',
      'galle': 'Galle',
      'nuwara eliya': 'Nuwara Eliya',
      'ella': 'Ella',
      'yala': 'Yala',
      'sigiriya': 'Sigiriya',
      'dambulla': 'Dambulla',
      'trincomalee': 'Trincomalee',
      'bentota': 'Bentota',
      'mirissa': 'Mirissa',
      'unawatuna': 'Unawatuna',
      'anuradhapura': 'Anuradhapura',
      'polonnaruwa': 'Polonnaruwa',
      'hikkaduwa': 'Hikkaduwa',
      'negombo': 'Negombo',
      'jaffna': 'Jaffna',
      'ahangama': 'Ahangama',
      'arugam bay': 'Arugam Bay',
      'habarana': 'Habarana',
      'pasikuda': 'Pasikuda',
      'weligama': 'Weligama',
      'tangalle': 'Tangalle',
      'kitulgala': 'Kitulgala',
      'hatton': 'Hatton',
      'nallathanniya': 'Nallathanniya',
      'tissamaharama': 'Tissamaharama',
      'udawalawe': 'Udawalawe',
      'wilpattu': 'Wilpattu',
      'kalpitiya': 'Kalpitiya',
      'pinnawala': 'Pinnawala',
      'ratnapura': 'Ratnapura',
      'badulla': 'Badulla',
      'matale': 'Matale',
      'mahaweli': 'Kandy',
      'jetwing': 'Yala',
      'radisson': 'Galle',
    };
    const lower = hotelName.toLowerCase();
    for (const [key, value] of Object.entries(locations)) {
      if (lower.includes(key)) return value;
    }
    return hotelName;
  }

  private formatMealPlanCode(mealPlan: string): string {
    if (!mealPlan) return '—';
    const lower = mealPlan.toLowerCase().trim();
    if (lower === 'bb' || lower.includes('bed') && lower.includes('breakfast')) return 'BB';
    if (lower === 'hb' || lower.includes('half board')) return 'HB';
    if (lower === 'fb' || lower.includes('full board')) return 'FB';
    if (lower === 'ro' || lower.includes('room only')) return 'RO';
    return mealPlan;
  }
}

export const documentGeneratorService = new DocumentGeneratorService();
