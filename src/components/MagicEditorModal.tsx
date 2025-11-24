
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
    const containerRef = useRef<HTMLDivElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [brushSize, setBrushSize] = useState(20);
    const [history, setHistory] = useState<ImageData[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [currentImageSrc, setCurrentImageSrc] = useState(imageUrl);
    const [zoomLevel, setZoomLevel] = useState(1);

    // Initialize Canvas with Image
    useEffect(() => {
        const img = new Image();
        img.src = currentImageSrc;
        img.crossOrigin = "anonymous";
        img.onload = () => {
            const canvas = canvasRef.current;
            const container = containerRef.current;
            if (canvas && container) {
                // Reset logic for new image
                // Calculate scale to fit image within container initially, but respect native resolution on canvas
                // We actually want the canvas to be native resolution for quality, and scaled via CSS for display.
                
                // For simplicity in drawing math, we set canvas dimensions to image dimensions
                canvas.width = img.width;
                canvas.height = img.height;
                
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.drawImage(img, 0, 0);
                    // Reset history stack when image changes (e.g., after a successful removal)
                    setHistory([ctx.getImageData(0, 0, canvas.width, canvas.height)]);
                }
                
                // Auto-fit zoom level initially
                const containerAspect = container.clientWidth / container.clientHeight;
                const imageAspect = img.width / img.height;
                let initialZoom = 1;
                
                if (img.width > container.clientWidth || img.height > container.clientHeight) {
                     if (imageAspect > containerAspect) {
                         initialZoom = (container.clientWidth - 40) / img.width;
                     } else {
                         initialZoom = (container.clientHeight - 40) / img.height;
                     }
                }
                setZoomLevel(initialZoom);
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
    const handleZoomIn = () => setZoomLevel(prev => Math.min(prev * 1.2, 3)); // Max 3x
    const handleZoomOut = () => setZoomLevel(prev => Math.max(prev / 1.2, 0.1)); // Min 0.1x

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
            // Adjust coordinates based on zoom level and position
            const x = (e.clientX - rect.left) / zoomLevel;
            const y = (e.clientY - rect.top) / zoomLevel;

            ctx.globalCompositeOperation = 'source-over';
            ctx.beginPath();
            ctx.arc(x, y, brushSize / (2 * zoomLevel), 0, Math.PI * 2); // Adjust brush visual size too? No, usually absolute
            // Let's keep brush size absolute in pixels relative to image
            ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2); 
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
                    if (
                        Math.abs(currentData![i] - initialData[i]) > 5 ||
                        Math.abs(currentData![i+1] - initialData[i+1]) > 5 ||
                        Math.abs(currentData![i+2] - initialData[i+2]) > 5
                    ) {
                        maskImgData.data[i] = 255;
                        maskImgData.data[i+1] = 255;
                        maskImgData.data[i+2] = 255;
                        maskImgData.data[i+3] = 255;
                    } else {
                        maskImgData.data[i] = 0;
                        maskImgData.data[i+1] = 0;
                        maskImgData.data[i+2] = 0;
                        maskImgData.data[i+3] = 255;
                    }
                }
                maskCtx.putImageData(maskImgData, 0, 0);
            }

            const maskBase64 = maskCanvas.toDataURL('image/png').split(',')[1];
            
            // Get Clean Base
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
            {/* Massive Container for Editing */}
            <div className="w-[95vw] h-[92vh] bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col relative">
                
                {/* Header */}
                <div className="px-8 py-4 border-b border-gray-100 flex justify-between items-center bg-white z-10 shrink-0">
                    <div>
                        <h2 className="text-2xl font-bold text-[#1A1A1E] flex items-center gap-2">
                            <div className="p-2 bg-[#F9D230] rounded-full text-[#1A1A1E]"><MagicWandIcon className="w-5 h-5"/></div>
                            Magic Editor
                        </h2>
                        <p className="text-xs text-gray-500 mt-1">Zoom, pan, and highlight objects to remove.</p>
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

                {/* Main Workspace */}
                <div className="flex-1 bg-[#f0f0f0] relative overflow-hidden flex items-center justify-center">
                    {/* Canvas Container with Pan/Zoom */}
                    <div 
                        ref={containerRef} 
                        className="relative w-full h-full overflow-auto flex items-center justify-center custom-scrollbar"
                        style={{ cursor: isDrawing ? 'crosshair' : 'default' }}
                    >
                        <canvas
                            ref={canvasRef}
                            onMouseDown={startDrawing}
                            onMouseMove={draw}
                            onMouseUp={stopDrawing}
                            onMouseLeave={stopDrawing}
                            className="shadow-2xl transition-transform duration-75 ease-out origin-center"
                            style={{ 
                                transform: `scale(${zoomLevel})`,
                                transformOrigin: 'center'
                            }}
                        />
                    </div>

                    {/* Floating Zoom Controls */}
                    <div className="absolute bottom-6 right-6 flex flex-col gap-2 bg-white/90 backdrop-blur shadow-lg p-2 rounded-xl border border-gray-200">
                        <button onClick={handleZoomIn} className="p-2 hover:bg-gray-100 rounded-lg text-gray-600"><ZoomInIcon className="w-6 h-6"/></button>
                        <div className="h-px bg-gray-200 w-full my-1"></div>
                        <button onClick={handleZoomOut} className="p-2 hover:bg-gray-100 rounded-lg text-gray-600"><ZoomOutIcon className="w-6 h-6"/></button>
                        <div className="text-xs font-mono text-center text-gray-400 mt-1">{Math.round(zoomLevel * 100)}%</div>
                    </div>

                    {isProcessing && (
                        <div className="absolute inset-0 bg-white/80 flex flex-col items-center justify-center z-50 backdrop-blur-sm">
                            <div className="w-20 h-20 border-4 border-[#F9D230] border-t-transparent rounded-full animate-spin mb-6"></div>
                            <p className="text-[#1A1A1E] font-bold text-2xl tracking-widest animate-pulse">REMOVING...</p>
                            <p className="text-gray-500 text-sm mt-2">AI is regenerating the background.</p>
                        </div>
                    )}
                </div>

                {/* Footer Controls */}
                <div className="px-8 py-4 bg-white border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-6 shrink-0">
                    <div className="flex items-center gap-6 w-full sm:w-auto">
                        <div className="flex flex-col gap-2 w-full sm:w-64">
                            <div className="flex justify-between text-xs font-bold text-gray-400 uppercase tracking-wider">
                                <span>Brush Size</span>
                                <span>{brushSize}px</span>
                            </div>
                            <input 
                                type="range" 
                                min="5" 
                                max="150" 
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
                        {/* Done Button (Visible if user made edits) */}
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
