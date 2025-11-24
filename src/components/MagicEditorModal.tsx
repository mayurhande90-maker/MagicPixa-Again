
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
                // Calculate aspect ratio fit with padding
                const maxWidth = container.clientWidth;
                const maxHeight = container.clientHeight;
                
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
            ctx.fillStyle = 'rgba(255, 0, 0, 0.5)'; // Semi-transparent red for highlight
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
                // Create mask based on difference from original state
                const mainCtx = canvasRef.current.getContext('2d');
                const currentData = mainCtx?.getImageData(0, 0, maskCanvas.width, maskCanvas.height).data;
                const initialData = history[0].data;
                const maskImgData = maskCtx.createImageData(maskCanvas.width, maskCanvas.height);
                
                for (let i = 0; i < currentData!.length; i += 4) {
                    // Check if pixel differs from original (meaning user drew on it)
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
            
            // Get the clean base image from history[0] (original state before drawing red)
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
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
            <div className="w-full max-w-5xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className="px-8 py-5 border-b border-gray-100 flex justify-between items-center bg-white z-10">
                    <div>
                        <h2 className="text-2xl font-bold text-[#1A1A1E] flex items-center gap-2">
                            <div className="p-2 bg-[#F9D230] rounded-full text-[#1A1A1E]"><MagicWandIcon className="w-5 h-5"/></div>
                            Magic Editor
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">Highlight the object you want to remove.</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={handleUndo} 
                            disabled={history.length <= 1} 
                            className="p-2 rounded-full hover:bg-gray-100 text-gray-500 hover:text-[#1A1A1E] disabled:opacity-30 transition-colors"
                            title="Undo"
                        >
                            <UndoIcon className="w-6 h-6"/>
                        </button>
                        <button 
                            onClick={onClose} 
                            className="p-2 rounded-full hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                            title="Close"
                        >
                            <XIcon className="w-6 h-6"/>
                        </button>
                    </div>
                </div>

                {/* Canvas Area */}
                <div className="flex-1 bg-gray-50 relative flex items-center justify-center p-8 overflow-hidden">
                    <div className="relative shadow-xl rounded-lg overflow-hidden border border-gray-200 bg-white" ref={containerRef} style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <canvas
                            ref={canvasRef}
                            onMouseDown={startDrawing}
                            onMouseMove={draw}
                            onMouseUp={stopDrawing}
                            onMouseLeave={stopDrawing}
                            className="cursor-crosshair touch-none"
                        />
                        {isProcessing && (
                            <div className="absolute inset-0 bg-white/80 flex flex-col items-center justify-center z-50 backdrop-blur-sm">
                                <div className="w-16 h-16 border-4 border-[#F9D230] border-t-transparent rounded-full animate-spin mb-6"></div>
                                <p className="text-[#1A1A1E] font-bold text-lg tracking-widest animate-pulse">REMOVING OBJECT...</p>
                                <p className="text-gray-500 text-sm mt-2">AI is filling in the details.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Controls */}
                <div className="px-8 py-5 bg-white border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-6 w-full sm:w-auto">
                        <div className="flex flex-col gap-2 w-full sm:w-64">
                            <div className="flex justify-between text-xs font-bold text-gray-400 uppercase tracking-wider">
                                <span>Brush Size</span>
                                <span>{brushSize}px</span>
                            </div>
                            <input 
                                type="range" 
                                min="5" 
                                max="100" 
                                value={brushSize} 
                                onChange={(e) => setBrushSize(Number(e.target.value))}
                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#1A1A1E]"
                            />
                        </div>
                        {/* Brush Preview Circle */}
                        <div 
                            className="w-10 h-10 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center flex-shrink-0"
                            title="Brush Preview"
                        >
                            <div 
                                style={{ width: Math.min(32, brushSize), height: Math.min(32, brushSize) }} 
                                className="rounded-full bg-red-500/50"
                            ></div>
                        </div>
                    </div>

                    <div className="flex gap-3 w-full sm:w-auto">
                        <button 
                            onClick={onClose}
                            className="flex-1 sm:flex-none px-6 py-3 rounded-xl font-bold text-gray-600 hover:bg-gray-100 transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={handleRemove} 
                            disabled={isProcessing}
                            className="flex-1 sm:flex-none bg-[#1A1A1E] text-white px-8 py-3 rounded-xl font-bold hover:bg-black transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl active:scale-95 disabled:opacity-50 disabled:transform-none"
                        >
                            <MagicWandIcon className="w-5 h-5 text-[#F9D230]"/>
                            <span>Remove Object</span>
                            <span className="bg-white/20 text-[10px] px-2 py-0.5 rounded text-white font-normal ml-1">1 Credit</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};
