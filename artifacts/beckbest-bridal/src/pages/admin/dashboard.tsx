import React from 'react';
import { useGetAdminStats } from '@workspace/api-client-react';
import { Package, Users, ShoppingCart, DollarSign, ArrowUpRight, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

export default function Dashboard() {
  const { data: stats, isLoading } = useGetAdminStats();

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100';
      case 'processing': return 'bg-blue-100 text-blue-800 hover:bg-blue-100';
      case 'shipped': return 'bg-purple-100 text-purple-800 hover:bg-purple-100';
      case 'delivered': return 'bg-green-100 text-green-800 hover:bg-green-100';
      case 'cancelled': return 'bg-red-100 text-red-800 hover:bg-red-100';
      default: return 'bg-gray-100 text-gray-800 hover:bg-gray-100';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-8">
        <h1 className="text-3xl font-bold font-serif">Overview</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Skeleton className="lg:col-span-2 h-[400px]" />
          <Skeleton className="lg:col-span-1 h-[400px]" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold font-serif text-foreground">Overview</h1>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              ${stats?.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">+12% from last month</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stats?.totalOrders}</div>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 text-xs px-1.5 font-normal">
                {stats?.pendingOrders} Pending
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stats?.totalCustomers}</div>
            <p className="text-xs text-muted-foreground mt-1">+4 new this week</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stats?.totalProducts}</div>
            <p className="text-xs text-muted-foreground mt-1">Across all collections</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Orders */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Orders</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats?.recentOrders?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No recent orders
                    </TableCell>
                  </TableRow>
                ) : (
                  stats?.recentOrders?.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">#{order.id}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span>{order.customerName}</span>
                          <span className="text-xs text-muted-foreground">{order.customerEmail}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(order.createdAt), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell>${order.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`border-none ${getStatusColor(order.status)}`}>
                          {order.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Top Products */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Top Performing Products</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {stats?.topProducts?.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">No data available</div>
              ) : (
                stats?.topProducts?.map((product, idx) => (
                  <div key={product.productId} className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                        {idx + 1}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-medium text-sm line-clamp-1 max-w-[150px]">{product.productName}</span>
                        <span className="text-xs text-muted-foreground">{product.orderCount} sales</span>
                      </div>
                    </div>
                    <div className="font-medium text-sm">
                      ${product.revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
