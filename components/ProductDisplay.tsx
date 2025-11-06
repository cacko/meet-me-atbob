import React from 'react';
import { Product } from '../types';

interface ProductDisplayProps {
  products: Product[];
  onSelectProduct: (product: Product) => void;
  selectedProduct: Product | null;
}

export const ProductDisplay: React.FC<ProductDisplayProps> = ({ products, onSelectProduct, selectedProduct }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {products.map((product, index) => {
        const isSelected = selectedProduct?.name === product.name;
        return (
          <div
            key={index}
            className={`relative bg-bg-light p-4 rounded-md shadow-inner border cursor-pointer
                        flex justify-between items-center transition-all duration-300 ease-in-out
                        ${isSelected
                          ? 'border-secondary ring-2 ring-secondary transform scale-105 pr-14'
                          : 'hover:border-secondary hover:scale-[1.02]'
                        }`}
            onClick={() => onSelectProduct(product)}
            role="radio"
            aria-checked={isSelected}
            tabIndex={0}
          >
            <span className="text-text-base text-lg md:text-xl font-sans">{product.name}</span>
            <span className="text-primary text-xl md:text-2xl font-bold">
              £{product.price.toFixed(2)}
            </span>
            
            {isSelected && (
              <div className="absolute top-1/2 right-4 -translate-y-1/2 text-secondary animate-pop-in">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};