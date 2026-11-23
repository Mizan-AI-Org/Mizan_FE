import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Loader2, PlusCircle, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../hooks/use-auth';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { API_BASE } from "@/lib/api";
import { unwrapEnvelope } from "@/lib/envelope";
import i18n from "@/i18n";

function asList(payload: unknown): any[] {
  const data = unwrapEnvelope(payload);
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    for (const key of ["results", "data", "items"]) {
      if (Array.isArray(obj[key])) return obj[key] as any[];
    }
  }
  return [];
}



import { useLanguage } from "@/hooks/use-language";
interface Category {
    id: string;
    name: string;
    description: string | null;
    is_active: boolean;
    display_order: number;
}

const categoryFormSchema = z.object({
    name: z.string().min(1, { error: () => i18n.t("category_management.name_required") }),
    description: z.string().optional().nullable(),
    display_order: z.coerce.number<number>().min(0, { error: () => i18n.t("category_management.order_non_negative") }).optional().default(0),
    is_active: z.boolean().optional().default(true),
});

type CategoryFormValues = z.infer<typeof categoryFormSchema>;

const CategoryManagement: React.FC = () => {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const { t } = useLanguage();
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);

    const form = useForm<z.input<typeof categoryFormSchema>, unknown, CategoryFormValues>({
        resolver: zodResolver(categoryFormSchema),
        defaultValues: {
            name: '',
            description: '',
            display_order: 0,
            is_active: true,
        },
    });

    const { data: categories = [], isLoading, error } = useQuery<Category[]>({
        queryKey: ['categories', user?.restaurant],
        queryFn: async () => {
            if (!user?.restaurant) return [];
            const response = await fetch(`${API_BASE}/staff/categories/`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
                },
            });
            if (!response.ok) {
                throw new Error(t('category_management.fetch_failed'));
            }
            return asList(await response.json());
        },
        enabled: !!user?.restaurant && (user.role === 'SUPER_ADMIN' || user.role === 'OWNER' || user.role === 'ADMIN'),
    });

    const createCategoryMutation = useMutation({
        mutationFn: async (data: CategoryFormValues) => {
            const response = await fetch(`${API_BASE}/staff/categories/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
                },
                body: JSON.stringify(data),
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.name || t('category_management.create_failed'));
            }
            return asList(await response.json());
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categories'] });
            toast.success(t("generic.toast.category_created_successfully"));
            setIsCreateDialogOpen(false);
            form.reset();
        },
        onError: (error) => {
            toast.error(error.message || t("category_management.create_failed"));
        },
    });

    const updateCategoryMutation = useMutation({
        mutationFn: async (data: Category) => {
            const response = await fetch(`${API_BASE}/staff/categories/${data.id}/`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
                },
                body: JSON.stringify(data),
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.name || t('category_management.update_failed'));
            }
            return asList(await response.json());
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categories'] });
            toast.success(t("generic.toast.category_updated_successfully"));
            setIsEditDialogOpen(false);
            setEditingCategory(null);
        },
        onError: (error) => {
            toast.error(error.message || t("category_management.update_failed"));
        },
    });

    const deleteCategoryMutation = useMutation({
        mutationFn: async (categoryId: string) => {
            const response = await fetch(`${API_BASE}/staff/categories/${categoryId}/`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
                },
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || t('category_management.delete_failed'));
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categories'] });
            toast.success(t("generic.toast.category_deleted_successfully"));
        },
        onError: (error) => {
            toast.error(error.message || t("category_management.delete_failed"));
        },
    });

    const handleCreateSubmit = (values: CategoryFormValues) => {
        createCategoryMutation.mutate(values);
    };

    const handleEditSubmit = (values: CategoryFormValues) => {
        if (editingCategory) {
            updateCategoryMutation.mutate({ ...editingCategory, ...values });
        }
    };

    const openEditDialog = (category: Category) => {
        setEditingCategory(category);
        form.reset(category);
        setIsEditDialogOpen(true);
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    if (error) {
        return <div className="text-center py-8 text-red-500">{t("swap_requests.error_prefix", { message: error.message })}</div>;
    }

    if (!user || (user.role !== 'SUPER_ADMIN' && user.role !== 'OWNER' && user.role !== 'ADMIN')) {
        return <div className="text-center py-8 text-gray-500">{t("generic.no_access_description")}</div>;
    }

    return (
        <div className="container mx-auto p-6">
            <h2 className="text-3xl font-bold text-gray-800 mb-6">{t("category_management.title")}</h2>

            <div className="flex justify-end mb-4">
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                    <PlusCircle className="w-4 h-4 mr-2" /> {t("category_management.create_new")}
                </Button>
            </div>

            <div className="space-y-4">
                {categories.length === 0 ? (
                    <p className="text-center text-gray-500">{t("category_management.empty")}</p>
                ) : (
                    categories.map(category => (
                        <Card key={category.id} className="shadow-sm">
                            <CardHeader className="flex-row items-center justify-between">
                                <CardTitle>{category.name}</CardTitle>
                                <div className="flex gap-2">
                                    <Button variant="outline" size="sm" onClick={() => openEditDialog(category)}>
                                        <Edit className="w-4 h-4" />
                                    </Button>
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={() => deleteCategoryMutation.mutate(category.id)}
                                        disabled={deleteCategoryMutation.isPending}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <p className="text-muted-foreground">{category.description || t('category_management.no_description')}</p>
                                <p className="text-sm text-gray-500">{t("category_management.order_value", { order: category.display_order })}</p>
                                <p className="text-sm text-gray-500">{t("category_management.status_value", { status: category.is_active ? t('common.active') : t('common.inactive') })}</p>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>

            {/* Create Category Dialog */}
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t("category_management.create_new")}</DialogTitle>
                    </DialogHeader>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(handleCreateSubmit)} className="space-y-4">
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t("category_management.name_label")}</FormLabel>
                                        <FormControl>
                                            <Input placeholder={t("category_management.name_placeholder")} {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="description"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t("category_management.description_label")}</FormLabel>
                                        <FormControl>
                                            <Textarea placeholder={t("category_management.description_placeholder")} {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="display_order"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t("category_management.display_order")}</FormLabel>
                                        <FormControl>
                                            <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value))} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)} type="button">
                                    {t("common.cancel")}
                                </Button>
                                <Button type="submit" disabled={createCategoryMutation.isPending}>
                                    {createCategoryMutation.isPending ? t('category_management.creating') : t('category_management.create')}
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>

            {/* Edit Category Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t("category_management.edit_title")}</DialogTitle>
                    </DialogHeader>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(handleEditSubmit)} className="space-y-4">
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t("category_management.name_label")}</FormLabel>
                                        <FormControl>
                                            <Input {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="description"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t("category_management.description_label")}</FormLabel>
                                        <FormControl>
                                            <Textarea {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="display_order"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t("category_management.display_order")}</FormLabel>
                                        <FormControl>
                                            <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value))} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="is_active"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow-sm">
                                        <FormControl>
                                            <input
                                                type="checkbox"
                                                checked={field.value}
                                                onChange={field.onChange}
                                                className="mt-1 h-4 w-4"
                                                aria-label={t("category_management.is_active")}
                                            />
                                        </FormControl>
                                        <div className="space-y-1 leading-none">
                                            <FormLabel>{t("category_management.is_active")}</FormLabel>
                                            <p className="text-sm text-muted-foreground">
                                                {t("category_management.is_active_hint")}
                                            </p>
                                        </div>
                                    </FormItem>
                                )}
                            />
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} type="button">
                                    {t("common.cancel")}
                                </Button>
                                <Button type="submit" disabled={updateCategoryMutation.isPending}>
                                    {updateCategoryMutation.isPending ? t('common.saving') : t('category_management.save_changes')}
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default CategoryManagement;
