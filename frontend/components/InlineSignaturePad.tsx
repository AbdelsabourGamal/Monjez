import React, { useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { Language } from '../types';

interface InlineSignaturePadProps {
  value: string;
  onSave: (dataUrl: string) => void;
}

export const InlineSignaturePad: React.FC<InlineSignaturePadProps> = ({ value, onSave }) => {
  const { t } = useTranslation(['common']);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    onSave('');
  }, [onSave]);

  const drawImageFromValue = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (value && value.startsWith('data:image')) {
        const img = new Image();
        img.onload = () => {
            const canvas = canvasRef.current;
            if (!canvas) return;
            // Draw image centered and scaled to fit
            const hRatio = canvas.width / img.width;
            const vRatio = canvas.height / img.height;
            const ratio = Math.min(hRatio, vRatio, 1);
            const centerShiftX = (canvas.width - img.width * ratio) / 2;
            const centerShiftY = (canvas.height - img.height * ratio) / 2;
            ctx.drawImage(img, 0, 0, img.width, img.height,
                          centerShiftX, centerShiftY, img.width * ratio, img.height * ratio);
        };
        img.src = value;
    }
  }, [value]);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
        if (!canvas.parentElement) return;
        ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        const rect = canvas.parentElement.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;

        canvas.width = rect.width;
        canvas.height = rect.height;
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        drawImageFromValue();
    };
    
    const resizeObserver = new ResizeObserver(resizeCanvas);
    if (canvas.parentElement) {
      resizeObserver.observe(canvas.parentElement);
    }
    
    const getCoords = (event: MouseEvent | TouchEvent) => {
        const rect = canvas.getBoundingClientRect();
        const clientX = event instanceof MouseEvent ? event.clientX : event.touches[0].clientX;
        const clientY = event instanceof MouseEvent ? event.clientY : event.touches[0].clientY;
        return { x: clientX - rect.left, y: clientY - rect.top };
    };

    const startDrawing = (event: MouseEvent | TouchEvent) => {
      event.preventDefault();
      const { x, y } = getCoords(event);
      ctx.beginPath();
      ctx.moveTo(x, y);
      isDrawingRef.current = true;
    };

    const draw = (event: MouseEvent | TouchEvent) => {
      if (!isDrawingRef.current) return;
      event.preventDefault();
      const { x, y } = getCoords(event);
      ctx.lineTo(x, y);
      ctx.stroke();
    };

    const stopDrawing = () => {
      if (!isDrawingRef.current) return;
      ctx.closePath();
      isDrawingRef.current = false;
      
      const dataUrl = canvas.toDataURL('image/png');
      onSave(dataUrl);
    };

    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseleave', stopDrawing);
    canvas.addEventListener('touchstart', startDrawing, { passive: false });
    canvas.addEventListener('touchmove', draw, { passive: false });
    canvas.addEventListener('touchend', stopDrawing);
    canvas.addEventListener('touchcancel', stopDrawing);

    return () => {
      resizeObserver.disconnect();
      canvas.removeEventListener('mousedown', startDrawing);
      canvas.removeEventListener('mousemove', draw);
      canvas.removeEventListener('mouseup', stopDrawing);
      canvas.removeEventListener('mouseleave', stopDrawing);
      canvas.removeEventListener('touchstart', startDrawing);
      canvas.removeEventListener('touchmove', draw);
      canvas.removeEventListener('touchend', stopDrawing);
      canvas.removeEventListener('touchcancel', stopDrawing);
    };
  }, [drawImageFromValue, onSave]);
  
  return (
    <div className="relative w-full h-32 bg-gray-400 dark:bg-gray-800 rounded-md border-2 border-dashed dark:border-gray-600 cursor-crosshair">
        <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full"></canvas>
        {(!value || !value.startsWith('data:image')) && (
            <div className="absolute inset-0 flex items-center justify-center text-gray-100 pointer-events-none">
                {t('common:signature.drawPlaceholder')}
            </div>
        )}
        <button 
            type="button" 
            onClick={clearCanvas} 
            className="absolute top-1 right-1 rtl:right-auto rtl:left-1 px-2 py-1 text-xs font-medium rounded-md bg-white text-gray-700 border border-gray-300 shadow-sm hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            aria-label={t('common:signature.clear')}
        >
            {t('common:signature.clear')}
        </button>
    </div>
  );
};