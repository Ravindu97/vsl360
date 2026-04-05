import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { itineraryApi } from '@/api/endpoints.api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { PaginationControls } from '@/components/shared/PaginationControls';
import { Pencil, Power, PowerOff, Trash2 } from 'lucide-react';
import type { ItineraryActivity, ItineraryCategory, ItineraryDestination } from '@/types';

const categoryOptions: ItineraryCategory[] = [
  'GENERAL',
  'WILDLIFE',
  'SPIRITUAL',
  'CULTURAL',
  'ADVENTURE',
  'LEISURE',
  'WELLNESS',
];

const PAGE_SIZE = 10;

type ImportCatalogPayload = {
  destinations: Array<{ id: string; name: string; slug: string; isActive?: boolean; sortOrder: number }>;
  activities: Array<{
    id: string;
    destinationId: string;
    title: string;
    description: string;
    category: string;
    isSeasonal?: boolean;
    sortOrder: number;
    sourceRow?: number | null;
  }>;
};

export function ItineraryLibraryPage() {
  const queryClient = useQueryClient();

  const [destinationSearch, setDestinationSearch] = useState('');
  const [destinationPage, setDestinationPage] = useState(1);
  const [destinationEditingId, setDestinationEditingId] = useState('');
  const [selectedDestinationId, setSelectedDestinationId] = useState('');

  const [activitySearch, setActivitySearch] = useState('');
  const [activityCategory, setActivityCategory] = useState<string>('ALL');
  const [activityPage, setActivityPage] = useState(1);
  const [activityEditingId, setActivityEditingId] = useState('');

  const [showImportPanel, setShowImportPanel] = useState(false);
  const [importJson, setImportJson] = useState('');
  const [importError, setImportError] = useState('');

  const [destinationForm, setDestinationForm] = useState({
    name: '',
    slug: '',
    isActive: true,
  });

  const [activityForm, setActivityForm] = useState({
    title: '',
    description: '',
    category: 'GENERAL' as ItineraryCategory,
    isSeasonal: false,
  });

  const { data: destinationData } = useQuery({
    queryKey: ['itinerary-destinations', destinationSearch, destinationPage],
    queryFn: () => itineraryApi.listDestinations({
      search: destinationSearch,
      page: destinationPage,
      pageSize: PAGE_SIZE,
    }),
  });

  const destinations: ItineraryDestination[] = destinationData?.data?.items ?? [];
  const destinationPagination = destinationData?.data;

  const activeDestination = useMemo(
    () => destinations.find((destination) => destination.id === selectedDestinationId),
    [destinations, selectedDestinationId]
  );

  const { data: activityData } = useQuery({
    queryKey: ['itinerary-activities', selectedDestinationId, activitySearch, activityCategory, activityPage],
    queryFn: () => itineraryApi.listActivities({
      destinationId: selectedDestinationId || undefined,
      search: activitySearch,
      category: activityCategory !== 'ALL' ? activityCategory : undefined,
      page: activityPage,
      pageSize: PAGE_SIZE,
    }),
    enabled: !!selectedDestinationId,
  });

  const activities: ItineraryActivity[] = activityData?.data?.items ?? [];
  const activityPagination = activityData?.data;

  const saveDestination = useMutation({
    mutationFn: async () => {
      if (destinationEditingId) {
        return itineraryApi.updateDestination(destinationEditingId, {
          name: destinationForm.name,
          slug: destinationForm.slug || undefined,
          isActive: destinationForm.isActive,
        });
      }

      return itineraryApi.createDestination({
        name: destinationForm.name,
        slug: destinationForm.slug || undefined,
        isActive: destinationForm.isActive,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['itinerary-destinations'] });
      setDestinationEditingId('');
      setDestinationForm({ name: '', slug: '', isActive: true });
    },
  });

  const removeDestination = useMutation({
    mutationFn: (destinationId: string) => itineraryApi.deleteDestination(destinationId),
    onSuccess: (_, destinationId) => {
      if (selectedDestinationId === destinationId) setSelectedDestinationId('');
      queryClient.invalidateQueries({ queryKey: ['itinerary-destinations'] });
      queryClient.invalidateQueries({ queryKey: ['itinerary-activities'] });
    },
  });

  const toggleDestinationStatus = useMutation({
    mutationFn: ({ destinationId, isActive }: { destinationId: string; isActive: boolean }) =>
      itineraryApi.updateDestination(destinationId, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['itinerary-destinations'] });
    },
  });

  const saveActivity = useMutation({
    mutationFn: async () => {
      if (!selectedDestinationId) throw new Error('Select a destination first');

      if (activityEditingId) {
        return itineraryApi.updateActivity(activityEditingId, {
          destinationId: selectedDestinationId,
          title: activityForm.title,
          description: activityForm.description,
          category: activityForm.category,
          isSeasonal: activityForm.isSeasonal,
        });
      }

      return itineraryApi.createActivity({
        destinationId: selectedDestinationId,
        title: activityForm.title,
        description: activityForm.description,
        category: activityForm.category,
        isSeasonal: activityForm.isSeasonal,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['itinerary-activities'] });
      setActivityEditingId('');
      setActivityForm({ title: '', description: '', category: 'GENERAL', isSeasonal: false });
    },
  });

  const removeActivity = useMutation({
    mutationFn: (activityId: string) => itineraryApi.deleteActivity(activityId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['itinerary-activities'] });
    },
  });

  const exportCatalog = useMutation({
    mutationFn: () => itineraryApi.exportCatalog(),
    onSuccess: (response) => {
      const payload = JSON.stringify(response.data, null, 2);
      const blob = new Blob([payload], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `itinerary-catalog-${new Date().toISOString().slice(0, 10)}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
    },
  });

  const importCatalog = useMutation({
    mutationFn: (payload: ImportCatalogPayload) =>
      itineraryApi.importCatalog({ replaceAll: true, ...payload }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['itinerary-destinations'] });
      queryClient.invalidateQueries({ queryKey: ['itinerary-activities'] });
      setImportJson('');
      setImportError('');
      setShowImportPanel(false);
      setDestinationPage(1);
      setActivityPage(1);
    },
  });

  const onImportJson = () => {
    setImportError('');

    let parsed: ImportCatalogPayload;
    try {
      parsed = JSON.parse(importJson);
    } catch {
      setImportError('Invalid JSON format. Please paste a valid catalog export.');
      return;
    }

    if (!Array.isArray(parsed.destinations) || !Array.isArray(parsed.activities)) {
      setImportError('JSON must include destinations[] and activities[] arrays.');
      return;
    }

    const confirmed = window.confirm(
      'This will replace the current itinerary catalog. Do you want to continue?'
    );
    if (!confirmed) return;

    importCatalog.mutate(parsed);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">Itinerary Library</h1>
        <p className="text-sm text-muted-foreground">
          Manage destination master data and reusable activity content for itinerary generation.
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">Destinations: {destinationPagination?.total ?? 0}</Badge>
            <Badge variant="secondary">Activities: {activityPagination?.total ?? 0}</Badge>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => exportCatalog.mutate()} disabled={exportCatalog.isPending}>
              {exportCatalog.isPending ? 'Exporting...' : 'Export Catalog JSON'}
            </Button>
            <Button variant="outline" onClick={() => setShowImportPanel((prev) => !prev)}>
              {showImportPanel ? 'Hide Import' : 'Bulk Import JSON'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {showImportPanel && (
        <Card>
          <CardHeader>
            <CardTitle>Bulk Import (Replace Existing Catalog)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">Paste exported catalog JSON to replace all current data.</p>
            <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Warning: This operation removes existing destinations and activities before importing.
            </div>
            <Textarea
              rows={8}
              value={importJson}
              onChange={(event) => setImportJson(event.target.value)}
              placeholder="Paste JSON from Export Catalog"
            />
            {importError && (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {importError}
              </div>
            )}
            <div className="flex gap-2">
              <Button onClick={onImportJson} disabled={!importJson.trim() || importCatalog.isPending}>
                {importCatalog.isPending ? 'Importing...' : 'Import and Replace'}
              </Button>
              <Button variant="outline" onClick={() => setImportJson('')}>Clear</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr,1.25fr]">
        <Card>
          <CardHeader>
            <CardTitle>Destinations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="Search destinations"
              value={destinationSearch}
              onChange={(event) => {
                setDestinationSearch(event.target.value);
                setDestinationPage(1);
              }}
            />

            <div className="grid gap-2 rounded-lg border bg-muted/20 p-3">
              <p className="text-xs font-medium text-muted-foreground">Create or Edit Destination</p>
              <Label>Name</Label>
              <Input
                value={destinationForm.name}
                onChange={(event) => setDestinationForm((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="e.g., Kandy"
              />
              <Label className="flex items-center gap-2">
                Slug (optional) - if entered manually, use lowercase kebab-case.
                <span className="relative inline-flex items-center group">
                  <span
                    className="inline-flex h-5 w-5 items-center justify-center rounded-full border text-[11px] font-semibold text-muted-foreground"
                    aria-label="Slug format help"
                  >
                    ?
                  </span>
                  <span className="pointer-events-none absolute left-1/2 top-full z-10 mt-2 hidden w-72 -translate-x-1/2 rounded-md border bg-background p-2 text-xs font-normal leading-relaxed text-foreground shadow-md group-hover:block">
                    Slug is used as a stable, URL-friendly identifier for filtering, linking, and API calls. Keep it lowercase with hyphens only.
                    Examples: kandy, nuwara-eliya, arugam-bay.
                  </span>
                </span>
              </Label>
              <Input
                value={destinationForm.slug}
                onChange={(event) => setDestinationForm((prev) => ({ ...prev, slug: event.target.value }))}
                placeholder="e.g., kandy"
              />
              <Label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={destinationForm.isActive}
                  onChange={(event) => setDestinationForm((prev) => ({ ...prev, isActive: event.target.checked }))}
                />
                Active
              </Label>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  disabled={!destinationForm.name.trim() || saveDestination.isPending}
                  onClick={() => saveDestination.mutate()}
                >
                  {destinationEditingId ? 'Update Destination' : 'Add Destination'}
                </Button>
                {destinationEditingId && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setDestinationEditingId('');
                      setDestinationForm({ name: '', slug: '', isActive: true });
                    }}
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </div>

            <div className="rounded-md border">
              {destinations.map((destination) => (
                <div
                  key={destination.id}
                  className={`flex items-center justify-between gap-2 border-b p-3 last:border-b-0 ${
                    selectedDestinationId === destination.id ? 'bg-primary/5' : 'bg-background'
                  }`}
                >
                  <button
                    type="button"
                    className="flex-1 text-left"
                    onClick={() => {
                      setSelectedDestinationId(destination.id);
                      setActivityPage(1);
                    }}
                  >
                    <p className="font-medium">{destination.name}</p>
                    <p className="text-xs text-muted-foreground">/{destination.slug}</p>
                  </button>
                  <div className="flex items-center gap-1">
                    <Badge variant={destination.isActive ? 'secondary' : 'outline'}>
                      {destination.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 w-8 p-0"
                      title={destination.isActive ? 'Deactivate destination' : 'Activate destination'}
                      aria-label={destination.isActive ? 'Deactivate destination' : 'Activate destination'}
                      onClick={() =>
                        toggleDestinationStatus.mutate({
                          destinationId: destination.id,
                          isActive: !destination.isActive,
                        })
                      }
                    >
                      {destination.isActive ? (
                        <PowerOff className="h-4 w-4" />
                      ) : (
                        <Power className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 w-8 p-0"
                      title="Edit destination"
                      onClick={() => {
                        setDestinationEditingId(destination.id);
                        setDestinationForm({
                          name: destination.name,
                          slug: destination.slug,
                          isActive: destination.isActive,
                        });
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="h-8 w-8 p-0"
                      title="Delete destination"
                      onClick={() => removeDestination.mutate(destination.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <PaginationControls
              page={destinationPagination?.page ?? 1}
              totalPages={destinationPagination?.totalPages ?? 1}
              totalItems={destinationPagination?.total ?? 0}
              pageSize={destinationPagination?.pageSize ?? PAGE_SIZE}
              itemLabel="destinations"
              onPrevious={() => setDestinationPage((current) => Math.max(1, current - 1))}
              onNext={() => setDestinationPage((current) => Math.min(destinationPagination?.totalPages ?? current, current + 1))}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="space-y-2">
            <CardTitle>Activities</CardTitle>
            {activeDestination ? (
              <div className="flex items-center justify-between">
                <Badge variant="secondary">Selected: {activeDestination.name}</Badge>
                <Button size="sm" variant="ghost" onClick={() => setSelectedDestinationId('')}>Clear selection</Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Select a destination from the left panel to manage activities.</p>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {!selectedDestinationId ? (
              <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                Choose a destination to load and edit activities.
              </div>
            ) : (
              <>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Input
                    placeholder="Search activities"
                    value={activitySearch}
                    onChange={(event) => {
                      setActivitySearch(event.target.value);
                      setActivityPage(1);
                    }}
                  />
                  <Select
                    value={activityCategory}
                    onValueChange={(value) => {
                      setActivityCategory(value);
                      setActivityPage(1);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Categories</SelectItem>
                      {categoryOptions.map((category) => (
                        <SelectItem key={category} value={category}>{category}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2 rounded-lg border bg-muted/20 p-3">
                  <p className="text-xs font-medium text-muted-foreground">Create or Edit Activity</p>
                  <Label>Title</Label>
                  <Input
                    value={activityForm.title}
                    onChange={(event) => setActivityForm((prev) => ({ ...prev, title: event.target.value }))}
                    placeholder="e.g., Nine Arch Bridge"
                  />
                  <Label>Description</Label>
                  <Textarea
                    value={activityForm.description}
                    onChange={(event) => setActivityForm((prev) => ({ ...prev, description: event.target.value }))}
                    rows={4}
                    placeholder="Activity details"
                  />
                  <Label>Category</Label>
                  <Select
                    value={activityForm.category}
                    onValueChange={(value) => setActivityForm((prev) => ({ ...prev, category: value as ItineraryCategory }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categoryOptions.map((category) => (
                        <SelectItem key={category} value={category}>{category}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Label className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={activityForm.isSeasonal}
                      onChange={(event) => setActivityForm((prev) => ({ ...prev, isSeasonal: event.target.checked }))}
                    />
                    Seasonal activity
                  </Label>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      disabled={!activityForm.title.trim() || !activityForm.description.trim() || saveActivity.isPending}
                      onClick={() => saveActivity.mutate()}
                    >
                      {activityEditingId ? 'Update Activity' : 'Add Activity'}
                    </Button>
                    {activityEditingId && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setActivityEditingId('');
                          setActivityForm({ title: '', description: '', category: 'GENERAL', isSeasonal: false });
                        }}
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activities.map((activity) => (
                      <TableRow key={activity.id}>
                        <TableCell className="font-medium">{activity.title}</TableCell>
                        <TableCell>{activity.category}{activity.isSeasonal ? ' (Seasonal)' : ''}</TableCell>
                        <TableCell className="max-w-[320px] truncate text-muted-foreground">{activity.description}</TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 w-8 p-0"
                            title="Edit activity"
                            onClick={() => {
                              setActivityEditingId(activity.id);
                              setActivityForm({
                                title: activity.title,
                                description: activity.description,
                                category: activity.category,
                                isSeasonal: activity.isSeasonal,
                              });
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="h-8 w-8 p-0"
                            title="Delete activity"
                            onClick={() => removeActivity.mutate(activity.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <PaginationControls
                  page={activityPagination?.page ?? 1}
                  totalPages={activityPagination?.totalPages ?? 1}
                  totalItems={activityPagination?.total ?? 0}
                  pageSize={activityPagination?.pageSize ?? PAGE_SIZE}
                  itemLabel="activities"
                  onPrevious={() => setActivityPage((current) => Math.max(1, current - 1))}
                  onNext={() => setActivityPage((current) => Math.min(activityPagination?.totalPages ?? current, current + 1))}
                />
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
