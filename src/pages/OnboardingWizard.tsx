import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
    ArrowRight,
    CheckCircle2,
    Circle,
    ClipboardList,
    ListChecks,
    Loader2,
    MapPin,
    Sparkles,
    UtensilsCrossed,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { API_BASE } from '@/lib/api';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';

type StepKey = 'branch' | 'shift_template' | 'checklist' | 'menu';

interface OnboardingStatus {
    restaurant_id: string;
    completed: boolean;
    completed_at: string | null;
    steps: Record<StepKey, boolean>;
    order: StepKey[];
    next_step: StepKey | null;
}

const STEP_META: Record<
    StepKey,
    { title: string; description: string; icon: React.ComponentType<{ className?: string }>; deepLink: string }
> = {
    branch: {
        title: 'Add your first branch',
        description:
            'Register the physical site so clock-in, geofencing and reports know where your staff work.',
        icon: MapPin,
        deepLink: '/dashboard/settings?tab=locations',
    },
    shift_template: {
        title: 'Create a weekly shift template',
        description:
            'Give the scheduler a starting shape so Miya can auto-generate next week in one click.',
        icon: ClipboardList,
        deepLink: '/schedule-management',
    },
    checklist: {
        title: 'Publish an opening checklist',
        description:
            'Staff will run this at the start of each shift — safety, cleaning, float count.',
        icon: ListChecks,
        deepLink: '/dashboard/checklist-templates',
    },
    menu: {
        title: 'Seed your menu',
        description:
            'A starter category and item so POS, reports, and the AI all have something to work with.',
        icon: UtensilsCrossed,
        deepLink: '/menu-management',
    },
};

const authHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem('access_token') || ''}`,
    'Content-Type': 'application/json',
});

const OnboardingWizard: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [activeStep, setActiveStep] = useState<StepKey | null>(null);

    const canManage = useMemo(() => {
        const role = String(user?.role || '').toUpperCase();
        return ['SUPER_ADMIN', 'OWNER', 'ADMIN'].includes(role);
    }, [user?.role]);

    const {
        data: status,
        isLoading,
        error,
    } = useQuery<OnboardingStatus>({
        queryKey: ['onboarding-status'],
        queryFn: async () => {
            const res = await fetch(`${API_BASE}/accounts/onboarding/`, {
                headers: authHeaders(),
            });
            if (!res.ok) {
                throw new Error('Failed to load onboarding status.');
            }
            return res.json();
        },
        enabled: !!user,
    });

    useEffect(() => {
        if (status && !activeStep) {
            setActiveStep(status.next_step || status.order[0]);
        }
    }, [status, activeStep]);

    const markStep = useMutation({
        mutationFn: async (step: StepKey) => {
            const res = await fetch(`${API_BASE}/accounts/onboarding/`, {
                method: 'POST',
                headers: authHeaders(),
                body: JSON.stringify({ step }),
            });
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(
                    (body as { detail?: string }).detail ||
                        'Could not update onboarding.'
                );
            }
            return (await res.json()) as OnboardingStatus;
        },
        onSuccess: (next) => {
            queryClient.setQueryData(['onboarding-status'], next);
            setActiveStep(next.next_step);
            if (next.completed) {
                toast.success('Setup complete. Welcome to Mizan.');
            }
        },
        onError: (err: unknown) => {
            toast.error(err instanceof Error ? err.message : 'Action failed.');
        },
    });

    const seed = useMutation({
        mutationFn: async () => {
            const res = await fetch(
                `${API_BASE}/accounts/onboarding/seed/`,
                { method: 'POST', headers: authHeaders() }
            );
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(
                    (body as { detail?: string }).detail ||
                        'Could not seed defaults.'
                );
            }
            return res.json();
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({
                queryKey: ['onboarding-status'],
            });
            toast.success('Sensible defaults created — edit any of them later.');
        },
        onError: (err: unknown) => {
            toast.error(err instanceof Error ? err.message : 'Seed failed.');
        },
    });

    if (!user) {
        return null;
    }

    if (!canManage) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-6">
                <Card className="max-w-md w-full">
                    <CardContent className="py-10 text-center space-y-4">
                        <Sparkles className="h-8 w-8 mx-auto text-slate-400" />
                        <p className="text-muted-foreground">
                            Only the restaurant owner can complete initial
                            setup. Ask them to finish the onboarding wizard.
                        </p>
                        <Button
                            variant="outline"
                            onClick={() => navigate('/staff-dashboard')}
                        >
                            Go to my staff app
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (isLoading || !status) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center p-6">
                <Card className="max-w-md w-full border-red-200">
                    <CardContent className="py-8 text-center text-red-600">
                        {error instanceof Error
                            ? error.message
                            : 'Failed to load onboarding status.'}
                    </CardContent>
                </Card>
            </div>
        );
    }

    const completedCount = status.order.filter((s) => status.steps[s]).length;
    const totalCount = status.order.length;
    const progress = Math.round((completedCount / totalCount) * 100);

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-8">
                <div>
                    <Badge className="mb-3 bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100">
                        First-run setup
                    </Badge>
                    <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
                        Let’s get {user.restaurant_name || 'your restaurant'}{' '}
                        ready
                    </h1>
                    <p className="mt-2 text-muted-foreground max-w-2xl">
                        Four quick steps so the rest of the app actually has
                        something to work with. You can skip to the dashboard
                        whenever you want — progress is saved.
                    </p>
                </div>

                <Card>
                    <CardContent className="py-5">
                        <div className="flex items-center justify-between gap-3">
                            <div className="text-sm font-medium">
                                {completedCount} of {totalCount} complete
                            </div>
                            <div className="text-xs text-muted-foreground">
                                {progress}%
                            </div>
                        </div>
                        <div className="mt-2 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                            <div
                                className="h-full bg-emerald-500 transition-all"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                        <div className="mt-4 flex flex-wrap items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => seed.mutate()}
                                disabled={seed.isPending || status.completed}
                            >
                                {seed.isPending
                                    ? 'Seeding…'
                                    : 'Seed sensible defaults'}
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => navigate('/dashboard')}
                            >
                                Skip to dashboard
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <div className="space-y-3">
                    {status.order.map((key) => {
                        const meta = STEP_META[key];
                        const done = status.steps[key];
                        const isActive = activeStep === key;
                        const Icon = meta.icon;
                        return (
                            <Card
                                key={key}
                                className={cn(
                                    'transition-shadow',
                                    isActive && 'ring-2 ring-emerald-400/50',
                                    done && 'bg-emerald-50/40 dark:bg-emerald-950/10'
                                )}
                            >
                                <CardHeader
                                    className="cursor-pointer"
                                    onClick={() => setActiveStep(key)}
                                >
                                    <CardTitle className="flex items-center gap-3 text-base sm:text-lg">
                                        {done ? (
                                            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                                        ) : (
                                            <Circle className="h-5 w-5 text-slate-400 shrink-0" />
                                        )}
                                        <Icon className="h-5 w-5 text-slate-500 shrink-0" />
                                        <span className="flex-1">
                                            {meta.title}
                                        </span>
                                        {done && (
                                            <Badge
                                                variant="secondary"
                                                className="text-xs"
                                            >
                                                done
                                            </Badge>
                                        )}
                                    </CardTitle>
                                </CardHeader>
                                {isActive && (
                                    <CardContent className="pt-0 pb-5 space-y-4">
                                        <p className="text-sm text-muted-foreground">
                                            {meta.description}
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                            <Button
                                                onClick={() =>
                                                    navigate(meta.deepLink)
                                                }
                                                className="gap-2"
                                            >
                                                Open {meta.title.toLowerCase()}
                                                <ArrowRight className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="outline"
                                                disabled={
                                                    markStep.isPending || done
                                                }
                                                onClick={() =>
                                                    markStep.mutate(key)
                                                }
                                            >
                                                {done
                                                    ? 'Completed'
                                                    : 'Mark step complete'}
                                            </Button>
                                        </div>
                                    </CardContent>
                                )}
                            </Card>
                        );
                    })}
                </div>

                {status.completed && (
                    <Card className="border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20">
                        <CardContent className="py-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div>
                                <p className="font-semibold">
                                    You’re all set.
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    Your dashboard now has real data — jump in.
                                </p>
                            </div>
                            <Button
                                onClick={() => navigate('/dashboard')}
                                className="gap-2"
                            >
                                Go to dashboard
                                <ArrowRight className="h-4 w-4" />
                            </Button>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
};

export default OnboardingWizard;
