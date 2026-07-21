import React, { memo } from "react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Heart, ShoppingBag, User, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[100dvh] flex flex-col bg-background selection:bg-primary/20 selection:text-primary">
      <Navbar />
      <main className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  );
}

const Navbar = memo(function Navbar() {
  const { customerToken } = useAuth();
  
  const navLinks = [
    { label: "Lookbooks", href: "/lookbooks" },
    { label: "Collections", href: "/products?category=dresses" },
    { label: "Accessories", href: "/products?category=accessories" },
    { label: "Shop All", href: "/products" },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-md">
      <div className="container mx-auto px-4 md:px-6 h-20 flex items-center justify-between">
        {/* Mobile Nav */}
        <div className="md:hidden flex items-center">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[300px] sm:w-[400px]">
              <nav className="flex flex-col gap-6 mt-10">
                <Link href="/" className="font-serif text-2xl tracking-widest uppercase mb-4">
                  BECKBEST
                </Link>
                {navLinks.map((link) => (
                  <Link key={link.href} href={link.href} className="text-lg text-muted-foreground hover:text-foreground transition-colors">
                    {link.label}
                  </Link>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
        </div>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-8 w-1/3">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} className="text-sm uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors">
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Logo */}
        <div className="flex justify-center w-1/3">
          <Link href="/" className="font-serif text-3xl md:text-4xl tracking-widest uppercase font-semibold">
            Beckbest
          </Link>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 md:gap-4 w-1/3">
          <Button variant="ghost" size="icon" asChild>
            <Link href={customerToken ? "/account" : "/login"}>
              <User className="h-5 w-5 font-light" />
              <span className="sr-only">Account</span>
            </Link>
          </Button>
          <Button variant="ghost" size="icon" asChild>
            <Link href="/wishlist">
              <Heart className="h-5 w-5 font-light" />
              <span className="sr-only">Wishlist</span>
            </Link>
          </Button>
          <Button variant="ghost" size="icon" asChild>
            <Link href="/cart">
              <ShoppingBag className="h-5 w-5 font-light" />
              <span className="sr-only">Cart</span>
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
});

const Footer = memo(function Footer() {
  return (
    <footer className="bg-muted text-muted-foreground border-t border-border pt-16 pb-8">
      <div className="container mx-auto px-4 md:px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          <div className="col-span-1 md:col-span-1">
            <Link href="/" className="font-serif text-2xl tracking-widest uppercase text-foreground mb-6 block">
              Beckbest
            </Link>
            <p className="text-sm leading-relaxed max-w-xs">
              A curated destination for the modern romantic. Exquisite bridal gowns, veils, and accessories crafted with uncompromising attention to detail.
            </p>
          </div>
          
          <div>
            <h4 className="font-serif text-lg text-foreground mb-4">Shop</h4>
            <ul className="space-y-3 text-sm">
              <li><Link href="/products?category=dresses" className="hover:text-foreground transition-colors">Gowns</Link></li>
              <li><Link href="/products?category=accessories" className="hover:text-foreground transition-colors">Accessories</Link></li>
              <li><Link href="/products?category=veils" className="hover:text-foreground transition-colors">Veils</Link></li>
              <li><Link href="/products" className="hover:text-foreground transition-colors">All Collections</Link></li>
              <li><Link href="/lookbooks" className="hover:text-foreground transition-colors">Lookbooks</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-serif text-lg text-foreground mb-4">Support</h4>
            <ul className="space-y-3 text-sm">
              <li><Link href="/faq" className="hover:text-foreground transition-colors">FAQ & Shipping</Link></li>
              <li><Link href="/returns" className="hover:text-foreground transition-colors">Returns</Link></li>
              <li><Link href="/sizing" className="hover:text-foreground transition-colors">Sizing Guide</Link></li>
              <li><Link href="/contact" className="hover:text-foreground transition-colors">Contact Us</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-serif text-lg text-foreground mb-4">Connect</h4>
            <ul className="space-y-3 text-sm">
              <li><a href="#" className="hover:text-foreground transition-colors">Instagram</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">Pinterest</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">TikTok</a></li>
            </ul>
          </div>
        </div>
        
        <div className="flex flex-col md:flex-row justify-between items-center border-t border-border/50 pt-8 text-xs text-muted-foreground/70">
          <p>&copy; {new Date().getFullYear()} Beckbest Bridal. All rights reserved.</p>
          <div className="flex gap-4 mt-4 md:mt-0">
            <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
});
