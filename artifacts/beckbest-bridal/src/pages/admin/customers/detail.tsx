import React from 'react';
import { useRoute, Link } from 'wouter';
import { useAdminGetCustomer, getAdminGetCustomerQueryKey } from '@workspace/api-client-react';
import { ChevronLeft, Mail, Phone, ShoppingBag, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

export default function AdminCustomerDetail() {
  const [, params] = useRoute('/bb-studio/customers/:id');
  const id = parseInt(params?.id || '0');

  const { data: customer, isLoading } = useAdminGetCustomer(id, { query: { enabled: !!id, queryKey: getAdminGetCustomerQueryKey(id) } });

  if (isLoading) {
    return <div className="p-8"><Skeleton className="w-full h-96" /></div>;
  }

  if (!customer) {
    return <div className="p-8 text-center text-muted-foreground">Customer not found</div>;
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/bb-studio/customers">
            <ChevronLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-3xl font-bold font-serif text-foreground">Customer Profile</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Profile Card */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-card p-6 rounded-md border border-border flex flex-col items-center text-center">
            <div className="h-20 w-20 bg-primary/10 rounded-full flex items-center justify-center text-primary font-serif text-2xl mb-4">
              {customer.firstName.charAt(0)}{customer.lastName.charAt(0)}
            </div>
            <h2 className="font-serif text-2xl font-bold">{customer.firstName} {customer.lastName}</h2>
            <div className="mt-2 mb-6">
              {customer.isVerified ? (
                <Badge variant="outline" className="bg-green-100 text-green-800 border-none">Verified Customer</Badge>
              ) : (
                <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-none">Unverified Email</Badge>
              )}
            </div>

            <div className="w-full space-y-4 text-sm text-left">
              <div className="flex items-start gap-3">
                <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
                <span className="text-foreground break-all">{customer.email}</span>
              </div>
              {customer.phone && (
                <div className="flex items-start gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <span className="text-foreground">{customer.phone}</span>
                </div>
              )}
              <div className="flex items-start gap-3">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                <span className="text-muted-foreground italic">No addresses saved</span>
              </div>
            </div>

            <div className="w-full pt-6 mt-6 border-t border-border">
              <p className="text-xs text-muted-foreground text-center">
                Customer since {format(new Date(customer.createdAt), 'MMMM d, yyyy')}
              </p>
            </div>
          </div>
        </div>

        {/* Stats & Activity */}
        <div className="md:col-span-2 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-card p-6 rounded-md border border-border">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <ShoppingBag className="h-4 w-4" />
                <span className="text-sm font-medium uppercase tracking-wider">Total Orders</span>
              </div>
              <div className="text-3xl font-serif">{customer.orderCount}</div>
            </div>
            <div className="bg-card p-6 rounded-md border border-border">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <ShoppingBag className="h-4 w-4" />
                <span className="text-sm font-medium uppercase tracking-wider">Total Spent</span>
              </div>
              <div className="text-3xl font-serif">
                ${customer.totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          <div className="bg-card p-6 rounded-md border border-border">
            <h3 className="font-serif text-xl mb-4">Recent Order Activity</h3>
            {customer.orderCount === 0 ? (
              <div className="py-8 text-center text-muted-foreground text-sm">
                No orders placed yet.
              </div>
            ) : (
              <div className="py-8 text-center text-muted-foreground text-sm italic">
                Orders summary would appear here.
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
