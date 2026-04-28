import { useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft } from 'lucide-react';
import { bookingsApi } from '@/api/bookings.api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { clearSessionDraft, loadSessionDraft, saveSessionDraft } from '@/utils/sessionDraft';
import { inclusiveTourDayCount } from '@/utils/tourDates';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CurrencyCode } from '@/types';
import { cn } from '@/lib/utils';

const createBookingSchema = z.object({
  numberOfDays: z.coerce.number().min(1),
  flightNumber: z.string().optional(),
  arrivalDate: z.string().min(1, 'Required'),
  arrivalTime: z.string().min(1, 'Required'),
  departureDate: z.string().min(1, 'Required'),
  departureTime: z.string().min(1, 'Required'),
  additionalActivities: z.string().optional(),
  specialCelebrations: z.string().optional(),
  generalNotes: z.string().optional(),
  includeActivities: z.boolean(),
  includeTransport: z.boolean(),
  includeHotel: z.boolean(),
  client: z.object({
    name: z.string().min(1, 'Client name is required'),
    citizenship: z.string().min(1, 'Required'),
    languagePreference: z.string().min(1, 'Required'),
    preferredCurrency: z.nativeEnum(CurrencyCode),
    email: z.string().email('Invalid email'),
    contactNumber: z.string().min(1, 'Required'),
    passportNumber: z.string().optional(),
  }),
}).refine(
  (data) => data.includeActivities || data.includeTransport || data.includeHotel,
  { message: 'Select at least one option', path: ['includeActivities'] }
);

type CreateBookingForm = z.infer<typeof createBookingSchema>;

const BOOKING_CREATE_DRAFT_KEY = 'vsl360.booking.create.draft';

const defaultFormValues: CreateBookingForm = {
  numberOfDays: 1,
  flightNumber: '',
  arrivalDate: '',
  arrivalTime: '',
  departureDate: '',
  departureTime: '',
  additionalActivities: '',
  specialCelebrations: '',
  generalNotes: '',
  includeActivities: true,
  includeTransport: true,
  includeHotel: true,
  client: {
    name: '',
    citizenship: '',
    languagePreference: 'English',
    preferredCurrency: CurrencyCode.USD,
    email: '',
    contactNumber: '',
    passportNumber: '',
  },
};

