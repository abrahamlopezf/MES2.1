import { useState, useEffect, useRef } from 'react';

export const useBottomSheetAnimation = (isOpen: boolean, duration: number = 400) => {
  const [isRendered, setIsRendered] = useState(false);
  const [animateIn, setAnimateIn] = useState(false);

  const sheetRef = useRef<HTMLDivElement | null>(null);
  const [startY, setStartY] = useState<number | null>(null);
  const [currentY, setCurrentY] = useState<number>(0);

  useEffect(() => {
    if (isOpen) {
      setIsRendered(true);
      // Double requestAnimationFrame ensures the initial state is painted before applying the open state
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setAnimateIn(true);
        });
      });
    } else {
      setAnimateIn(false);
      const timer = setTimeout(() => setIsRendered(false), duration);
      return () => clearTimeout(timer);
    }
  }, [isOpen, duration]);

  const handleTouchStart = (e: any) => {
    setStartY(e.touches[0].clientY);
  };

  const handleTouchMove = (e: any) => {
    if (startY === null) return;
    const y = e.touches[0].clientY;
    const deltaY = y - startY;
    if (deltaY > 0) {
      setCurrentY(deltaY);
    }
  };

  const handleTouchEnd = (onClose: () => void) => {
    if (currentY > 100) {
      onClose();
    }
    setStartY(null);
    setCurrentY(0);
  };

  return {
    isRendered,
    animateIn,
    sheetRef,
    currentY,
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd
    }
  };
};
