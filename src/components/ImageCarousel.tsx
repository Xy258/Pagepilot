import React from 'react';

interface ImageCarouselProps {
  images: string[];
}

const placeholderImage = 'https://via.placeholder.com/64?text=No+Image';

const ImageCarousel: React.FC<ImageCarouselProps> = ({ images }) => {
  if (!images || images.length === 0) {
    return (
      <div className="text-xs text-stone-400 dark:text-stone-600 italic">
        No images available
      </div>
    );
  }

  return (
    <div className="flex space-x-2 overflow-x-auto py-1">
      {images.map((src, idx) => (
        <img
          key={idx}
          src={src}
          alt={`Product image ${idx + 1}`}
          className="w-16 h-16 object-cover rounded-xl border border-stone-200 dark:border-stone-700"
          onError={(e) => {
            const target = e.currentTarget as HTMLImageElement;
            target.src = placeholderImage;
          }}
        />
      ))}
    </div>
  );
};

export default ImageCarousel;
