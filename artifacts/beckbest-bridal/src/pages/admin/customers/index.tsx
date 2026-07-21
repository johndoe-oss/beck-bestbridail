import React from 'react';
import { useAdminListCustomers } from '@workspace/api-client-react';
import { Link } from 'wouter';
import { Search, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

export default function AdminCustomers() {
  const [searchTerm, setSearchTerm] = React.useState('');
  const { data, isLoading } = useAdminListCustomers({ search: searchTerm || undefined });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold font-serif text-foreground">Customers</h1>
      </div>

      <div className="flex items-center gap-2 max-w-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search by name or email..." 
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
              <TableHead>Customer</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead className="text-right">Orders</TableHead>
              <TableHead className="text-right">Total Spent</TableHead>
              <TableHead>Registered</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-32 mb-1" /><Skeleton className="h-3 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-4 w-8 ml-auto" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : data?.customers?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                  No customers found.
                </TableCell>
              </TableRow>
            ) : (
              data?.customers?.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell>
                    <p className="font-medium">{customer.firstName} {customer.lastName}</p>
                    <p className="text-xs text-muted-foreground">{customer.email}</p>
                  </TableCell>
                  <TableCell>
                    {customer.isVerified ? (
                      <Badge variant="outline" className="bg-green-100 text-green-800 border-none text-[10px]">Verified</Badge>
                    ) : (
                      <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-none text-[10px]">Pending</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{customer.phone || '-'}</TableCell>
                  <TableCell className="text-right">{customer.orderCount}</TableCell>
                  <TableCell className="text-right font-medium">
                    ${customer.totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {format(new Date(customer.createdAt), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" asChild>
                      <Link href={`/bb-studio/customers/${customer.id}`}>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </Link>
                    </Button>
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
