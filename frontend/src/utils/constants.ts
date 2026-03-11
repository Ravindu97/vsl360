import { BookingStatus, Role } from '@/types';

export const STATUS_LABELS: Record<BookingStatus, string> = {
  [BookingStatus.INQUIRY_RECEIVED]: 'Inquiry Received',
  [BookingStatus.CLIENT_PROFILE_CREATED]: 'Client Profile Created',
  [BookingStatus.PAX_DETAILS_ADDED]: 'Pax Details Added',
  [BookingStatus.COSTING_COMPLETED]: 'Costing Completed',
  [BookingStatus.SALES_CONFIRMED]: 'Sales Confirmed',
  [BookingStatus.RESERVATION_PENDING]: 'Reservation Pending',
  [BookingStatus.RESERVATION_COMPLETED]: 'Reservation Completed',
  [BookingStatus.TRANSPORT_PENDING]: 'Transport Pending',
  [BookingStatus.TRANSPORT_COMPLETED]: 'Transport Completed',
  [BookingStatus.DOCUMENTS_READY]: 'Documents Ready',
  [BookingStatus.OPS_APPROVED]: 'Ops Approved',
  [BookingStatus.COMPLETED]: 'Completed',
  [BookingStatus.CANCELLED]: 'Cancelled',
};

export const STATUS_COLORS: Record<BookingStatus, string> = {
  [BookingStatus.INQUIRY_RECEIVED]: 'bg-gray-100 text-gray-700',
  [BookingStatus.CLIENT_PROFILE_CREATED]: 'bg-blue-100 text-blue-700',
  [BookingStatus.PAX_DETAILS_ADDED]: 'bg-blue-100 text-blue-700',
  [BookingStatus.COSTING_COMPLETED]: 'bg-indigo-100 text-indigo-700',
  [BookingStatus.SALES_CONFIRMED]: 'bg-purple-100 text-purple-700',
  [BookingStatus.RESERVATION_PENDING]: 'bg-yellow-100 text-yellow-700',
  [BookingStatus.RESERVATION_COMPLETED]: 'bg-green-100 text-green-700',
  [BookingStatus.TRANSPORT_PENDING]: 'bg-orange-100 text-orange-700',
  [BookingStatus.TRANSPORT_COMPLETED]: 'bg-green-100 text-green-700',
  [BookingStatus.DOCUMENTS_READY]: 'bg-teal-100 text-teal-700',
  [BookingStatus.OPS_APPROVED]: 'bg-emerald-100 text-emerald-700',
  [BookingStatus.COMPLETED]: 'bg-green-200 text-green-800',
  [BookingStatus.CANCELLED]: 'bg-red-100 text-red-700',
};

export const ROLE_LABELS: Record<Role, string> = {
  [Role.SALES]: 'Sales Person',
  [Role.RESERVATION]: 'Reservation Dept',
  [Role.TRANSPORT]: 'Transport Dept',
  [Role.OPS_MANAGER]: 'Operations Manager',
};

export const MEAL_PLANS = ['BB', 'HB', 'FB', 'AI'] as const;

export const MEAL_PLAN_LABELS: Record<string, string> = {
  BB: 'Bed & Breakfast',
  HB: 'Half Board',
  FB: 'Full Board',
  AI: 'All Inclusive',
};
