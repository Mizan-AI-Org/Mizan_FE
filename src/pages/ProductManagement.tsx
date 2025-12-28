import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Loader2, PlusCircle, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../hooks/use-auth';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { API_BASE } from "@/lib/api";


interface Category {
    id: string;
    name: string;
}

interface Product {
    id: string;
    name: string;
    description: string | null;
    base_price: number;
    is_active: boolean;
    image: string | null;
    category: string; // Category ID
    category_info?: Category; // Nested category info for display
}

const productFormSchema = z.object({
    name: z.string().min(1, "Product name is required"),
    description: z.string().optional().nullable(),
    base_price: z.coerce.number().min(0.01, "Price must be greater than 0"),
    is_active: z.boolean().optional().default(true),
    category: z.string().uuid("Invalid category selected"),
    image: z.any().optional().nullable(), // For file input
});

type ProductFormValues = z.infer<typeof productFormSchema>;

const ProductManagement: React.FC = () => {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const form = useForm<ProductFormValues>({
        resolver: zodResolver(productFormSchema),
        defaultValues: {
            name: '',
            description: '',
            base_price: 0.01,
            is_active: true,
            category: '',
            image: null,
        },
    });

    const { data: products = [], isLoading, error } = useQuery<Product[]>({
        queryKey: ['products', user?.restaurant?.id],
        queryFn: async () => {
            if (!user?.restaurant?.id) return [];
            const response = await fetch(`${API_BASE}/staff/products/`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
                },
            });
            if (!response.ok) {
                throw new Error('Failed to fetch products');
            }
            return response.json();
        },
        enabled: !!user?.restaurant?.id && (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN'),
    });

    const { data: categories = [], isLoading: isLoadingCategories } = useQuery<Category[]>({
        queryKey: ['categories', user?.restaurant?.id],
        queryFn: async () => {
            if (!user?.restaurant?.id) return [];
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
        enabled: !!user?.restaurant?.id && (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN'),
    });

    const createProductMutation = useMutation({
        mutationFn: async (data: FormData) => {
            const response = await fetch(`${API_BASE}/staff/products/`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
                },
                body: data,
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.name || 'Failed to create product');
            }
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['products'] });
            toast.success("Product created successfully.");
            setIsCreateDialogOpen(false);
            form.reset();
        },
        onError: (error) => {
            toast.error(error.message || "Failed to create product.");
        },
    });

    const updateProductMutation = useMutation({
        mutationFn: async ({ id, data }: { id: string; data: FormData }) => {
            const response = await fetch(`${API_BASE}/staff/products/${id}/`, {
                method: 'PATCH', // Use PATCH for partial updates, including file uploads
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
                    // Content-Type header is NOT set for FormData, browser handles it
                },
                body: data,
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.name || 'Failed to update product');
            }
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['products'] });
            toast.success("Product updated successfully.");
            setIsEditDialogOpen(false);
            setEditingProduct(null);
        },
        onError: (error) => {
            toast.error(error.message || "Failed to update product.");
        },
    });

    const deleteProductMutation = useMutation({
        mutationFn: async (productId: string) => {
            const response = await fetch(`${API_BASE}/staff/products/${productId}/`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
                },
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Failed to delete product');
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['products'] });
            toast.success("Product deleted successfully.");
        },
        onError: (error) => {
            toast.error(error.message || "Failed to delete product.");
        },
    });

    const handleCreateSubmit = (values: ProductFormValues) => {
        const formData = new FormData();
        formData.append('name', values.name);
        formData.append('description', values.description || '');
        formData.append('base_price', values.base_price.toString());
        formData.append('is_active', values.is_active.toString());
        formData.append('category', values.category);
        if (values.image && values.image[0]) {
            formData.append('image', values.image[0]);
        }
        createProductMutation.mutate(formData);
    };

    const handleEditSubmit = (values: ProductFormValues) => {
        if (!editingProduct) return;

        const formData = new FormData();
        // Only append fields that have changed
        if (values.name !== editingProduct.name) formData.append('name', values.name);
        if (values.description !== editingProduct.description) formData.append('description', values.description || '');
        if (values.base_price !== editingProduct.base_price) formData.append('base_price', values.base_price.toString());
        if (values.is_active !== editingProduct.is_active) formData.append('is_active', values.is_active.toString());
        if (values.category !== editingProduct.category) formData.append('category', values.category);

        // Handle image update only if a new file is selected
        if (values.image && values.image[0]) {
            formData.append('image', values.image[0]);
        }

        // If no changes, don't make API call
        if (Array.from(formData.keys()).length === 0) {
            setIsEditDialogOpen(false);
            return;
        }

        updateProductMutation.mutate({ id: editingProduct.id, data: formData });
    };

    const openEditDialog = (product: Product) => {
        setEditingProduct(product);
        form.reset({
            name: product.name,
            description: product.description,
            base_price: product.base_price,
            is_active: product.is_active,
            category: product.category,
            image: null, // Image input should be reset for editing
        });
        setIsEditDialogOpen(true);
    };

    if (isLoading || isLoadingCategories) {
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
            <h2 className="text-3xl font-bold text-gray-800 mb-6">Product Management</h2>

            <div className="flex justify-end mb-4">
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                    <PlusCircle className="w-4 h-4 mr-2" /> Create New Product
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {products.length === 0 ? (
                    <p className="text-center text-gray-500 col-span-full">No products found.</p>
                ) : (
                    products.map(product => (
                        <Card key={product.id} className="shadow-sm">
                            <CardHeader className="flex-row items-center justify-between">
                                <CardTitle>{product.name}</CardTitle>
                                <div className="flex gap-2">
                                    <Button variant="outline" size="sm" onClick={() => openEditDialog(product)}>
                                        <Edit className="w-4 h-4" />
                                    </Button>
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={() => deleteProductMutation.mutate(product.id)}
                                        disabled={deleteProductMutation.isPending}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent>
                                {product.image && (
                                    <img
                                        src={product.image}
                                        alt={product.name}
                                        className="w-full h-40 object-cover rounded-md mb-3"
                                    />
                                )}
                                <p className="text-muted-foreground">{product.description || 'No description'}</p>
                                <p className="text-lg font-bold text-primary">${product.base_price.toFixed(2)}</p>
                                <p className="text-sm text-gray-500">Category: {product.category_info?.name || 'N/A'}</p>
                                <p className="text-sm text-gray-500">Status: {product.is_active ? 'Active' : 'Inactive'}</p>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>

            {/* Create Product Dialog */}
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create New Product</DialogTitle>
                    </DialogHeader>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(handleCreateSubmit)} className="space-y-4">
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Product Name</FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g., Spaghetti Carbonara" {...field} />
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
                                            <Textarea placeholder="A brief description of the product" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="base_price"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Base Price</FormLabel>
                                        <FormControl>
                                            <Input type="number" step="0.01" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="category"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Category</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select a category" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {isLoadingCategories ? (
                                                    <SelectItem value="__loading_categories__" disabled>Loading categories...</SelectItem>
                                                ) : categories.length === 0 ? (
                                                    <SelectItem value="__no_categories__" disabled>No categories available</SelectItem>
                                                ) : (
                                                    categories.map(category => (
                                                        <SelectItem key={category.id} value={category.id}>
                                                            {category.name}
                                                        </SelectItem>
                                                    ))
                                                )}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="image"
                                render={({ field: { onChange, value, ...rest } }) => (
                                    <FormItem>
                                        <FormLabel>Product Image (Optional)</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="file"
                                                accept="image/*"
                                                ref={fileInputRef}
                                                onChange={(event) => onChange(event.target.files)}
                                                {...rest}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)} type="button">
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={createProductMutation.isPending}>
                                    {createProductMutation.isPending ? 'Creating...' : 'Create Product'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>

            {/* Edit Product Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Product</DialogTitle>
                    </DialogHeader>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(handleEditSubmit)} className="space-y-4">
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Product Name</FormLabel>
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
                                name="base_price"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Base Price</FormLabel>
                                        <FormControl>
                                            <Input type="number" step="0.01" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="category"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Category</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select a category" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {isLoadingCategories ? (
                                                    <SelectItem value="__loading_categories__" disabled>Loading categories...</SelectItem>
                                                ) : categories.length === 0 ? (
                                                    <SelectItem value="__no_categories__" disabled>No categories available</SelectItem>
                                                ) : (
                                                    categories.map(category => (
                                                        <SelectItem key={category.id} value={category.id}>
                                                            {category.name}
                                                        </SelectItem>
                                                    ))
                                                )}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="image"
                                render={({ field: { onChange, value, ...rest } }) => (
                                    <FormItem>
                                        <FormLabel>Product Image (Optional)</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="file"
                                                accept="image/*"
                                                ref={fileInputRef} // Using ref for image input
                                                onChange={(event) => onChange(event.target.files)}
                                                {...rest}
                                            />
                                        </FormControl>
                                        {editingProduct?.image && ( // Display current image if exists
                                            <div className="mt-2">
                                                <p className="text-sm text-muted-foreground mb-1">Current Image:</p>
                                                <img src={editingProduct.image} alt="Current Product" className="w-32 h-32 object-cover rounded-md" />
                                            </div>
                                        )}
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
                                                Whether this product is currently active and visible on the POS.
                                            </p>
                                        </div>
                                    </FormItem>
                                )}
                            />
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} type="button">
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={updateProductMutation.isPending}>
                                    {updateProductMutation.isPending ? 'Saving...' : 'Save Changes'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default ProductManagement;
