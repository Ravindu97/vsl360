import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { itineraryApi } from '@/api/endpoints.api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { PaginationControls } from '@/components/shared/PaginationControls';
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

export function ItineraryLibraryPage() {
  const queryClient = useQueryClient();

  const [destinationSearch, setDestinationSearch] = useState('');
  const [activitySearch, setActivitySearch] = useState('');
  const [selectedDestinationId, setSelectedDestinationId] = useState<string>('');
  const [destinationEditingId, setDestinationEditingId] = useState<string>('');
  const [activityEditingId, setActivityEditingId] = useState<string>('');
  const [destinationPage, setDestinationPage] = useState(1);
  const [activityPage, setActivityPage] = useState(1);
  const [showImportPanel, setShowImportPanel] = useState(false);
  const [importJson, setImportJson] = useState('');

  const [destinationForm, setDestinationForm] = useState({ name: '', slug: '', isActive: true });
  const [activityForm, setActivityForm] = useState({
    title: '',
    description: '',
    category: 'GENERAL' as ItineraryCategory,
    isSeasonal: false,
  });

  const { data: destinationData } = useQuery({
    queryKey: ['itinerary-destinations', destinationSearch, destinationPage],
    queryFn: () => itineraryApi.listDestinations({ search: destinationSearch, page: destinationPage, pageSize: PAGE_SIZE }),
  });

  const destinations: ItineraryDestination[] = destinationData?.data?.items ?? [];
  const destinationPagination = destinationData?.data;

  const activeDestination = useMemo(
    () => destinations.find((destination) => destination.id === selectedDestinationId),
    [destinations, selectedDestinationId]
  );

  const { data: activityData } = useQuery({
    queryKey: ['itinerary-activities', selectedDestinationId, activitySearch, activityPage],
    queryFn: () => itineraryApi.listActivities({
      destinationId: selectedDestinationId || undefined,
      search: activitySearch,
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
      if (selectedDestinationId === destinationId) {
        setSelectedDestinationId('');
      }
      queryClient.invalidateQueries({ queryKey: ['itinerary-destinations'] });
      queryClient.invalidateQueries({ queryKey: ['itinerary-activities'] });
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
    mutationFn: (payload: {
      replaceAll?: boolean;
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
    }) => itineraryApi.importCatalog(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['itinerary-destinations'] });
      queryClient.invalidateQueries({ queryKey: ['itinerary-activities'] });
      setImportJson('');
      setShowImportPanel(false);
      setDestinationPage(1);
      setActivityPage(1);
    },
  });

  const onImportJson = () => {
    const parsed = JSON.parse(importJson) as {
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

    importCatalog.mutate({
      replaceAll: true,
      destinations: parsed.destinations,
      activities: parsed.activities,
    });
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Itinerary Library</h1>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => exportCatalog.mutate()} disabled={exportCatalog.isPending}>
          {exportCatalog.isPending ? 'Exporting...' : 'Export Catalog JSON'}
        </Button>
        <Button variant="outline" onClick={() => setShowImportPanel((prev) => !prev)}>
          {showImportPanel ? 'Hide Import' : 'Bulk Import JSON'}
        </Button>
      </div>

      {showImportPanel && (
        <Card>
          <CardHeader>
            <CardTitle>Bulk Import (Replace Existing Catalog)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Paste exported catalog JSON. Import runs with replaceAll=true.
            </p>
            <Textarea
              rows={8}
              value={importJson}
              onChange={(event) => setImportJson(event.target.value)}
              placeholder="Paste JSON from Export Catalog"
            />
            <div className="flex gap-2">
              <Button onClick={onImportJson} disabled={!importJson.trim() || importCatalog.isPending}>
                {importCatalog.isPending ? 'Importing...' : 'Import and Replace'}
              </Button>
              <Button variant="outline" onClick={() => setImportJson('')}>
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
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

            <div className="grid gap-2 rounded border p-3">
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
                    Slug is used as a stable, URL-friendly identifier for filtering, linking, and API calls. It should stay lowercase with hyphens only.
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

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {destinations.map((destination) => (
                  <TableRow
                    key={destination.id}
                    className={selectedDestinationId === destination.id ? 'bg-muted/50' : ''}
                  >
                    <TableCell
                      className="cursor-pointer font-medium"
                      onClick={() => {
                        setSelectedDestinationId(destination.id);
                        setActivityPage(1);
                      }}
                    >
                      {destination.name}
                    </TableCell>
                    <TableCell>{destination.isActive ? 'Active' : 'Inactive'}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setDestinationEditingId(destination.id);
                          setDestinationForm({
                            name: destination.name,
                            slug: destination.slug,
                            isActive: destination.isActive,
                          });
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => removeDestination.mutate(destination.id)}
                      >
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
          <CardHeader>
            <CardTitle>
              Activities {activeDestination ? `- ${activeDestination.name}` : ''}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!selectedDestinationId ? (
              <p className="text-sm text-muted-foreground">Select a destination to manage activities.</p>
            ) : (
              <>
                <Input
                  placeholder="Search activities"
                  value={activitySearch}
                  onChange={(event) => {
                    setActivitySearch(event.target.value);
                    setActivityPage(1);
                  }}
                />

                <div className="grid gap-2 rounded border p-3">
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
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activities.map((activity) => (
                      <TableRow key={activity.id}>
                        <TableCell className="font-medium">{activity.title}</TableCell>
                        <TableCell>{activity.category}{activity.isSeasonal ? ' (Seasonal)' : ''}</TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
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
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => removeActivity.mutate(activity.id)}
                          >
                            Delete
                          </Button>
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
