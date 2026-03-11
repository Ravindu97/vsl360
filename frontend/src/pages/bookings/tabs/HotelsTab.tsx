import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Trash2, CheckCircle, Save, X } from 'lucide-react';
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
  roomPreference: z.string().optional(),
  mealPlan: z.string().min(1, 'Required'),
  mealPreference: z.string().optional(),
  mobilityNotes: z.string().optional(),
  reservationNotes: z.string().optional(),
});

type HotelForm = z.infer<typeof hotelSchema>;

export function HotelsTab({ booking }: Props) {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const [adding, setAdding] = useState(false);
  const canManage = user ? canManageHotels(user.role) : false;

  const { data } = useQuery({
    queryKey: ['hotels', booking.id],
    queryFn: () => hotelsApi.list(booking.id),
  });

  const hotels: HotelBooking[] = data?.data ?? booking.hotelPlan ?? [];

  const form = useForm<HotelForm>({
    resolver: zodResolver(hotelSchema),
    defaultValues: { nightNumber: (hotels.length + 1), numberOfRooms: 1, mealPlan: 'BB' },
  });

  const createHotel = useMutation({
    mutationFn: (data: HotelForm) => hotelsApi.create(booking.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hotels', booking.id] });
      queryClient.invalidateQueries({ queryKey: ['booking', booking.id] });
      form.reset({ nightNumber: hotels.length + 2, numberOfRooms: 1, mealPlan: 'BB' });
      setAdding(false);
    },
  });

  const confirmHotel = useMutation({
    mutationFn: (hotelId: string) => hotelsApi.confirm(booking.id, hotelId),
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
          <form onSubmit={form.handleSubmit((d) => createHotel.mutate(d))} className="mb-4 grid gap-3 rounded-md border p-4 sm:grid-cols-3">
            <div className="space-y-1">
              <Label>Night # *</Label>
              <Input type="number" {...form.register('nightNumber')} />
            </div>
            <div className="space-y-1">
              <Label>Hotel Name *</Label>
              <Input {...form.register('hotelName')} />
            </div>
            <div className="space-y-1">
              <Label>Room Category *</Label>
              <Input {...form.register('roomCategory')} />
            </div>
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
              <Label>Room Preference</Label>
              <Input {...form.register('roomPreference')} />
            </div>
            <div className="space-y-1">
              <Label>Meal Preference</Label>
              <Input {...form.register('mealPreference')} />
            </div>
            <div className="space-y-1">
              <Label>Mobility Notes</Label>
              <Input {...form.register('mobilityNotes')} />
            </div>
            <div className="space-y-1">
              <Label>Reservation Notes</Label>
              <Textarea {...form.register('reservationNotes')} />
            </div>
            <div className="sm:col-span-3 flex gap-2">
              <Button type="submit" size="sm" disabled={createHotel.isPending}>
                <Save className="mr-1 h-3 w-3" /> Save
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setAdding(false)}>
                <X className="mr-1 h-3 w-3" /> Cancel
              </Button>
            </div>
          </form>
        )}

        {hotels.length === 0 ? (
          <EmptyState title="No hotel bookings" description="Add hotel nights for this booking" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Night</TableHead>
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
                  <TableRow key={h.id}>
                    <TableCell>{h.nightNumber}</TableCell>
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
                          {h.confirmationStatus !== 'CONFIRMED' && (
                            <Button variant="ghost" size="icon" onClick={() => confirmHotel.mutate(h.id)} title="Confirm">
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" onClick={() => deleteHotel.mutate(h.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
