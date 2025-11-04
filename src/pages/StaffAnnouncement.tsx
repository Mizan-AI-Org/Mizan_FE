/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useMemo, useState } from 'react';
import { useNotifications } from '@/hooks/useNotifications';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

const StaffAnnouncementsList: React.FC = () => {
  const { notifications, markAsRead } = useNotifications();
  const [query, setQuery] = useState('');
  const [readFilter, setReadFilter] = useState<'all' | 'read' | 'unread'>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [openDetail, setOpenDetail] = useState(false);
  const [selected, setSelected] = useState<any | null>(null);

  const announcements = useMemo(() => notifications.filter(n => (n.notification_type || '').toUpperCase() === 'ANNOUNCEMENT'), [notifications]);

  const filtered = useMemo(() => {
    return announcements.filter(a => {
      const matchesQuery = query.trim().length === 0 || (
        (a.title || '').toLowerCase().includes(query.toLowerCase()) ||
        (a.description || '').toLowerCase().includes(query.toLowerCase())
      );
      const matchesRead = readFilter === 'all' || (readFilter === 'read' ? !!a.read : !a.read);
      const ts = new Date(a.timestamp).getTime();
      const afterStart = !startDate || ts >= new Date(startDate).getTime();
      const beforeEnd = !endDate || ts <= new Date(endDate).getTime();
      return matchesQuery && matchesRead && afterStart && beforeEnd;
    });
  }, [announcements, query, readFilter, startDate, endDate]);

  const openModal = (item: any) => {
    setSelected(item);
    setOpenDetail(true);
    if (!item.read) {
      // Log view as read for tracking purposes
      markAsRead(item.id);
    }
  };

  return (
    <div className="flex justify-center mt-8">
      <Card className="w-full max-w-7xl">
        <CardHeader>
          <CardTitle>Team Announcements</CardTitle>
          <CardDescription>Stay informed with the latest team updates and announcements.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="md:col-span-2">
              <label className="text-sm font-medium" htmlFor="announcement-search">Search</label>
              <Input id="announcement-search" placeholder="Search title or message" value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Read Status</label>
              <Select value={readFilter} onValueChange={(v) => setReadFilter(v as any)}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="unread">Unread</SelectItem>
                  <SelectItem value="read">Read</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-sm font-medium" htmlFor="start-date">Start</label>
                <Input id="start-date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium" htmlFor="end-date">End</label>
                <Input id="end-date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </div>
          </div>

          <div className="divide-y rounded-md border">
            {filtered.length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground">No announcements match your filters.</div>
            ) : (
              filtered.map(item => (
                <button
                  key={item.id}
                  onClick={() => openModal(item)}
                  className={`w-full text-left p-4 hover:bg-muted/40 focus:outline-none focus:ring-2 focus:ring-primary/50 ${item.read ? '' : 'bg-blue-50/40'}`}
                  aria-label={`View announcement ${item.title || item.verb}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{item.title || item.verb}</span>
                        {!item.read && <span className="inline-block text-xs px-2 py-0.5 rounded bg-blue-600 text-white">Unread</span>}
                      </div>
                      {item.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground whitespace-nowrap">{new Date(item.timestamp).toLocaleString()}</div>
                  </div>
                </button>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={openDetail} onOpenChange={setOpenDetail}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{selected?.title || selected?.verb}</DialogTitle>
            <DialogDescription>
              Announcement Only
            </DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-3">
              {selected.description && (
                <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: selected.description }} />
              )}
              <p className="text-xs text-muted-foreground">{new Date(selected.timestamp).toLocaleString()}</p>
              {Array.isArray(selected.attachments) && selected.attachments.length > 0 && (
                <div>
                  <p className="text-sm font-medium">Attachments</p>
                  <ul className="list-disc list-inside space-y-1">
                    {selected.attachments.map((file: any, idx: number) => (
                      <li key={idx}>
                        <a href={file.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                          {file.original_name || `Attachment ${idx + 1}`}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StaffAnnouncementsList;