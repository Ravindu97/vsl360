import { Role } from '@/types';

export function canCreateBooking(role: Role): boolean {
  return role === Role.SALES || role === Role.OPS_MANAGER;
}

export function canEditBooking(role: Role): boolean {
  return role === Role.SALES || role === Role.OPS_MANAGER;
}

export function canManageHotels(role: Role): boolean {
  return role === Role.RESERVATION || role === Role.OPS_MANAGER;
}

export function canManageTransport(role: Role): boolean {
  return role === Role.TRANSPORT || role === Role.OPS_MANAGER;
}

export function canManageUsers(role: Role): boolean {
  return role === Role.OPS_MANAGER;
}

export function canApproveDocuments(role: Role): boolean {
  return role === Role.OPS_MANAGER;
}

export function canGenerateInvoice(role: Role): boolean {
  return role === Role.SALES || role === Role.OPS_MANAGER;
}

export function canAdvanceToReservationStatuses(role: Role): boolean {
  return role === Role.RESERVATION || role === Role.OPS_MANAGER;
}

export function canAdvanceToTransportStatuses(role: Role): boolean {
  return role === Role.TRANSPORT || role === Role.OPS_MANAGER;
}

export function canAdvanceToCosting(role: Role): boolean {
  return role === Role.SALES || role === Role.OPS_MANAGER;
}

export function canAdvanceToDocumentsReady(role: Role): boolean {
  return role === Role.OPS_MANAGER;
}
