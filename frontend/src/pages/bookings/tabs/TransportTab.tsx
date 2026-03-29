import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Trash2, Save, X } from 'lucide-react';
import { transportApi } from '@/api/endpoints.api';
import { useAuthStore } from '@/store/authStore';
import { canManageTransport } from '@/utils/permissions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EmptyState } from '@/components/shared/EmptyState';
import type { Booking, TransportPlan } from '@/types';

interface Props {
  booking: Booking;
}

const transportSchema = z.object({
  vehicleModel: z.string().min(1, 'Required'),
  vehicleModel: z.string().min(1, 'Required'),
  vehicleIdNumber: z.string().optional(),
  vehicleNotes: z.string().optional(),
  babySeatRequired: z.boolean(),
  wheelchairRequired: z.boolean(),
  driverName: z.string().optional(),
  driverLanguage: z.string().min(1, 'Required'),
  arrivalPickupLocation: z.string().optional(),
  arrivalPickupTime: z.string().optional(),
  arrivalPickupNotes: z.string().optional(),
  departureDropLocation: z.string().optional(),
  departureDropTime: z.string().optional(),
  departureDropNotes: z.string().optional(),
  internalNotes: z.string().optional(),
});

type TransportForm = z.infer<typeof transportSchema>;

const dayPlanSchema = z.object({
  dayNumber: z.coerce.number().min(1),
  description: z.string().min(1, 'Required'),
  pickupTime: z.string().optional(),
  pickupLocation: z.string().optional(),
  dropLocation: z.string().optional(),
  notes: z.string().optional(),
});

type DayPlanForm = z.infer<typeof dayPlanSchema>;

