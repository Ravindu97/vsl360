import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  BookOpen,
  Users,
  BarChart3,
  Globe,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { canManageUsers } from '@/utils/permissions';
import { cn } from '@/lib/utils';
import { Role } from '@/types';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: null },
  { name: 'Bookings', href: '/bookings', icon: BookOpen, roles: null },
  { name: 'Users', href: '/users', icon: Users, roles: [Role.OPS_MANAGER] },
  { name: 'Reports', href: '/reports', icon: BarChart3, roles: [Role.OPS_MANAGER] },
];

export function Sidebar() {
  const user = useAuthStore((s) => s.user);

  const visibleNav = navigation.filter((item) => {
    if (!item.roles) return true;
    return user && item.roles.includes(user.role as Role);
  });

  return (
    <aside className="flex h-full w-64 flex-col border-r bg-background">
      <div className="flex h-14 items-center gap-2 border-b px-4">
        <Globe className="h-6 w-6 text-primary" />
        <span className="text-lg font-bold">VSL 360</span>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {visibleNav.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )
            }
          >
            <item.icon className="h-4 w-4" />
            {item.name}
          </NavLink>
        ))}
      </nav>
      {user && (
        <div className="border-t p-4">
          <p className="text-xs text-muted-foreground">Logged in as</p>
          <p className="text-sm font-medium truncate">{user.name}</p>
          <p className="text-xs text-muted-foreground capitalize">{user.role.toLowerCase().replace('_', ' ')}</p>
        </div>
      )}
    </aside>
  );
}
