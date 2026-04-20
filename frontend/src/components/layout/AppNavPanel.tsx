import { NavLink } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/lib/utils';
import { getVisibleNavItems } from './appNavConfig';

interface Props {
  /** Called after a nav link is activated (e.g. close mobile sheet) */
  onNavClick?: () => void;
  className?: string;
}

export function AppNavPanel({ onNavClick, className }: Props) {
  const user = useAuthStore((s) => s.user);
  const visibleNav = getVisibleNavItems(user);

  return (
    <div className={cn('flex h-full flex-col', className)}>
      <div className="flex h-20 items-center border-b px-4">
        <img src="/assets/logo.png" alt="VSL 360 logo" className="h-14 w-auto origin-left scale-125 object-contain" />
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {visibleNav.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            onClick={onNavClick}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )
            }
          >
            <item.icon className="h-4 w-4 shrink-0" />
            {item.name}
          </NavLink>
        ))}
      </nav>
      {user && (
        <div className="border-t p-4">
          <p className="text-xs text-muted-foreground">Logged in as</p>
          <p className="truncate text-sm font-medium">{user.name}</p>
          <p className="text-xs capitalize text-muted-foreground">{user.role.toLowerCase().replace('_', ' ')}</p>
        </div>
      )}
    </div>
  );
}
