/**
 * Day row for booking itinerary plan (in-memory + API payloads + PDF).
 */
export type ItineraryPlanDay = {
  dayNumber: number;
  dateLabel?: string;
  destinationId?: string;
  morningActivityId?: string;
  afternoonActivityId?: string;
  eveningActivityId?: string;
  notes?: string;
};
