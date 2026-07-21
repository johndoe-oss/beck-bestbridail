import React from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useAdminLogout, useGetAdminMe } from "@workspace/api-client-react";
import { 
  LayoutDashboard, 
  Package, 
  Tags, 
  Users, 
  ShoppingCart, 
  Send,
  LogOut,
  Settings,
  BookOpen
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const { setAdminToken } = useAuth();
  const logout = useAdminLogout();
  const { data: admin } = useGetAdminMe();

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSettled: () => {
        setAdminToken(null);
        setLocation("/bb-studio/login");
      }
    });
  };

  const navItems = [
    { label: "Dashboard", href: "/bb-studio/dashboard", icon: LayoutDashboard },
    { label: "Orders", href: "/bb-studio/orders", icon: ShoppingCart },
    { label: "Products", href: "/bb-studio/products", icon: Package },
    { label: "Categories", href: "/bb-studio/categories", icon: Tags },
    { label: "Customers", href: "/bb-studio/customers", icon: Users },
    { label: "Lookbooks", href: "/bb-studio/lookbooks", icon: BookOpen },
    { label: "Notifications", href: "/bb-studio/notifications", icon: Send },
  ];

  return (
    <div className="flex min-h-[100dvh] w-full bg-muted/30">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 border-r border-border bg-card flex flex-col hidden md:flex">
        <div className="h-16 flex items-center px-6 border-b border-border">
          <Link href="/bb-studio/dashboard" className="font-serif text-xl font-bold uppercase tracking-wider text-primary">
            BB Studio
          </Link>
        </div>
        
        <div className="flex-1 overflow-auto py-6">
          <nav className="flex flex-col gap-1 px-4">
            {navItems.map((item) => {
              const isActive = location === item.href || location.startsWith(item.href + "/");
              return (
                <Link key={item.href} href={item.href}>
                  <div className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors ${
                    isActive 
                      ? "bg-primary/10 text-primary font-medium" 
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}>
                    <item.icon className={`h-4 w-4 ${isActive ? "text-primary" : ""}`} />
                    {item.label}
                  </div>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-medium text-xs">
              {admin?.name?.charAt(0) || "A"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{admin?.name || "Admin"}</p>
              <p className="text-xs text-muted-foreground truncate">{admin?.email || ""}</p>
            </div>
          </div>
          <Button variant="outline" className="w-full justify-start text-muted-foreground" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 flex-shrink-0 border-b border-border bg-card flex items-center px-6 justify-between md:justify-end">
          <div className="md:hidden">
            <Link href="/bb-studio/dashboard" className="font-serif text-xl font-bold uppercase tracking-wider text-primary">
              BB Studio
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="text-muted-foreground">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </header>
        <div className="flex-1 overflow-auto p-6 md:p-8">
          <div className="mx-auto max-w-6xl">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
