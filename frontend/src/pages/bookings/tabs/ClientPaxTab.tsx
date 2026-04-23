import { useState, useCallback, useEffect } from 'react';
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
import { CurrencyCode, PaxType } from '@/types';
import { inferPaxTypeFromAge } from '@/utils/invoicePolicy';

interface Props {
  booking: Booking;
}

const clientSchema = z.object({
  name: z.string().min(1),
  citizenship: z.string().min(1),
  languagePreference: z.string().min(1),
  preferredCurrency: z.nativeEnum(CurrencyCode),
  email: z.string().email(),
  contactNumber: z.string().min(1),
  passportNumber: z.string().optional(),
});

const paxSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  relationship: z.string().optional(),
  age: z.preprocess(
    (value) => (value === '' || value === null || value === undefined ? undefined : Number(value)),
    z.number({ required_error: 'Age is required' }).int().min(0, 'Age is required').max(120, 'Please provide a valid age')
  ),
});

type PaxForm = z.infer<typeof paxSchema>;

export function ClientPaxTab({ booking }: Props) {
  const queryClient = useQueryClient();
  const [editingClient, setEditingClient] = useState(false);
  const [addingPax, setAddingPax] = useState(false);
  const [editingPaxId, setEditingPaxId] = useState<string | null>(null);

  // Client form
  const clientForm = useForm({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name: booking.client?.name ?? '',
      citizenship: booking.client?.citizenship ?? '',
      languagePreference: booking.client?.languagePreference ?? 'English',
      preferredCurrency: booking.client?.preferredCurrency ?? CurrencyCode.USD,
      email: booking.client?.email ?? '',
      contactNumber: booking.client?.contactNumber ?? '',
      passportNumber: booking.client?.passportNumber ?? '',
    },
  });

  useEffect(() => {
    if (editingClient) return;
    clientForm.reset({
      name: booking.client?.name ?? '',
      citizenship: booking.client?.citizenship ?? '',
      languagePreference: booking.client?.languagePreference ?? 'English',
      preferredCurrency: booking.client?.preferredCurrency ?? CurrencyCode.USD,
      email: booking.client?.email ?? '',
      contactNumber: booking.client?.contactNumber ?? '',
      passportNumber: booking.client?.passportNumber ?? '',
    });
  }, [
    editingClient,
    booking.client?.name,
    booking.client?.citizenship,
    booking.client?.languagePreference,
    booking.client?.preferredCurrency,
    booking.client?.email,
    booking.client?.contactNumber,
    booking.client?.passportNumber,
    clientForm,
  ]);

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
    defaultValues: { name: '', relationship: '', age: undefined },
  });

  const watchedAge = paxForm.watch('age');
  const inferredType = inferPaxTypeFromAge(Number.isFinite(Number(watchedAge)) ? Number(watchedAge) : 0);

  const editPaxForm = useForm<PaxForm>({
    resolver: zodResolver(paxSchema),
    defaultValues: { name: '', relationship: '', age: undefined },
  });
  const watchedEditAge = editPaxForm.watch('age') as number | string | undefined;
  const editingPaxRow = editingPaxId ? paxList.find((p) => p.id === editingPaxId) : null;
  const editAgeNum =
    watchedEditAge === '' || watchedEditAge == null || watchedEditAge === undefined
      ? NaN
      : Number(watchedEditAge);
  const editInferredType = Number.isFinite(editAgeNum)
    ? inferPaxTypeFromAge(editAgeNum)
    : (editingPaxRow?.type ?? PaxType.ADULT);

  const createPax = useMutation({
    mutationFn: (data: PaxForm) => paxApi.create(booking.id, { ...data, type: inferPaxTypeFromAge(data.age) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pax', booking.id] });
      queryClient.invalidateQueries({ queryKey: ['booking', booking.id] });
      paxForm.reset({ name: '', relationship: '', age: undefined });
      setAddingPax(false);
    },
  });

  const updatePax = useMutation({
    mutationFn: ({ paxId, data }: { paxId: string; data: PaxForm }) =>
      paxApi.update(booking.id, paxId, { ...data, type: inferPaxTypeFromAge(data.age) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pax', booking.id] });
      queryClient.invalidateQueries({ queryKey: ['booking', booking.id] });
      setEditingPaxId(null);
    },
  });

  const startEditPax = useCallback(
    (pax: Pax) => {
      setEditingPaxId(pax.id);
      setAddingPax(false);
      editPaxForm.reset({
        name: pax.name,
        relationship: pax.relationship ?? '',
        age: pax.age,
      });
    },
    [editPaxForm]
  );

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
                <Label>Language Preference</Label>
                <Input {...clientForm.register('languagePreference')} />
              </div>
              <div className="space-y-2">
                <Label>Preferred Currency</Label>
                <Select
                  value={clientForm.watch('preferredCurrency')}
                  onValueChange={(value) => clientForm.setValue('preferredCurrency', value as CurrencyCode, { shouldDirty: true, shouldValidate: true })}
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
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" {...clientForm.register('email')} />
              </div>
              <div className="space-y-2">
                <Label>Contact Number</Label>
                <Input {...clientForm.register('contactNumber')} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Passport number</Label>
                <Input {...clientForm.register('passportNumber')} autoComplete="off" />
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
              <Info label="Language Preference" value={booking.client?.languagePreference} />
              <Info label="Preferred Currency" value={booking.client?.preferredCurrency} />
              <Info label="Email" value={booking.client?.email} />
              <Info label="Contact" value={booking.client?.contactNumber} />
              <Info label="Passport number" value={booking.client?.passportNumber ?? undefined} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pax Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Passengers ({paxList.length})</CardTitle>
          {!addingPax && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setEditingPaxId(null);
                setAddingPax(true);
              }}
            >
              <Plus className="mr-2 h-3 w-3" /> Add Pax
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <div className="mb-4 rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
            Passenger policy: age ≤5 = Infant (free), ages 6–11 = Child (50%), age 12+ = Adult (full rate). Invoice uses these age bands; type is set from age.
          </div>

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
                <Label>Type (Auto)</Label>
                <Select value={inferredType} disabled>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(PaxType).map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Age</Label>
                <Input type="number" min={0} max={120} step={1} {...paxForm.register('age')} />
                {paxForm.formState.errors.age && (
                  <p className="text-xs text-red-600">{paxForm.formState.errors.age.message}</p>
                )}
              </div>
              <div className="flex items-end gap-2">
                <Button type="submit" size="sm" disabled={createPax.isPending}>
                  <Save className="mr-1 h-3 w-3" /> Add
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    paxForm.reset({ name: '', relationship: '', age: undefined });
                    setAddingPax(false);
                  }}
                >
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
                {paxList.map((pax) =>
                  editingPaxId === pax.id ? (
                    <TableRow key={pax.id} className="align-top">
                      <TableCell colSpan={5} className="p-2">
                        <form
                          className="grid gap-2 rounded-md border bg-muted/20 p-3 sm:grid-cols-5"
                          onSubmit={editPaxForm.handleSubmit((d) => updatePax.mutate({ paxId: pax.id, data: d }))}
                        >
                          <div className="space-y-1 sm:col-span-1">
                            <Label className="text-xs">Name *</Label>
                            <Input {...editPaxForm.register('name')} />
                            {editPaxForm.formState.errors.name && (
                              <p className="text-xs text-red-600">{editPaxForm.formState.errors.name.message}</p>
                            )}
                          </div>
                          <div className="space-y-1 sm:col-span-1">
                            <Label className="text-xs">Relationship</Label>
                            <Input {...editPaxForm.register('relationship')} />
                          </div>
                          <div className="space-y-1 sm:col-span-1">
                            <Label className="text-xs">Type (Auto)</Label>
                            <Select value={editInferredType} disabled>
                              <SelectTrigger className="h-9">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {Object.values(PaxType).map((t) => (
                                  <SelectItem key={t} value={t}>
                                    {t}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1 sm:col-span-1">
                            <Label className="text-xs">Age *</Label>
                            <Input type="number" min={0} max={120} step={1} {...editPaxForm.register('age')} />
                            {editPaxForm.formState.errors.age && (
                              <p className="text-xs text-red-600">{editPaxForm.formState.errors.age.message}</p>
                            )}
                          </div>
                          <div className="flex items-end justify-end gap-1 sm:col-span-1">
                            <Button type="submit" size="sm" disabled={updatePax.isPending}>
                              <Save className="mr-1 h-3 w-3" />
                              {updatePax.isPending ? '...' : 'Save'}
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditingPaxId(null);
                                editPaxForm.reset();
                              }}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </form>
                      </TableCell>
                    </TableRow>
                  ) : (
                    <TableRow key={pax.id}>
                      <TableCell className="font-medium">{pax.name}</TableCell>
                      <TableCell>{pax.relationship || '—'}</TableCell>
                      <TableCell>{pax.type}</TableCell>
                      <TableCell>{pax.age ?? '—'}</TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex items-center">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => startEditPax(pax)}
                            title="Edit passenger"
                            aria-label="Edit passenger"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deletePax.mutate(pax.id)}
                            title="Delete passenger"
                            aria-label="Delete passenger"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                )}
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
