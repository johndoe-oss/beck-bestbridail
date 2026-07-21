import React, { useState } from 'react';
import { useLocation, Link } from 'wouter';
import { useGetCart, useCreateOrder, getGetCartQueryKey, getListMyOrdersQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Lock, CreditCard, ChevronLeft } from 'lucide-react';

export default function Checkout() {
  const [, setLocation] = useLocation();
  const { data: cart, isLoading } = useGetCart();
  const createOrder = useCreateOrder();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');

  // Redirect if cart is empty
  React.useEffect(() => {
    if (!isLoading && (!cart || cart.items.length === 0)) {
      setLocation('/cart');
    }
  }, [cart, isLoading, setLocation]);

  if (isLoading || !cart || cart.items.length === 0) return null;

  const handlePlaceOrder = () => {
    if (!address.trim()) {
      toast({ variant: "destructive", title: "Missing Information", description: "Please provide a shipping address." });
      return;
    }

    createOrder.mutate({ data: { shippingAddress: address, notes } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetCartQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListMyOrdersQueryKey() });
        toast({ title: "Order placed successfully!", description: "We'll send you an email confirmation shortly." });
        setLocation('/account');
      },
      onError: (err: any) => {
        toast({ variant: "destructive", title: "Checkout failed", description: err?.data?.message || "An error occurred." });
      }
    });
  };

  const tax = cart.total * 0.08; // Fake 8% tax
  const shipping = cart.total > 500 ? 0 : 25;
  const grandTotal = cart.total + tax + shipping;

  return (
    <div className="bg-background min-h-screen pb-24">
      <div className="container mx-auto px-4 md:px-6 py-12 md:py-16 max-w-6xl">
        
        <Link href="/cart" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6 sm:mb-8">
          <ChevronLeft className="h-4 w-4 mr-1" /> Return to Bag
        </Link>
        
        <h1 className="font-serif text-3xl sm:text-4xl mb-8 sm:mb-12 flex items-center gap-3">
          Checkout <Lock className="h-6 w-6 text-muted-foreground" />
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-24">
          
          {/* Form */}
          <div className="space-y-10 order-2 lg:order-1">
            
            <section>
              <h2 className="font-serif text-2xl mb-6 pb-2 border-b border-border">1. Shipping Information</h2>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="address">Full Shipping Address</Label>
                  <Textarea 
                    id="address" 
                    placeholder="Street address, City, State, ZIP..." 
                    className="min-h-[100px]"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Order Notes / Delivery Instructions (Optional)</Label>
                  <Textarea 
                    id="notes" 
                    placeholder="Any special instructions for us..." 
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>
            </section>

            <section>
              <h2 className="font-serif text-2xl mb-6 pb-2 border-b border-border">2. Payment Method</h2>
              <div className="bg-muted/30 p-6 border border-border rounded-md">
                <div className="flex items-center gap-3 mb-6">
                  <CreditCard className="h-5 w-5 text-primary" />
                  <span className="font-medium">Credit Card</span>
                </div>
                
                <div className="space-y-4 opacity-70">
                  <div className="space-y-2">
                    <Label>Card Number</Label>
                    <Input disabled value="**** **** **** 4242" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Expiry</Label>
                      <Input disabled value="12/25" />
                    </div>
                    <div className="space-y-2">
                      <Label>CVC</Label>
                      <Input disabled value="***" />
                    </div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-4 italic">
                  * This is a demonstration. Payment is bypassed for this demo.
                </p>
              </div>
            </section>

            <Button 
              size="lg" 
              className="w-full h-14 text-base tracking-wide rounded-none"
              onClick={handlePlaceOrder}
              disabled={createOrder.isPending}
            >
              {createOrder.isPending ? "Processing..." : `Pay $${grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
            </Button>
            
          </div>

          {/* Summary */}
          <div className="order-1 lg:order-2">
            <div className="bg-muted/30 p-8 rounded-lg sticky top-24 border border-border">
              <h2 className="font-serif text-2xl mb-6">Order Summary</h2>
              
              <div className="space-y-6 mb-8 max-h-[40vh] overflow-auto pr-2 scrollbar-hide">
                {cart.items.map(item => (
                  <div key={item.productId} className="flex gap-4">
                    <div className="w-16 h-20 bg-muted flex-shrink-0 relative">
                      <img src={item.productImage || "/attached_assets/generated_images/placeholder.jpg"} className="w-full h-full object-cover" />
                      <div className="absolute -top-2 -right-2 w-5 h-5 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center">
                        {item.quantity}
                      </div>
                    </div>
                    <div className="flex-1 py-1">
                      <h4 className="font-medium text-sm leading-tight">{item.productName}</h4>
                      <p className="text-muted-foreground text-sm mt-1">${item.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-4 text-sm border-t border-border pt-6 mb-6">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span>${cart.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Shipping</span>
                  <span>{shipping === 0 ? 'Complimentary' : `$${shipping.toFixed(2)}`}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Estimated Tax</span>
                  <span>${tax.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
              
              <div className="border-t border-border pt-6">
                <div className="flex justify-between items-end">
                  <span className="font-serif text-xl">Total</span>
                  <span className="text-2xl font-medium">${grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
