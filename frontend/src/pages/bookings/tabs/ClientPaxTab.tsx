import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Pencil, Trash2, Save, X } from 'lucide-react';
import { clientApi, paxApi } from '@/api/endpoints.api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EmptyState } from '@/components/shared/EmptyState';
import type { Booking, Pax } from '@/types';
import { PaxType } from '@/types';

interface Props {
  booking: Booking;
}

const clientSchema = z.object({
  name: z.string().min(1),
  citizenship: z.string().min(1),
  email: z.string().email(),
  contactNumber: z.string().min(1),
});

const paxSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  relationship: z.string().optional(),
  type: z.nativeEnum(PaxType),
  age: z.coerce.number().optional(),
});

type PaxForm = z.infer<typeof paxSchema>;

export function ClientPaxTab({ booking }: Props) {
  const queryClient = useQueryClient();
  const [editingClient, setEditingClient] = useState(false);
  const [addingPax, setAddingPax] = useState(false);

  // Client form
  const clientForm = useForm({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name: booking.client?.name ?? '',
      citizenship: booking.client?.citizenship ?? '',
      email: booking.client?.email ?? '',
      contactNumber: booking.client?.contactNumber ?? '',
    },
  });

  const updateClient = useMutation({
    mutationFn: (data: any) => clientApi.update(booking.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking', booking.id] });
      setEditingClient(false);
    },
  });

  // Pax
  const { data: paxData } = useQuery({
    queryKey: ['pax', booking.id],
    queryFn: () => paxApi.list(booking.id),
  });

  const paxList: Pax[] = paxData?.data ?? booking.paxList ?? [];

  const paxForm = useForm<PaxForm>({
    resolver: zodResolver(paxSchema),
    defaultValues: { type: PaxType.ADULT },
  });

  const createPax = useMutation({
    mutationFn: (data: PaxForm) => paxApi.create(booking.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pax', booking.id] });
      queryClient.invalidateQueries({ queryKey: ['booking', booking.id] });
      paxForm.reset({ type: PaxType.ADULT });
      setAddingPax(false);
    },
  });

  const deletePax = useMutation({
    mutationFn: (paxId: string) => paxApi.delete(booking.id, paxId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pax', booking.id] });
      queryClient.invalidateQueries({ queryKey: ['booking', booking.id] });
    },
  });

  return (
    <div className="space-y-6">
      {/* Client Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Client (Main Guest)</CardTitle>
          {!editingClient && (
            <Button variant="outline" size="sm" onClick={() => setEditingClient(true)}>
              <Pencil className="mr-2 h-3 w-3" /> Edit
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {editingClient ? (
            <form onSubmit={clientForm.handleSubmit((d) => updateClient.mutate(d))} className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input {...clientForm.register('name')} />
              </div>
              <div className="space-y-2">
                <Label>Citizenship</Label>
                <Input {...clientForm.register('citizenship')} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" {...clientForm.register('email')} />
              </div>
              <div className="space-y-2">
                <Label>Contact Number</Label>
                <Input {...clientForm.register('contactNumber')} />
              </div>
              <div className="sm:col-span-2 flex gap-2">
                <Button type="submit" size="sm" disabled={updateClient.isPending}>
                  <Save className="mr-2 h-3 w-3" />{updateClient.isPending ? 'Saving...' : 'Save'}
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setEditingClient(false)}>
                  <X className="mr-2 h-3 w-3" /> Cancel
                </Button>
              </div>
            </form>
          ) : (
            <div className="grid gap-3 text-sm sm:grid-cols-2">
              <Info label="Name" value={booking.client?.name} />
              <Info label="Citizenship" value={booking.client?.citizenship} />
              <Info label="Email" value={booking.client?.email} />
              <Info label="Contact" value={booking.client?.contactNumber} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pax Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Passengers ({paxList.length})</CardTitle>
          {!addingPax && (
            <Button variant="outline" size="sm" onClick={() => setAddingPax(true)}>
              <Plus className="mr-2 h-3 w-3" /> Add Pax
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {addingPax && (
            <form
              onSubmit={paxForm.handleSubmit((d) => createPax.mutate(d))}
              className="mb-4 grid gap-3 rounded-md border p-4 sm:grid-cols-5"
            >
              <div className="space-y-1">
                <Label>Name *</Label>
                <Input {...paxForm.register('name')} />
              </div>
              <div className="space-y-1">
                <Label>Relationship</Label>
                <Input {...paxForm.register('relationship')} />
              </div>
              <div className="space-y-1">
                <Label>Type</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                  {...paxForm.register('type')}
                >
                  {Object.values(PaxType).map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label>Age</Label>
                <Input type="number" {...paxForm.register('age')} />
              </div>
              <div className="flex items-end gap-2">
                <Button type="submit" size="sm" disabled={createPax.isPending}>
                  <Save className="mr-1 h-3 w-3" /> Add
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setAddingPax(false)}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </form>
          )}

          {paxList.length === 0 ? (
            <EmptyState title="No passengers yet" description="Add passengers for this booking" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Relationship</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Age</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paxList.map((pax) => (
                  <TableRow key={pax.id}>
                    <TableCell className="font-medium">{pax.name}</TableCell>
                    <TableCell>{pax.relationship || '—'}</TableCell>
                    <TableCell>{pax.type}</TableCell>
                    <TableCell>{pax.age ?? '—'}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => deletePax.mutate(pax.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Info({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="font-medium">{value || '—'}</p>
    </div>
  );
}
