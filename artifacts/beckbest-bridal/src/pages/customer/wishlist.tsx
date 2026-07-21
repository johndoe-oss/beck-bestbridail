import React from 'react';
import { Link } from 'wouter';
import { useGetWishlist, useRemoveFromWishlist, useAddCartItem, getGetWishlistQueryKey, getGetCartQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { AppEmptyState } from '@/components/ui/app-empty-state';
import { ProductGridSkeleton } from '@/components/ui/app-skeletons';
import { Button } from '@/components/ui/button';
import { Heart, Trash2, ShoppingBag } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Wishlist() {
  const { data: wishlist, isLoading } = useGetWishlist();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const remove = useRemoveFromWishlist();
  const addToCart = useAddCartItem();

  const handleRemove = (productId: number) => {
    remove.mutate({ productId }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetWishlistQueryKey() });
        toast({ title: "Removed from wishlist" });
      }
    });
  };

  const handleAddToCart = (productId: number) => {
    addToCart.mutate({ data: { productId, quantity: 1 } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetCartQueryKey() });
        toast({ title: "Added to cart" });
      }
    });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 md:px-6 py-12 md:py-24">
        <h1 className="font-serif text-4xl mb-12">Your Wishlist</h1>
        <ProductGridSkeleton count={4} />
      </div>
    );
  }

  if (!wishlist || wishlist.items.length === 0) {
    return (
      <AppEmptyState 
        title="Your wishlist is empty"
        description="Save your favorite items here to review them later."
        icon={Heart}
        actionLabel="Discover Pieces"
        actionHref="/products"
      />
    );
  }

  return (
    <div className="bg-background min-h-screen pb-24">
      <div className="container mx-auto px-4 md:px-6 py-12 md:py-16">
        <div className="flex items-end justify-between mb-12 border-b border-border pb-6">
          <h1 className="font-serif text-4xl">Your Wishlist</h1>
          <p className="text-muted-foreground">{wishlist.items.length} {wishlist.items.length === 1 ? 'item' : 'items'}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-12">
          <AnimatePresence>
            {wishlist.items.map((item) => (
              <motion.div 
                key={item.productId}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="group relative flex flex-col"
              >
                <div className="relative aspect-[3/4] overflow-hidden bg-muted mb-4">
                  <img 
                    src={item.product.images?.[0] || "/attached_assets/generated_images/placeholder.jpg"} 
                    alt={item.product.name}
                    className="object-cover w-full h-full transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute top-4 right-4 z-20 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => handleRemove(item.productId)}
                      className="w-10 h-10 rounded-full bg-white text-destructive shadow-sm flex items-center justify-center hover:scale-110 transition-transform"
                      title="Remove"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                    <button 
                      onClick={() => handleAddToCart(item.productId)}
                      className="w-10 h-10 rounded-full bg-primary text-primary-foreground shadow-sm flex items-center justify-center hover:scale-110 transition-transform"
                      disabled={!item.product.inStock}
                      title={item.product.inStock ? "Add to bag" : "Out of stock"}
                    >
                      <ShoppingBag className="h-4 w-4" />
                    </button>
                  </div>
                  
                  {!item.product.inStock && (
                    <div className="absolute bottom-4 left-4 z-20 bg-background/90 backdrop-blur-sm px-3 py-1 text-xs font-medium uppercase tracking-wider">
                      Out of Stock
                    </div>
                  )}
                </div>
                
                <div className="space-y-1 flex-1">
                  <h3 className="font-serif text-xl hover:text-primary transition-colors">
                    <Link href={`/products/${item.productId}`}>{item.product.name}</Link>
                  </h3>
                  <div className="flex items-center gap-3 mt-2">
                    <p className="text-foreground tracking-wide">
                      ${item.product.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