export function BookingCreatePage() {
  const navigate = useNavigate();

  const initialValues = useMemo(() => {
    const draft = loadSessionDraft<CreateBookingForm>(BOOKING_CREATE_DRAFT_KEY);
    return {
      ...defaultFormValues,
      ...draft,
      client: {
        ...defaultFormValues.client,
        ...(draft?.client ?? {}),
      },
    };
  }, []);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors },
  } = useForm<CreateBookingForm>({
    resolver: zodResolver(createBookingSchema),
    defaultValues: initialValues,
  });

  const watchedValues = watch();
  const scopeError = errors.includeActivities?.message;
  const lastAutoDepartureRef = useRef<string | null>(initialValues.departureDate || null);

  // When arrival or departure *dates* change, sync number of days (inclusive). Edits to
  // "Number of days" alone do not trigger this.
  useEffect(() => {
    const arrivalDate = watchedValues.arrivalDate;
    const departureDate = watchedValues.departureDate;
    if (!arrivalDate || !departureDate) return;
    const next = inclusiveTourDayCount(arrivalDate, departureDate);
    setValue('numberOfDays', next, { shouldDirty: true, shouldValidate: true });
  }, [watchedValues.arrivalDate, watchedValues.departureDate, setValue]);

  useEffect(() => {
    const arrivalDate = watchedValues.arrivalDate;
    const numberOfDays = watchedValues.numberOfDays;
    const currentDepartureDate = watchedValues.departureDate;

    if (!arrivalDate || !numberOfDays) {
      return;
    }

    const arrival = new Date(`${arrivalDate}T00:00:00`);
    if (Number.isNaN(arrival.getTime())) {
      return;
    }

    const computedDeparture = new Date(arrival);
    computedDeparture.setDate(computedDeparture.getDate() + Math.max(0, numberOfDays - 1));
    const nextDepartureDate = [
      computedDeparture.getFullYear(),
      String(computedDeparture.getMonth() + 1).padStart(2, '0'),
      String(computedDeparture.getDate()).padStart(2, '0'),
    ].join('-');

    const shouldApplyAutoValue =
      !currentDepartureDate ||
      currentDepartureDate === lastAutoDepartureRef.current;

    if (shouldApplyAutoValue && currentDepartureDate !== nextDepartureDate) {
      setValue('departureDate', nextDepartureDate, { shouldDirty: true, shouldValidate: true });
      lastAutoDepartureRef.current = nextDepartureDate;
      return;
    }

    if (currentDepartureDate === nextDepartureDate) {
      lastAutoDepartureRef.current = nextDepartureDate;
    }
  }, [setValue, watchedValues.arrivalDate, watchedValues.departureDate, watchedValues.numberOfDays]);

  useEffect(() => {
    saveSessionDraft(BOOKING_CREATE_DRAFT_KEY, watchedValues);
  }, [watchedValues]);

  const mutation = useMutation({
    mutationFn: (data: CreateBookingForm) => bookingsApi.create(data),
    onSuccess: (res) => {
      clearSessionDraft(BOOKING_CREATE_DRAFT_KEY);
      reset(defaultFormValues);
      navigate(`/bookings/${res.data.id}`);
    },
  });

  const onSubmit = (data: CreateBookingForm) => mutation.mutate(data);

  const handleClearDraft = () => {
    clearSessionDraft(BOOKING_CREATE_DRAFT_KEY);
    reset(defaultFormValues);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/bookings')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">Create New Booking</h1>
      </div>

      {mutation.isError && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          Failed to create booking. Please try again.
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Client Information</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Client Name *</Label>
              <Input {...register('client.name')} />
              {errors.client?.name && <p className="text-xs text-destructive">{errors.client.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Citizenship *</Label>
              <Input {...register('client.citizenship')} />
              {errors.client?.citizenship && <p className="text-xs text-destructive">{errors.client.citizenship.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Language Preference *</Label>
              <Input {...register('client.languagePreference')} />
              {errors.client?.languagePreference && <p className="text-xs text-destructive">{errors.client.languagePreference.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Preferred Currency *</Label>
              <Select
                value={watch('client.preferredCurrency')}
                onValueChange={(value) => setValue('client.preferredCurrency', value as CurrencyCode, { shouldDirty: true, shouldValidate: true })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={CurrencyCode.EUR}>Euro (EUR)</SelectItem>
                  <SelectItem value={CurrencyCode.USD}>US Dollar (USD)</SelectItem>
                  <SelectItem value={CurrencyCode.INR}>Indian Rupee (INR)</SelectItem>
                </SelectContent>
              </Select>
              {errors.client?.preferredCurrency && <p className="text-xs text-destructive">{errors.client.preferredCurrency.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input type="email" {...register('client.email')} />
              {errors.client?.email && <p className="text-xs text-destructive">{errors.client.email.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Contact Number *</Label>
              <Input {...register('client.contactNumber')} />
              {errors.client?.contactNumber && <p className="text-xs text-destructive">{errors.client.contactNumber.message}</p>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Identity and Passport</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>Passport number</Label>
              <Input {...register('client.passportNumber')} placeholder="e.g. N1234567" autoComplete="off" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Flight and Transit</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>Flight number</Label>
              <Input {...register('flightNumber')} placeholder="e.g. UL 123" autoComplete="off" />
            </div>
            <div className="space-y-2">
              <Label>Arrival Date *</Label>
              <Input type="date" {...register('arrivalDate')} />
              {errors.arrivalDate && <p className="text-xs text-destructive">{errors.arrivalDate.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Arrival Time *</Label>
              <Input type="time" {...register('arrivalTime')} />
              {errors.arrivalTime && <p className="text-xs text-destructive">{errors.arrivalTime.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Departure Date *</Label>
              <Input type="date" {...register('departureDate')} />
              {errors.departureDate && <p className="text-xs text-destructive">{errors.departureDate.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Departure Time *</Label>
              <Input type="time" {...register('departureTime')} />
              {errors.departureTime && <p className="text-xs text-destructive">{errors.departureTime.message}</p>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Booking Scope</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">Select what this booking needs; you can update later.</p>
            <div className="flex flex-wrap gap-2">
              {[
                { field: 'includeActivities' as const, label: 'Activities' },
                { field: 'includeTransport' as const, label: 'Transport' },
                { field: 'includeHotel' as const, label: 'Hotel' },
              ].map((item) => {
                const active = watch(item.field);
                return (
                  <Button
                    key={item.field}
                    type="button"
                    variant="outline"
                    className={cn(
                      'rounded-full',
                      active ? 'border-primary bg-primary/10 text-primary hover:bg-primary/15' : 'text-muted-foreground'
                    )}
                    onClick={() => setValue(item.field, !active, { shouldDirty: true, shouldValidate: true })}
                  >
                    {item.label}
                  </Button>
                );
              })}
            </div>
            {scopeError && <p className="text-xs text-destructive">{scopeError}</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tour Details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Number of Days *</Label>
              <Input type="number" min={1} {...register('numberOfDays')} />
              {errors.numberOfDays && <p className="text-xs text-destructive">{errors.numberOfDays.message}</p>}
              <p className="text-xs text-muted-foreground">
                Auto-fills from arrival and departure dates; you can change it if needed.
              </p>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Additional Activities</Label>
              <Textarea {...register('additionalActivities')} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Special Celebrations</Label>
              <Textarea {...register('specialCelebrations')} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>General Notes</Label>
              <Textarea {...register('generalNotes')} />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button variant="ghost" type="button" onClick={handleClearDraft}>
            Clear Draft
          </Button>
          <Button variant="outline" type="button" onClick={() => navigate('/bookings')}>
            Cancel
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Creating...' : 'Create Booking'}
          </Button>
        </div>
      </form>
    </div>
  );
}
