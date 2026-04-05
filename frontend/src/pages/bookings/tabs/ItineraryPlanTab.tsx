import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { itineraryApi } from '@/api/endpoints.api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import type { Booking, ItineraryActivity, ItineraryDestination } from '@/types';

interface Props {
  booking: Booking;
}

type DayPlan = {
  dayNumber: number;
  dateLabel: string;
  destinationId: string;
  morningActivityId: string;
  afternoonActivityId: string;
  eveningActivityId: string;
  notes: string;
};

const STORAGE_KEY_PREFIX = 'itinerary-plan-draft';

function buildDateLabel(arrivalDate: string, dayNumber: number): string {
  const base = new Date(arrivalDate);
  if (Number.isNaN(base.getTime())) return `Day ${dayNumber}`;
  const next = new Date(base);
  next.setDate(base.getDate() + (dayNumber - 1));
  return next.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function ItineraryPlanTab({ booking }: Props) {
  const dayCount = Math.max(1, booking.numberOfDays || 1);
  const storageKey = `${STORAGE_KEY_PREFIX}:${booking.id}`;

  const { data: destinationData } = useQuery({
    queryKey: ['itinerary-plan-destinations'],
    queryFn: () => itineraryApi.listDestinations({ page: 1, pageSize: 200 }),
  });

  const { data: activityData } = useQuery({
    queryKey: ['itinerary-plan-activities'],
    queryFn: () => itineraryApi.listActivities({ page: 1, pageSize: 500 }),
  });

  const destinations: ItineraryDestination[] = (destinationData?.data?.items ?? []).filter((destination) => destination.isActive);
  const activities: ItineraryActivity[] = activityData?.data?.items ?? [];

  const defaultPlans = useMemo<DayPlan[]>(
    () =>
      Array.from({ length: dayCount }, (_, index) => ({
        dayNumber: index + 1,
        dateLabel: buildDateLabel(booking.arrivalDate, index + 1),
        destinationId: '',
        morningActivityId: '',
        afternoonActivityId: '',
        eveningActivityId: '',
        notes: '',
      })),
    [booking.arrivalDate, dayCount]
  );

  const [plans, setPlans] = useState<DayPlan[]>(defaultPlans);
  const [savedAt, setSavedAt] = useState<string>('');

  useEffect(() => {
    setPlans(defaultPlans);
    setSavedAt('');
  }, [defaultPlans]);

  useEffect(() => {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as DayPlan[];
      if (!Array.isArray(parsed)) return;

      const merged = defaultPlans.map((base) => {
        const fromDraft = parsed.find((item) => item.dayNumber === base.dayNumber);
        return fromDraft ? { ...base, ...fromDraft } : base;
      });

      setPlans(merged);
    } catch {
      // Ignore invalid local draft payload.
    }
  }, [defaultPlans, storageKey]);

  const completedDays = plans.filter((day) => day.destinationId && (day.morningActivityId || day.afternoonActivityId || day.eveningActivityId)).length;

  const updateDay = (dayNumber: number, patch: Partial<DayPlan>) => {
    setPlans((current) =>
      current.map((day) => {
        if (day.dayNumber !== dayNumber) return day;
        return { ...day, ...patch };
      })
    );
  };

  const saveDraft = () => {
    window.localStorage.setItem(storageKey, JSON.stringify(plans));
    setSavedAt(new Date().toLocaleString());
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2">
            Itinerary Plan Blueprint
            <Badge variant="secondary">{completedDays}/{dayCount} days designed</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            Build the day-by-day plan here first, then generate Full Itinerary from Documents.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="rounded-md border bg-background px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted"
              onClick={saveDraft}
            >
              Save Draft
            </button>
            {savedAt && <span className="text-xs">Saved: {savedAt}</span>}
          </div>
        </CardContent>
      </Card>

      {plans.map((day) => {
        const dayActivities = activities.filter((activity) => activity.destinationId === day.destinationId);

        return (
          <Card key={day.dayNumber}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Day {day.dayNumber} - {day.dateLabel}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Destination</p>
                <Select
                  value={day.destinationId || '__none__'}
                  onValueChange={(value) =>
                    updateDay(day.dayNumber, {
                      destinationId: value === '__none__' ? '' : value,
                      morningActivityId: '',
                      afternoonActivityId: '',
                      eveningActivityId: '',
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select destination" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">No destination selected</SelectItem>
                    {destinations.map((destination) => (
                      <SelectItem key={destination.id} value={destination.id}>{destination.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Morning</p>
                <Select
                  value={day.morningActivityId || '__none__'}
                  onValueChange={(value) => updateDay(day.dayNumber, { morningActivityId: value === '__none__' ? '' : value })}
                  disabled={!day.destinationId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select morning activity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">No activity</SelectItem>
                    {dayActivities.map((activity) => (
                      <SelectItem key={activity.id} value={activity.id}>{activity.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Afternoon</p>
                <Select
                  value={day.afternoonActivityId || '__none__'}
                  onValueChange={(value) => updateDay(day.dayNumber, { afternoonActivityId: value === '__none__' ? '' : value })}
                  disabled={!day.destinationId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select afternoon activity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">No activity</SelectItem>
                    {dayActivities.map((activity) => (
                      <SelectItem key={activity.id} value={activity.id}>{activity.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 md:col-span-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Evening</p>
                <Select
                  value={day.eveningActivityId || '__none__'}
                  onValueChange={(value) => updateDay(day.dayNumber, { eveningActivityId: value === '__none__' ? '' : value })}
                  disabled={!day.destinationId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select evening activity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">No activity</SelectItem>
                    {dayActivities.map((activity) => (
                      <SelectItem key={activity.id} value={activity.id}>{activity.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 md:col-span-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Notes for document writer</p>
                <Textarea
                  value={day.notes}
                  onChange={(event) => updateDay(day.dayNumber, { notes: event.target.value })}
                  rows={3}
                  placeholder="Special moments, pace, meal notes, route comments, etc."
                />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
