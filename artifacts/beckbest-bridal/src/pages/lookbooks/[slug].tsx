import { useState, useRef, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'wouter';
import { useGetLookbook } from '@workspace/api-client-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, RotateCw, ZoomIn, ZoomOut, Maximize2, Minimize2, ChevronLeft, ChevronRight, X, Heart, Share2, Palette, Play, ShoppingBag, Ruler, DollarSign } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';

type ViewMode = 'front' | 'back' | 'side' | 'detail';

export default function LookbookDetail() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const { data, isLoading } = useGetLookbook(slug || '');
  const { toast } = useToast();
  const { customerToken } = useAuth();

  const [currentPage, setCurrentPage] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>('front');
  const [showColors, setShowColors] = useState(false);
  const [showSizes, setShowSizes] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isPlayingVideo, setIsPlayingVideo] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const items = data?.items || [];
  const totalPages = items.length;
  const currentItem = items[currentPage];

  // 360° rotation simulation - generate rotation frames
  const rotationFrames = useCallback(() => {
    if (!currentItem?.imageUrl) return [];
    const frames: string[] = [];
    // In a real implementation, you'd have multiple images from different angles
    // For now, we simulate with the same image and CSS transform
    for (let i = 0; i < 36; i++) {
      frames.push(currentItem.imageUrl);
    }
    return frames;
  }, [currentItem?.imageUrl]);

  const handleAddToCart = () => {
    if (!customerToken) {
      toast({ title: "Sign in required", description: "Please sign in to add to cart." });
      return;
    }
    if (!currentItem?.productId && !(currentItem as any).price) {
      toast({ title: "Contact for pricing", description: "Please contact us for pricing and ordering." });
      return;
    }
    toast({ title: "Added to cart", description: currentItem?.caption || "Item added to your cart." });
  };

  const handleWishlist = () => {
    if (!customerToken) {
      toast({ title: "Sign in required", description: "Please sign in to save to wishlist." });
      return;
    }
    toast({ title: "Saved to wishlist" });
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: data?.title || 'Lookbook', url: window.location.href });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast({ title: "Link copied", description: "Lookbook link copied to clipboard." });
    }
  };

  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 0.25, 10));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 0.25, 0.5));

  const handleRotate = () => {
    setRotation(prev => (prev + 30) % 360);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoomLevel > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - imagePosition.x, y: e.clientY - imagePosition.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && zoomLevel > 1) {
      setImagePosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const toggleVideo = () => {
    if (!(currentItem as any).videoUrl) return;
    setIsPlayingVideo(!isPlayingVideo);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') setCurrentPage(prev => Math.max(0, prev - 1));
      if (e.key === 'ArrowRight') setCurrentPage(prev => Math.min(totalPages - 1, prev + 1));
      if (e.key === 'Escape') { setSelectedImage(null); setShowColors(false); }
      if (e.key === '+' || e.key === '=') handleZoomIn();
      if (e.key === '-') handleZoomOut();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [totalPages]);

  // Reset zoom/rotation when page changes
  useEffect(() => {
    setZoomLevel(1);
    setRotation(0);
    setViewMode('front');
    setImagePosition({ x: 0, y: 0 });
    setIsPlayingVideo(false);
    setShowColors(false);
    setShowSizes(false);
  }, [currentPage]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <Skeleton className="h-10 w-48 mb-6" />
          <Skeleton className="h-8 w-3/4 mb-4" />
          <Skeleton className="h-6 w-1/2 mb-8" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Skeleton className="aspect-[3/4] w-full rounded-xl" />
            <div className="space-y-4">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-12 w-full mt-8" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground text-lg mb-4">Lookbook not found.</p>
          <Link href="/lookbooks">
            <Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Lookbooks</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation Bar */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/lookbooks">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </Button>
            </Link>
            <div className="hidden sm:block">
              <h1 className="text-lg font-serif font-semibold truncate max-w-[300px]">{data.title}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {currentPage + 1} / {totalPages}
            </Badge>
            <Button variant="ghost" size="icon" onClick={handleShare} title="Share">
              <Share2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleWishlist} title="Save">
              <Heart className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Booklet Layout - Two Page Spread */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
          {/* Left Page - 360° Product Viewer */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">360° View</h2>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleZoomOut} title="Zoom Out">
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="text-xs text-muted-foreground w-8 text-center">{Math.round(zoomLevel * 100)}%</span>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleZoomIn} title="Zoom In">
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleRotate} title="Rotate">
                  <RotateCw className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={toggleFullscreen} title="Fullscreen">
                  {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {/* Main Image Container with 360° capabilities */}
            <div
              ref={containerRef}
              className="relative aspect-[3/4] bg-muted rounded-lg overflow-hidden cursor-grab active:cursor-grabbing group"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onClick={() => currentItem?.imageUrl && setSelectedImage(currentItem.imageUrl)}
            >
              {currentItem?.imageUrl ? (
                <img
                  src={currentItem.imageUrl}
                  alt={currentItem.caption || data.title}
                  className="w-full h-full object-cover transition-transform duration-200 select-none"
                  style={{
                    transform: `scale(${zoomLevel}) rotate(${rotation}deg) translate(${imagePosition.x}px, ${imagePosition.y}px)`,
                  }}
                  draggable={false}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                  No image available
                </div>
              )}

              {/* View Mode Overlay Buttons */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                {(['front', 'back', 'side', 'detail'] as ViewMode[]).map((mode) => (
                  <button
                    key={mode}
                    onClick={(e) => { e.stopPropagation(); setViewMode(mode); }}
                    className={`px-3 py-1.5 text-xs rounded-full backdrop-blur-sm transition-colors ${
                      viewMode === mode
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-black/50 text-white hover:bg-black/70'
                    }`}
                  >
                    {mode.charAt(0).toUpperCase() + mode.slice(1)}
                  </button>
                ))}
              </div>

              {/* Rotation indicator */}
              {rotation > 0 && (
                <div className="absolute top-4 right-4 bg-black/50 text-white text-xs px-2 py-1 rounded-full backdrop-blur-sm">
                  {rotation}°
                </div>
              )}
            </div>

            {/* Colors Palette */}
            {currentItem && (currentItem as any).colors && (currentItem as any).colors.length > 0 && (
              <div className="space-y-2">
                <button
                  onClick={() => setShowColors(!showColors)}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Palette className="h-4 w-4" />
                  <span>Available Colors ({(currentItem as any).colors.length})</span>
                  <ChevronRight className={`h-3 w-3 transition-transform ${showColors ? 'rotate-90' : ''}`} />
                </button>
                {showColors && (
                  <div className="flex flex-wrap gap-3 p-3 bg-muted/50 rounded-lg">
                    {(currentItem as any).colors.map((color: string, idx: number) => (
                      <div key={idx} className="text-center group cursor-pointer">
                        <div
                          className="w-10 h-10 rounded-full mx-auto mb-1 shadow-md border-2 border-white group-hover:scale-110 transition-transform"
                          style={{ backgroundColor: color }}
                        />
                    <p className="text-[10px] text-muted-foreground block truncate max-w-[60px]">{color}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Product Link */}
            {currentItem?.productId && (
              <Link href={`/products/${currentItem.productId}`}>
                <Button variant="outline" className="w-full rounded-none">
                  View Product Details
                </Button>
              </Link>
            )}
          </div>

          {/* Right Page - Lookbook Details */}
          <div className="space-y-6">
            <div>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-serif font-bold text-foreground">
                {currentItem?.caption || data.title}
              </h2>
              {data.description && (
                <p className="text-muted-foreground mt-2 leading-relaxed">{data.description}</p>
              )}
            </div>

            {/* Caption / Description */}
            {currentItem?.caption && (
              <div className="prose prose-sm max-w-none text-muted-foreground">
                <p>{currentItem.caption}</p>
              </div>
            )}

            {/* Thumbnail Strip for page navigation */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Browse Pages
              </h3>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {items.map((item, idx) => (
                  <button
                    key={item.id}
                    onClick={() => setCurrentPage(idx)}
                    className={`relative aspect-[3/4] rounded-md overflow-hidden border-2 transition-all ${
                      idx === currentPage
                        ? 'border-primary ring-2 ring-primary/20'
                        : 'border-transparent hover:border-muted-foreground/30'
                    }`}
                  >
                    <img
                      src={item.imageUrl}
                      alt={item.caption || `Page ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-1">
                      <span className="text-[10px] text-white font-medium">{idx + 1}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Page Navigation */}
            <div className="flex items-center justify-between gap-4 pt-4 border-t border-border">
              <Button
                variant="outline"
                onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                disabled={currentPage === 0}
                className="flex-1"
              >
                <ChevronLeft className="mr-2 h-4 w-4" /> Previous
              </Button>
              <span className="text-sm text-muted-foreground whitespace-nowrap">
                Page {currentPage + 1} of {totalPages}
              </span>
              <Button
                variant="outline"
                onClick={() => setCurrentPage(prev => Math.min(totalPages - 1, prev + 1))}
                disabled={currentPage === totalPages - 1}
                className="flex-1"
              >
                Next <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Fullscreen Image Modal */}
      {selectedImage && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center">
          <button
            onClick={() => setSelectedImage(null)}
            className="absolute top-4 right-4 text-white/80 hover:text-white p-2 z-10"
          >
            <X className="h-8 w-8" />
          </button>
          <div className="relative w-full h-full flex items-center justify-center p-4">
            <img
              src={selectedImage}
              alt="Enlarged view"
              className="max-h-[90vh] max-w-[90vw] object-contain"
              style={{
                transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
              }}
            />
          </div>
          {/* Controls overlay */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-black/50 backdrop-blur-sm rounded-full px-4 py-2">
            <button onClick={handleZoomOut} className="text-white/80 hover:text-white p-1">
              <ZoomOut className="h-5 w-5" />
            </button>
            <span className="text-white/80 text-xs w-8 text-center">{Math.round(zoomLevel * 100)}%</span>
            <button onClick={handleZoomIn} className="text-white/80 hover:text-white p-1">
              <ZoomIn className="h-5 w-5" />
            </button>
            <div className="w-px h-6 bg-white/20" />
            <button onClick={handleRotate} className="text-white/80 hover:text-white p-1">
              <RotateCw className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}