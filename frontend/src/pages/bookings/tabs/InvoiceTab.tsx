import { useState, useEffect, useRef } from 'react';
import { AxiosError } from 'axios';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Pencil, Save, X, Plus, Trash2 } from 'lucide-react';
import { invoiceApi } from '@/api/endpoints.api';
import { useAuthStore } from '@/store/authStore';
import { canGenerateInvoice } from '@/utils/permissions';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/shared/EmptyState';
import { PaxType } from '@/types';
import type { Booking, Invoice } from '@/types';

interface Props {
  booking: Booking;
}

const invoiceSchema = z.object({
  costPerPerson: z.coerce.number().min(0),
  totalAmount: z.coerce.number().min(0),
  advancePaid: z.coerce.number().min(0),
  balanceAmount: z.coerce.number().min(0),
  paymentNotes: z.string().optional(),
  paymentInstructions: z.string().optional(),
  tourInclusions: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.advancePaid > data.totalAmount) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['advancePaid'],
      message: 'Advance paid cannot exceed total amount.',
    });
  }

  if (data.balanceAmount !== data.totalAmount - data.advancePaid) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['balanceAmount'],
      message: 'Balance amount must equal total amount minus advance paid.',
    });
  }
});

type InvoiceForm = z.infer<typeof invoiceSchema>;

