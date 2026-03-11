import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Pencil, Save, X } from 'lucide-react';
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
});

type InvoiceForm = z.infer<typeof invoiceSchema>;

export function InvoiceTab({ booking }: Props) {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const canManage = user ? canGenerateInvoice(user.role) : false;
  const [editing, setEditing] = useState(false);

  const { data } = useQuery({
    queryKey: ['invoice', booking.id],
    queryFn: () => invoiceApi.get(booking.id),
    retry: false,
  });

  const invoice: Invoice | null = data?.data ?? booking.invoice ?? null;

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
        }
      : { costPerPerson: 0, totalAmount: 0, advancePaid: 0, balanceAmount: 0 },
  });

  const saveMutation = useMutation({
    mutationFn: (data: InvoiceForm) =>
      invoice ? invoiceApi.update(booking.id, data) : invoiceApi.create(booking.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoice', booking.id] });
      queryClient.invalidateQueries({ queryKey: ['booking', booking.id] });
      setEditing(false);
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
            <div className="space-y-2">
              <Label>Cost Per Person (USD) *</Label>
              <Input type="number" step="0.01" {...form.register('costPerPerson')} />
            </div>
            <div className="space-y-2">
              <Label>Total Amount (USD) *</Label>
              <Input type="number" step="0.01" {...form.register('totalAmount')} />
            </div>
            <div className="space-y-2">
              <Label>Advance Paid (USD) *</Label>
              <Input type="number" step="0.01" {...form.register('advancePaid')} />
            </div>
            <div className="space-y-2">
              <Label>Balance Amount (USD) *</Label>
              <Input type="number" step="0.01" {...form.register('balanceAmount')} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Payment Notes</Label>
              <Textarea {...form.register('paymentNotes')} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Payment Instructions</Label>
              <Textarea {...form.register('paymentInstructions')} />
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
