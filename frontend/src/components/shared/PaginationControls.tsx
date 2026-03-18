import { Button } from '@/components/ui/button';

interface Props {
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  itemLabel: string;
  onPrevious: () => void;
  onNext: () => void;
}

export function PaginationControls({
  page,
  totalPages,
  totalItems,
  pageSize,
  itemLabel,
  onPrevious,
  onNext,
}: Props) {
  if (totalItems === 0) {
    return null;
  }

  const startItem = (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, totalItems);

  return (
    <div className="flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground">
        Showing {startItem}-{endItem} of {totalItems} {itemLabel}
      </p>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onPrevious} disabled={page <= 1}>
          Previous
        </Button>
        <span className="min-w-[92px] text-center text-sm text-muted-foreground">
          Page {page} of {Math.max(totalPages, 1)}
        </span>
        <Button variant="outline" size="sm" onClick={onNext} disabled={page >= totalPages}>
          Next
        </Button>
      </div>
    </div>
  );
}