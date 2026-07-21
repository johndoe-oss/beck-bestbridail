import React from 'react';
import { Link } from 'wouter';
import { useAdminListProducts, useAdminDeleteProduct, getAdminListProductsQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function AdminProducts() {
  const { data, isLoading } = useAdminListProducts();
  const deleteMutation = useAdminDeleteProduct();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [searchTerm, setSearchTerm] = React.useState('');

  const handleDelete = (id: number) => {
    deleteMutation.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getAdminListProductsQueryKey() });
        toast({ title: "Product deleted", description: "The product has been removed." });
      },
      onError: (err: any) => {
        toast({ variant: "destructive", title: "Error", description: err?.data?.message || "Failed to delete product." });
      }
    });
  };

  const filteredProducts = data?.products?.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.sku?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold font-serif text-foreground">Products</h1>
        <Button asChild>
          <Link href="/bb-studio/products/new">
            <Plus className="mr-2 h-4 w-4" /> New Product
          </Link>
        </Button>
      </div>

      <div className="flex items-center gap-2 max-w-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search products or SKU..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-card"
          />
        </div>
      </div>

      <div className="bg-card rounded-md border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Image</TableHead>
              <TableHead>Name / SKU</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date Added</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-12 w-10 rounded" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32 mb-2" /><Skeleton className="h-3 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-16 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : filteredProducts?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                  No products found.
                </TableCell>
              </TableRow>
            ) : (
              filteredProducts?.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    <div className="w-10 h-12 bg-muted rounded overflow-hidden flex-shrink-0">
                      <img 
                        src={product.images?.[0] || "/attached_assets/generated_images/placeholder.jpg"} 
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="font-medium">{product.name}</p>
                    <p className="text-xs text-muted-foreground">SKU: {product.sku || 'N/A'}</p>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{product.categoryName}</TableCell>
                  <TableCell>${product.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1 items-start">
                      <Badge variant="outline" className={`border-none ${product.inStock ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {product.inStock ? 'In Stock' : 'Out of Stock'}
                      </Badge>
                      {product.featured && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Featured</Badge>}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {format(new Date(product.createdAt), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" asChild>
                        <Link href={`/bb-studio/products/${product.id}`}>
                          <Edit className="h-4 w-4 text-muted-foreground" />
                        </Link>
                      </Button>
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Product?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. This will permanently delete the product from the catalog.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => handleDelete(product.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
