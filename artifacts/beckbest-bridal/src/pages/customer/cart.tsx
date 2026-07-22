import React from 'react';
import { Link, useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  useGetCart, 
  useRemoveCartItem, 
  useUpdateCartItem,
  getGetCartQueryKey
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Trash2, Plus, Minus, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AppEmptyState } from '@/components/ui/app-empty-state';
import { CartSkeleton } from '@/components/ui/app-skeletons';
import { ShoppingBag } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function Cart() {
  const [, setLocation] = useLocation();
  const { data: cart, isLoading } = useGetCart();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const removeItem = useRemoveCartItem();
  const updateItem = useUpdateCartItem();

  const handleRemove = (productId: number) => {
    removeItem.mutate({ productId }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetCartQueryKey() });
        toast({ title: "Item removed", description: "The item has been removed from your bag." });
      }
    });
  };

  const handleUpdateQuantity = (productId: number, currentQty: number, delta: number) => {
    const newQty = currentQty + delta;
    if (newQty < 1) return;
    
    updateItem.mutate({ productId, data: { quantity: newQty } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetCartQueryKey() });
      }
    });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 md:px-6 py-12 md:py-24">
        <h1 className="font-serif text-4xl mb-12">Your Shopping Bag</h1>
        <CartSkeleton />
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <AppEmptyState 
        title="Your bag is empty"
        description="Looks like you haven't added anything to your bag yet."
        icon={ShoppingBag}
        actionLabel="Continue Shopping"
        actionHref="/products"
      />
    );
  }

  return (
    <div className="bg-background min-h-screen pb-24">
      <div className="container mx-auto px-4 md:px-6 py-12 md:py-16">
        <h1 className="font-serif text-3xl sm:text-4xl mb-8 sm:mb-12">Your Shopping Bag</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
          {/* Cart Items */}
          <div className="lg:col-span-2">
            <div className="border-b border-border pb-4 mb-6 hidden md:grid grid-cols-12 text-sm text-muted-foreground">
              <div className="col-span-6">Product</div>
              <div className="col-span-3 text-center">Quantity</div>
              <div className="col-span-3 text-right">Total</div>
            </div>

            <div className="space-y-8">
              <AnimatePresence>
                {cart.items.map((item) => (
                  <motion.div 
                    key={item.productId}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
                    className="flex flex-col sm:flex-row md:grid md:grid-cols-12 gap-6 items-center border-b border-border pb-8"
                  >
                    {/* Product Info */}
                    <div className="col-span-6 flex items-center gap-6 w-full sm:w-auto">
                      <Link href={`/products/${item.productId}`} className="w-24 aspect-[3/4] bg-muted flex-shrink-0 block">
                        <img 
                          src={item.productImage || "https://images.unsplash.com/photo-1617114919297-3c8ddb01e599?w=150&h=225&fit=crop"} 
                          alt={item.productName} 
                          className="w-full h-full object-cover"
                        />
                      </Link>
                      <div className="flex-1">
                        <h3 className="font-serif text-xl hover:text-primary transition-colors mb-2">
                          <Link href={`/products/${item.productId}`}>{item.productName}</Link>
                        </h3>
                        <p className="text-muted-foreground">${item.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                      </div>
                    </div>

                    {/* Quantity */}
                    <div className="col-span-3 flex items-center justify-between sm:justify-center w-full sm:w-auto border border-border sm:border-none p-2 sm:p-0">
                      <span className="sm:hidden text-sm text-muted-foreground">Quantity:</span>
                      <div className="flex items-center border border-border rounded-sm h-10 w-28">
                        <button 
                          className="w-8 h-full flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50"
                          onClick={() => handleUpdateQuantity(item.productId, item.quantity, -1)}
                          disabled={item.quantity <= 1 || updateItem.isPending}
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="flex-1 text-center text-sm">{item.quantity}</span>
                        <button 
                          className="w-8 h-full flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50"
                          onClick={() => handleUpdateQuantity(item.productId, item.quantity, 1)}
                          disabled={updateItem.isPending}
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                    </div>

                    {/* Total & Remove */}
                    <div className="col-span-3 flex items-center justify-between sm:justify-end w-full sm:w-auto gap-4">
                      <span className="sm:hidden text-sm text-muted-foreground">Total:</span>
                      <p className="font-medium text-lg">${(item.price * item.quantity).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                      <button 
                        className="text-muted-foreground hover:text-destructive transition-colors ml-4"
                        onClick={() => handleRemove(item.productId)}
                        disabled={removeItem.isPending}
                        title="Remove item"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-muted/30 p-6 sm:p-8 rounded-lg sticky top-24 border border-border">
              <h2 className="font-serif text-2xl mb-6">Order Summary</h2>
              
              <div className="space-y-4 text-sm mb-6">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal ({cart.itemCount} items)</span>
                  <span>${cart.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Shipping</span>
                  <span>Calculated at checkout</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Taxes</span>
                  <span>Calculated at checkout</span>
                </div>
              </div>
              
              <div className="border-t border-border pt-6 mb-8">
                <div className="flex justify-between items-end">
                  <span className="font-serif text-xl">Estimated Total</span>
                  <span className="text-2xl font-medium">${cart.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              <Button 
                size="lg" 
                className="w-full h-14 text-base tracking-wide rounded-none group"
                onClick={() => setLocation('/checkout')}
              >
                Proceed to Checkout
                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Button>

              <div className="mt-6 text-center text-xs text-muted-foreground space-y-2">
                <p>Secure checkout powered by Stripe.</p>
                <p>Complimentary shipping on orders over $500.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
