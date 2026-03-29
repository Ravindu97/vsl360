export enum Role {
  SALES = 'SALES',
  RESERVATION = 'RESERVATION',
  TRANSPORT = 'TRANSPORT',
  OPS_MANAGER = 'OPS_MANAGER',
}

export enum BookingStatus {
  INQUIRY_RECEIVED = 'INQUIRY_RECEIVED',
  CLIENT_PROFILE_CREATED = 'CLIENT_PROFILE_CREATED',
  PAX_DETAILS_ADDED = 'PAX_DETAILS_ADDED',
  COSTING_COMPLETED = 'COSTING_COMPLETED',
  SALES_CONFIRMED = 'SALES_CONFIRMED',
  RESERVATION_PENDING = 'RESERVATION_PENDING',
  RESERVATION_COMPLETED = 'RESERVATION_COMPLETED',
  TRANSPORT_PENDING = 'TRANSPORT_PENDING',
  TRANSPORT_COMPLETED = 'TRANSPORT_COMPLETED',
  DOCUMENTS_READY = 'DOCUMENTS_READY',
  OPS_APPROVED = 'OPS_APPROVED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum PaxType {
  ADULT = 'ADULT',
  CHILD = 'CHILD',
  INFANT = 'INFANT',
}

export enum DocumentType {
  INVOICE = 'INVOICE',
  TRANSPORT_DETAILS = 'TRANSPORT_DETAILS',
  HOTEL_RESERVATION = 'HOTEL_RESERVATION',
  FULL_ITINERARY = 'FULL_ITINERARY',
  TRAVEL_CONFIRMATION = 'TRAVEL_CONFIRMATION',
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
}

export interface Client {
  id: string;
  bookingId: string;
  name: string;
  citizenship: string;
  languagePreference: string;
  email: string;
  contactNumber: string;
  passportCopy?: string;
  flightTicket?: string;
}

export interface Pax {
  id: string;
  bookingId: string;
  name: string;
  relationship?: string;
  type: PaxType;
  age?: number;
}

export interface HotelBooking {
  id: string;
  bookingId: string;
  nightNumber: number;
  hotelName: string;
  roomCategory: string;
  numberOfRooms: number;
  roomPreference?: string;
  mealPlan: string;
  mealPreference?: string;
  mobilityNotes?: string;
  confirmationStatus: string;
  reservationNotes?: string;
}

export interface TransportDayPlan {
  id: string;
  transportPlanId: string;
  dayNumber: number;
  description: string;
  pickupTime?: string;
  pickupLocation?: string;
  dropLocation?: string;
  notes?: string;
}

export interface TransportPlan {
  id: string;
  bookingId: string;
  vehicleModel: string;
  vehicleIdNumber?: string;
  vehicleNotes?: string;
  babySeatRequired: boolean;
  wheelchairRequired: boolean;
  driverName?: string;
  driverLanguage: string;
  arrivalPickupLocation?: string;
  arrivalPickupTime?: string;
  arrivalPickupNotes?: string;
  departureDropLocation?: string;
  departureDropTime?: string;
  departureDropNotes?: string;
  internalNotes?: string;
  dayPlans: TransportDayPlan[];
}

export interface Invoice {
  id: string;
  bookingId: string;
  invoiceNumber: string;
  invoiceDate: string;
  costPerPerson: number;
  totalAmount: number;
  advancePaid: number;
  balanceAmount: number;
  paymentNotes?: string;
  paymentInstructions?: string;
  tourInclusions?: string;
}

export interface Attachment {
  id: string;
  bookingId: string;
  fileName: string;
  fileType: string;
  filePath: string;
  fileSize: number;
  uploadedBy: string;
  createdAt: string;
}

export interface GeneratedDocument {
  id: string;
  bookingId: string;
  type: DocumentType;
  filePath: string;
  version: number;
  generatedBy: string;
  createdAt: string;
}

export interface StatusHistory {
  id: string;
  bookingId: string;
  fromStatus?: BookingStatus;
  toStatus: BookingStatus;
  changedBy: string;
  changedByName?: string;
  notes?: string;
  createdAt: string;
}

export interface Booking {
  id: string;
  bookingId: string;
  status: BookingStatus;
  numberOfDays: number;
  tourMonth: string;
  arrivalDate: string;
  arrivalTime: string;
  departureDate: string;
  departureTime: string;
  additionalActivities?: string;
  specialCelebrations?: string;
  generalNotes?: string;
  salesOwnerId: string;
  salesOwner: Pick<User, 'id' | 'name' | 'email'>;
  client?: Client;
  paxList: Pax[];
  hotelPlan: HotelBooking[];
  transportPlan?: TransportPlan;
  invoice?: Invoice;
  attachments: Attachment[];
  documents: GeneratedDocument[];
  statusHistory: StatusHistory[];
  _count?: {
    paxList: number;
    hotelPlan: number;
    attachments: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface DashboardData {
  totalBookings: number;
  statusCounts: Record<string, number>;
  revenue: {
    total: number;
    collected: number;
    pending: number;
  };
  recentBookings: Booking[];
}

export interface LoginResponse {
  accessToken: string;
  user: User;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
