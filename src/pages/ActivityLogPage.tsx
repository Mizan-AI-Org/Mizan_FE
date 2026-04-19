import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    Activity,
    ChevronLeft,
    ChevronRight,
    Filter,
    Loader2,
    Search,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { API_BASE } from '@/lib/api';
import { useAuth } from '@/hooks/use-auth';

interface AuditRow {
    id: string;
    timestamp: string | null;
    action_type: string;
    action_label: string;
    entity_type: string;
    entity_id: string | null;
    description: string;
    ip_address: string | null;
    user: {
        id: string;
        email: string;
        name: string;
        role: string;
    } | null;
}

interface AuditResponse {
    count: number;
    next: string | null;
    previous: string | null;
    results: AuditRow[];
}

const ACTION_TYPES: { value: string; label: string }[] = [
    { value: '__all__', label: 'All actions' },
    { value: 'CREATE', label: 'Created' },
    { value: 'UPDATE', label: 'Updated' },
    { value: 'DELETE', label: 'Deleted' },
    { value: 'LOGIN', label: 'Login' },
    { value: 'LOGIN_FAILED', label: 'Login failed' },
    { value: 'LOGIN_PIN', label: 'PIN login' },
    { value: 'LOGOUT', label: 'Logout' },
    { value: 'PASSWORD_CHANGED', label: 'Password changed' },
    { value: 'PIN_CHANGED', label: 'PIN changed' },
    { value: 'PERMISSION_CHANGE', label: 'Permission changed' },
    { value: 'ACCOUNT_LOCKED', label: 'Account locked' },
    { value: 'ACCOUNT_UNLOCKED', label: 'Account unlocked' },
    { value: 'ORDER_ACTION', label: 'Order action' },
    { value: 'INVENTORY_ACTION', label: 'Inventory action' },
    { value: 'OTHER', label: 'Other' },
];

const badgeTone = (actionType: string): string => {
    if (actionType === 'DELETE') return 'bg-red-100 text-red-700 border-red-200';
    if (actionType === 'CREATE')
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    if (actionType === 'UPDATE')
        return 'bg-blue-100 text-blue-700 border-blue-200';
    if (actionType.startsWith('LOGIN') || actionType === 'LOGOUT')
        return 'bg-violet-100 text-violet-700 border-violet-200';
    if (actionType.includes('FAILED') || actionType.includes('LOCKED'))
        return 'bg-amber-100 text-amber-700 border-amber-200';
    return 'bg-slate-100 text-slate-700 border-slate-200';
};