export function InvoiceTab({ booking }: Props) {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const canManage = user ? canGenerateInvoice(user.role) : false;
  const [editing, setEditing] = useState(false);
  const [saveError, setSaveError] = useState<string>('');
  const [newInclusion, setNewInclusion] = useState('');

  const adults = (booking.client ? 1 : 0) + booking.paxList.filter(p => p.type === PaxType.ADULT).length;
  const children = booking.paxList.filter(p => p.type === PaxType.CHILD).length;
  const infants = booking.paxList.filter(p => p.type === PaxType.INFANT).length;
  const totalGuests = adults + children + infants;

  const { data } = useQuery({
    queryKey: ['invoice', booking.id],
    queryFn: () => invoiceApi.get(booking.id),
    retry: false,
  });

  const invoice: Invoice | null = data?.data ?? booking.invoice ?? null;

  const [inclusions, setInclusions] = useState<string[]>(
    () => (booking.invoice?.tourInclusions ?? '').split('\n').filter(Boolean)
  );

  // Sync inclusions when query data loads
  useEffect(() => {
    if (data?.data?.tourInclusions !== undefined) {
      setInclusions((data.data.tourInclusions ?? '').split('\n').filter(Boolean));
    }
  }, [data?.data?.tourInclusions]);

  const form = useForm<InvoiceForm>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: invoice
      ? {
          costPerPerson: invoice.costPerPerson,
          totalAmount: invoice.totalAmount,
          advancePaid: invoice.advancePaid,
          balanceAmount: invoice.balanceAmount,
          paymentNotes: invoice.paymentNotes ?? '',
          paymentInstructions: invoice.paymentInstructions ?? '',
          tourInclusions: invoice.tourInclusions ?? '',
        }
      : { costPerPerson: 0, totalAmount: 0, advancePaid: 0, balanceAmount: 0 },
  });

  const { setValue, watch, getValues, formState: { errors } } = form;
  const watchedCost = watch('costPerPerson');
  const watchedTotal = watch('totalAmount');
  const watchedAdvance = watch('advancePaid');

  const lastAutoTotalRef = useRef<number>(invoice?.totalAmount ?? 0);
  const lastAutoBalanceRef = useRef<number>(invoice?.balanceAmount ?? 0);

  // Reset auto-fill baselines each time editing mode opens
  useEffect(() => {
    if (editing) {
      lastAutoTotalRef.current = getValues('totalAmount');
      lastAutoBalanceRef.current = getValues('balanceAmount');
      setSaveError('');
      setInclusions(invoice?.tourInclusions?.split('\n').filter(Boolean) ?? []);
      setNewInclusion('');
    }
  }, [editing, getValues]);

  // Auto-compute Total = Cost Per Person × Total Guests
  useEffect(() => {
    if (!editing || totalGuests === 0) return;
    const cost = Number(watchedCost) || 0;
    const computedTotal = cost * totalGuests;
    const currentTotal = Number(getValues('totalAmount')) || 0;
    if (currentTotal === lastAutoTotalRef.current) {
      setValue('totalAmount', computedTotal, { shouldDirty: true });
      lastAutoTotalRef.current = computedTotal;
    }
  }, [watchedCost, editing, totalGuests, getValues, setValue]);

  // Auto-compute Balance = Total − Advance Paid
  useEffect(() => {
    if (!editing) return;
    const total = Number(watchedTotal) || 0;
    const advance = Number(watchedAdvance) || 0;
    const computedBalance = Math.max(0, total - advance);
    const currentBalance = Number(getValues('balanceAmount')) || 0;
    if (currentBalance === lastAutoBalanceRef.current) {
      setValue('balanceAmount', computedBalance, { shouldDirty: true });
      lastAutoBalanceRef.current = computedBalance;
    }
  }, [watchedTotal, watchedAdvance, editing, getValues, setValue]);

  const saveMutation = useMutation({
    mutationFn: (data: InvoiceForm) =>
      invoice ? invoiceApi.update(booking.id, { ...data, tourInclusions: inclusions.join('\n') }) : invoiceApi.create(booking.id, { ...data, tourInclusions: inclusions.join('\n') }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoice', booking.id] });
      queryClient.invalidateQueries({ queryKey: ['booking', booking.id] });
      setSaveError('');
      setEditing(false);
    },
    onError: (error) => {
      const message = error instanceof AxiosError
        ? error.response?.data?.error ?? 'Unable to save invoice.'
        : 'Unable to save invoice.';
      setSaveError(message);
    },
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Invoice</CardTitle>
        {canManage && !editing && (
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            <Pencil className="mr-2 h-3 w-3" /> {invoice ? 'Edit' : 'Create'}
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {editing && canManage ? (
          <form onSubmit={form.handleSubmit((d) => saveMutation.mutate(d))} className="grid gap-4 sm:grid-cols-2">
            {saveError && (
              <div className="sm:col-span-2 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {saveError}
              </div>
            )}
            <div className="sm:col-span-2 flex flex-wrap items-center gap-3 rounded-lg border bg-muted/40 px-4 py-3 text-sm">
              <span className="text-xs font-medium text-muted-foreground">Guests from Pax Details:</span>
              <div className="flex flex-wrap gap-2">
                <span className="rounded border bg-background px-2 py-0.5 text-xs font-semibold">Adults: {adults}</span>
                {children > 0 && <span className="rounded border bg-background px-2 py-0.5 text-xs font-semibold">Children: {children}</span>}
                {infants > 0 && <span className="rounded border bg-background px-2 py-0.5 text-xs font-semibold">Infants: {infants}</span>}
                <span className="rounded border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs font-semibold">Total: {totalGuests}</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Cost Per Person (USD) *</Label>
              <Input type="number" step="0.01" {...form.register('costPerPerson')} />
              {errors.costPerPerson && <p className="text-xs text-red-600">{errors.costPerPerson.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Total Amount (USD) *</Label>
              <Input type="number" step="0.01" {...form.register('totalAmount')} />
              <p className="text-xs text-muted-foreground">Auto: Cost × {totalGuests} guests</p>
              {errors.totalAmount && <p className="text-xs text-red-600">{errors.totalAmount.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Advance Paid (USD) *</Label>
              <Input type="number" step="0.01" {...form.register('advancePaid')} />
              {errors.advancePaid && <p className="text-xs text-red-600">{errors.advancePaid.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Balance Amount (USD) *</Label>
              <Input type="number" step="0.01" {...form.register('balanceAmount')} />
              <p className="text-xs text-muted-foreground">Auto: Total − Advance</p>
              {errors.balanceAmount && <p className="text-xs text-red-600">{errors.balanceAmount.message}</p>}
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Payment Notes</Label>
              <Textarea {...form.register('paymentNotes')} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Payment Instructions</Label>
              <Textarea {...form.register('paymentInstructions')} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Tour Inclusions</Label>
              <div className="space-y-2">
                {inclusions.map((item, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="flex-1 rounded border bg-muted/30 px-3 py-1.5 text-sm">{item}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-red-600"
                      onClick={() => setInclusions(inclusions.filter((_, idx) => idx !== i))}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
                <div className="flex items-center gap-2">
                  <Input
                    value={newInclusion}
                    onChange={(e) => setNewInclusion(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const val = newInclusion.trim();
                        if (val) { setInclusions([...inclusions, val]); setNewInclusion(''); }
                      }
                    }}
                    placeholder="Type an item and press Enter or click +"
                    className="flex-1 text-sm"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9 w-9 p-0"
                    onClick={() => {
                      const val = newInclusion.trim();
                      if (val) { setInclusions([...inclusions, val]); setNewInclusion(''); }
                    }}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
            <div className="sm:col-span-2 flex gap-2">
              <Button type="submit" size="sm" disabled={saveMutation.isPending}>
                <Save className="mr-1 h-3 w-3" /> {saveMutation.isPending ? 'Saving...' : 'Save'}
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setEditing(false)}>
                <X className="mr-1 h-3 w-3" /> Cancel
              </Button>
            </div>
          </form>
        ) : invoice ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/40 px-4 py-2.5 text-xs">
              <span className="font-medium text-muted-foreground">Guests:</span>
              <span>{adults} Adults{children > 0 ? ` · ${children} Children` : ''}{infants > 0 ? ` · ${infants} Infants` : ''}</span>
              <span className="ml-auto font-semibold">{totalGuests} Total</span>
            </div>
            <div className="grid gap-3 text-sm sm:grid-cols-2">
              <Info label="Invoice Number" value={invoice.invoiceNumber} />
              <Info label="Date" value={formatDate(invoice.invoiceDate)} />
              <Info label="Cost Per Person" value={formatCurrency(invoice.costPerPerson)} />
              <Info label="Total Amount" value={formatCurrency(invoice.totalAmount)} />
              <Info label="Advance Paid" value={formatCurrency(invoice.advancePaid)} />
              <Info label="Balance" value={formatCurrency(invoice.balanceAmount)} />
            </div>
            {invoice.paymentNotes && (
              <div className="text-sm">
                <p className="text-muted-foreground text-xs">Payment Notes</p>
                <p>{invoice.paymentNotes}</p>
              </div>
            )}
            {invoice.paymentInstructions && (
              <div className="text-sm">
                <p className="text-muted-foreground text-xs">Payment Instructions</p>
                <p>{invoice.paymentInstructions}</p>
              </div>
            )}
            {invoice.tourInclusions && (
              <div className="text-sm">
                <p className="text-muted-foreground text-xs">Tour Inclusions</p>
                <ul className="list-disc list-inside mt-1 space-y-0.5">
                  {invoice.tourInclusions.split('\n').filter(Boolean).map((item, i) => (
                    <li key={i}>{item.trim()}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <EmptyState title="No invoice" description="Create an invoice for this booking" />
        )}
      </CardContent>
    </Card>
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
