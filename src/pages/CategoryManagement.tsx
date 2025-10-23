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

const API_BASE = import.meta.env.VITE_REACT_APP_API_URL || 'http://localhost:8000/api';

interface Category {
    id: string;
    name: string;
    description: string | null;
    is_active: boolean;
    display_order: number;
}

const categoryFormSchema = z.object({
    name: z.string().min(1, "Category name is required"),
    description: z.string().optional().nullable(),
    display_order: z.coerce.number().min(0, "Display order must be non-negative").optional().default(0),
    is_active: z.boolean().optional().default(true),
});

type CategoryFormValues = z.infer<typeof categoryFormSchema>;

const CategoryManagement: React.FC = () => {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);

    const form = useForm<CategoryFormValues>({
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
                throw new Error('Failed to fetch categories');
            }
            return response.json();
        },
        enabled: !!user?.restaurant && (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN'),
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
                throw new Error(errorData.name || 'Failed to create category');
            }
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categories'] });
            toast.success("Category created successfully.");
            setIsCreateDialogOpen(false);
            form.reset();
        },
        onError: (error) => {
            toast.error(error.message || "Failed to create category.");
        },
    });

    const updateCategoryMutation = useMutation({
        mutationFn: async (data: Category) => {
            const response = await fetch(`${API_BASE}/staff/categories/${data.id}/`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
                },
                body: JSON.stringify(data),
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.name || 'Failed to update category');
            }
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categories'] });
            toast.success("Category updated successfully.");
            setIsEditDialogOpen(false);
            setEditingCategory(null);
        },
        onError: (error) => {
            toast.error(error.message || "Failed to update category.");
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
                throw new Error(errorData.detail || 'Failed to delete category');
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categories'] });
            toast.success("Category deleted successfully.");
        },
        onError: (error) => {
            toast.error(error.message || "Failed to delete category.");
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
        return <div className="text-center py-8 text-red-500">Error: {error.message}</div>;
    }

    if (!user || (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN')) {
        return <div className="text-center py-8 text-gray-500">You do not have permission to view this page.</div>;
    }

    return (
        <div className="container mx-auto p-6">
            <h2 className="text-3xl font-bold text-gray-800 mb-6">Category Management</h2>

            <div className="flex justify-end mb-4">
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                    <PlusCircle className="w-4 h-4 mr-2" /> Create New Category
                </Button>
            </div>

            <div className="space-y-4">
                {categories.length === 0 ? (
                    <p className="text-center text-gray-500">No categories found.</p>
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
                                <p className="text-muted-foreground">{category.description || 'No description'}</p>
                                <p className="text-sm text-gray-500">Order: {category.display_order}</p>
                                <p className="text-sm text-gray-500">Status: {category.is_active ? 'Active' : 'Inactive'}</p>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>

            {/* Create Category Dialog */}
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create New Category</DialogTitle>
                    </DialogHeader>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(handleCreateSubmit)} className="space-y-4">
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Category Name</FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g., Appetizers" {...field} />
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
                                        <FormLabel>Description (Optional)</FormLabel>
                                        <FormControl>
                                            <Textarea placeholder="A brief description of the category" {...field} />
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
                                        <FormLabel>Display Order</FormLabel>
                                        <FormControl>
                                            <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value))} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)} type="button">
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={createCategoryMutation.isPending}>
                                    {createCategoryMutation.isPending ? 'Creating...' : 'Create Category'}
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
                        <DialogTitle>Edit Category</DialogTitle>
                    </DialogHeader>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(handleEditSubmit)} className="space-y-4">
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Category Name</FormLabel>
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
                                        <FormLabel>Description (Optional)</FormLabel>
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
                                        <FormLabel>Display Order</FormLabel>
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
                                                aria-label="Is Active"
                                            />
                                        </FormControl>
                                        <div className="space-y-1 leading-none">
                                            <FormLabel>Is Active</FormLabel>
                                            <p className="text-sm text-muted-foreground">
                                                Whether this category is currently active and visible.
                                            </p>
                                        </div>
                                    </FormItem>
                                )}
                            />
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} type="button">
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={updateCategoryMutation.isPending}>
                                    {updateCategoryMutation.isPending ? 'Saving...' : 'Save Changes'}
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
