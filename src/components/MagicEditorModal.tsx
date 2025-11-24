
import React, { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { XIcon, UndoIcon, MagicWandIcon, CheckIcon, ZoomInIcon, ZoomOutIcon } from './icons';
import { removeElementFromImage } from '../services/imageToolsService';

interface MagicEditorModalProps {
    imageUrl: string;
    onClose: () => void;
    onSave: (newImageUrl: string) => void;
    deductCredit: () => Promise<void>;
}

export const MagicEditorModal: React.FC<MagicEditorModalProps> = ({ imageUrl, onClose, onSave, deductCredit }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [brushSize, setBrushSize] = useState(30);
    const [history, setHistory] = useState<ImageData[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [currentImageSrc, setCurrentImageSrc] = useState(imageUrl);
    const [zoomLevel, setZoomLevel] = useState(1);
    
    // Image Dimensions for Canvas scaling
    const [imgDims, setImgDims] = useState({ w: 0, h: 0 });

    // Initialize Canvas with Image
    useEffect(() => {
        const img = new Image();
        img.src = currentImageSrc;
        img.crossOrigin = "anonymous";
        img.onload = () => {
            setImgDims({ w: img.width, h: img.height });
            const canvas = canvasRef.current;
            if (canvas) {
                // Set internal resolution to native image size
                canvas.width = img.width;
                canvas.height = img.height;
                
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.drawImage(img, 0, 0);
                    setHistory([ctx.getImageData(0, 0, canvas.width, canvas.height)]);
                }
                
                // Initial Auto-Fit Zoom (fit within 800px or window height)
                const fitZoom = Math.min(
                    (window.innerWidth * 0.8) / img.width,
                    (window.innerHeight * 0.6) / img.height,
                    1 // Don't upscale initially if image is small
                );
                setZoomLevel(fitZoom);
            }
        };
    }, [currentImageSrc]);

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

    // Zoom Logic
    const handleZoomIn = () => setZoomLevel(prev => Math.min(prev * 1.2, 5)); // Max 5x
    const handleZoomOut = () => setZoomLevel(prev => Math.max(prev / 1.2, 0.1)); // Min 0.1x

    // Interaction Handlers
    const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
        setIsDrawing(true);
        draw(e);
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (isDrawing) {
            draw(e);
        }
    };

    const handleMouseUp = () => {
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
            
            // Calculate scale ratio between visual size and internal size
            // rect.width is the visual width on screen (css width)
            // canvas.width is the internal bitmap width
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;

            const x = (e.clientX - rect.left) * scaleX;
            const y = (e.clientY - rect.top) * scaleY;

            ctx.globalCompositeOperation = 'source-over';
            ctx.beginPath();
            // Adjust brush size relative to zoom so it feels consistent on screen
            // If zoom is 2x, we need the circle on bitmap to be smaller to look same size?
            // Actually, users usually want "Screen Pixel" brush size.
            // If I have a 20px brush on screen, that's 20 * scaleX pixels on image.
            const scaledBrush = brushSize * scaleX;
            
            ctx.arc(x, y, scaledBrush / 2, 0, Math.PI * 2); 
            
            ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
            ctx.fill();
        }
    };

    // Generate Mask & Process
    const handleRemove = async () => {
        if (!canvasRef.current) return;
        
        setIsProcessing(true);
        try {
            await deductCredit();

            // 1. Create Mask
            const canvas = canvasRef.current;
            const maskCanvas = document.createElement('canvas');
            maskCanvas.width = canvas.width;
            maskCanvas.height = canvas.height;
            const maskCtx = maskCanvas.getContext('2d');
            
            if (maskCtx) {
                const mainCtx = canvas.getContext('2d');
                const currentData = mainCtx?.getImageData(0, 0, canvas.width, canvas.height).data;
                const initialData = history[0].data;
                const maskImgData = maskCtx.createImageData(canvas.width, canvas.height);
                
                for (let i = 0; i < currentData!.length; i += 4) {
                    // Check for Red overlay (simple diff)
                    // If pixel has changed significantly from original, mark as mask
                    if (
                        Math.abs(currentData![i] - initialData[i]) > 10 ||
                        Math.abs(currentData![i+1] - initialData[i+1]) > 10 || // Red channel diff
                        Math.abs(currentData![i+2] - initialData[i+2]) > 10
                    ) {
                        maskImgData.data[i] = 0;     // Black
                        maskImgData.data[i+1] = 0;   // Black
                        maskImgData.data[i+2] = 0;   // Black
                        maskImgData.data[i+3] = 255; // Opaque
                    } else {
                        maskImgData.data[i] = 255;   // White
                        maskImgData.data[i+1] = 255; // White
                        maskImgData.data[i+2] = 255; // White
                        maskImgData.data[i+3] = 255; // Opaque
                    }
                }
                maskCtx.putImageData(maskImgData, 0, 0);
            }

            const maskBase64 = maskCanvas.toDataURL('image/png').split(',')[1];
            
            // Get Clean Base (Initial Image)
            const exportCanvas = document.createElement('canvas');
            exportCanvas.width = canvas.width;
            exportCanvas.height = canvas.height;
            const exportCtx = exportCanvas.getContext('2d');
            exportCtx?.putImageData(history[0], 0, 0);
            const cleanBase64 = exportCanvas.toDataURL('image/png').split(',')[1];

            const resultBase64 = await removeElementFromImage(cleanBase64, 'image/png', maskBase64);
            const resultUrl = `data:image/png;base64,${resultBase64}`;
            
            // Update state to show result WITHOUT closing modal
            setCurrentImageSrc(resultUrl);

        } catch (e) {
            console.error(e);
            alert("Edit failed. Please try again.");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDone = () => {
        onSave(currentImageSrc);
        onClose();
    };

    return createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-fadeIn">
            <div className="w-[95vw] h-[92vh] bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col relative">
                
                {/* Header */}
                <div className="px-8 py-4 border-b border-gray-100 flex justify-between items-center bg-white z-10 shrink-0">
                    <div>
                        <h2 className="text-2xl font-bold text-[#1A1A1E] flex items-center gap-2">
                            <div className="p-2 bg-[#F9D230] rounded-full text-[#1A1A1E]"><MagicWandIcon className="w-5 h-5"/></div>
                            Magic Editor
                        </h2>
                        <p className="text-xs text-gray-500 mt-1">Draw over objects to remove them.</p>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        {history.length > 1 && (
                            <button 
                                onClick={handleUndo} 
                                className="p-2 rounded-full hover:bg-gray-100 text-gray-500 hover:text-[#1A1A1E] transition-colors flex items-center gap-2 text-sm font-medium"
                                title="Undo"
                            >
                                <UndoIcon className="w-5 h-5"/> Undo
                            </button>
                        )}
                        <button 
                            onClick={onClose} 
                            className="p-2 rounded-full hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                            title="Close without saving"
                        >
                            <XIcon className="w-6 h-6"/>
                        </button>
                    </div>
                </div>

                {/* Main Workspace with Native Scrolling */}
                <div className="flex-1 bg-[#f0f0f0] relative overflow-auto flex items-center justify-center cursor-crosshair">
                    <div className="relative m-auto p-10"> {/* m-auto centers content in overflow container */}
                        <canvas
                            ref={canvasRef}
                            onMouseDown={handleMouseDown}
                            onMouseMove={handleMouseMove}
                            onMouseUp={handleMouseUp}
                            onMouseLeave={handleMouseUp}
                            className="shadow-2xl bg-white"
                            style={{ 
                                width: imgDims.w * zoomLevel,
                                height: imgDims.h * zoomLevel,
                                // Ensure crisp rendering
                                imageRendering: 'auto' 
                            }}
                        />
                    </div>

                    {/* Floating Zoom Controls */}
                    <div className="fixed bottom-24 right-12 flex flex-col gap-2 bg-white/90 backdrop-blur shadow-lg p-2 rounded-xl border border-gray-200 z-20">
                        <button onClick={handleZoomIn} className="p-2 hover:bg-gray-100 rounded-lg text-gray-600"><ZoomInIcon className="w-6 h-6"/></button>
                        <div className="h-px bg-gray-200 w-full my-1"></div>
                        <button onClick={handleZoomOut} className="p-2 hover:bg-gray-100 rounded-lg text-gray-600"><ZoomOutIcon className="w-6 h-6"/></button>
                        <div className="text-xs font-mono text-center text-gray-400 mt-1">{Math.round(zoomLevel * 100)}%</div>
                    </div>

                    {isProcessing && (
                        <div className="absolute inset-0 bg-white/80 flex flex-col items-center justify-center z-50 backdrop-blur-sm fixed">
                            <div className="w-20 h-20 border-4 border-[#F9D230] border-t-transparent rounded-full animate-spin mb-6"></div>
                            <p className="text-[#1A1A1E] font-bold text-2xl tracking-widest animate-pulse">REMOVING...</p>
                            <p className="text-gray-500 text-sm mt-2">AI is regenerating the background.</p>
                        </div>
                    )}
                </div>

                {/* Footer Controls */}
                <div className="px-8 py-4 bg-white border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-6 shrink-0 z-10">
                    <div className="flex items-center gap-6 w-full sm:w-auto">
                        <div className="flex flex-col gap-2 w-full sm:w-64">
                            <div className="flex justify-between text-xs font-bold text-gray-400 uppercase tracking-wider">
                                <span>Brush Size</span>
                                <span>{brushSize}px</span>
                            </div>
                            <input 
                                type="range" 
                                min="10" 
                                max="200" 
                                value={brushSize} 
                                onChange={(e) => setBrushSize(Number(e.target.value))}
                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#1A1A1E]"
                            />
                        </div>
                        <div 
                            className="w-10 h-10 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center flex-shrink-0"
                            title="Brush Preview"
                        >
                            <div 
                                style={{ width: Math.min(32, brushSize/2), height: Math.min(32, brushSize/2) }} 
                                className="rounded-full bg-red-500/50"
                            ></div>
                        </div>
                    </div>

                    <div className="flex gap-3 w-full sm:w-auto">
                        <button 
                            onClick={handleDone}
                            className="flex-1 sm:flex-none px-8 py-3 rounded-xl font-bold text-green-600 bg-green-50 hover:bg-green-100 transition-colors border border-green-200 flex items-center gap-2"
                        >
                            <CheckIcon className="w-5 h-5"/> Done
                        </button>

                        <button 
                            onClick={handleRemove} 
                            disabled={isProcessing}
                            className="flex-1 sm:flex-none bg-[#1A1A1E] text-white px-8 py-3 rounded-xl font-bold hover:bg-black transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl active:scale-95 disabled:opacity-50 disabled:transform-none"
                        >
                            <MagicWandIcon className="w-5 h-5 text-[#F9D230]"/>
                            <span>Remove Selected</span>
                            <span className="bg-white/20 text-[10px] px-2 py-0.5 rounded text-white font-normal ml-1">1 Credit</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};
