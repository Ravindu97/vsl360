import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Circle, ExternalLink, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { canCreateBooking, canManageUsers } from '@/utils/permissions';
import { useAuthStore } from '@/store/authStore';

const DISMISS_KEY = 'vsl360-onboarding-dismissed';

interface DashboardOnboardingChecklistProps {
  totalBookings: number;
  inquiryTotalCount: number;
  teamCount: number;
}

export function DashboardOnboardingChecklist({
  totalBookings,
  inquiryTotalCount,
  teamCount,
}: DashboardOnboardingChecklistProps) {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(DISMISS_KEY) === 'true';
  });

  const items = [
    {
      id: 'ingest',
      label: 'Connect website ingest',
      hint: 'Match INGEST_API_KEY on admin with ADMIN_INGEST_API_KEY on the public site.',
      done: inquiryTotalCount > 0,
      action: () => window.open('https://visitsrilanka360.com/planner', '_blank', 'noopener,noreferrer'),
      actionLabel: 'Open public site',
      show: true,
    },
    {
      id: 'team',
      label: 'Invite team',
      hint: 'Add planners so inquiries can be assigned and followed up.',
      done: teamCount > 1,
      action: () => navigate('/users'),
      actionLabel: 'Manage users',
      show: user ? canManageUsers(user.role) : false,
    },
    {
      id: 'booking',
      label: 'Create first booking',
      hint: 'Turn an accepted quote into a managed booking.',
      done: totalBookings > 0,
      action: () => navigate('/bookings/new'),
      actionLabel: 'New booking',
      show: user ? canCreateBooking(user.role) : false,
    },
  ].filter((item) => item.show);

  const completedCount = items.filter((item) => item.done).length;
  const allDone = items.length > 0 && completedCount === items.length;

  if (dismissed || allDone || items.length === 0) {
    return null;
  }

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, 'true');
    setDismissed(true);
  }

  return (
    <Card className="border-blue-200 bg-blue-50/40">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
        <div>
          <CardTitle className="text-lg">Getting started</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            {completedCount} of {items.length} complete — finish setup to run inquiries end-to-end.
          </p>
        </div>
        <Button variant="ghost" size="icon" className="shrink-0" onClick={dismiss} title="Dismiss">
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex flex-col gap-2 rounded-md border bg-background p-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex items-start gap-3">
              {item.done ? (
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
              ) : (
                <Circle className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
              )}
              <div>
                <p className={`text-sm font-medium ${item.done ? 'text-muted-foreground line-through' : ''}`}>
                  {item.label}
                </p>
                {!item.done ? <p className="text-xs text-muted-foreground">{item.hint}</p> : null}
              </div>
            </div>
            {!item.done ? (
              <Button variant="outline" size="sm" className="shrink-0" onClick={item.action}>
                {item.actionLabel}
                {item.id === 'ingest' ? <ExternalLink className="ml-2 h-3.5 w-3.5" /> : null}
              </Button>
            ) : null}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