const formatWhen = (iso: string | null): string => {
    if (!iso) return '—';
    try {
        const d = new Date(iso);
        return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
        })}`;
    } catch {
        return iso;
    }
};

const ActivityLogPage: React.FC = () => {
    const { user } = useAuth();
    const [page, setPage] = useState(1);
    const [actionType, setActionType] = useState<string>('__all__');
    const [q, setQ] = useState('');
    const [qInput, setQInput] = useState('');

    const canView = useMemo(() => {
        const role = String(user?.role || '').toUpperCase();
        return ['SUPER_ADMIN', 'OWNER', 'ADMIN', 'MANAGER'].includes(role);
    }, [user?.role]);

    const { data, isLoading, error, isFetching } = useQuery<AuditResponse>({
        queryKey: ['audit-logs', page, actionType, q],
        queryFn: async () => {
            const params = new URLSearchParams();
            params.set('page', String(page));
            params.set('page_size', '25');
            if (actionType && actionType !== '__all__') {
                params.set('action_type', actionType);
            }
            if (q) params.set('q', q);
            const res = await fetch(
                `${API_BASE}/accounts/audit-logs/?${params.toString()}`,
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('access_token') || ''}`,
                    },
                }
            );
            if (!res.ok) {
                throw new Error('Failed to load audit log.');
            }
            return res.json();
        },
        enabled: canView,
    });

    if (!canView) {
        return (
            <div className="p-10 text-center text-muted-foreground">
                You do not have permission to view the activity log.
            </div>
        );
    }

    const rows = data?.results || [];
    const total = data?.count || 0;
    const totalPages = Math.max(1, Math.ceil(total / 25));

    const submitSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setPage(1);
        setQ(qInput.trim());
    };

    return (
        <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950/30">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                        <Activity className="h-6 w-6 text-blue-600" />
                        Activity log
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
                        Every material change in your account — logins, staff
                        edits, schedule changes, orders, settings — with who
                        did it and when. Tenant-scoped.
                    </p>
                </div>

                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Filter className="h-4 w-4 text-slate-500" />
                            Filters
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form
                            onSubmit={submitSearch}
                            className="flex flex-col md:flex-row gap-3 md:items-end"
                        >
                            <div className="flex-1">
                                <label className="text-xs text-muted-foreground block mb-1">
                                    Search
                                </label>
                                <div className="relative">
                                    <Search className="h-4 w-4 absolute left-2.5 top-2.5 text-muted-foreground" />
                                    <Input
                                        value={qInput}
                                        onChange={(e) =>
                                            setQInput(e.target.value)
                                        }
                                        placeholder="User email, path, description…"
                                        className="pl-8"
                                    />
                                </div>
                            </div>
                            <div className="w-full md:w-64">
                                <label className="text-xs text-muted-foreground block mb-1">
                                    Action
                                </label>
                                <Select
                                    value={actionType}
                                    onValueChange={(v) => {
                                        setActionType(v);
                                        setPage(1);
                                    }}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {ACTION_TYPES.map((a) => (
                                            <SelectItem
                                                key={a.value}
                                                value={a.value}
                                            >
                                                {a.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <Button type="submit" variant="outline">
                                Apply
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-0">
                        {isLoading ? (
                            <div className="flex items-center justify-center h-48">
                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            </div>
                        ) : error ? (
                            <div className="p-8 text-center text-red-600">
                                {error instanceof Error
                                    ? error.message
                                    : 'Failed to load audit log.'}
                            </div>
                        ) : rows.length === 0 ? (
                            <div className="p-12 text-center text-muted-foreground">
                                No events match your filters yet.
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-50 dark:bg-slate-900/40 text-xs uppercase text-muted-foreground">
                                        <tr>
                                            <th className="text-left px-4 py-2 font-medium">
                                                When
                                            </th>
                                            <th className="text-left px-4 py-2 font-medium">
                                                Who
                                            </th>
                                            <th className="text-left px-4 py-2 font-medium">
                                                Action
                                            </th>
                                            <th className="text-left px-4 py-2 font-medium">
                                                Entity
                                            </th>
                                            <th className="text-left px-4 py-2 font-medium">
                                                Detail
                                            </th>
                                            <th className="text-left px-4 py-2 font-medium">
                                                IP
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {rows.map((row) => (
                                            <tr
                                                key={row.id}
                                                className="hover:bg-slate-50/80 dark:hover:bg-slate-900/30"
                                            >
                                                <td className="px-4 py-2.5 whitespace-nowrap text-muted-foreground">
                                                    {formatWhen(row.timestamp)}
                                                </td>
                                                <td className="px-4 py-2.5">
                                                    {row.user ? (
                                                        <div>
                                                            <div className="font-medium">
                                                                {row.user.name}
                                                            </div>
                                                            <div className="text-xs text-muted-foreground">
                                                                {row.user.email}{' '}
                                                                ·{' '}
                                                                {row.user.role}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <span className="text-muted-foreground">
                                                            system
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-2.5">
                                                    <Badge
                                                        variant="outline"
                                                        className={badgeTone(
                                                            row.action_type
                                                        )}
                                                    >
                                                        {row.action_label}
                                                    </Badge>
                                                </td>
                                                <td className="px-4 py-2.5 font-mono text-xs">
                                                    {row.entity_type}
                                                </td>
                                                <td className="px-4 py-2.5 text-muted-foreground max-w-md truncate">
                                                    {row.description}
                                                </td>
                                                <td className="px-4 py-2.5 text-xs text-muted-foreground font-mono">
                                                    {row.ip_address || '—'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {total > 25 && (
                    <div className="flex items-center justify-between text-sm">
                        <div className="text-muted-foreground">
                            Page {page} of {totalPages} · {total} events
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={page <= 1 || isFetching}
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                            >
                                <ChevronLeft className="h-4 w-4" />
                                Prev
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={page >= totalPages || isFetching}
                                onClick={() => setPage((p) => p + 1)}
                            >
                                Next
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ActivityLogPage;
