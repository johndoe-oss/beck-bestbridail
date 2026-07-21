import React, { Suspense, lazy } from 'react';
import { Route, Switch, Router as WouterRouter } from 'wouter';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AuthProvider } from '@/hooks/use-auth';
import { Protected } from '@/components/layout/protected-route';
import { PublicLayout } from '@/components/layout/public-layout';
import { Skeleton } from '@/components/ui/skeleton';

// ── Lightweight fallback for lazy route Suspense boundaries ─────────────
function PageSkeleton() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Skeleton className="h-64 w-full max-w-2xl rounded-sm" />
    </div>
  );
}

// ── Lazy-loaded pages for code splitting ──────────────────────────────
const Home = lazy(() => import('@/pages/home'));
const Products = lazy(() => import('@/pages/products/index'));
const ProductDetail = lazy(() => import('@/pages/products/detail'));
const Login = lazy(() => import('@/pages/auth/login'));
const Register = lazy(() => import('@/pages/auth/register'));
const VerifyEmail = lazy(() => import('@/pages/auth/verify-email'));
const ForgotPassword = lazy(() => import('@/pages/auth/forgot-password'));
const ResetPassword = lazy(() => import('@/pages/auth/reset-password'));
const PaymentVerify = lazy(() => import('@/pages/payment/verify'));
const Lookbooks = lazy(() => import('@/pages/lookbooks/index'));
const LookbookDetail = lazy(() => import('@/pages/lookbooks/[slug]'));

const Cart = lazy(() => import('@/pages/customer/cart'));
const Checkout = lazy(() => import('@/pages/customer/checkout'));
const Wishlist = lazy(() => import('@/pages/customer/wishlist'));
const Account = lazy(() => import('@/pages/customer/account'));

const AdminLogin = lazy(() => import('@/pages/admin/login'));
const Dashboard = lazy(() => import('@/pages/admin/dashboard'));
const AdminProducts = lazy(() => import('@/pages/admin/products/index'));
const AdminProductForm = lazy(() => import('@/pages/admin/products/form'));
const AdminCategories = lazy(() => import('@/pages/admin/categories'));
const AdminCustomers = lazy(() => import('@/pages/admin/customers/index'));
const AdminCustomerDetail = lazy(() => import('@/pages/admin/customers/detail'));
const AdminOrders = lazy(() => import('@/pages/admin/orders'));
const AdminNotifications = lazy(() => import('@/pages/admin/notifications'));
const AdminLookbooks = lazy(() => import('@/pages/admin/lookbooks/index'));
const AdminLookbookForm = lazy(() => import('@/pages/admin/lookbooks/form'));

const NotFound = lazy(() => import('@/pages/not-found'));

// ── Stable wrapper components (avoid inline arrows creating new refs every render) ──

// Stable edit-form component for the /bb-studio/:entity/:id routes
function AdminProductFormEdit() {
  return <AdminProductForm isEdit />;
}
function AdminLookbookFormEdit() {
  return <AdminLookbookForm isEdit />;
}

// ── QueryClient with caching tuned for a CMS-driven storefront ────────
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      // Products/categories/lookbooks are updated rarely — cache aggressively
      staleTime: 2 * 60 * 1000, // 2 minutes
      gcTime: 10 * 60 * 1000,   // 10 minutes (was cacheTime in v4)
    },
  },
});

function Router() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Switch>
        {/* ── Public Pages ──────────────────────────────────────── */}
        <Route path="/" component={() => <PublicLayout><Home /></PublicLayout>} />
        <Route path="/products" component={() => <PublicLayout><Products /></PublicLayout>} />
        <Route path="/products/:slug" component={() => <PublicLayout><ProductDetail /></PublicLayout>} />
        <Route path="/lookbooks" component={() => <PublicLayout><Lookbooks /></PublicLayout>} />
        <Route path="/lookbooks/:slug" component={() => <PublicLayout><LookbookDetail /></PublicLayout>} />
        <Route path="/login" component={() => <PublicLayout><Login /></PublicLayout>} />
        <Route path="/register" component={() => <PublicLayout><Register /></PublicLayout>} />
        <Route path="/verify-email" component={() => <PublicLayout><VerifyEmail /></PublicLayout>} />
        <Route path="/forgot-password" component={() => <PublicLayout><ForgotPassword /></PublicLayout>} />
        <Route path="/reset-password" component={() => <PublicLayout><ResetPassword /></PublicLayout>} />
        <Route path="/payment/verify" component={() => <PublicLayout><PaymentVerify /></PublicLayout>} />

        {/* ── Protected Customer Pages ──────────────────────────── */}
        <Route path="/cart" component={() => <Protected component={Cart} />} />
        <Route path="/checkout" component={() => <Protected component={Checkout} />} />
        <Route path="/wishlist" component={() => <Protected component={Wishlist} />} />
        <Route path="/account" component={() => <Protected component={Account} />} />

        {/* ── Admin Auth ────────────────────────────────────────── */}
        <Route path="/bb-studio/login" component={AdminLogin} />

        {/* ── Protected Admin Pages ─────────────────────────────── */}
        <Route path="/bb-studio/dashboard" component={() => <Protected component={Dashboard} adminOnly />} />
        <Route path="/bb-studio/products" component={() => <Protected component={AdminProducts} adminOnly />} />
        <Route path="/bb-studio/products/new" component={() => <Protected component={AdminProductForm} adminOnly />} />
        <Route path="/bb-studio/products/:id" component={() => <Protected component={AdminProductFormEdit} adminOnly />} />
        <Route path="/bb-studio/categories" component={() => <Protected component={AdminCategories} adminOnly />} />
        <Route path="/bb-studio/customers" component={() => <Protected component={AdminCustomers} adminOnly />} />
        <Route path="/bb-studio/customers/:id" component={() => <Protected component={AdminCustomerDetail} adminOnly />} />
        <Route path="/bb-studio/orders" component={() => <Protected component={AdminOrders} adminOnly />} />
        <Route path="/bb-studio/notifications" component={() => <Protected component={AdminNotifications} adminOnly />} />
        <Route path="/bb-studio/lookbooks" component={() => <Protected component={AdminLookbooks} adminOnly />} />
        <Route path="/bb-studio/lookbooks/new" component={() => <Protected component={AdminLookbookForm} adminOnly />} />
        <Route path="/bb-studio/lookbooks/:id" component={() => <Protected component={AdminLookbookFormEdit} adminOnly />} />

        {/* ── 404 ───────────────────────────────────────────────── */}
        <Route component={() => <PublicLayout><NotFound /></PublicLayout>} />
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
