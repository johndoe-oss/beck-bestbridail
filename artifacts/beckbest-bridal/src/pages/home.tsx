import React from 'react';
import { Link } from 'wouter';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { useListFeaturedProducts } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { ProductGridSkeleton } from '@/components/ui/app-skeletons';
import { productSlug } from '@/lib/product-token';

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

export default function Home() {
  const { data: featuredProducts, isLoading } = useListFeaturedProducts();

  return (
    <motion.div 
      initial="hidden"
      animate="visible"
      variants={staggerContainer}
      className="flex flex-col"
    >
      {/* Hero Section */}
      <section className="relative h-[90vh] min-h-[600px] w-full flex items-center justify-center overflow-hidden bg-muted">
        <div className="absolute inset-0 z-0">
          <img 
            src="/attached_assets/generated_images/hero.jpg" 
            alt="Luxury bridal gown" 
            className="w-full h-full object-cover object-top opacity-90"
          />
          <div className="absolute inset-0 bg-black/20" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent opacity-80" />
        </div>
        
        <div className="container relative z-10 mx-auto px-4 text-center">
          <motion.div variants={staggerContainer} className="max-w-3xl mx-auto flex flex-col items-center">
            <motion.p variants={fadeIn} className="text-white/80 uppercase tracking-[0.3em] text-sm mb-6 font-medium">
              The Fall Collection
            </motion.p>
            <motion.h1 variants={fadeIn} className="font-serif text-5xl md:text-7xl lg:text-8xl text-white leading-tight mb-8 drop-shadow-sm">
              Elegance in Every <br className="hidden md:block"/> Thread
            </motion.h1>
            <motion.div variants={fadeIn}>
              <Button asChild size="lg" className="bg-white text-foreground hover:bg-white/90 rounded-none px-8 font-medium tracking-wide">
                <Link href="/products?category=dresses">
                  Discover the Collection
                </Link>
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex flex-col md:flex-row justify-between items-end mb-12">
            <motion.div variants={fadeIn} className="max-w-xl">
              <h2 className="font-serif text-3xl md:text-4xl mb-4">Curated Selections</h2>
              <p className="text-muted-foreground leading-relaxed">
                Explore our most coveted pieces, chosen for their unparalleled craftsmanship and timeless appeal.
              </p>
            </motion.div>
            <motion.div variants={fadeIn} className="mt-6 md:mt-0">
              <Link href="/products" className="group flex items-center gap-2 text-sm uppercase tracking-widest font-medium text-foreground hover:text-primary transition-colors">
                View All <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </motion.div>
          </div>

          {isLoading ? (
            <ProductGridSkeleton count={4} />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-12">
              {featuredProducts?.products?.slice(0, 4).map((product, i) => (
                <motion.div 
                  key={product.id}
                  variants={fadeIn}
                  custom={i}
                  className="group relative"
                >
                  <Link href={`/products/${productSlug(product.id, product.name)}`} className="block relative aspect-[3/4] overflow-hidden bg-muted mb-4">
                    <img 
                      src={product.images?.[0] || "/attached_assets/generated_images/placeholder.jpg"} 
                      alt={product.name}
                      loading="lazy"
                      className="object-cover w-full h-full transition-transform duration-700 group-hover:scale-105"
                    />
                    {product.images?.[1] && (
                      <img 
                        src={product.images[1]} 
                        alt={product.name}
                        loading="lazy"
                        className="absolute inset-0 object-cover w-full h-full opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                      />
                    )}
                  </Link>
                  <div className="space-y-1">
                    <h3 className="font-serif text-xl group-hover:text-primary transition-colors">
                      <Link href={`/products/${productSlug(product.id, product.name)}`}>{product.name}</Link>
                    </h3>
                    <p className="text-muted-foreground text-sm">{product.categoryName}</p>
                    <p className="text-foreground tracking-wide mt-2">
                      ${product.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Brand Story */}
      <section className="py-24 bg-muted relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none opacity-5 mix-blend-multiply" 
             style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/cubes.png")' }}></div>
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <motion.div variants={fadeIn} className="aspect-[4/5] relative overflow-hidden">
              <img 
                src="/attached_assets/generated_images/atelier.jpg" 
                alt="Beckbest Atelier" 
                className="w-full h-full object-cover"
              />
            </motion.div>
            <motion.div variants={fadeIn} className="max-w-lg md:pl-12">
              <p className="text-primary uppercase tracking-[0.2em] text-xs font-bold mb-4">The Atelier</p>
              <h2 className="font-serif text-4xl md:text-5xl leading-tight mb-6">
                Where Dreams <br/>Take Shape
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-6">
                At Beckbest Bridal, we believe finding your wedding dress should be as memorable as the day you wear it. Step into our hushed Parisian-inspired atelier, where silk meets lace, and every bride is the center of our universe.
              </p>
              <p className="text-muted-foreground leading-relaxed mb-8">
                Our curated collections feature the finest international designers alongside our bespoke in-house creations, designed for the modern romantic who appreciates subtle luxury and uncompromising quality.
              </p>
              <img src="/attached_assets/generated_images/placeholder.jpg" className="w-24 h-24 object-cover rounded-full mix-blend-darken grayscale opacity-70" alt="Signature" />
            </motion.div>
          </div>
        </div>
      </section>
      
      {/* Categories */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-4 md:px-6">
          <motion.div variants={fadeIn} className="text-center mb-16">
            <h2 className="font-serif text-3xl md:text-4xl">Shop by Category</h2>
          </motion.div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { title: "Gowns", image: "/attached_assets/generated_images/gown1.jpg", slug: "dresses" },
              { title: "Veils", image: "/attached_assets/generated_images/veil1.jpg", slug: "veils" },
              { title: "Accessories", image: "/attached_assets/generated_images/placeholder.jpg", slug: "accessories" },
            ].map((cat, i) => (
              <motion.div key={cat.title} variants={fadeIn} custom={i}>
                <Link href={`/products?category=${cat.slug}`} className="group block relative aspect-square overflow-hidden bg-muted">
                  <div className="absolute inset-0 bg-black/20 z-10 transition-colors duration-500 group-hover:bg-black/40" />
                  <img src={cat.image} alt={cat.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  <div className="absolute inset-0 z-20 flex items-center justify-center">
                    <h3 className="text-white font-serif text-3xl tracking-wide">{cat.title}</h3>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </motion.div>
  );
}
