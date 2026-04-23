import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Trash2, CheckCircle, Save, X, Pencil, RotateCcw } from 'lucide-react';
import { hotelsApi } from '@/api/endpoints.api';
import { useAuthStore } from '@/store/authStore';
import { canManageHotels } from '@/utils/permissions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/shared/EmptyState';
import { MEAL_PLAN_LABELS } from '@/utils/constants';
import type { Booking, HotelBooking } from '@/types';

interface Props {
  booking: Booking;
}

const hotelSchema = z.object({
  nightNumber: z.coerce.number().min(1),
  hotelName: z.string().min(1, 'Required'),
  roomCategory: z.string().min(1, 'Required'),
  numberOfRooms: z.coerce.number().min(1),
  mealPlan: z.string().min(1, 'Required'),
  mealPreference: z.string().optional(),
  reservationNotes: z.string().optional(),
  location: z.string().max(200).optional(),
});

type HotelForm = z.infer<typeof hotelSchema>;

function getInitialNightCount(booking: Booking): number {
  if (booking.arrivalDate && booking.departureDate) {
    const arrival = new Date(`${booking.arrivalDate}T00:00:00`);
    const departure = new Date(`${booking.departureDate}T00:00:00`);
    if (!Number.isNaN(arrival.getTime()) && !Number.isNaN(departure.getTime())) {
      const diffDays = Math.round((departure.getTime() - arrival.getTime()) / (1000 * 60 * 60 * 24));
      return Math.max(0, diffDays);
    }
  }

  return Math.max(0, booking.numberOfDays - 1);
}

function buildInitialHotelDraft(nightNumber: number): HotelForm {
  return {
    nightNumber,
    hotelName: 'To Be Confirmed',
    roomCategory: 'To Be Confirmed',
    numberOfRooms: 1,
    mealPlan: 'BB',
    mealPreference: '',
    reservationNotes: '',
    location: '',
  };
}

