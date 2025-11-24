
import React, { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { XIcon, UndoIcon, MagicWandIcon, CheckIcon } from './icons';
import { removeElementFromImage } from '../services/imageToolsService';

interface MagicEditorModalProps {
    imageUrl: string;
    onClose: () => void;
    onSave: (newImageUrl: string) => void;
    deductCredit: () => Promise<void>;
}

export const MagicEditorModal: React.FC<MagicEditorModalProps> = ({ imageUrl, onClose, onSave, deductCredit }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [brushSize, setBrushSize] = useState(20);
    const [history, setHistory] = useState<ImageData[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null);

    // Initialize Canvas with Image
    useEffect(() => {
        const img = new Image();
        img.src = imageUrl;
        img.crossOrigin = "anonymous";
        img.onload = () => {
            setOriginalImage(img);
            const canvas = canvasRef.current;
            const container = containerRef.current;
            if (canvas && container) {
                // Calculate aspect ratio fit
                const maxWidth = container.clientWidth - 40; // padding
                const maxHeight = container.clientHeight - 150; // controls space
                
                let width = img.width;
                let height = img.height;
                
                if (width > maxWidth || height > maxHeight) {
                    const ratio = Math.min(maxWidth / width, maxHeight / height);
                    width *= ratio;
                    height *= ratio;
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.drawImage(img, 0, 0, width, height);
                    saveHistory(); // Initial state
                }
            }
        };
    }, [imageUrl]);

    const saveHistory = () => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (canvas && ctx) {
            setHistory(prev => [...prev, ctx.getImageData(0, 0, canvas.width, canvas.height)]);
        }
    };

    const handleUndo = () => {
        if (history.length > 1) {
            const newHistory = [...history];
            newHistory.pop(); // Remove current
            const previousState = newHistory[newHistory.length - 1];
            setHistory(newHistory);
            
            const canvas = canvasRef.current;
            const ctx = canvas?.getContext('2d');
            if (canvas && ctx && previousState) {
                ctx.putImageData(previousState, 0, 0);
            }
        }
    };

    // Drawing Logic
    const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
        setIsDrawing(true);
        draw(e);
    };

    const stopDrawing = () => {
        if (isDrawing) {
            setIsDrawing(false);
            saveHistory();
        }
    };

    const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isDrawing) return;
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (canvas && ctx) {
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            ctx.globalCompositeOperation = 'source-over';
            ctx.beginPath();
            ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 0, 0, 0.5)'; // Semi-transparent red
            ctx.fill();
        }
    };

    // Generate Mask & Process
    const handleRemove = async () => {
        if (!originalImage || !canvasRef.current) return;
        
        setIsProcessing(true);
        try {
            await deductCredit();

            // 1. Create Mask Image
            const maskCanvas = document.createElement('canvas');
            maskCanvas.width = canvasRef.current.width;
            maskCanvas.height = canvasRef.current.height;
            const maskCtx = maskCanvas.getContext('2d');
            
            if (maskCtx) {
                // Draw black background
                maskCtx.fillStyle = 'black';
                maskCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);
                
                // Extract red pixels from main canvas to create white mask
                const mainCtx = canvasRef.current.getContext('2d');
                const imageData = mainCtx?.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
                
                if (imageData) {
                    const data = imageData.data;
                    for (let i = 0; i < data.length; i += 4) {
                        // Check if pixel is reddish (our brush)
                        // Simple check: Red channel > 0 and alpha > 0 (since we drew on top)
                        // But wait, we drew on top of the image.
                        // Better approach: Compare current canvas with original image history[0]
                        // OR simpler: We should have drawn on a separate layer ideally.
                        // Since we drew on top, let's imply mask from red intensity.
                        
                        // Optimized: User draws Red 0.5.
                        // Actually, for V1, let's just assume any pixel changed from original is the mask.
                        // But we don't have easy diffing here without heavy computation.
                        
                        // Correct Fix: We need to isolate the brush strokes. 
                        // Since we drew directly on the image, identifying the mask purely by color is risky if the image has red.
                        // However, we know we used rgba(255,0,0,0.5).
                        
                        // Alternative: Re-implement drawing to use a separate off-screen canvas for the mask strokes.
                    }
                }
                
                // --- ROBUST MASK GENERATION ---
                // We will re-create the mask by comparing the current canvas state to the initial state (history[0])
                // Any pixel that is different is part of the mask.
                const currentData = mainCtx?.getImageData(0, 0, maskCanvas.width, maskCanvas.height).data;
                const initialData = history[0].data;
                const maskImgData = maskCtx.createImageData(maskCanvas.width, maskCanvas.height);
                
                for (let i = 0; i < currentData!.length; i += 4) {
                    // Compare RGB
                    if (
                        Math.abs(currentData![i] - initialData[i]) > 5 ||
                        Math.abs(currentData![i+1] - initialData[i+1]) > 5 ||
                        Math.abs(currentData![i+2] - initialData[i+2]) > 5
                    ) {
                        // Changed -> White (Mask)
                        maskImgData.data[i] = 255;
                        maskImgData.data[i+1] = 255;
                        maskImgData.data[i+2] = 255;
                        maskImgData.data[i+3] = 255;
                    } else {
                        // Unchanged -> Black
                        maskImgData.data[i] = 0;
                        maskImgData.data[i+1] = 0;
                        maskImgData.data[i+2] = 0;
                        maskImgData.data[i+3] = 255;
                    }
                }
                maskCtx.putImageData(maskImgData, 0, 0);
            }

            const maskBase64 = maskCanvas.toDataURL('image/png').split(',')[1];
            const originalBase64 = imageUrl.split(',')[1] || imageUrl; // Handle data URI or URL (if local)
            
            // Note: If imageUrl is a remote URL, we need to fetch it to get base64. 
            // But since we drew it on canvas (history[0]), we can export from there.
            const exportCanvas = document.createElement('canvas');
            exportCanvas.width = canvasRef.current.width;
            exportCanvas.height = canvasRef.current.height;
            const exportCtx = exportCanvas.getContext('2d');
            exportCtx?.putImageData(history[0], 0, 0);
            const cleanBase64 = exportCanvas.toDataURL('image/png').split(',')[1];

            const resultBase64 = await removeElementFromImage(cleanBase64, 'image/png', maskBase64);
            const resultUrl = `data:image/png;base64,${resultBase64}`;
            
            onSave(resultUrl);
            onClose();

        } catch (e) {
            console.error(e);
            alert("Edit failed. Please try again.");
        } finally {
            setIsProcessing(false);
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
            <div className="w-full h-full max-w-6xl flex flex-col" ref={containerRef}>
                {/* Header */}
                <div className="flex justify-between items-center mb-4 bg-black/50 p-4 rounded-2xl">
                    <h2 className="text-white font-bold text-xl flex items-center gap-2">
                        <MagicWandIcon className="w-6 h-6 text-[#F9D230]"/> Magic Editor
                    </h2>
                    <div className="flex gap-4">
                        <button onClick={handleUndo} disabled={history.length <= 1} className="text-white/80 hover:text-white disabled:opacity-30 p-2">
                            <UndoIcon className="w-6 h-6"/>
                        </button>
                        <button onClick={onClose} className="text-white/80 hover:text-red-400 p-2">
                            <XIcon className="w-6 h-6"/>
                        </button>
                    </div>
                </div>

                {/* Canvas Area */}
                <div className="flex-1 relative flex items-center justify-center overflow-hidden bg-[#1a1a1a] rounded-2xl border border-white/10">
                    <canvas
                        ref={canvasRef}
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={stopDrawing}
                        onMouseLeave={stopDrawing}
                        className="cursor-crosshair shadow-2xl"
                    />
                    {isProcessing && (
                        <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center z-50">
                            <div className="w-12 h-12 border-4 border-[#F9D230] border-t-transparent rounded-full animate-spin mb-4"></div>
                            <p className="text-white font-bold tracking-widest animate-pulse">REMOVING OBJECT...</p>
                        </div>
                    )}
                </div>

                {/* Footer Controls */}
                <div className="mt-4 bg-white rounded-2xl p-4 flex items-center justify-between gap-6 shadow-xl">
                    <div className="flex items-center gap-4">
                        <span className="text-xs font-bold text-gray-400 uppercase">Brush Size</span>
                        <input 
                            type="range" 
                            min="5" 
                            max="100" 
                            value={brushSize} 
                            onChange={(e) => setBrushSize(Number(e.target.value))}
                            className="w-48 accent-[#1A1A1E]"
                        />
                        <div className="w-8 h-8 rounded-full bg-red-500/50 border border-gray-300 flex items-center justify-center text-[10px] text-white font-bold">
                            {brushSize}
                        </div>
                    </div>

                    <button 
                        onClick={handleRemove} 
                        disabled={isProcessing}
                        className="bg-[#1A1A1E] text-white px-8 py-3 rounded-xl font-bold hover:bg-black transition-all flex items-center gap-2 shadow-lg"
                    >
                        <MagicWandIcon className="w-5 h-5 text-[#F9D230]"/>
                        Remove Selected (1 Credit)
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};
