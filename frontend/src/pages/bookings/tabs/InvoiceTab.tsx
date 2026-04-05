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
import { CurrencyCode, PaxType } from '@/types';
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

type PolicyBreakdown = {
  adults: number;
  children: number;
  infants: number;
  adultUnits: number;
  childUnits: number;
  totalUnits: number;
  adultRate: number;
  childRate: number;
  infantRate: number;
  adultSubtotal: number;
  childSubtotal: number;
  infantSubtotal: number;
  computedTotal: number;
};

function computePolicyBreakdown(booking: Booking, costPerPerson: number): PolicyBreakdown {
  const adults = (booking.client ? 1 : 0) + booking.paxList.filter((p) => p.type === PaxType.ADULT).length;
  const children = booking.paxList.filter((p) => p.type === PaxType.CHILD).length;
  const infants = booking.paxList.filter((p) => p.type === PaxType.INFANT).length;

  const adultUnits = adults;
  const childUnits = children * 0.5;
  const totalUnits = adultUnits + childUnits;

  const adultRate = costPerPerson;
  const childRate = costPerPerson * 0.5;
  const infantRate = 0;

  const adultSubtotal = adultUnits * costPerPerson;
  const childSubtotal = children * childRate;
  const infantSubtotal = 0;
  const computedTotal = adultSubtotal + childSubtotal;

  return {
    adults,
    children,
    infants,
    adultUnits,
    childUnits,
    totalUnits,
    adultRate,
    childRate,
    infantRate,
    adultSubtotal,
    childSubtotal,
    infantSubtotal,
    computedTotal,
  };
}

