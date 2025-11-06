import React, { useEffect, useRef } from 'react';
import { RegistrationForm, Theme } from '../types';

// Declare Chart on window object from CDN
declare global {
  interface Window {
    Chart: any;
  }
}

interface ProductPieChartProps {
  registrations: RegistrationForm[];
  theme: Theme;
}


export const ProductPieChart: React.FC<ProductPieChartProps> = ({ registrations, theme }) => {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstanceRef = useRef<any>(null); // To hold the chart instance

  useEffect(() => {
    if (!registrations || registrations.length === 0 || !chartRef.current || !window.Chart || !theme) {
      return;
    }

    // 1. Aggregate product data
    const productCounts: { [key: string]: number } = {};
    registrations.forEach(reg => {
      if (reg.selectedProduct) {
        productCounts[reg.selectedProduct.name] = (productCounts[reg.selectedProduct.name] || 0) + 1;
      }
    });

    const labels = Object.keys(productCounts);
    const data = Object.values(productCounts);

    // If no products selected across all users, don't render chart
    if (labels.length === 0) {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }
      return;
    }

    // 2. Destroy previous chart instance before creating a new one
    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }

    // 3. Create new chart
    const ctx = chartRef.current.getContext('2d');
    if (ctx) {
      chartInstanceRef.current = new window.Chart(ctx, {
        type: 'pie',
        data: {
          labels: labels,
          datasets: [{
            label: 'Drink Preferences',
            data: data,
            backgroundColor: theme.chartColors.slice(0, labels.length),
            borderColor: theme.colors.bgLight, 
            borderWidth: 2,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'top',
              labels: {
                color: theme.colors.textBase,
                font: {
                  family: theme.fonts.sans,
                  size: 14,
                },
              },
            },
            title: {
              display: true,
              text: 'Drink Preferences',
              color: theme.colors.primary,
              font: {
                family: theme.fonts.heading,
                size: 20,
              },
              padding: {
                top: 10,
                bottom: 20
              }
            },
            tooltip: {
              bodyFont: {
                family: theme.fonts.sans,
              },
              titleFont: {
                family: theme.fonts.heading,
              },
              backgroundColor: theme.colors.bgDark,
              titleColor: theme.colors.textInverse,
              bodyColor: theme.colors.textInverse,
              borderColor: theme.colors.accent,
              borderWidth: 1,
            }
          }
        },
      });
    }

    // 4. Cleanup on unmount
    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }
    };
  }, [registrations, theme]);

  const totalProductsSelected = registrations.filter(reg => !!reg.selectedProduct).length;

  if (totalProductsSelected === 0) {
     return (
        <div className="mt-8 pt-6 border-t border-accent border-opacity-50 text-center">
             <h3 className="text-2xl font-heading text-primary mb-4">Drink Preferences</h3>
             <p className="text-text-base italic opacity-80">No drinks have been selected by the guests yet.</p>
        </div>
     );
  }

  return (
    <div className="mt-8 pt-6 border-t border-accent border-opacity-50">
       <div className="relative h-64 md:h-80 w-full max-w-md mx-auto">
         <canvas ref={chartRef} aria-label="Pie chart of selected drinks"></canvas>
       </div>
    </div>
  );
};