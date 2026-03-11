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

const createBookingSchema = z.object({
  tourMonth: z.string().min(1, 'Required'),
  numberOfDays: z.coerce.number().min(1),
  arrivalDate: z.string().min(1, 'Required'),
  arrivalTime: z.string().min(1, 'Required'),
  departureDate: z.string().min(1, 'Required'),
  departureTime: z.string().min(1, 'Required'),
  additionalActivities: z.string().optional(),
  specialCelebrations: z.string().optional(),
  generalNotes: z.string().optional(),
  client: z.object({
    name: z.string().min(1, 'Client name is required'),
    citizenship: z.string().min(1, 'Required'),
    email: z.string().email('Invalid email'),
    contactNumber: z.string().min(1, 'Required'),
  }),
});

type CreateBookingForm = z.infer<typeof createBookingSchema>;

export function BookingCreatePage() {
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateBookingForm>({
    resolver: zodResolver(createBookingSchema),
    defaultValues: {
      numberOfDays: 1,
    },
  });

  const mutation = useMutation({
    mutationFn: (data: CreateBookingForm) => bookingsApi.create(data),
    onSuccess: (res) => {
      navigate(`/bookings/${res.data.id}`);
    },
  });

  const onSubmit = (data: CreateBookingForm) => mutation.mutate(data);

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
            <CardTitle>Tour Details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Tour Month *</Label>
              <Input placeholder="e.g. January 2026" {...register('tourMonth')} />
              {errors.tourMonth && <p className="text-xs text-destructive">{errors.tourMonth.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Number of Days *</Label>
              <Input type="number" min={1} {...register('numberOfDays')} />
              {errors.numberOfDays && <p className="text-xs text-destructive">{errors.numberOfDays.message}</p>}
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
