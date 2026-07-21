import React, { useState, useEffect } from 'react';
import { useLocation, useRoute } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  useAdminCreateProduct, 
  useAdminUpdateProduct, 
  useGetProduct,
  useAdminListCategories,
  getAdminListProductsQueryKey,
  getGetProductQueryKey
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, Upload, X } from 'lucide-react';

const productSchema = z.object({
  name: z.string().min(1, "Name is required"),
  sku: z.string().optional(),
  price: z.coerce.number().min(0, "Price must be >= 0"),
  compareAtPrice: z.coerce.number().optional().nullable(),
  description: z.string().optional(),
  categoryId: z.coerce.number().optional().nullable(),
  inStock: z.boolean(),
  featured: z.boolean(),
  images: z.array(z.string()).max(6, "Maximum 6 images allowed"),
});

type ProductFormValues = z.infer<typeof productSchema>;

async function uploadProductImage(file: File): Promise<string> {
  const token = localStorage.getItem('bb_admin_token');
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch('/api/bb-portal/media/upload', {
    method: 'POST',
    headers: token ? { 'Authorization': `Bearer ${token}` } : {},
    body: formData,
  });
  if (!res.ok) throw new Error('Upload failed');
  const data = await res.json();
  return data.url;
}

export default function ProductForm({ isEdit = false }: { isEdit?: boolean }) {
  const [, setLocation] = useLocation();
  const [, params] = useRoute('/bb-studio/products/:id');
  const id = isEdit && params?.id ? parseInt(params.id) : 0;
  
  const { data: product, isLoading: isLoadingProduct } = useGetProduct(id, { query: { enabled: isEdit && !!id, queryKey: getGetProductQueryKey(id) } });
  const { data: categoriesData } = useAdminListCategories();
  
  const createMutation = useAdminCreateProduct();
  const updateMutation = useAdminUpdateProduct();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [images, setImages] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      sku: "",
      price: 0,
      compareAtPrice: null,
      description: "",
      categoryId: null,
      inStock: true,
      featured: false,
      images: [],
    },
  });

  useEffect(() => {
    if (isEdit && product) {
      form.reset({
        name: product.name,
        sku: product.sku || "",
        price: product.price,
        compareAtPrice: product.compareAtPrice || null,
        description: product.description || "",
        categoryId: product.categoryId || null,
        inStock: product.inStock,
        featured: product.featured,
        images: product.images || [],
      });
      setImages(product.images || []);
    }
  }, [isEdit, product, form]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const files = Array.from(e.target.files);
    const availableSlots = 6 - images.length;
    
    if (files.length > availableSlots) {
      toast({ variant: "destructive", title: "Too many images", description: `You can only add ${availableSlots} more images.` });
      return;
    }

    setIsUploading(true);
    try {
      const uploadPromises = files.map(file => uploadProductImage(file));
      const urls = await Promise.all(uploadPromises);
      const newImages = [...images, ...urls];
      setImages(newImages);
      form.setValue('images', newImages, { shouldDirty: true });
      toast({ title: "Success", description: "Images uploaded successfully." });
    } catch (err) {
      toast({ variant: "destructive", title: "Upload Failed", description: "Failed to upload one or more images." });
    } finally {
      setIsUploading(false);
      if (e.target) e.target.value = ''; // Reset input
    }
  };

  const removeImage = (indexToRemove: number) => {
    const newImages = images.filter((_, idx) => idx !== indexToRemove);
    setImages(newImages);
    form.setValue('images', newImages, { shouldDirty: true });
  };

  const onSubmit = (data: ProductFormValues) => {
    const payload = {
      ...data,
      compareAtPrice: data.compareAtPrice || undefined,
      categoryId: data.categoryId || undefined,
      description: data.description || undefined,
      sku: data.sku || undefined,
    };

    if (isEdit) {
      updateMutation.mutate({ id, data: payload }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getAdminListProductsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetProductQueryKey(id) });
          toast({ title: "Product Updated", description: "The product has been updated successfully." });
          setLocation("/bb-studio/products");
        },
        onError: (err: any) => {
          toast({ variant: "destructive", title: "Error", description: err?.data?.message || "Failed to update product." });
        }
      });
    } else {
      createMutation.mutate({ data: payload }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getAdminListProductsQueryKey() });
          toast({ title: "Product Created", description: "The product has been created successfully." });
          setLocation("/bb-studio/products");
        },
        onError: (err: any) => {
          toast({ variant: "destructive", title: "Error", description: err?.data?.message || "Failed to create product." });
        }
      });
    }
  };

  if (isEdit && isLoadingProduct) {
    return <div className="p-8">Loading product details...</div>;
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6 max-w-4xl pb-12">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => setLocation('/bb-studio/products')}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-3xl font-bold font-serif text-foreground">
          {isEdit ? 'Edit Product' : 'New Product'}
        </h1>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Main Details */}
            <div className="lg:col-span-2 space-y-8">
              <div className="bg-card p-6 rounded-md border border-border space-y-6">
                <h2 className="text-lg font-medium border-b border-border pb-2">Basic Information</h2>
                
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Product Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. The Celeste Gown" {...field} />
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
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Detailed product description..." className="min-h-[150px]" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="bg-card p-6 rounded-md border border-border space-y-6">
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <h2 className="text-lg font-medium">Media</h2>
                  <span className="text-xs text-muted-foreground">{images.length}/6 images</span>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {images.map((url, idx) => (
                    <div key={idx} className="relative aspect-[3/4] bg-muted rounded-md overflow-hidden group border border-border">
                      <img src={url} alt={`Preview ${idx}`} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Button 
                          type="button" 
                          variant="destructive" 
                          size="icon"
                          className="h-8 w-8 rounded-full"
                          onClick={() => removeImage(idx)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  
                  {images.length < 6 && (
                    <label className="aspect-[3/4] bg-muted border-2 border-dashed border-border rounded-md flex flex-col items-center justify-center cursor-pointer hover:bg-muted/80 transition-colors">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6 text-muted-foreground">
                        <Upload className="w-8 h-8 mb-3 opacity-50" />
                        <p className="mb-2 text-sm"><span className="font-semibold">Click to upload</span></p>
                        <p className="text-xs">{isUploading ? 'Uploading...' : 'SVG, PNG, JPG'}</p>
                      </div>
                      <input 
                        type="file" 
                        className="hidden" 
                        accept="image/*" 
                        multiple 
                        onChange={handleImageUpload} 
                        disabled={isUploading}
                      />
                    </label>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column - Organization & Pricing */}
            <div className="space-y-8">
              <div className="bg-card p-6 rounded-md border border-border space-y-6">
                <h2 className="text-lg font-medium border-b border-border pb-2">Pricing & Inventory</h2>
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Price ($)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" min="0" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="compareAtPrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Compare at ($)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" min="0" value={field.value || ''} onChange={field.onChange} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="sku"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>SKU</FormLabel>
                      <FormControl>
                        <Input placeholder="BB-DRS-001" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="bg-card p-6 rounded-md border border-border space-y-6">
                <h2 className="text-lg font-medium border-b border-border pb-2">Organization</h2>
                
                <FormField
                  control={form.control}
                  name="categoryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select 
                        value={field.value?.toString() || ''} 
                        onValueChange={(val) => field.onChange(val ? parseInt(val) : null)}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categoriesData?.categories?.map((c) => (
                            <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-4 pt-4 border-t border-border">
                  <FormField
                    control={form.control}
                    name="inStock"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">In Stock</FormLabel>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="featured"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Featured</FormLabel>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-4 border-t border-border pt-6">
            <Button type="button" variant="outline" onClick={() => setLocation('/bb-studio/products')}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || isUploading}>
              {isPending ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Product'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
