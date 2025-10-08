/**
 * Virtual List Component
 * Efficiently render large lists without performance issues
 */

import React, { useCallback, useRef, useState, useEffect } from 'react';

interface VirtualListProps<T> {
  items: T[];
  itemHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  containerHeight: number;
  buffer?: number; // Number of items to render outside viewport
  className?: string;
}

export function VirtualList<T>({
  items,
  itemHeight,
  renderItem,
  containerHeight,
  buffer = 5,
  className = ''
}: VirtualListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Calculate visible range
  const totalHeight = items.length * itemHeight;
  const visibleStart = Math.floor(scrollTop / itemHeight);
  const visibleEnd = Math.ceil((scrollTop + containerHeight) / itemHeight);
  
  // Add buffer for smooth scrolling
  const startIndex = Math.max(0, visibleStart - buffer);
  const endIndex = Math.min(items.length - 1, visibleEnd + buffer);
  
  // Get visible items
  const visibleItems = items.slice(startIndex, endIndex + 1);
  
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    setScrollTop(target.scrollTop);
  }, []);
  
  // Reset scroll on items change
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
      setScrollTop(0);
    }
  }, [items.length]);
  
  return (
    <div
      ref={containerRef}
      className={`overflow-auto ${className}`}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        {visibleItems.map((item, index) => {
          const actualIndex = startIndex + index;
          return (
            <div
              key={actualIndex}
              style={{
                position: 'absolute',
                top: actualIndex * itemHeight,
                height: itemHeight,
                width: '100%'
              }}
            >
              {renderItem(item, actualIndex)}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Optimized transaction list component
export function VirtualTransactionList({ 
  transactions,
  onEdit,
  onDelete 
}: {
  transactions: any[];
  onEdit: (tx: any) => void;
  onDelete: (id: string) => void;
}) {
  const renderTransaction = useCallback((tx: any) => (
    <div className="flex items-center justify-between p-4 border-b hover:bg-accent/5 transition-colors">
      <div className="flex-1">
        <div className="font-medium">{tx.payee}</div>
        <div className="text-sm text-muted-foreground">{tx.category}</div>
      </div>
      <div className="flex items-center gap-4">
        <span className={`font-semibold ${tx.amount < 0 ? 'text-red-500' : 'text-green-500'}`}>
          ${Math.abs(tx.amount / 100).toFixed(2)}
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => onEdit(tx)}
            className="text-sm text-primary hover:underline"
          >
            Edit
          </button>
          <button
            onClick={() => onDelete(tx.id)}
            className="text-sm text-destructive hover:underline"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  ), [onEdit, onDelete]);
  
  if (transactions.length > 100) {
    // Use virtual scrolling for large lists
    return (
      <VirtualList
        items={transactions}
        itemHeight={80}
        containerHeight={600}
        renderItem={renderTransaction}
        className="border rounded-lg"
      />
    );
  }
  
  // Regular rendering for small lists
  return (
    <div className="border rounded-lg max-h-[600px] overflow-auto">
      {transactions.map(tx => (
        <div key={tx.id}>
          {renderTransaction(tx)}
        </div>
      ))}
    </div>
  );
}
