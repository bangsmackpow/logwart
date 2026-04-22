import { useState, useEffect, useCallback, useRef } from 'react';

export interface ColumnWidths {
  [key: string]: number;
}

export function useColumnResize(initialWidths: ColumnWidths, storageKey: string) {
  const [widths, setWidths] = useState<ColumnWidths>(initialWidths);
  const isResizing = useRef<string | null>(null);
  const startX = useRef<number>(0);
  const startWidth = useRef<number>(0);

  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        setWidths(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse saved widths", e);
      }
    }
  }, [storageKey]);

  const startResizing = useCallback((id: string, clientX: number) => {
    isResizing.current = id;
    startX.current = clientX;
    startWidth.current = widths[id] || 150;
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', stopResizing);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [widths]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing.current) return;
    
    const deltaX = e.clientX - startX.current;
    const newWidth = Math.max(50, startWidth.current + deltaX);
    
    setWidths(prev => {
      const next = { ...prev, [isResizing.current as string]: newWidth };
      return next;
    });
  }, []);

  const stopResizing = useCallback(() => {
    if (isResizing.current) {
      localStorage.setItem(storageKey, JSON.stringify(widths));
    }
    isResizing.current = null;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', stopResizing);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, [storageKey, widths, handleMouseMove]);

  return { widths, startResizing };
}
