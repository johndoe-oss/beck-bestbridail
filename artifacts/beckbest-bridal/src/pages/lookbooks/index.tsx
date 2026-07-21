import { useState } from 'react';
import { Link } from 'wouter';
import { useListLookbooks } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Heart, Share2, ChevronRight, X, BookOpen, Filter } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';

const LOOKBOOK_CATEGORIES = [
  { id: 'all', label: 'All Lookbooks', icon: '📖' },
  { id: 'wedding', label: 'Wedding', icon: '💒' },
  { id: 'bridal-shower', label: 'Bridal Shower', icon: '🎀' },
  { id: 'engagement', label: 'Engagement', icon: '💍' },
  { id: 'rehearsal-dinner', label: 'Rehearsal Dinner', icon: '🍽️' },
  { id: 'honeymoon', label: 'Honeymoon', icon: '🌴' },
  { id: 'custom', label: 'Custom', icon: '✨' },
];

export default function Lookbooks() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const { data: allData, isLoading: isAllLoading } = useListLookbooks();
  const { toast } = useToast();
  const { customerToken } = useAuth();

  // Client-side filtering since the generated API doesn't support category param
  const lookbooks = (allData?.lookbooks || []).filter(lb => {
    if (selectedCategory === 'all') return true;
    return (lb as any).category === selectedCategory;
  });
  const isLoading = isAllLoading;

  const handleWishlist = () => {
    if (!customerToken) {
      toast({ title: "Sign in required", description: "Please sign in to save to wishlist." });
      return;
    }
    toast({ title: "Saved to wishlist" });
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: 'Beckbest Bridal Lookbook', url: window.location.href });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast({ title: "Link copied", description: "Lookbook link copied to clipboard." });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative h-[50vh] min-h-[400px] sm:min-h-[500px] overflow-hidden">
        <img
          src="https://images.openai.com/static-rsc-4/2BKLVxfnPP2afGGSvKxWRWuITiWneJKTBXBBhxBHne7TbTfqdtIv9MR2igoBzUYughrOZRWqwhQOzs6P8EgNWYf4xEg97tzi_bAI3lGDnLIjV6pulmABSBN5Q8KSgJaU4_bV-BDTVLl9SE7AK1IsggczBCwqcB8bBuM46MbAWMG9hjxBs-wYpOaxyB9x1tcJ?purpose=fullsize"
          alt="Beckbest Bridal Lookbook Hero"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-black/40" />
        <div className="relative z-10 flex h-full items-center justify-center text-center text-white px-4">
          <div className="max-w-4xl mx-auto space-y-6">
            <h1 className="text-3xl sm:text-4xl md:text-6xl font-serif font-bold tracking-tight">
              The Beckbest Bridal Lookbook
            </h1>
            <p className="text-sm sm:text-base md:text-xl font-light tracking-wide max-w-2xl mx-auto">
              Explore our curated collections — from wedding gowns to bridal showers, 
              engagements to honeymoons. Flip through each booklet to discover your perfect look.
            </p>
            <div className="flex flex-wrap justify-center gap-3 pt-4">
              {LOOKBOOK_CATEGORIES.slice(0, 5).map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
                    selectedCategory === cat.id
                      ? 'bg-white text-black'
                      : 'bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm'
                  }`}
                >
                  <span className="mr-1.5">{cat.icon}</span>
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Category Navigation */}
      <section className="py-8 px-4 md:px-8 border-b border-border sticky top-0 z-30 bg-background/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
            <Filter className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            {LOOKBOOK_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium transition-all flex-shrink-0 ${
                  selectedCategory === cat.id
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {cat.icon} {cat.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Lookbook Booklets Grid */}
      <section className="py-16 px-4 md:px-8 max-w-7xl mx-auto">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-4">
                <Skeleton className="aspect-[3/4] w-full rounded-lg" />
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        ) : lookbooks.length === 0 ? (
          <div className="text-center py-20">
            <BookOpen className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-serif font-semibold text-foreground mb-2">No Lookbooks Found</h3>
            <p className="text-muted-foreground">
              {selectedCategory !== 'all'
                ? `No lookbooks available in the "${selectedCategory}" category yet.`
                : 'No lookbooks are available at this time.'}
            </p>
            {selectedCategory !== 'all' && (
              <Button variant="outline" className="mt-4" onClick={() => setSelectedCategory('all')}>
                View All Lookbooks
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-serif font-bold text-foreground">
                {selectedCategory === 'all'
                  ? 'All Collections'
                  : `${LOOKBOOK_CATEGORIES.find(c => c.id === selectedCategory)?.label || selectedCategory} Collections`}
              </h2>
              <Badge variant="outline" className="text-xs">
                {lookbooks.length} lookbook{lookbooks.length !== 1 ? 's' : ''}
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {lookbooks.map((lookbook) => (
                <Link key={lookbook.id} href={`/lookbooks/${lookbook.slug}`}>
                  <div className="group relative bg-card rounded-lg overflow-hidden border border-border hover:shadow-lg transition-all duration-300">
                    {/* Booklet Cover Image */}
                    <div className="relative aspect-[3/4] overflow-hidden bg-muted">
                      {lookbook.coverImage ? (
                        <img
                          src={lookbook.coverImage}
                          alt={lookbook.title}
                          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <BookOpen className="h-16 w-16 text-muted-foreground/40" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      
                      {/* Category Badge */}
                      <div className="absolute top-3 left-3">
                      <Badge variant="secondary" className="bg-white/90 text-black backdrop-blur-sm text-xs">
                          {LOOKBOOK_CATEGORIES.find(c => c.id === (lookbook as any).category)?.icon}{' '}
                          {LOOKBOOK_CATEGORIES.find(c => c.id === (lookbook as any).category)?.label || (lookbook as any).category}
                        </Badge>
                      </div>

                      {/* Quick Actions */}
                      <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleWishlist(); }}
                          className="bg-white/90 p-2 rounded-full shadow hover:bg-white transition-colors"
                        >
                          <Heart className="h-4 w-4 text-foreground" />
                        </button>
                        <button
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleShare(); }}
                          className="bg-white/90 p-2 rounded-full shadow hover:bg-white transition-colors"
                        >
                          <Share2 className="h-4 w-4 text-foreground" />
                        </button>
                      </div>

                      {/* Page Count Overlay */}
                      <div className="absolute bottom-3 left-3">
                        <Badge variant="outline" className="bg-black/50 text-white border-white/20 text-xs">
                          {lookbook.itemCount} page{lookbook.itemCount !== 1 ? 's' : ''}
                        </Badge>
                      </div>

                      {/* Open Booklet CTA */}
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <Button 
                          className="bg-white text-black hover:bg-white/90 shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300"
                          onClick={(e) => { e.preventDefault(); }}
                        >
                          <BookOpen className="mr-2 h-4 w-4" /> Open Booklet
                        </Button>
                      </div>
                    </div>

                    {/* Booklet Info */}
                    <div className="p-4 space-y-1">
                      <h3 className="font-serif font-semibold text-lg text-foreground group-hover:text-primary transition-colors line-clamp-1">
                        {lookbook.title}
                      </h3>
                      {lookbook.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {lookbook.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 pt-1">
                        <span className="text-xs text-muted-foreground">
                          {lookbook.itemCount} image{lookbook.itemCount !== 1 ? 's' : ''}
                        </span>
                        <ChevronRight className="h-3 w-3 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </section>

      {/* Image Viewer Modal */}
      {selectedImage && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
          <button
            onClick={() => setSelectedImage(null)}
            className="absolute top-4 right-4 text-white p-2"
          >
            <X className="h-8 w-8" />
          </button>
          <div className="relative max-w-5xl max-h-[90vh]">
            <img
              src={selectedImage}
              alt="Enlarged view"
              className="max-h-[85vh] max-w-full object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
}