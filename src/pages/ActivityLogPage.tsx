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
import { unwrapEnvelope } from '@/lib/envelope';
import { PAGE_SHELL } from '@/lib/page-shell';
import { useAuth } from '@/hooks/use-auth';
import { useLanguage } from '@/hooks/use-language';

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

const buildActionTypes = (t: (key: string) => string): { value: string; label: string }[] => [
    { value: '__all__', label: t('activitylog.action.__all__') },
    { value: 'CREATE', label: t('activitylog.action.create') },
    { value: 'UPDATE', label: t('activitylog.action.update') },
    { value: 'DELETE', label: t('activitylog.action.delete') },
    { value: 'LOGIN', label: t('activitylog.action.login') },
    { value: 'LOGIN_FAILED', label: t('activitylog.action.login_failed') },
    { value: 'LOGIN_PIN', label: t('activitylog.action.login_pin') },
    { value: 'LOGOUT', label: t('activitylog.action.logout') },
    { value: 'PASSWORD_CHANGED', label: t('activitylog.action.password_changed') },
    { value: 'PIN_CHANGED', label: t('activitylog.action.pin_changed') },
    { value: 'PERMISSION_CHANGE', label: t('activitylog.action.permission_change') },
    { value: 'ACCOUNT_LOCKED', label: t('activitylog.action.account_locked') },
    { value: 'ACCOUNT_UNLOCKED', label: t('activitylog.action.account_unlocked') },
    { value: 'ORDER_ACTION', label: t('activitylog.action.order_action') },
    { value: 'INVENTORY_ACTION', label: t('activitylog.action.inventory_action') },
    { value: 'OTHER', label: t('activitylog.action.other') },
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
    if (!iso) return '-';
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
    const { t } = useLanguage();
    const actionTypes = useMemo(() => buildActionTypes(t), [t]);
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
                `${API_BASE}/audit-logs/?${params.toString()}`,
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('access_token') || ''}`,
                    },
                }
            );
            if (!res.ok) {
                throw new Error(t('activitylog.load_failed'));
            }
            return unwrapEnvelope<AuditResponse>(await res.json());
        },
        enabled: canView,
    });

    if (!canView) {
        return (
            <div className="p-10 text-center text-muted-foreground">
                {t('activitylog.no_permission')}
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
        <div className="min-h-screen">
            <div className={`${PAGE_SHELL} py-8 space-y-6`}>
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                        <Activity className="h-6 w-6 text-blue-600" />
                        {t('activitylog.title')}
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
                        {t('activitylog.subtitle')}
                    </p>
                </div>

                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Filter className="h-4 w-4 text-slate-500" />
                            {t('activitylog.filters')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form
                            onSubmit={submitSearch}
                            className="flex flex-col md:flex-row gap-3 md:items-end"
                        >
                            <div className="flex-1">
                                <label className="text-xs text-muted-foreground block mb-1">
                                    {t('common.search')}
                                </label>
                                <div className="relative">
                                    <Search className="h-4 w-4 absolute left-2.5 top-2.5 text-muted-foreground" />
                                    <Input
                                        value={qInput}
                                        onChange={(e) =>
                                            setQInput(e.target.value)
                                        }
                                        placeholder={t('activitylog.search_placeholder')}
                                        className="pl-8"
                                    />
                                </div>
                            </div>
                            <div className="w-full md:w-64">
                                <label className="text-xs text-muted-foreground block mb-1">
                                    {t('activitylog.col_action')}
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
                                        {actionTypes.map((a) => (
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
                                {t('activitylog.apply')}
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
                                    : t('activitylog.load_failed')}
                            </div>
                        ) : rows.length === 0 ? (
                            <div className="p-12 text-center text-muted-foreground">
                                {t('activitylog.empty')}
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-50 dark:bg-slate-900/40 text-xs uppercase text-muted-foreground">
                                        <tr>
                                            <th className="text-left px-4 py-2 font-medium">
                                                {t('activitylog.col_when')}
                                            </th>
                                            <th className="text-left px-4 py-2 font-medium">
                                                {t('activitylog.col_who')}
                                            </th>
                                            <th className="text-left px-4 py-2 font-medium">
                                                {t('activitylog.col_action')}
                                            </th>
                                            <th className="text-left px-4 py-2 font-medium">
                                                {t('activitylog.col_entity')}
                                            </th>
                                            <th className="text-left px-4 py-2 font-medium">
                                                {t('activitylog.col_detail')}
                                            </th>
                                            <th className="text-left px-4 py-2 font-medium">
                                                {t('activitylog.col_ip')}
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
                                                            {t('activitylog.system')}
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
                                                    {row.ip_address || '-'}
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
                            {t('activitylog.pagination', { page, totalPages, total })}
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={page <= 1 || isFetching}
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                            >
                                <ChevronLeft className="h-4 w-4" />
                                {t('common.previous')}
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={page >= totalPages || isFetching}
                                onClick={() => setPage((p) => p + 1)}
                            >
                                {t('common.next')}
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
