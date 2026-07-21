import React, { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { productSlug } from '@/lib/product-token';
import { useListProducts, useListCategories } from '@workspace/api-client-react';
import { ProductGridSkeleton } from '@/components/ui/app-skeletons';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, Filter, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter, SheetClose } from '@/components/ui/sheet';

export default function Products() {
  const [location] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  
  const initialCategory = searchParams.get('category') || '';
  const initialSearch = searchParams.get('search') || '';
  
  const [category, setCategory] = useState(initialCategory);
  const [search, setSearch] = useState(initialSearch);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000]);
  
  const { data: categoryData } = useListCategories();
  
  // Debounce search/filter params
  const [debouncedParams, setDebouncedParams] = useState({ category, search, minPrice: priceRange[0], maxPrice: priceRange[1] });
  
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedParams({ category, search, minPrice: priceRange[0], maxPrice: priceRange[1] });
    }, 500);
    return () => clearTimeout(timer);
  }, [category, search, priceRange]);

  const { data, isLoading } = useListProducts({
    ...debouncedParams,
    category: debouncedParams.category || undefined,
    search: debouncedParams.search || undefined,
  });

  const clearFilters = () => {
    setCategory('');
    setSearch('');
    setPriceRange([0, 10000]);
  };

  return (
    <div className="bg-background min-h-screen">
      <div className="bg-muted py-12 md:py-20 mb-12">
        <div className="container mx-auto px-4 md:px-6 text-center">
          <h1 className="font-serif text-4xl md:text-5xl mb-4">
            {category ? `${category.charAt(0).toUpperCase() + category.slice(1)}` : 'All Collections'}
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Discover our curated selection of breathtaking bridal wear and accessories.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 md:px-6 pb-24">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Desktop Sidebar Filters */}
          <div className="hidden lg:block w-64 flex-shrink-0 space-y-10">
            <FilterSidebar 
              categories={categoryData?.categories || []}
              category={category}
              setCategory={setCategory}
              search={search}
              setSearch={setSearch}
              priceRange={priceRange}
              setPriceRange={setPriceRange}
              clearFilters={clearFilters}
            />
          </div>

          {/* Mobile Filters */}
          <div className="lg:hidden flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">
              {data?.total || 0} Products
            </p>
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Filter className="h-4 w-4" />
                  Filters
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] sm:w-[400px] overflow-y-auto">
                <SheetHeader className="mb-6">
                  <SheetTitle className="font-serif text-2xl">Filters</SheetTitle>
                </SheetHeader>
                <FilterSidebar 
                  categories={categoryData?.categories || []}
                  category={category}
                  setCategory={setCategory}
                  search={search}
                  setSearch={setSearch}
                  priceRange={priceRange}
                  setPriceRange={setPriceRange}
                  clearFilters={clearFilters}
                />
                <SheetFooter className="mt-8">
                  <SheetClose asChild>
                    <Button className="w-full">View Results</Button>
                  </SheetClose>
                </SheetFooter>
              </SheetContent>
            </Sheet>
          </div>

          {/* Product Grid */}
          <div className="flex-1">
            <div className="hidden lg:flex items-center justify-between mb-8">
              <p className="text-sm text-muted-foreground">
                Showing {data?.products.length || 0} of {data?.total || 0} results
              </p>
            </div>

            {isLoading ? (
              <ProductGridSkeleton count={8} />
            ) : data?.products.length === 0 ? (
              <div className="py-20 text-center flex flex-col items-center">
                <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center mb-6">
                  <Search className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="font-serif text-2xl mb-2">No products found</h3>
                <p className="text-muted-foreground mb-6">Try adjusting your filters or search terms.</p>
                <Button variant="outline" onClick={clearFilters}>Clear Filters</Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-x-6 gap-y-12">
                <AnimatePresence mode="popLayout">
                  {data?.products.map((product) => (
                    <motion.div 
                      key={product.id}
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.3 }}
                      className="group relative"
                    >
                      <Link href={`/products/${productSlug(product.id, product.name)}`} className="block relative aspect-[3/4] overflow-hidden bg-muted mb-4">
                        {!product.inStock && (
                          <div className="absolute top-4 left-4 z-20 bg-background/90 backdrop-blur-sm px-3 py-1 text-xs font-medium uppercase tracking-wider">
                            Out of Stock
                          </div>
                        )}
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
                        <div className="flex items-center gap-3 mt-2">
                          <p className="text-foreground tracking-wide font-medium">
                            ${product.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </p>
                          {product.compareAtPrice && (
                            <p className="text-muted-foreground line-through text-sm">
                              ${product.compareAtPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </p>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function FilterSidebar({
  categories,
  category,
  setCategory,
  search,
  setSearch,
  priceRange,
  setPriceRange,
  clearFilters
}: any) {
  return (
    <div className="space-y-10">
      <div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search collections..." 
            className="pl-9 bg-background"
          />
        </div>
      </div>

      <div>
        <h4 className="font-serif text-xl mb-4">Categories</h4>
        <div className="space-y-3">
          <div className="flex items-center space-x-3">
            <Checkbox 
              id="cat-all" 
              checked={category === ''}
              onCheckedChange={() => setCategory('')}
            />
            <Label htmlFor="cat-all" className="font-normal text-muted-foreground cursor-pointer">All Categories</Label>
          </div>
          {categories.map((c: any) => (
            <div key={c.id} className="flex items-center space-x-3">
              <Checkbox 
                id={`cat-${c.slug}`} 
                checked={category === c.slug}
                onCheckedChange={(checked) => setCategory(checked ? c.slug : '')}
              />
              <Label htmlFor={`cat-${c.slug}`} className="font-normal text-muted-foreground cursor-pointer">
                {c.name}
              </Label>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h4 className="font-serif text-xl mb-4">Price Range</h4>
        <div className="px-2">
          <Slider
            defaultValue={[0, 10000]}
            max={10000}
            step={100}
            value={[priceRange[0], priceRange[1]]}
            onValueChange={(val) => setPriceRange([val[0], val[1]])}
            className="mt-6 mb-4"
          />
          <div className="flex items-center justify-between text-sm text-muted-foreground mt-2">
            <span>${priceRange[0]}</span>
            <span>${priceRange[1] === 10000 ? '10,000+' : priceRange[1]}</span>
          </div>
        </div>
      </div>

      {(category !== '' || search !== '' || priceRange[0] !== 0 || priceRange[1] !== 10000) && (
        <Button variant="ghost" className="w-full text-muted-foreground" onClick={clearFilters}>
          <X className="h-4 w-4 mr-2" />
          Clear All Filters
        </Button>
      )}
    </div>
  );
}