export function HotelsTab({ booking }: Props) {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [editingHotelId, setEditingHotelId] = useState<string | null>(null);
  const hasSeededRef = useRef(false);
  const canManage = user ? canManageHotels(user.role) : false;

  const { data, isLoading } = useQuery({
    queryKey: ['hotels', booking.id],
    queryFn: () => hotelsApi.list(booking.id),
  });

  const hotels = useMemo<HotelBooking[]>(() => data?.data ?? booking.hotelPlan ?? [], [booking.hotelPlan, data?.data]);
  const initialNightCount = useMemo(() => getInitialNightCount(booking), [booking]);

  const form = useForm<HotelForm>({
    resolver: zodResolver(hotelSchema),
    defaultValues: { nightNumber: (hotels.length + 1), numberOfRooms: 1, mealPlan: 'BB', location: '' },
  });

  const editForm = useForm<HotelForm>({
    resolver: zodResolver(hotelSchema),
    defaultValues: buildInitialHotelDraft(1),
  });

  const createHotel = useMutation({
    mutationFn: (data: HotelForm) => hotelsApi.create(booking.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hotels', booking.id] });
      queryClient.invalidateQueries({ queryKey: ['booking', booking.id] });
      form.reset({ nightNumber: hotels.length + 2, numberOfRooms: 1, mealPlan: 'BB', location: '' });
      setAdding(false);
    },
  });

  const updateHotel = useMutation({
    mutationFn: ({ hotelId, data }: { hotelId: string; data: HotelForm }) => hotelsApi.update(booking.id, hotelId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hotels', booking.id] });
      queryClient.invalidateQueries({ queryKey: ['booking', booking.id] });
      setEditingHotelId(null);
    },
  });

  const seedHotels = useMutation({
    mutationFn: async () => {
      for (let nightNumber = 1; nightNumber <= initialNightCount; nightNumber += 1) {
        await hotelsApi.create(booking.id, buildInitialHotelDraft(nightNumber));
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hotels', booking.id] });
      queryClient.invalidateQueries({ queryKey: ['booking', booking.id] });
    },
    onSettled: () => {
      hasSeededRef.current = true;
    },
  });

  const confirmHotel = useMutation({
    mutationFn: (hotelId: string) => hotelsApi.confirm(booking.id, hotelId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hotels', booking.id] });
      queryClient.invalidateQueries({ queryKey: ['booking', booking.id] });
    },
  });

  const updateHotelStatus = useMutation({
    mutationFn: ({ hotelId, confirmationStatus }: { hotelId: string; confirmationStatus: 'PENDING' | 'CONFIRMED' }) =>
      hotelsApi.update(booking.id, hotelId, { confirmationStatus }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hotels', booking.id] });
      queryClient.invalidateQueries({ queryKey: ['booking', booking.id] });
    },
  });

  const deleteHotel = useMutation({
    mutationFn: (hotelId: string) => hotelsApi.delete(booking.id, hotelId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hotels', booking.id] });
      queryClient.invalidateQueries({ queryKey: ['booking', booking.id] });
    },
  });

  useEffect(() => {
    if (isLoading || !canManage || hotels.length > 0 || initialNightCount <= 0 || seedHotels.isPending || hasSeededRef.current) {
      return;
    }

    hasSeededRef.current = true;
    seedHotels.mutate();
  }, [canManage, hotels.length, initialNightCount, isLoading, seedHotels]);

  const startEditing = (hotel: HotelBooking) => {
    editForm.reset({
      nightNumber: hotel.nightNumber,
      hotelName: hotel.hotelName,
      roomCategory: hotel.roomCategory,
      numberOfRooms: hotel.numberOfRooms,
      mealPlan: hotel.mealPlan,
      mealPreference: hotel.mealPreference ?? '',
      reservationNotes: hotel.reservationNotes ?? '',
      location: hotel.location ?? '',
    });
    setEditingHotelId(hotel.id);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Hotel Plan ({hotels.length} nights)</CardTitle>
        {canManage && !adding && (
          <Button variant="outline" size="sm" onClick={() => setAdding(true)}>
            <Plus className="mr-2 h-3 w-3" /> Add Night
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {adding && canManage && (
          <form onSubmit={form.handleSubmit((d) => createHotel.mutate(d))} className="mb-4 space-y-4 rounded-md border p-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1">
                <Label>Night # *</Label>
                <Input type="number" {...form.register('nightNumber')} />
              </div>
              <div className="space-y-1">
                <Label>Location</Label>
                <Input placeholder="City or area (optional)" {...form.register('location')} />
              </div>
              <div className="space-y-1">
                <Label>Hotel Name *</Label>
                <Input {...form.register('hotelName')} />
              </div>
              <div className="space-y-1">
                <Label>Room Category *</Label>
                <Input {...form.register('roomCategory')} />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1">
                <Label>Rooms *</Label>
                <Input type="number" min={1} {...form.register('numberOfRooms')} />
              </div>
              <div className="space-y-1">
                <Label>Meal Plan *</Label>
                <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm" {...form.register('mealPlan')}>
                  {Object.entries(MEAL_PLAN_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label>Meal Preference</Label>
                <Input {...form.register('mealPreference')} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Reservation Notes</Label>
              <Textarea {...form.register('reservationNotes')} />
            </div>
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={createHotel.isPending}>
                <Save className="mr-1 h-3 w-3" /> Save
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setAdding(false)}>
                <X className="mr-1 h-3 w-3" /> Cancel
              </Button>
            </div>
          </form>
        )}

        {seedHotels.isPending && (
          <div className="mb-4 rounded-md border border-dashed px-4 py-3 text-sm text-muted-foreground">
            Generating {initialNightCount} initial hotel night{initialNightCount === 1 ? '' : 's'} from the booking dates.
          </div>
        )}

        {hotels.length === 0 ? (
          <EmptyState
            title="No hotel bookings"
            description={initialNightCount > 0 ? 'Hotel nights will be auto-created from the trip dates, then you can edit them.' : 'Add hotel nights for this booking'}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Night</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Hotel</TableHead>
                <TableHead>Room</TableHead>
                <TableHead>Rooms</TableHead>
                <TableHead>Meal</TableHead>
                <TableHead>Status</TableHead>
                {canManage && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {hotels
                .sort((a, b) => a.nightNumber - b.nightNumber)
                .map((h) => (
                  editingHotelId === h.id ? (
                    <TableRow key={h.id}>
                      <TableCell colSpan={canManage ? 8 : 7}>
                        <form onSubmit={editForm.handleSubmit((data) => updateHotel.mutate({ hotelId: h.id, data }))} className="space-y-4 rounded-md border p-4">
                          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                            <div className="space-y-1">
                              <Label>Night # *</Label>
                              <Input type="number" {...editForm.register('nightNumber')} />
                            </div>
                            <div className="space-y-1">
                              <Label>Location</Label>
                              <Input placeholder="City or area (optional)" {...editForm.register('location')} />
                            </div>
                            <div className="space-y-1">
                              <Label>Hotel Name *</Label>
                              <Input {...editForm.register('hotelName')} />
                            </div>
                            <div className="space-y-1">
                              <Label>Room Category *</Label>
                              <Input {...editForm.register('roomCategory')} />
                            </div>
                          </div>
                          <div className="grid gap-3 sm:grid-cols-3">
                            <div className="space-y-1">
                              <Label>Rooms *</Label>
                              <Input type="number" min={1} {...editForm.register('numberOfRooms')} />
                            </div>
                            <div className="space-y-1">
                              <Label>Meal Plan *</Label>
                              <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm" {...editForm.register('mealPlan')}>
                                {Object.entries(MEAL_PLAN_LABELS).map(([k, v]) => (
                                  <option key={k} value={k}>{v}</option>
                                ))}
                              </select>
                            </div>
                            <div className="space-y-1">
                              <Label>Meal Preference</Label>
                              <Input {...editForm.register('mealPreference')} />
                            </div>
                          </div>
                          <div className="space-y-1">
                            <Label>Reservation Notes</Label>
                            <Textarea {...editForm.register('reservationNotes')} />
                          </div>
                          <div className="flex gap-2">
                            <Button type="submit" size="sm" disabled={updateHotel.isPending}>
                              <Save className="mr-1 h-3 w-3" /> Save Changes
                            </Button>
                            <Button type="button" variant="outline" size="sm" onClick={() => setEditingHotelId(null)}>
                              <X className="mr-1 h-3 w-3" /> Cancel
                            </Button>
                          </div>
                        </form>
                      </TableCell>
                    </TableRow>
                  ) : (
                    <TableRow key={h.id}>
                      <TableCell>{h.nightNumber}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {h.location?.trim() ? h.location : '—'}
                      </TableCell>
                      <TableCell className="font-medium">{h.hotelName}</TableCell>
                      <TableCell>{h.roomCategory}</TableCell>
                      <TableCell>{h.numberOfRooms}</TableCell>
                      <TableCell>{MEAL_PLAN_LABELS[h.mealPlan] || h.mealPlan}</TableCell>
                      <TableCell>
                        <Badge variant={h.confirmationStatus === 'CONFIRMED' ? 'default' : 'secondary'}>
                          {h.confirmationStatus}
                        </Badge>
                      </TableCell>
                      {canManage && (
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => startEditing(h)} title="Edit">
                              <Pencil className="h-4 w-4 text-slate-600" />
                            </Button>
                            {h.confirmationStatus !== 'CONFIRMED' && (
                              <Button variant="ghost" size="icon" onClick={() => confirmHotel.mutate(h.id)} title="Confirm">
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              </Button>
                            )}
                            {h.confirmationStatus === 'CONFIRMED' && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => updateHotelStatus.mutate({ hotelId: h.id, confirmationStatus: 'PENDING' })}
                                title="Mark as pending"
                              >
                                <RotateCcw className="h-4 w-4 text-amber-600" />
                              </Button>
                            )}
                            <Button variant="ghost" size="icon" onClick={() => deleteHotel.mutate(h.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  )
                ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
