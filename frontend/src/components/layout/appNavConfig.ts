import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  BookOpen,
  Users,
  BarChart3,
  Library,
} from 'lucide-react';
import { Role } from '@/types';

export type AppNavItem = {
  name: string;
  href: string;
  icon: LucideIcon;
  /** If set, only these roles see the item */
  roles: Role[] | null;
};

export const APP_NAV_ITEMS: AppNavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: null },
  { name: 'Bookings', href: '/bookings', icon: BookOpen, roles: null },
  { name: 'Itinerary Library', href: '/itinerary', icon: Library, roles: [Role.OPS_MANAGER] },
  { name: 'Users', href: '/users', icon: Users, roles: [Role.OPS_MANAGER] },
  { name: 'Reports', href: '/reports', icon: BarChart3, roles: [Role.OPS_MANAGER] },
];

export function getVisibleNavItems(user: { role: string } | null): AppNavItem[] {
  return APP_NAV_ITEMS.filter((item) => {
    if (!item.roles) return true;
    return user ? item.roles.includes(user.role as Role) : false;
  });
}
