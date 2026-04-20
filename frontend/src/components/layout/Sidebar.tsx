import { AppNavPanel } from './AppNavPanel';

export function Sidebar() {
  return (
    <aside className="hidden h-full w-64 shrink-0 border-r bg-background lg:flex lg:flex-col">
      <AppNavPanel />
    </aside>
  );
}
