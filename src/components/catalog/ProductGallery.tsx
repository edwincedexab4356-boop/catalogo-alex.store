import React, { useState } from 'react';
import { Image as ImageIcon, ChevronLeft, ChevronRight } from 'lucide-react';

interface ProductGalleryProps {
  mainImageUrl?: string | null;
  images?: string[];
  productName: string;
}

export const ProductGallery: React.FC<ProductGalleryProps> = ({
  mainImageUrl,
  images = [],
  productName,
}) => {
  // Combine main image and additional gallery images, removing duplicates or empty values
  const allImages = React.useMemo(() => {
    const list: string[] = [];
    if (mainImageUrl) list.push(mainImageUrl);
    if (images && Array.isArray(images)) {
      images.forEach((img) => {
        if (img && !list.includes(img) && list.length < 4) {
          list.push(img);
        }
      });
    }
    return list.slice(0, 4);
  }, [mainImageUrl, images]);

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [imgError, setImgError] = useState<Record<number, boolean>>({});

  const currentImage = allImages[selectedIndex] || mainImageUrl || '';

  const handlePrev = () => {
    setSelectedIndex((prev) => (prev === 0 ? allImages.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setSelectedIndex((prev) => (prev === allImages.length - 1 ? 0 : prev + 1));
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Big Display Area */}
      <div className="relative aspect-square w-full rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center">
        {currentImage && !imgError[selectedIndex] ? (
          <img
            src={currentImage}
            alt={`${productName} - Vista ${selectedIndex + 1}`}
            onError={() => setImgError((prev) => ({ ...prev, [selectedIndex]: true }))}
            className="w-full h-full object-cover object-center transition-all duration-300"
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-slate-400 p-8 text-center">
            <ImageIcon className="w-16 h-16 stroke-[1.2] mb-3 opacity-40" />
            <span className="text-sm font-medium">Sin imagen disponible</span>
          </div>
        )}

        {/* Carousel controls if more than 1 image */}
        {allImages.length > 1 && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handlePrev();
              }}
              className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-slate-800 p-2 rounded-full shadow-lg backdrop-blur-sm transition-all"
              aria-label="Imagen anterior"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleNext();
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-slate-800 p-2 rounded-full shadow-lg backdrop-blur-sm transition-all"
              aria-label="Imagen siguiente"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            {/* Counter badge */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-slate-900/70 backdrop-blur-md text-white text-xs font-semibold px-3 py-1 rounded-full">
              {selectedIndex + 1} / {allImages.length}
            </div>
          </>
        )}
      </div>

      {/* Thumbnails row */}
      {allImages.length > 1 && (
        <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-thin">
          {allImages.map((img, idx) => (
            <button
              key={idx}
              onClick={() => setSelectedIndex(idx)}
              className={`relative shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                selectedIndex === idx
                  ? 'border-[#c5a059] ring-2 ring-[#c5a059]/30 shadow-md'
                  : 'border-transparent opacity-70 hover:opacity-100'
              }`}
            >
              <img
                src={img}
                alt={`Miniatura ${idx + 1}`}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