export function TransportTab({ booking }: Props) {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const canManage = user ? canManageTransport(user.role) : false;
  const [editingPlan, setEditingPlan] = useState(false);
  const [addingDay, setAddingDay] = useState(false);

  const { data } = useQuery({
    queryKey: ['transport', booking.id],
    queryFn: () => transportApi.get(booking.id),
    retry: false,
  });

  const plan: TransportPlan | null = data?.data ?? booking.transportPlan ?? null;

  const planForm = useForm<TransportForm>({
    resolver: zodResolver(transportSchema),
    defaultValues: plan
      ? { ...plan, babySeatRequired: plan.babySeatRequired ?? false, wheelchairRequired: plan.wheelchairRequired ?? false }
      : { vehicleModel: '', driverLanguage: 'English', babySeatRequired: false, wheelchairRequired: false },
  });

  const dayForm = useForm<DayPlanForm>({
    resolver: zodResolver(dayPlanSchema),
    defaultValues: { dayNumber: (plan?.dayPlans?.length ?? 0) + 1 },
  });

  const savePlan = useMutation({
    mutationFn: (data: TransportForm) =>
      plan ? transportApi.update(booking.id, data) : transportApi.create(booking.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transport', booking.id] });
      queryClient.invalidateQueries({ queryKey: ['booking', booking.id] });
      setEditingPlan(false);
    },
  });

  const createDay = useMutation({
    mutationFn: (data: DayPlanForm) => transportApi.createDayPlan(booking.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transport', booking.id] });
      queryClient.invalidateQueries({ queryKey: ['booking', booking.id] });
      dayForm.reset({ dayNumber: (plan?.dayPlans?.length ?? 0) + 2 });
      setAddingDay(false);
    },
  });

  const deleteDay = useMutation({
    mutationFn: (dayId: string) => transportApi.deleteDayPlan(booking.id, dayId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transport', booking.id] });
      queryClient.invalidateQueries({ queryKey: ['booking', booking.id] });
    },
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Transport Plan</CardTitle>
          {canManage && !editingPlan && (
            <Button variant="outline" size="sm" onClick={() => setEditingPlan(true)}>
              {plan ? 'Edit' : 'Create'} Plan
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {editingPlan && canManage ? (
            <form onSubmit={planForm.handleSubmit((d) => savePlan.mutate(d))} className="space-y-6">
              {/* Vehicle Details */}
              <fieldset className="rounded-md border p-4 space-y-3">
                <legend className="px-2 text-sm font-semibold text-muted-foreground">Vehicle Details</legend>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label>Vehicle Model *</Label>
                    <Input {...planForm.register('vehicleModel')} />
                  </div>
                  <div className="space-y-1">
                    <Label>Vehicle ID Number</Label>
                    <Input {...planForm.register('vehicleIdNumber')} />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <Label>Vehicle Notes</Label>
                    <Input {...planForm.register('vehicleNotes')} />
                  </div>
                </div>
              </fieldset>

              {/* Driver Details */}
              <fieldset className="rounded-md border p-4 space-y-3">
                <legend className="px-2 text-sm font-semibold text-muted-foreground">Driver Details</legend>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label>Driver Name</Label>
                    <Input {...planForm.register('driverName')} />
                  </div>
                  <div className="space-y-1">
                    <Label>Driver Language *</Label>
                    <Input {...planForm.register('driverLanguage')} />
                  </div>
                </div>
              </fieldset>

              {/* Special Requirements */}
              <fieldset className="rounded-md border p-4 space-y-3">
                <legend className="px-2 text-sm font-semibold text-muted-foreground">Special Requirements</legend>
                <div className="flex flex-wrap gap-6">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" {...planForm.register('babySeatRequired')} className="rounded" />
                    Baby Seat Required
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" {...planForm.register('wheelchairRequired')} className="rounded" />
                    Wheelchair Required
                  </label>
                </div>
              </fieldset>

              {/* Arrival Pickup */}
              <fieldset className="rounded-md border p-4 space-y-3">
                <legend className="px-2 text-sm font-semibold text-muted-foreground">Arrival Pickup</legend>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="space-y-1">
                    <Label>Location</Label>
                    <Input {...planForm.register('arrivalPickupLocation')} />
                  </div>
                  <div className="space-y-1">
                    <Label>Time</Label>
                    <Input type="time" {...planForm.register('arrivalPickupTime')} />
                  </div>
                  <div className="space-y-1">
                    <Label>Notes</Label>
                    <Input {...planForm.register('arrivalPickupNotes')} />
                  </div>
                </div>
              </fieldset>

              {/* Departure Drop */}
              <fieldset className="rounded-md border p-4 space-y-3">
                <legend className="px-2 text-sm font-semibold text-muted-foreground">Departure Drop</legend>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="space-y-1">
                    <Label>Location</Label>
                    <Input {...planForm.register('departureDropLocation')} />
                  </div>
                  <div className="space-y-1">
                    <Label>Time</Label>
                    <Input type="time" {...planForm.register('departureDropTime')} />
                  </div>
                  <div className="space-y-1">
                    <Label>Notes</Label>
                    <Input {...planForm.register('departureDropNotes')} />
                  </div>
                </div>
              </fieldset>

              {/* Internal Notes */}
              <div className="space-y-1">
                <Label>Internal Notes</Label>
                <Textarea {...planForm.register('internalNotes')} />
              </div>

              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={savePlan.isPending}>
                  <Save className="mr-1 h-3 w-3" /> {savePlan.isPending ? 'Saving...' : 'Save'}
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setEditingPlan(false)}>
                  <X className="mr-1 h-3 w-3" /> Cancel
                </Button>
              </div>
            </form>
          ) : plan ? (
            <div className="space-y-4">
              <div className="grid gap-3 text-sm sm:grid-cols-3">
                <Info label="Vehicle" value={plan.vehicleModel} />
                <Info label="Vehicle ID" value={plan.vehicleIdNumber} />
                <Info label="Driver" value={`${plan.driverName || '—'} (${plan.driverLanguage})`} />
              </div>
              <div className="grid gap-3 text-sm sm:grid-cols-2">
                <Info label="Arrival Pickup" value={[plan.arrivalPickupLocation, plan.arrivalPickupTime].filter(Boolean).join(' at ')} />
                <Info label="Departure Drop" value={[plan.departureDropLocation, plan.departureDropTime].filter(Boolean).join(' at ')} />
              </div>
              <div className="flex gap-6 text-sm">
                {plan.babySeatRequired && <span className="rounded-full bg-blue-50 px-3 py-0.5 text-blue-700 text-xs font-medium">Baby Seat</span>}
                {plan.wheelchairRequired && <span className="rounded-full bg-blue-50 px-3 py-0.5 text-blue-700 text-xs font-medium">Wheelchair</span>}
                {!plan.babySeatRequired && !plan.wheelchairRequired && <span className="text-xs text-muted-foreground">No special requirements</span>}
              </div>
            </div>
          ) : (
            <EmptyState title="No transport plan" description="Create a transport plan for this booking" />
          )}
        </CardContent>
      </Card>

      {plan && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Day Plans ({plan.dayPlans?.length ?? 0})</CardTitle>
            {canManage && !addingDay && (
              <Button variant="outline" size="sm" onClick={() => setAddingDay(true)}>
                <Plus className="mr-2 h-3 w-3" /> Add Day
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {addingDay && canManage && (
              <form onSubmit={dayForm.handleSubmit((d) => createDay.mutate(d))} className="mb-4 grid gap-3 rounded-md border p-4 sm:grid-cols-3">
                <div className="space-y-1">
                  <Label>Day # *</Label>
                  <Input type="number" {...dayForm.register('dayNumber')} />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label>Description *</Label>
                  <Input {...dayForm.register('description')} />
                </div>
                <div className="space-y-1">
                  <Label>Pickup Time</Label>
                  <Input type="time" {...dayForm.register('pickupTime')} />
                </div>
                <div className="space-y-1">
                  <Label>Pickup Location</Label>
                  <Input {...dayForm.register('pickupLocation')} />
                </div>
                <div className="space-y-1">
                  <Label>Drop Location</Label>
                  <Input {...dayForm.register('dropLocation')} />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label>Notes</Label>
                  <Textarea {...dayForm.register('notes')} />
                </div>
                <div className="flex items-end gap-2">
                  <Button type="submit" size="sm" disabled={createDay.isPending}>
                    <Save className="mr-1 h-3 w-3" /> Add
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => setAddingDay(false)}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </form>
            )}

            {(!plan.dayPlans || plan.dayPlans.length === 0) ? (
              <EmptyState title="No day plans" description="Add day-by-day transport plans" />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Day</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Pickup</TableHead>
                    <TableHead>Drop</TableHead>
                    {canManage && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {plan.dayPlans
                    .sort((a, b) => a.dayNumber - b.dayNumber)
                    .map((d) => (
                      <TableRow key={d.id}>
                        <TableCell>{d.dayNumber}</TableCell>
                        <TableCell className="font-medium">{d.description}</TableCell>
                        <TableCell>{[d.pickupTime, d.pickupLocation].filter(Boolean).join(' — ') || '—'}</TableCell>
                        <TableCell>{d.dropLocation || '—'}</TableCell>
                        {canManage && (
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon" onClick={() => deleteDay.mutate(d.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="font-medium">{value || '—'}</p>
    </div>
  );
}