export function InvoiceTab({ booking }: Props) {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const canManage = user ? canGenerateInvoice(user.role) : false;
  const [editing, setEditing] = useState(false);
  const [saveError, setSaveError] = useState<string>('');
  const [newInclusion, setNewInclusion] = useState('');
  const [autoPolicyMode, setAutoPolicyMode] = useState(true);

  const adults = (booking.client ? 1 : 0) + booking.paxList.filter((p) => p.type === PaxType.ADULT).length;
  const children = booking.paxList.filter((p) => p.type === PaxType.CHILD).length;
  const infants = booking.paxList.filter((p) => p.type === PaxType.INFANT).length;
  const totalGuests = adults + children + infants;

  const { data } = useQuery({
    queryKey: ['invoice', booking.id],
    queryFn: () => invoiceApi.get(booking.id),
    retry: false,
  });

  const invoice: Invoice | null = data?.data ?? booking.invoice ?? null;
  const currencyCode = booking.client?.preferredCurrency ?? CurrencyCode.USD;

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
  const policy = computePolicyBreakdown(booking, Number(watchedCost) || 0);
  const totalDiff = (Number(watchedTotal) || 0) - policy.computedTotal;
  const hasManualMismatch = !autoPolicyMode && Math.abs(totalDiff) >= 0.01;

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
      setAutoPolicyMode(true);
    }
  }, [editing, getValues, invoice?.tourInclusions]);

  // Auto-compute Total using policy rates:
  // Adult = 100%, Child = 50%, Infant = 0%
  useEffect(() => {
    if (!editing || !autoPolicyMode) return;
    const cost = Number(watchedCost) || 0;
    const breakdown = computePolicyBreakdown(booking, cost);
    const computedTotal = breakdown.computedTotal;
    setValue('totalAmount', computedTotal, { shouldDirty: true });
    lastAutoTotalRef.current = computedTotal;
  }, [watchedCost, booking, editing, autoPolicyMode, setValue]);

  // Auto-compute Balance = Total − Advance Paid
  useEffect(() => {
    if (!editing) return;
    const total = Number(watchedTotal) || 0;
    const advance = Number(watchedAdvance) || 0;
    const computedBalance = Math.max(0, total - advance);
    setValue('balanceAmount', computedBalance, { shouldDirty: true });
    lastAutoBalanceRef.current = computedBalance;
  }, [watchedTotal, watchedAdvance, editing, setValue]);

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

  const handleSave = (data: InvoiceForm) => {
    if (hasManualMismatch) {
      const proceed = window.confirm(
        `Manual total differs from policy by ${formatCurrency(totalDiff, currencyCode)}. Do you want to save anyway?`
      );
      if (!proceed) return;
    }

    saveMutation.mutate(data);
  };

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
          <form onSubmit={form.handleSubmit(handleSave)} className="grid gap-4 sm:grid-cols-2">
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
            <div className="sm:col-span-2 rounded-lg border bg-muted/20 p-3 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium text-muted-foreground">Passenger policy cost breakdown</p>
                <label className="inline-flex items-center gap-2 text-xs font-medium">
                  <input
                    type="checkbox"
                    checked={autoPolicyMode}
                    onChange={(e) => setAutoPolicyMode(e.target.checked)}
                  />
                  Auto-calculate total from policy
                </label>
              </div>
              <div className="mt-2 overflow-x-auto">
                <table className="min-w-full text-xs">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="px-2 py-1 text-left">Category</th>
                      <th className="px-2 py-1 text-left">Pax</th>
                      <th className="px-2 py-1 text-left">Rate Rule</th>
                      <th className="px-2 py-1 text-left">Applied Rate</th>
                      <th className="px-2 py-1 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b/60">
                      <td className="px-2 py-1">Adults</td>
                      <td className="px-2 py-1">{policy.adults}</td>
                      <td className="px-2 py-1">100%</td>
                      <td className="px-2 py-1">{formatCurrency(policy.adultRate, currencyCode)}</td>
                      <td className="px-2 py-1 text-right">{formatCurrency(policy.adultSubtotal, currencyCode)}</td>
                    </tr>
                    <tr className="border-b/60">
                      <td className="px-2 py-1">Children</td>
                      <td className="px-2 py-1">{policy.children}</td>
                      <td className="px-2 py-1">50%</td>
                      <td className="px-2 py-1">{formatCurrency(policy.childRate, currencyCode)}</td>
                      <td className="px-2 py-1 text-right">{formatCurrency(policy.childSubtotal, currencyCode)}</td>
                    </tr>
                    <tr>
                      <td className="px-2 py-1">Infants</td>
                      <td className="px-2 py-1">{policy.infants}</td>
                      <td className="px-2 py-1">Free</td>
                      <td className="px-2 py-1">{formatCurrency(policy.infantRate, currencyCode)}</td>
                      <td className="px-2 py-1 text-right">{formatCurrency(policy.infantSubtotal, currencyCode)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold">Computed total: {formatCurrency(policy.computedTotal, currencyCode)}</p>
                {!autoPolicyMode && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setValue('totalAmount', policy.computedTotal, { shouldDirty: true })}
                  >
                    Use computed total
                  </Button>
                )}
              </div>
              {hasManualMismatch && (
                <div className="mt-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-amber-800">
                  Warning: manual total is different from policy by {formatCurrency(totalDiff, currencyCode)}.
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label>Cost Per Person ({currencyCode}) *</Label>
              <Input type="number" step="0.01" {...form.register('costPerPerson')} />
              {errors.costPerPerson && <p className="text-xs text-red-600">{errors.costPerPerson.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Total Amount ({currencyCode}) *</Label>
              <Input
                type="number"
                step="0.01"
                {...form.register('totalAmount')}
                disabled={autoPolicyMode}
                className={autoPolicyMode ? 'bg-muted text-muted-foreground' : ''}
              />
              {autoPolicyMode ? (
                <p className="text-xs text-muted-foreground">Auto: Adult full + Child 50% + Infant free</p>
              ) : (
                <p className={`text-xs ${Math.abs(totalDiff) < 0.01 ? 'text-emerald-700' : 'text-amber-700'}`}>
                  Manual mode: {Math.abs(totalDiff) < 0.01 ? 'matches policy total' : `difference from policy is ${formatCurrency(totalDiff, currencyCode)}`}
                </p>
              )}
              {errors.totalAmount && <p className="text-xs text-red-600">{errors.totalAmount.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Advance Paid ({currencyCode}) *</Label>
              <Input type="number" step="0.01" {...form.register('advancePaid')} />
              {errors.advancePaid && <p className="text-xs text-red-600">{errors.advancePaid.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Balance Amount ({currencyCode}) *</Label>
              <Input
                type="number"
                step="0.01"
                {...form.register('balanceAmount')}
                disabled
                className="bg-muted text-muted-foreground"
              />
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
              <Info label={`Cost Per Person (${currencyCode})`} value={formatCurrency(invoice.costPerPerson, currencyCode)} />
              <Info label={`Total Amount (${currencyCode})`} value={formatCurrency(invoice.totalAmount, currencyCode)} />
              <Info label={`Advance Paid (${currencyCode})`} value={formatCurrency(invoice.advancePaid, currencyCode)} />
              <Info label={`Balance (${currencyCode})`} value={formatCurrency(invoice.balanceAmount, currencyCode)} />
            </div>
            {(() => {
              const readonlyPolicy = computePolicyBreakdown(booking, Number(invoice.costPerPerson));
              return (
                <div className="rounded-lg border bg-muted/20 p-3 text-sm">
                  <p className="text-xs font-medium text-muted-foreground">Passenger Policy Cost Breakdown</p>
                  <div className="mt-2 overflow-x-auto">
                    <table className="min-w-full text-xs">
                      <thead>
                        <tr className="border-b text-muted-foreground">
                          <th className="px-2 py-1 text-left">Category</th>
                          <th className="px-2 py-1 text-left">Pax</th>
                          <th className="px-2 py-1 text-left">Applied Rate</th>
                          <th className="px-2 py-1 text-right">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b/60">
                          <td className="px-2 py-1">Adults</td>
                          <td className="px-2 py-1">{readonlyPolicy.adults}</td>
                          <td className="px-2 py-1">{formatCurrency(readonlyPolicy.adultRate, currencyCode)}</td>
                          <td className="px-2 py-1 text-right">{formatCurrency(readonlyPolicy.adultSubtotal, currencyCode)}</td>
                        </tr>
                        <tr className="border-b/60">
                          <td className="px-2 py-1">Children</td>
                          <td className="px-2 py-1">{readonlyPolicy.children}</td>
                          <td className="px-2 py-1">{formatCurrency(readonlyPolicy.childRate, currencyCode)}</td>
                          <td className="px-2 py-1 text-right">{formatCurrency(readonlyPolicy.childSubtotal, currencyCode)}</td>
                        </tr>
                        <tr>
                          <td className="px-2 py-1">Infants</td>
                          <td className="px-2 py-1">{readonlyPolicy.infants}</td>
                          <td className="px-2 py-1">{formatCurrency(readonlyPolicy.infantRate, currencyCode)}</td>
                          <td className="px-2 py-1 text-right">{formatCurrency(readonlyPolicy.infantSubtotal, currencyCode)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <p className="mt-2 font-semibold">Computed Total: {formatCurrency(readonlyPolicy.computedTotal, currencyCode)}</p>
                  {Math.abs(Number(invoice.totalAmount) - readonlyPolicy.computedTotal) >= 0.01 && (
                    <p className="mt-1 text-xs text-amber-700">
                      Saved invoice total differs from policy by {formatCurrency(Number(invoice.totalAmount) - readonlyPolicy.computedTotal, currencyCode)}.
                    </p>
                  )}
                </div>
              );
            })()}
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
