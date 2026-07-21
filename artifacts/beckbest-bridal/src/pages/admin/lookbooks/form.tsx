import React, { useState, useEffect } from 'react';
import { useLocation, useRoute } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  useAdminCreateLookbook,
  useAdminUpdateLookbook,
  useAdminGetLookbook,
  useAdminCreateLookbookItem,
  useAdminDeleteLookbookItem,
  useAdminListProducts,
  getAdminListLookbooksQueryKey,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { ChevronLeft, Plus, X, Upload, Trash2, FileImage, Link as LinkIcon } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';

const lookbookSchema = z.object({
  title: z.string().min(1, "Title is required"),
  slug: z.string().min(1, "Slug is required"),
  description: z.string().optional(),
  coverImage: z.string().optional(),
  category: z.string().default("wedding"),
  isPublished: z.boolean(),
  sortOrder: z.coerce.number().int().min(0),
});

type LookbookFormValues = z.infer<typeof lookbookSchema>;

const itemSchema = z.object({
  productId: z.coerce.number().optional(),
  imageUrl: z.string().min(1, "Image URL is required"),
  caption: z.string().optional(),
  price: z.coerce.number().optional(),
  sizes: z.array(z.string()).default([]),
  color: z.string().optional(),
  colors: z.array(z.string()).default([]),
  videoUrl: z.string().optional(),
  videoType: z.string().optional(),
  sortOrder: z.coerce.number().int().min(0),
});

type ItemFormValues = z.infer<typeof itemSchema>;

