import React, { useState, useEffect } from 'react';
import { useGetMe, useListMyOrders, useLogoutCustomer, useGetWishlist, getGetMeQueryKey, getListMyOrdersQueryKey, getGetWishlistQueryKey } from '@workspace/api-client-react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { LogOut, Package, User, MapPin, Heart, Eye } from 'lucide-react';
import { OrderListSkeleton } from '@/components/ui/app-skeletons';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { format } from 'date-fns';

export default function Account() {
  const { customerToken } = useAuth();
  const queryClient = useQueryClient();
  const authHeaders: Record<string, string> = customerToken ? { Authorization: `Bearer ${customerToken}` } : {};
  
  // Include the token in the query key so cached 401 results are never reused
  // once the user is authenticated. This guarantees a fresh fetch with the new token.
  const userQueryKey = ['getMe', customerToken];
  const ordersQueryKey = ['listMyOrders', customerToken];
  const wishlistQueryKey = ['getWishlist', customerToken];
  
  const { data: user, isLoading: isUserLoading, error: userError } = useGetMe({ 
    request: { headers: authHeaders },
    query: { queryKey: userQueryKey }
  });
  const { data: ordersData, isLoading: isOrdersLoading, error: ordersError } = useListMyOrders({ 
    request: { headers: authHeaders },
    query: { queryKey: ordersQueryKey }
  });
  const { data: wishlistData, isLoading: isWishlistLoading } = useGetWishlist({ 
    request: { headers: authHeaders },
    query: { queryKey: wishlistQueryKey }
  });
  const logout = useLogoutCustomer();
  const { setCustomerToken } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSettled: () => {
        setCustomerToken(null);
        toast({ title: "Logged out", description: "You have been successfully logged out." });
        setLocation("/");
      }
    });
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'processing': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'shipped': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'delivered': return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="bg-background min-h-screen pb-24">
      <div className="bg-muted py-12 md:py-16">
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
            <h1 className="font-serif text-3xl sm:text-4xl mb-2 text-foreground">My Account</h1>
              <p className="text-muted-foreground">
                {isUserLoading ? 'Loading...' : `Welcome back${user?.firstName ? `, ${user.firstName}` : ''}.`}
              </p>
            </div>
            <Button variant="outline" onClick={handleLogout} disabled={logout.isPending}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 md:px-6 max-w-5xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          
          {/* Profile Sidebar */}
          <div className="lg:col-span-1 space-y-8">
            <div className="bg-card border border-border p-6 rounded-lg">
              <h3 className="font-serif text-xl mb-6 flex items-center gap-2">
                <User className="h-5 w-5 text-primary" /> Profile Details
              </h3>
              
              {isUserLoading ? (
                <div className="space-y-4">
                  <div className="h-4 bg-muted rounded w-3/4 animate-pulse"></div>
                  <div className="h-4 bg-muted rounded w-1/2 animate-pulse"></div>
                  <div className="h-4 bg-muted rounded w-2/3 animate-pulse"></div>
                </div>
              ) : (
                <div className="space-y-4 text-sm">
                  <div>
                    <p className="text-muted-foreground mb-1">Name</p>
                    <p className="font-medium">{user?.firstName} {user?.lastName}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">Email</p>
                    <p className="font-medium">{user?.email}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">Phone</p>
                    <p className="font-medium">{user?.phone || 'Not provided'}</p>
                  </div>
                  <div className="pt-4 border-t border-border">
                    <Button variant="link" className="px-0 h-auto text-primary">Edit Profile</Button>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-muted/30 border border-border p-6 rounded-lg">
              <h3 className="font-serif text-xl mb-4 flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" /> Saved Addresses
              </h3>
              <p className="text-sm text-muted-foreground mb-4">No addresses saved yet.</p>
              <Button variant="outline" size="sm" className="w-full">Add New Address</Button>
            </div>
          </div>

          {/* Orders Main Area */}
          <div className="lg:col-span-2 space-y-8">
            {/* Recent Views */}
            <section>
            <h2 className="font-serif text-xl sm:text-2xl mb-6 flex items-center gap-2">
                <Eye className="h-5 w-5 text-primary" /> Recently Viewed
              </h2>
              <div className="text-center py-12 bg-muted/20 border border-border border-dashed rounded-lg">
                <Eye className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">Your recently viewed items will appear here.</p>
              </div>
            </section>

            {/* Items Bought Before / Wishlist */}
            <section>
            <h2 className="font-serif text-xl sm:text-2xl mb-6 flex items-center gap-2">
                <Heart className="h-5 w-5 text-primary" /> Wishlist & Saved Items
              </h2>
              {isWishlistLoading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="bg-muted animate-pulse rounded-lg h-48"></div>
                  ))}
                </div>
              ) : wishlistData?.items && wishlistData.items.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {wishlistData.items.map((item: any) => (
                    <div key={item.productId} className="bg-card border border-border rounded-lg overflow-hidden hover:shadow-lg transition-shadow cursor-pointer">
                      <div className="aspect-[3/4] bg-muted">
                        <img
                          src={(item.product.images && item.product.images[0]) || "https://images.unsplash.com/photo-1617114919297-3c8ddb01e599?w=400&h=600&fit=crop"}
                          className="w-full h-full object-cover"
                          alt={item.product.name}
                        />
                      </div>
                      <div className="p-3">
                        <p className="font-medium text-sm truncate">{item.product.name}</p>
                        <p className="text-primary font-semibold text-sm mt-1">
                          ${item.product.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-muted/20 border border-border border-dashed rounded-lg">
                  <Heart className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground text-sm mb-4">Save items you love to your wishlist.</p>
                  <Button variant="outline" size="sm" onClick={() => setLocation('/products')}>Browse Products</Button>
                </div>
              )}
            </section>

            {/* Order History */}
            <section>
            <h2 className="font-serif text-xl sm:text-2xl mb-8 flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" /> Order History
              </h2>

              {isOrdersLoading ? (
                <OrderListSkeleton count={3} />
              ) : ordersError ? (
                <div className="text-center py-12 bg-muted/20 border border-border border-dashed rounded-lg">
                  <Package className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                  <h3 className="font-serif text-xl mb-2">Unable to load orders</h3>
                  <p className="text-muted-foreground mb-4 text-sm">Please try again later.</p>
                  <Button variant="outline" onClick={() => setLocation('/account')}>Retry</Button>
                </div>
              ) : !ordersData?.orders || ordersData.orders.length === 0 ? (
                <div className="text-center py-16 bg-muted/20 border border-border border-dashed rounded-lg">
                  <Package className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                  <h3 className="font-serif text-xl mb-2">No orders yet</h3>
                  <p className="text-muted-foreground mb-6">When you place an order, it will appear here.</p>
                  <Button onClick={() => setLocation('/products')}>Start Shopping</Button>
                </div>
              ) : (
                <Accordion type="multiple" className="space-y-4">
                  {ordersData.orders.map((order) => (
                    <AccordionItem 
                      key={order.id} 
                      value={`order-${order.id}`} 
                      className="border border-border bg-card rounded-lg overflow-hidden"
                    >
                      <AccordionTrigger className="px-6 hover:no-underline hover:bg-muted/30">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between w-full pr-4 gap-4 text-left">
                          <div>
                            <p className="font-medium mb-1">Order #{order.id}</p>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(order.createdAt), 'MMMM d, yyyy')}
                            </p>
                          </div>
                          <div className="flex items-center justify-between sm:justify-end gap-6 sm:w-1/2">
                            <p className="font-medium text-lg">
                              ${order.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </p>
                            <Badge variant="outline" className={`${getStatusColor(order.status)} uppercase tracking-wider text-[10px]`}>
                              {order.status}
                            </Badge>
                          </div>
                        </div>
                      </AccordionTrigger>
                      
                      <AccordionContent className="px-6 pb-6 pt-2">
                        <div className="border-t border-border pt-6 mt-2">
                          <h4 className="text-sm font-medium uppercase tracking-wider text-muted-foreground mb-4">Items</h4>
                          <div className="space-y-4">
                            {order.items.map((item, idx) => (
                              <div key={idx} className="flex gap-4 items-center">
                                <div className="w-16 h-20 bg-muted flex-shrink-0">
                                  <img 
                          src={item.productImage || "https://images.unsplash.com/photo-1617114919297-3c8ddb01e599?w=100&h=150&fit=crop"} 
                                    className="w-full h-full object-cover" 
                                    alt={item.productName} 
                                  />
                                </div>
                                <div className="flex-1">
                                  <p className="font-medium text-sm">{item.productName}</p>
                                  <p className="text-muted-foreground text-sm mt-1">Qty: {item.quantity}</p>
                                </div>
                                <p className="font-medium text-sm">
                                  ${(item.priceAtTime * item.quantity).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </p>
                              </div>
                            ))}
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8 border-t border-border pt-6 text-sm">
                            <div>
                              <h4 className="font-medium uppercase tracking-wider text-muted-foreground mb-2">Shipping Address</h4>
                              <p className="whitespace-pre-line text-foreground/80">
                                {order.shippingAddress || "No address provided."}
                              </p>
                            </div>
                            <div>
                              <h4 className="font-medium uppercase tracking-wider text-muted-foreground mb-2">Order Summary</h4>
                              <div className="space-y-2 text-foreground/80">
                                <div className="flex justify-between">
                                  <span>Subtotal</span>
                                  <span>${(order.totalAmount - (order.totalAmount > 500 ? 0 : 25) - (order.totalAmount * 0.08)).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Shipping</span>
                                  <span>{order.totalAmount > 500 ? 'Complimentary' : '$25.00'}</span>
                                </div>
                                <div className="flex justify-between font-medium pt-2 border-t border-border/50 text-foreground">
                                  <span>Total</span>
                                  <span>${order.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              )}
            </section>
          </div>
          
        </div>
      </div>
    </div>
  );
}
