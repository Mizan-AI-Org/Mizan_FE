import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { listProcesses, createProcess, updateProcess, deleteProcess, Process } from '@/services/process';

export default function Processes() {
  const { user } = useAuth();
  const [processes, setProcesses] = useState<Process[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Process | null>(null);
  const [form, setForm] = useState<Process>({ name: '', description: '', restaurant: '' } as Process);

  const load = async () => {
    setLoading(true);
    try {
      const data = await listProcesses();
      setProcesses(data);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to load processes';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', description: '', restaurant: user?.restaurant_id } as Process);
    setOpen(true);
  };

  const openEdit = (p: Process) => {
    setEditing(p);
    setForm({ ...p });
    setOpen(true);
  };

  const save = async () => {
    try {
      if (!form.name) { toast.error('Name is required'); return; }
      if (!form.restaurant) { toast.error('Restaurant is required'); return; }
      if (editing?.id) {
        await updateProcess(editing.id as string, form);
        toast.success('Process updated');
      } else {
        await createProcess(form);
        toast.success('Process created');
      }
      setOpen(false);
      await load();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Save failed';
      toast.error(msg);
    }
  };

  const remove = async (id?: string) => {
    if (!id) return;
    try { await deleteProcess(id); toast.success('Process deleted'); await load(); }
    catch (e: unknown) { const msg = e instanceof Error ? e.message : 'Delete failed'; toast.error(msg); }
  };

  return (
    <div className="container mx-auto p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Processes</h1>
        <Button onClick={openCreate}>New Process</Button>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : processes.length === 0 ? (
        <Card><CardContent className="p-6">No processes yet.</CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {processes.map((p) => (
            <Card key={p.id}>
              <CardHeader>
                <CardTitle>{p.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm text-muted-foreground">{p.description}</p>
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" onClick={() => openEdit(p)}>Edit</Button>
                  <Button size="sm" variant="destructive" onClick={() => remove(p.id)}>Delete</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Edit Process' : 'New Process'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Name</label>
              <Input value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Input value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div>
              <label className="text-sm font-medium">Restaurant ID</label>
              <Input value={form.restaurant || ''} onChange={(e) => setForm({ ...form, restaurant: e.target.value })} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={save}>Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}