async function uploadImage(file: File): Promise<string> {
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

export default function LookbookForm({ isEdit = false }: { isEdit?: boolean }) {
  const [, setLocation] = useLocation();
  const [, params] = useRoute('/bb-studio/lookbooks/:id');
  const id = isEdit && params?.id ? parseInt(params.id) : 0;

  const { data: lookbook, isLoading: isLoadingLookbook } = useAdminGetLookbook(id, { query: { enabled: isEdit && !!id } });
  const { data: productsData } = useAdminListProducts();

  const createMutation = useAdminCreateLookbook();
  const updateMutation = useAdminUpdateLookbook();
  const createItemMutation = useAdminCreateLookbookItem();
  const deleteItemMutation = useAdminDeleteLookbookItem();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [items, setItems] = useState<any[]>([]);
  const [itemForm, setItemForm] = useState<ItemFormValues>({ imageUrl: '', productId: undefined, caption: '', price: undefined, sizes: [], color: '', colors: [], videoUrl: '', videoType: '', sortOrder: 0 });
  const [isUploading, setIsUploading] = useState(false);
  const [isAddingItem, setIsAddingItem] = useState(false);

  // Bulk upload state
  const [bulkUrls, setBulkUrls] = useState('');
  const [bulkFiles, setBulkFiles] = useState<FileList | null>(null);
  const [bulkProductId, setBulkProductId] = useState<number | undefined>(undefined);
  const [bulkCaption, setBulkCaption] = useState('');
  const [isBulkUploading, setIsBulkUploading] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0, message: '' });

  const form = useForm<LookbookFormValues>({
    resolver: zodResolver(lookbookSchema),
    defaultValues: {
      title: '',
      slug: '',
      description: '',
      coverImage: '',
      isPublished: false,
      sortOrder: 0,
    },
  });

  useEffect(() => {
    if (isEdit && lookbook) {
      form.reset({
        title: lookbook.title,
        slug: lookbook.slug,
        description: lookbook.description || '',
        coverImage: lookbook.coverImage || '',
        isPublished: lookbook.isPublished,
        sortOrder: lookbook.sortOrder,
      });
      setItems(lookbook.items || []);
    }
  }, [isEdit, lookbook, form]);

  const addBulkItems = async (targetLookbookId: number) => {
    const urlList = bulkUrls.split('\n').map(u => u.trim()).filter(u => u.length > 0);
    const fileList = bulkFiles ? Array.from(bulkFiles) : [];

    const totalItems = urlList.length + fileList.length;
    if (totalItems === 0) return 0;

    setIsBulkUploading(true);
    setBulkProgress({ current: 0, total: totalItems, message: 'Starting bulk upload...' });

    try {
      let processed = 0;

      // Process URLs first
      for (const url of urlList) {
        setBulkProgress({ current: processed + 1, total: totalItems, message: `Adding URL: ${url}` });
        const payload = {
          imageUrl: url,
          caption: bulkCaption || undefined,
          sortOrder: processed,
          ...(bulkProductId ? { productId: bulkProductId } : {}),
        };
        await createItemMutation.mutateAsync({ id: targetLookbookId, data: payload });
        setItems(prev => [...prev, { id: Date.now() + processed, imageUrl: url, caption: bulkCaption || null, sortOrder: processed, productId: bulkProductId || null }]);
        processed++;
      }

      // Process files
      for (const file of fileList) {
        setBulkProgress({ current: processed + 1, total: totalItems, message: `Uploading file: ${file.name}` });
        try {
          const uploadedUrl = await uploadImage(file);
          const payload = {
            imageUrl: uploadedUrl,
            caption: bulkCaption || undefined,
            sortOrder: processed,
            ...(bulkProductId ? { productId: bulkProductId } : {}),
          };
          await createItemMutation.mutateAsync({ id: targetLookbookId, data: payload });
          setItems(prev => [...prev, { id: Date.now() + processed, imageUrl: uploadedUrl, caption: bulkCaption || null, sortOrder: processed, productId: bulkProductId || null }]);
          processed++;
        } catch (err) {
          toast({ variant: "destructive", title: "Upload Failed", description: `Failed to upload ${file.name}` });
        }
      }

      // Reset bulk form
      setBulkUrls('');
      setBulkFiles(null);
      setBulkCaption('');
      setBulkProductId(undefined);

      toast({ title: "Bulk Upload Complete", description: `${processed} items added successfully.` });
      return processed;
    } catch (err) {
      toast({ variant: "destructive", title: "Bulk Upload Error", description: "Some items may not have been added." });
      return 0;
    } finally {
      setIsBulkUploading(false);
      setBulkProgress({ current: 0, total: 0, message: '' });
    }
  };

  const onSubmit = async (data: LookbookFormValues) => {
    const payload = {
      ...data,
      description: data.description || undefined,
      coverImage: data.coverImage || undefined,
    };

    if (isEdit && id) {
      updateMutation.mutate({ id, data: payload }, {
        onSuccess: async () => {
          queryClient.invalidateQueries({ queryKey: getAdminListLookbooksQueryKey() });
          toast({ title: "Lookbook Updated", description: "The lookbook has been updated successfully." });
          
          // Add bulk items after update
          const urlList = bulkUrls.split('\n').map(u => u.trim()).filter(u => u.length > 0);
          const fileList = bulkFiles ? Array.from(bulkFiles) : [];
          if (urlList.length + fileList.length > 0) {
            await addBulkItems(id);
          }
          
          setLocation("/bb-studio/lookbooks");
        },
        onError: (err: any) => {
          toast({ variant: "destructive", title: "Error", description: err?.data?.message || "Failed to update lookbook." });
        },
      });
    } else {
      createMutation.mutate({ data: payload }, {
        onSuccess: async (newLookbook) => {
          queryClient.invalidateQueries({ queryKey: getAdminListLookbooksQueryKey() });
          toast({ title: "Lookbook Created", description: "The lookbook has been created successfully." });
          
          // Add bulk items after creation
          await addBulkItems(newLookbook.id);
          
          setLocation(`/bb-studio/lookbooks/${newLookbook.id}`);
        },
        onError: (err: any) => {
          toast({ variant: "destructive", title: "Error", description: err?.data?.message || "Failed to create lookbook." });
        },
      });
    }
  };

  const handleAddItem = () => {
    if (!itemForm.imageUrl) {
      toast({ variant: "destructive", title: "Validation Error", description: "Image URL is required." });
      return;
    }
    setIsAddingItem(true);
    const targetLookbookId = isEdit ? id : undefined;
    if (!targetLookbookId) {
      toast({ variant: "destructive", title: "Error", description: "Please save the lookbook first before adding items." });
      setIsAddingItem(false);
      return;
    }

    const payload = {
      imageUrl: itemForm.imageUrl,
      caption: itemForm.caption || undefined,
      sortOrder: itemForm.sortOrder,
      ...(itemForm.productId ? { productId: itemForm.productId } : {}),
    };
    createItemMutation.mutate({ id: targetLookbookId, data: payload }, {
      onSuccess: (newItem) => {
        setItems([...items, newItem]);
        setItemForm({ imageUrl: '', productId: 0, caption: '', price: undefined, sizes: [], color: '', colors: [], videoUrl: '', videoType: '', sortOrder: 0 });
        toast({ title: "Item added", description: "Lookbook item has been added." });
        setIsAddingItem(false);
      },
      onError: (err: any) => {
        toast({ variant: "destructive", title: "Error", description: err?.data?.message || "Failed to add item." });
        setIsAddingItem(false);
      },
    });
  };

  const handleDeleteItem = (itemId: number) => {
    deleteItemMutation.mutate({ itemId }, {
      onSuccess: () => {
        setItems(items.filter(i => i.id !== itemId));
        toast({ title: "Item removed", description: "Lookbook item has been removed." });
      },
      onError: (err: any) => {
        toast({ variant: "destructive", title: "Error", description: err?.data?.message || "Failed to remove item." });
      },
    });
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setIsUploading(true);
    try {
      const url = await uploadImage(e.target.files[0]);
      form.setValue('coverImage', url, { shouldDirty: true });
      toast({ title: "Success", description: "Cover image uploaded." });
    } catch (err) {
      toast({ variant: "destructive", title: "Upload Failed", description: "Failed to upload cover image." });
    } finally {
      setIsUploading(false);
    }
  };

  if (isEdit && isLoadingLookbook) {
    return <div className="p-8">Loading lookbook details...</div>;
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6 max-w-4xl pb-12">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => setLocation('/bb-studio/lookbooks')}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-3xl font-bold font-serif text-foreground">
          {isEdit ? 'Edit Lookbook' : 'New Lookbook'}
        </h1>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <div className="bg-card p-6 rounded-md border border-border space-y-6">
            <h2 className="text-lg font-medium border-b border-border pb-2">Basic Information</h2>

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Spring 2025 Collection" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="slug"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Slug</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. spring-2025" {...field} />
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
                    <Textarea placeholder="Short description..." className="min-h-[100px]" {...field} />
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
                  <FormControl>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="wedding">💒 Wedding</SelectItem>
                        <SelectItem value="bridal-shower">🎀 Bridal Shower</SelectItem>
                        <SelectItem value="engagement">💍 Engagement</SelectItem>
                        <SelectItem value="rehearsal-dinner">🍽️ Rehearsal Dinner</SelectItem>
                        <SelectItem value="honeymoon">🌴 Honeymoon</SelectItem>
                        <SelectItem value="custom">✨ Custom</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Cover Image</label>
              <div className="flex items-center gap-4">
                {form.watch('coverImage') && (
                  <img src={form.watch('coverImage')} alt="Cover" className="h-20 w-16 object-cover rounded border border-border" />
                )}
                <label className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-border bg-background hover:bg-muted cursor-pointer">
                  <Upload className="h-4 w-4" />
                  <span className="text-sm">{isUploading ? 'Uploading...' : 'Upload Cover'}</span>
                  <input type="file" className="hidden" accept="image/*" onChange={handleCoverUpload} disabled={isUploading} />
                </label>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="sortOrder"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sort Order</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="isPublished"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Published</FormLabel>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
          </div>

          <div className="bg-card p-6 rounded-md border border-border space-y-6">
            <h3 className="text-lg font-medium">Bulk Add Items (URLs + Uploads)</h3>
            <p className="text-sm text-muted-foreground">
              Paste multiple image URLs (one per line) or select files to upload. All items will be added with sequential sort orders when you save the lookbook.
            </p>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2">
                  <LinkIcon className="h-4 w-4" /> Image URLs (one per line)
                </label>
                <Textarea
                  placeholder="https://example.com/image1.jpg&#10;https://example.com/image2.jpg&#10;https://example.com/image3.jpg"
                  value={bulkUrls}
                  onChange={(e) => setBulkUrls(e.target.value)}
                  className="min-h-[120px]"
                  disabled={isBulkUploading}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2">
                  <FileImage className="h-4 w-4" /> Or Upload Files
                </label>
                <Input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => setBulkFiles(e.target.files)}
                  disabled={isBulkUploading}
                />
                {bulkFiles && bulkFiles.length > 0 && (
                  <p className="text-xs text-muted-foreground">{bulkFiles.length} file(s) selected</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Link to Product (optional - applied to all)</label>
                  <Select
                    value={bulkProductId ? bulkProductId.toString() : ''}
                    onValueChange={(val) => setBulkProductId(val ? parseInt(val) : undefined)}
                    disabled={isBulkUploading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a product" />
                    </SelectTrigger>
                    <SelectContent>
                      {productsData?.products?.map((p) => (
                        <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Caption (optional - applied to all)</label>
                  <Input
                    placeholder="Optional caption"
                    value={bulkCaption}
                    onChange={(e) => setBulkCaption(e.target.value)}
                    disabled={isBulkUploading}
                  />
                </div>
              </div>

              {isBulkUploading && (
                <div className="space-y-2">
                  <Progress value={(bulkProgress.current / bulkProgress.total) * 100} />
                  <p className="text-xs text-muted-foreground">{bulkProgress.message} ({bulkProgress.current}/{bulkProgress.total})</p>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-4 border-t border-border pt-6">
            <Button type="button" variant="outline" onClick={() => setLocation('/bb-studio/lookbooks')}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || isBulkUploading}>
              {isPending ? 'Saving...' : isBulkUploading ? `Adding Items... (${bulkProgress.current}/${bulkProgress.total})` : isEdit ? 'Save Changes' : 'Create Lookbook'}
            </Button>
          </div>
        </form>
      </Form>

      {isEdit && id && (
        <>
          <Separator className="my-8" />
          <div className="space-y-6">
            <h2 className="text-2xl font-serif font-semibold text-foreground">Lookbook Items</h2>

              <div className="bg-card p-6 rounded-md border border-border space-y-6">
                <h3 className="text-lg font-medium">Add Single Item</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Image URL</label>
                    <Input
                      placeholder="https://..."
                      value={itemForm.imageUrl}
                      onChange={(e) => setItemForm({ ...itemForm, imageUrl: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Link to Product (optional)</label>
                    <Select
                      value={itemForm.productId ? itemForm.productId.toString() : ''}
                      onValueChange={(val) => setItemForm({ ...itemForm, productId: val ? parseInt(val) : undefined })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a product" />
                      </SelectTrigger>
                      <SelectContent>
                        {productsData?.products?.map((p) => (
                          <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Caption</label>
                    <Input
                      placeholder="Optional caption"
                      value={itemForm.caption}
                      onChange={(e) => setItemForm({ ...itemForm, caption: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Sort Order</label>
                    <Input
                      type="number"
                      min="0"
                      value={itemForm.sortOrder}
                      onChange={(e) => setItemForm({ ...itemForm, sortOrder: parseInt(e.target.value || '0') })}
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button onClick={handleAddItem} disabled={isAddingItem}>
                    <Plus className="mr-2 h-4 w-4" />
                    {isAddingItem ? 'Adding...' : 'Add Item'}
                  </Button>
                </div>
              </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {items.map((item) => (
                <div key={item.id} className="relative group border border-border rounded-md overflow-hidden bg-card">
                  <div className="aspect-square bg-muted">
                    <img src={item.imageUrl} alt={item.caption || ''} className="w-full h-full object-cover" />
                  </div>
                  <div className="p-2 space-y-1">
                    {item.caption && <p className="text-xs text-muted-foreground line-clamp-2">{item.caption}</p>}
                    {item.productName && (
                      <p className="text-xs font-medium truncate">{item.productName}</p>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleDeleteItem(item.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}