import React, { useState } from 'react';
import { useRoute, Link } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  useGetProduct, 
  useAddCartItem, 
  useAddToWishlist, 
  useGetWishlist,
  useListProducts,
  getGetCartQueryKey,
  getGetWishlistQueryKey,
  getGetProductQueryKey,
  getListProductsQueryKey
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Heart, Ruler, Truck, ChevronLeft, ChevronRight, Check, ShoppingBag } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { PurchaseModal } from '@/components/purchase-modal';
import { productIdFromSlug, productSlug } from '@/lib/product-token';

export default function ProductDetail() {
  const [, params] = useRoute('/products/:slug');
  // Decode the slug-based token back to the numeric DB ID
  const id = productIdFromSlug(params?.slug || '');
  
  const { data: product, isLoading } = useGetProduct(id, { query: { enabled: !!id, queryKey: getGetProductQueryKey(id) } });
  const { data: relatedData } = useListProducts(
    { category: product?.categoryName?.toLowerCase(), limit: 5 },
    { query: { enabled: !!product, queryKey: getListProductsQueryKey({ category: product?.categoryName?.toLowerCase(), limit: 5 }) } }
  );
  
  const [currentImageIdx, setCurrentImageIdx] = useState(0);
  const [purchaseModalOpen, setPurchaseModalOpen] = useState(false);
  const { customerToken } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: wishlist } = useGetWishlist({ query: { enabled: !!customerToken, queryKey: getGetWishlistQueryKey() } });
  const isInWishlist = wishlist?.items?.some(item => item.productId === id);
  
  const addToCart = useAddCartItem();
  const addToWishlist = useAddToWishlist();

  const handleAddToCart = () => {
    if (!customerToken) {
      toast({ title: "Please login", description: "You must be logged in to add items to your cart." });
      return;
    }
    
    addToCart.mutate({ data: { productId: id, quantity: 1 } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetCartQueryKey() });
        toast({ title: "Added to cart", description: `${product?.name} has been added to your bag.` });
      }
    });
  };

  const handleBuyNow = () => {
    if (!customerToken) {
      toast({ title: "Please login", description: "You must be logged in to purchase." });
      return;
    }
    setPurchaseModalOpen(true);
  };

  const handleToggleWishlist = () => {
    if (!customerToken) {
      toast({ title: "Please login", description: "You must be logged in to save items." });
      return;
    }
    
    if (isInWishlist) {
      toast({ title: "Already in wishlist", description: `${product?.name} is already in your wishlist.` });
    } else {
      addToWishlist.mutate({ data: { productId: id } }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetWishlistQueryKey() });
          toast({ title: "Saved", description: `${product?.name} has been saved to your wishlist.` });
        }
      });
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 md:px-6 py-12 md:py-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24">
          <div className="flex gap-4">
            <div className="w-20 hidden md:flex flex-col gap-4">
              <Skeleton className="w-20 h-28" />
              <Skeleton className="w-20 h-28" />
              <Skeleton className="w-20 h-28" />
            </div>
            <Skeleton className="flex-1 aspect-[3/4]" />
          </div>
          <div className="space-y-6 pt-10">
            <Skeleton className="w-1/4 h-4" />
            <Skeleton className="w-3/4 h-10" />
            <Skeleton className="w-1/3 h-6" />
            <Skeleton className="w-full h-px" />
            <Skeleton className="w-full h-32" />
            <Skeleton className="w-full h-12" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return <div className="py-32 text-center font-serif text-2xl">Product not found</div>;
  }

  const images = product.images?.length ? product.images : ["/attached_assets/generated_images/placeholder.jpg"];

  return (
    <div className="bg-background">
      <div className="container mx-auto px-4 md:px-6 py-8 md:py-16">
        
        {/* Breadcrumb */}
        <div className="text-sm text-muted-foreground mb-8 flex items-center gap-2">
          <Link href="/" className="hover:text-foreground">Home</Link>
          <span className="text-border">/</span>
          <Link href="/products" className="hover:text-foreground">Shop</Link>
          <span className="text-border">/</span>
          {product.categoryName && (
            <>
              <Link href={`/products?category=${product.categoryName.toLowerCase()}`} className="hover:text-foreground">
                {product.categoryName}
              </Link>
              <span className="text-border">/</span>
            </>
          )}
          <span className="text-foreground">{product.name}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20">
          
          {/* Gallery */}
          <div className="flex flex-col-reverse md:flex-row gap-4 lg:gap-6 lg:sticky lg:top-24 lg:self-start lg:h-[calc(100vh-8rem)]">
            {/* Thumbnails */}
            <div className="flex md:flex-col gap-4 overflow-auto scrollbar-hide py-2 md:py-0 w-full md:w-20 flex-shrink-0">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentImageIdx(idx)}
                  className={`relative w-16 sm:w-20 aspect-[3/4] flex-shrink-0 border-2 transition-all ${
                    idx === currentImageIdx ? 'border-primary opacity-100' : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={img} alt={`Thumbnail ${idx+1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>

            {/* Main Image */}
            <div className="relative flex-1 aspect-[3/4] md:aspect-auto bg-muted overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.img
                  key={currentImageIdx}
                  src={images[currentImageIdx]}
                  alt={product.name}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="w-full h-full object-cover"
                />
              </AnimatePresence>

              {images.length > 1 && (
                <>
                  <button 
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/50 backdrop-blur flex items-center justify-center hover:bg-white text-foreground transition-colors"
                    onClick={() => setCurrentImageIdx(i => i === 0 ? images.length - 1 : i - 1)}
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button 
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/50 backdrop-blur flex items-center justify-center hover:bg-white text-foreground transition-colors"
                    onClick={() => setCurrentImageIdx(i => i === images.length - 1 ? 0 : i + 1)}
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Product Info */}
          <div className="flex flex-col pt-4 lg:pt-10">
            <h1 className="font-serif text-2xl sm:text-3xl md:text-5xl mb-4 text-foreground">{product.name}</h1>
            
            <div className="flex items-center gap-4 mb-6">
              <span className="text-xl font-medium text-foreground">
                ${product.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
              {product.compareAtPrice && (
                <span className="text-lg text-muted-foreground line-through">
                  ${product.compareAtPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              )}
            </div>

            <div className="mb-8 prose prose-sm max-w-none text-muted-foreground whitespace-pre-line leading-relaxed">
              {product.description || "An exquisite piece crafted with uncompromising attention to detail."}
            </div>

            <div className="space-y-6 border-t border-b border-border py-8 mb-8">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${product.inStock ? 'bg-green-500' : 'bg-destructive'}`} />
                <span className="text-sm font-medium uppercase tracking-wider">
                  {product.inStock ? 'In Stock & Ready to Ship' : 'Made to Order - 12 Week Lead Time'}
                </span>
              </div>

              {product.categoryName?.toLowerCase() === 'dresses' && (
                <div className="bg-muted/50 p-4 flex items-start gap-4">
                  <Ruler className="h-5 w-5 mt-0.5 text-muted-foreground" />
                  <div>
                    <h4 className="font-medium mb-1 text-sm">Sizing Note</h4>
                    <p className="text-xs text-muted-foreground">Bridal sizing runs smaller than regular ready-to-wear. We recommend taking your measurements and consulting our size guide before ordering.</p>
                  </div>
                </div>
              )}

              {/* Primary CTA — Buy Now opens the purchase modal */}
              {product.inStock && (
                <Button
                  size="lg"
                  className="w-full rounded-none h-14 text-base font-medium tracking-wide uppercase gap-2"
                  onClick={handleBuyNow}
                >
                  <ShoppingBag className="h-5 w-5" />
                  Buy Now
                </Button>
              )}

              <div className="flex flex-col sm:flex-row gap-4">
                <Button 
                  variant="outline"
                  size="lg" 
                  className="flex-1 rounded-none h-12 text-sm font-medium tracking-wide uppercase"
                  disabled={addToCart.isPending || !product.inStock}
                  onClick={handleAddToCart}
                >
                  {addToCart.isPending ? "Adding..." : product.inStock ? "Add to Bag" : "Out of Stock"}
                </Button>
                <Button 
                  variant="outline" 
                  size="lg"
                  className="rounded-none h-12 w-full sm:w-12 px-0 border-border"
                  onClick={handleToggleWishlist}
                  disabled={addToWishlist.isPending}
                >
                  <Heart className={`h-5 w-5 ${isInWishlist ? 'fill-primary text-primary' : 'text-foreground'}`} />
                </Button>
              </div>
            </div>

            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="shipping" className="border-border">
                <AccordionTrigger className="text-base font-serif hover:no-underline py-4">Shipping & Returns</AccordionTrigger>
                <AccordionContent className="text-muted-foreground text-sm leading-relaxed">
                  <div className="space-y-4">
                    <p className="flex items-center gap-2"><Truck className="h-4 w-4"/> Free standard shipping on all orders over $500.</p>
                    <p>Standard items can be returned within 14 days of delivery. Made-to-order gowns and customized pieces are final sale and cannot be returned.</p>
                  </div>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="details" className="border-border">
                <AccordionTrigger className="text-base font-serif hover:no-underline py-4">Product Details</AccordionTrigger>
                <AccordionContent className="text-muted-foreground text-sm leading-relaxed">
                  <ul className="space-y-2">
                    <li className="flex gap-2"><Check className="h-4 w-4 mt-0.5"/> SKU: {product.sku || 'N/A'}</li>
                    <li className="flex gap-2"><Check className="h-4 w-4 mt-0.5"/> Category: {product.categoryName}</li>
                    <li className="flex gap-2"><Check className="h-4 w-4 mt-0.5"/> Designed in our Parisian atelier</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

          </div>
        </div>

        {/* Related Products */}
        {relatedData && relatedData.products.filter(p => p.id !== product.id).length > 0 && (
          <div className="mt-32">
            <h2 className="font-serif text-3xl mb-10 text-center">You May Also Love</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {relatedData.products.filter(p => p.id !== product.id).slice(0, 4).map((p) => (
                <div key={p.id} className="group relative">
                  <Link href={`/products/${productSlug(p.id, p.name)}`} className="block relative aspect-[3/4] overflow-hidden bg-muted mb-4">
                    <img 
                      src={p.images?.[0] || "/attached_assets/generated_images/placeholder.jpg"} 
                      alt={p.name}
                      className="object-cover w-full h-full transition-transform duration-700 group-hover:scale-105"
                    />
                  </Link>
                  <div className="space-y-1">
                    <h3 className="font-serif text-lg group-hover:text-primary transition-colors">
                      <Link href={`/products/${productSlug(p.id, p.name)}`}>{p.name}</Link>
                    </h3>
                    <p className="text-foreground tracking-wide mt-1">
                      ${p.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Purchase Modal — no cancel once open */}
      {product && (
        <PurchaseModal
          product={{
            id: product.id,
            name: product.name,
            price: product.price,
            compareAtPrice: product.compareAtPrice,
            images: product.images ?? [],
            inStock: product.inStock,
          }}
          isOpen={purchaseModalOpen}
          onClose={() => setPurchaseModalOpen(false)}
        />
      )}
    </div>
  );
}
