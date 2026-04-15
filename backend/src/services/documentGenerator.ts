import puppeteer from 'puppeteer';
import Handlebars from 'handlebars';
import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';
import prisma from '../config/database';
import { env } from '../config/env';
import logger from '../utils/logger';

// Register Handlebars helpers
Handlebars.registerHelper('inc', (value: number) => value + 1);
Handlebars.registerHelper('formatDate', (date: Date | string) => {
  const d = new Date(date);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
});
Handlebars.registerHelper('formatCurrency', (amount: number | string, currency?: string) => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  const currencyCode = typeof currency === 'string' ? currency : 'USD';
  const locale = currencyCode === 'EUR' ? 'de-DE' : currencyCode === 'INR' ? 'en-IN' : 'en-US';
  return new Intl.NumberFormat(locale, { style: 'currency', currency: currencyCode }).format(num);
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
  // Compare at cent precision to avoid floating-point rounding noise.
  return Math.abs(Math.round(invoiceTotal * 100) - Math.round(computedTotal * 100)) <= 1;
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
      path.join(process.cwd(), 'assets', fileName.toUpperCase()),
      path.join(assetsRoot, fileName.toUpperCase()),
      path.join(frontendPublicAssets, fileName.toUpperCase()),
      path.join(parentFrontendPublicAssets, fileName.toUpperCase()),
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

      logger.info(`Loaded document theme image from ${candidate}`);
      return this.encodeImage(candidate);
    }

    logger.warn('No theme image found for document templates (expected theme.jpg/jpeg/png).');
    return null;
  }

  private async renderPdf(html: string, filename: string, options?: PdfRenderOptions): Promise<string> {
    const outputPath = path.join(this.outputDir, filename);
    logger.info(`[renderPdf] Launching Puppeteer for ${filename}`);
    logger.info(`[renderPdf] Output directory: ${this.outputDir}`);
    logger.info(`[renderPdf] Output path: ${outputPath}`);
    logger.info(`[renderPdf] HTML size: ${html.length} chars`);

    let browser;
    try {
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
      logger.info(`[renderPdf] Puppeteer browser launched successfully`);
    } catch (launchErr) {
      logger.error(`[renderPdf] Failed to launch Puppeteer browser: ${String(launchErr)}`);
      throw launchErr;
    }

    try {
      const page = await browser.newPage();
      logger.info(`[renderPdf] New page created, setting content...`);
      await page.setContent(html, { waitUntil: 'networkidle0' });
      logger.info(`[renderPdf] Page content set, rendering PDF...`);
      await page.pdf({
        path: outputPath,
        format: 'A4',
        margin: options?.margin ?? { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' },
        scale: options?.scale ?? 1,
        preferCSSPageSize: options?.preferCSSPageSize ?? true,
        printBackground: true,
      });
      logger.info(`[renderPdf] PDF written successfully to ${outputPath}`);
      return outputPath;
    } finally {
      await browser.close();
      logger.info(`[renderPdf] Browser closed`);
    }
  }

  private loadTemplate(templateName: string): HandlebarsTemplateDelegate {
    const templatePath = path.join(this.templatesDir, `${templateName}.hbs`);
    logger.info(`[loadTemplate] Loading template: ${templatePath}`);
    if (!fs.existsSync(templatePath)) {
      logger.error(`[loadTemplate] Template file NOT FOUND: ${templatePath}`);
      throw new Error(`Template file not found: ${templatePath}`);
    }
    const templateSource = fs.readFileSync(templatePath, 'utf-8');
    logger.info(`[loadTemplate] Template loaded (${templateSource.length} chars): ${templateName}.hbs`);
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
    logger.info(`[generateInvoice] START bookingId=${bookingId} generatedBy=${generatedBy}`);

    logger.info(`[generateInvoice] Querying DB for booking...`);
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { client: true, invoice: true, paxList: true },
    });

    logger.info(`[generateInvoice] DB result: booking=${!!booking} client=${!!booking?.client} invoice=${!!booking?.invoice} paxCount=${booking?.paxList?.length ?? 0}`);

    if (!booking || !booking.invoice || !booking.client) {
      logger.error(`[generateInvoice] Missing required data: booking=${!!booking} client=${!!booking?.client} invoice=${!!booking?.invoice}`);
      throw new Error('Booking, client, or invoice data not found');
    }

    logger.info(`[generateInvoice] Booking ref=${booking.bookingId} client=${booking.client.firstName} ${booking.client.lastName}`);

    const layout = this.pickInvoiceLayout(booking.invoice);
    logger.info(`[generateInvoice] Layout selected: ${layout.layoutMode}`);

    const costBreakdown = computeInvoiceCostBreakdown(booking);
    const showPolicyBreakdown = isPolicyBasedInvoiceTotal(
      Number(booking.invoice.totalAmount),
      costBreakdown.computedTotal
    );
    logger.info(`[generateInvoice] Cost breakdown computed: total=${String(booking.invoice.totalAmount)} showBreakdown=${showPolicyBreakdown}`);

    const template = this.loadTemplate('invoice');
    const tourInclusionsList = booking.invoice.tourInclusions
      ? booking.invoice.tourInclusions.split('\n').map((l: string) => l.trim()).filter(Boolean)
      : [];

    logger.info(`[generateInvoice] Rendering template with ${tourInclusionsList.length} inclusion items...`);
    const html = template({
      themeImage: this.themeImage,
      brandLogoImage: this.invoiceLogoImage || this.brandLogoImage,
      layoutMode: layout.layoutMode,
      booking,
      client: booking.client,
      invoice: booking.invoice,
      currencyCode: booking.client.preferredCurrency ?? 'USD',
      paxCount: booking.paxList.length + 1,
      costBreakdown,
      showPolicyBreakdown,
      tourInclusionsList,
    });
    logger.info(`[generateInvoice] Template rendered, HTML size=${html.length} chars`);

    const filename = `invoice_${booking.bookingId}_${randomUUID().slice(0, 8)}.pdf`;
    logger.info(`[generateInvoice] Calling renderPdf with filename=${filename}`);
    const filePath = await this.renderPdf(html, filename, layout.pdf);
    logger.info(`[generateInvoice] PDF rendered at ${filePath}`);

    await prisma.generatedDocument.create({
      data: {
        bookingId,
        type: 'INVOICE',
        filePath,
        generatedBy,
      },
    });

    logger.info(`[generateInvoice] DONE booking=${booking.bookingId} file=${filePath}`);
    return filePath;
  }

  async generateTransportDetails(bookingId: string, generatedBy: string): Promise<string> {
    logger.info(`[generateTransportDetails] START bookingId=${bookingId} generatedBy=${generatedBy}`);

    logger.info(`[generateTransportDetails] Querying DB for booking...`);
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        client: true,
        paxList: true,
        transportPlan: { include: { dayPlans: { orderBy: { dayNumber: 'asc' } } } },
      },
    });

    logger.info(`[generateTransportDetails] DB result: booking=${!!booking} client=${!!booking?.client} transportPlan=${!!booking?.transportPlan} dayPlans=${booking?.transportPlan?.dayPlans?.length ?? 0}`);

    if (!booking || !booking.transportPlan || !booking.client) {
      logger.error(`[generateTransportDetails] Missing required data: booking=${!!booking} client=${!!booking?.client} transportPlan=${!!booking?.transportPlan}`);
      throw new Error('Booking, client, or transport data not found');
    }

    const adults = booking.paxList.filter((p: any) => p.type === 'ADULT').length + 1;
    const children = booking.paxList.filter((p: any) => p.type === 'CHILD').length;
    const infants = booking.paxList.filter((p: any) => p.type === 'INFANT').length;
    logger.info(`[generateTransportDetails] Guests: adults=${adults} children=${children} infants=${infants}`);

    const layout = this.pickTransportLayout(booking.transportPlan);
    logger.info(`[generateTransportDetails] Layout selected: ${layout.layoutMode}`);

    const template = this.loadTemplate('transport');
    logger.info(`[generateTransportDetails] Rendering template...`);
    const html = template({
      brandLogoImage: this.invoiceLogoImage || this.brandLogoImage,
      layoutMode: layout.layoutMode,
      booking,
      client: booking.client,
      transport: booking.transportPlan,
      adults,
      children,
      infants,
      totalGuests: adults + children + infants,
    });

    const filename = `transport_${booking.bookingId}_${randomUUID().slice(0, 8)}.pdf`;
    logger.info(`[generateTransportDetails] Template rendered, calling renderPdf filename=${filename}`);
    const filePath = await this.renderPdf(html, filename, layout.pdf);
    logger.info(`[generateTransportDetails] PDF rendered at ${filePath}`);

    await prisma.generatedDocument.create({
      data: {
        bookingId,
        type: 'TRANSPORT_DETAILS',
        filePath,
        generatedBy,
      },
    });

    logger.info(`[generateTransportDetails] DONE booking=${booking.bookingId} file=${filePath}`);
    return filePath;
  }

  async generateHotelReservation(bookingId: string, generatedBy: string): Promise<string> {
    logger.info(`[generateHotelReservation] START bookingId=${bookingId} generatedBy=${generatedBy}`);

    logger.info(`[generateHotelReservation] Querying DB for booking...`);
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        client: true,
        paxList: true,
        hotelPlan: { orderBy: { nightNumber: 'asc' } },
      },
    });

    logger.info(`[generateHotelReservation] DB result: booking=${!!booking} client=${!!booking?.client} hotelNights=${booking?.hotelPlan?.length ?? 0}`);

    if (!booking || !booking.client || booking.hotelPlan.length === 0) {
      logger.error(`[generateHotelReservation] Missing required data: booking=${!!booking} client=${!!booking?.client} hotelNights=${booking?.hotelPlan?.length ?? 0}`);
      throw new Error('Booking, client, or hotel data not found');
    }

    const adults = booking.paxList.filter((p: any) => p.type === 'ADULT').length + 1;
    const children = booking.paxList.filter((p: any) => p.type === 'CHILD').length;
    const infants = booking.paxList.filter((p: any) => p.type === 'INFANT').length;
    logger.info(`[generateHotelReservation] Guests: adults=${adults} children=${children} infants=${infants}`);

    const layout = this.pickReservationLayout(booking);
    logger.info(`[generateHotelReservation] Layout selected: ${layout.layoutMode}`);

    const template = this.loadTemplate('reservation');
    logger.info(`[generateHotelReservation] Rendering template...`);
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
    logger.info(`[generateHotelReservation] Template rendered, calling renderPdf filename=${filename}`);
    const filePath = await this.renderPdf(html, filename, layout.pdf);
    logger.info(`[generateHotelReservation] PDF rendered at ${filePath}`);

    await prisma.generatedDocument.create({
      data: {
        bookingId,
        type: 'HOTEL_RESERVATION',
        filePath,
        generatedBy,
      },
    });

    logger.info(`[generateHotelReservation] DONE booking=${booking.bookingId} file=${filePath}`);
    return filePath;
  }

  async generateItinerary(
    bookingId: string,
    generatedBy: string,
    planDaysInput?: ItineraryPlanDayInput[]
  ): Promise<{ filePath: string; docId: string }> {
    logger.info(`[generateItinerary] START bookingId=${bookingId} generatedBy=${generatedBy} planDaysInput=${JSON.stringify(planDaysInput ?? [])}`);

    logger.info(`[generateItinerary] Querying DB for booking...`);
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        client: true,
        paxList: true,
        hotelPlan: { orderBy: { nightNumber: 'asc' } },
        transportPlan: { include: { dayPlans: { orderBy: { dayNumber: 'asc' } } } },
      },
    });

    logger.info(`[generateItinerary] DB result: booking=${!!booking} client=${!!booking?.client} hotelNights=${booking?.hotelPlan?.length ?? 0} transportPlan=${!!booking?.transportPlan} dayPlans=${booking?.transportPlan?.dayPlans?.length ?? 0}`);

    if (!booking || !booking.client) {
      logger.error(`[generateItinerary] Missing required data: booking=${!!booking} client=${!!booking?.client}`);
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

      days.push({
        dayNumber: i,
        hotel: hotel || null,
        transport: dayPlan || null,
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
    logger.info(`[generateItinerary] Guests: adults=${adults} children=${children} infants=${infants} days=${booking.numberOfDays} planDays=${planDays.length}`);

    const layout = this.pickItineraryLayout(booking);
    logger.info(`[generateItinerary] Layout selected: ${layout.layoutMode}`);

    const template = this.loadTemplate('itinerary');
    logger.info(`[generateItinerary] Rendering template...`);
    const html = template({
      themeImage: this.themeImage,
      coverTemplateImage: this.itineraryCoverImage,
      brandLogoImage: this.brandLogoImage,
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

    const filename = `itinerary_${booking.bookingId}_${randomUUID().slice(0, 8)}.pdf`;
    logger.info(`[generateItinerary] Template rendered HTML size=${html.length} chars, calling renderPdf filename=${filename}`);
    const filePath = await this.renderPdf(html, filename, layout.pdf);
    logger.info(`[generateItinerary] PDF rendered at ${filePath}`);

    const doc = await prisma.generatedDocument.create({
      data: {
        bookingId,
        type: 'FULL_ITINERARY',
        filePath,
        generatedBy,
      },
    });

    logger.info(`[generateItinerary] DONE booking=${booking.bookingId} file=${filePath} docId=${doc.id}`);
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
    logger.info(`[generateTravelConfirmation] START bookingId=${bookingId} generatedBy=${generatedBy}`);

    logger.info(`[generateTravelConfirmation] Querying DB for booking...`);
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        client: true,
        paxList: true,
        hotelPlan: { orderBy: { nightNumber: 'asc' } },
        transportPlan: true,
      },
    });

    logger.info(`[generateTravelConfirmation] DB result: booking=${!!booking} client=${!!booking?.client} hotelNights=${booking?.hotelPlan?.length ?? 0} transportPlan=${!!booking?.transportPlan}`);

    if (!booking || !booking.client || booking.hotelPlan.length === 0) {
      logger.error(`[generateTravelConfirmation] Missing required data: booking=${!!booking} client=${!!booking?.client} hotelNights=${booking?.hotelPlan?.length ?? 0}`);
      throw new Error('Booking, client, or hotel data not found');
    }

    const adults = booking.paxList.filter((p: any) => p.type === 'ADULT').length + 1;
    const children = booking.paxList.filter((p: any) => p.type === 'CHILD').length;
    const infants = booking.paxList.filter((p: any) => p.type === 'INFANT').length;
    logger.info(`[generateTravelConfirmation] Guests: adults=${adults} children=${children} infants=${infants}`);

    // Build day-by-day rows from hotel plan
    const arrivalDate = new Date(booking.arrivalDate);
    const days = booking.hotelPlan.map((h: any, idx: number) => {
      const date = new Date(arrivalDate);
      date.setDate(date.getDate() + idx);
      return {
        dayNumber: idx + 1,
        date,
        location: this.extractLocation(h.hotelName),
        hotelName: h.hotelName,
        roomCategory: h.roomCategory || '—',
      };
    });

    const layout = this.pickTravelConfirmationLayout(booking);
    logger.info(`[generateTravelConfirmation] Layout selected: ${layout.layoutMode}`);

    const template = this.loadTemplate('travelConfirmation');
    logger.info(`[generateTravelConfirmation] Rendering template...`);
    const html = template({
      brandLogoImage: this.invoiceLogoImage || this.brandLogoImage,
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

    const filename = `travel_confirmation_${booking.bookingId}_${randomUUID().slice(0, 8)}.pdf`;
    logger.info(`[generateTravelConfirmation] Template rendered HTML size=${html.length} chars, calling renderPdf filename=${filename}`);
    const filePath = await this.renderPdf(html, filename, layout.pdf);
    logger.info(`[generateTravelConfirmation] PDF rendered at ${filePath}`);

    await prisma.generatedDocument.create({
      data: {
        bookingId,
        type: 'TRAVEL_CONFIRMATION',
        filePath,
        generatedBy,
      },
    });

    logger.info(`[generateTravelConfirmation] DONE booking=${booking.bookingId} file=${filePath}`);
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
