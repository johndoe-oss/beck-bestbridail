import React from 'react';
import { useAdminListOrders, useAdminUpdateOrder, getAdminListOrdersQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Filter } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from '@/components/ui/button';

const ORDER_STATUSES = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];

export default function AdminOrders() {
  const [statusFilter, setStatusFilter] = React.useState<string>('all');
  
  const { data, isLoading } = useAdminListOrders({
    status: statusFilter !== 'all' ? statusFilter : undefined
  });
  
  const updateMutation = useAdminUpdateOrder();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleStatusChange = (id: number, status: string) => {
    updateMutation.mutate({ id, data: { status } }, {
      onSuccess: () => {
        // Optimistic update logic
        queryClient.setQueryData(
          getAdminListOrdersQueryKey({ status: statusFilter !== 'all' ? statusFilter : undefined }), 
          (old: any) => {
            if (!old) return old;
            return {
              ...old,
              orders: old.orders.map((o: any) => o.id === id ? { ...o, status } : o)
            };
          }
        );
        toast({ title: "Status updated", description: `Order #${id} is now ${status}.` });
      },
      onError: (err: any) => {
        toast({ variant: "destructive", title: "Error", description: err?.data?.message || "Failed to update status." });
      }
    });
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-none';
      case 'processing': return 'bg-blue-100 text-blue-800 border-none';
      case 'shipped': return 'bg-purple-100 text-purple-800 border-none';
      case 'delivered': return 'bg-green-100 text-green-800 border-none';
      case 'cancelled': return 'bg-red-100 text-red-800 border-none';
      default: return 'bg-gray-100 text-gray-800 border-none';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold font-serif text-foreground">Orders</h1>
      </div>

      <div className="flex items-center gap-2 max-w-sm">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Filter className="h-4 w-4" /> Filter by Status:
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px] bg-card">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Orders</SelectItem>
            {ORDER_STATUSES.map(s => (
              <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="bg-card rounded-md border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order ID</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32 mb-1" /><Skeleton className="h-3 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : data?.orders?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                  No orders found.
                </TableCell>
              </TableRow>
            ) : (
              data?.orders?.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">#{order.id}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {format(new Date(order.createdAt), 'MMM d, yyyy h:mm a')}
                  </TableCell>
                  <TableCell>
                    <p className="font-medium">{order.customerName}</p>
                    <p className="text-xs text-muted-foreground">{order.customerEmail}</p>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{order.items.length} items</TableCell>
                  <TableCell className="font-medium">
                    ${order.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`uppercase tracking-wider text-[10px] ${getStatusColor(order.status)}`}>
                      {order.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" disabled={updateMutation.isPending}>
                          Update Status
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Set Status To</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {ORDER_STATUSES.map(status => (
                          <DropdownMenuItem 
                            key={status} 
                            onClick={() => handleStatusChange(order.id, status)}
                            disabled={order.status === status}
                            className="capitalize"
                          >
                            {status}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
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
