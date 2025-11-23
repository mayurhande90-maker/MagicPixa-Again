
import React, { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { XIcon, CheckIcon, MagicWandIcon, UndoIcon, TrashIcon, SparklesIcon } from './icons';
import { removeElementFromImage } from '../services/imageToolsService';

interface MagicEditorModalProps {
    imageUrl: string;
    onClose: () => void;
    onSave: (newImageUrl: string) => void;
    credits: number;
    onDeductCredits: (cost: number) => Promise<void>;
}

export const MagicEditorModal: React.FC<MagicEditorModalProps> = ({ imageUrl, onClose, onSave, credits, onDeductCredits }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const maskCanvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [brushSize, setBrushSize] = useState(30);
    const [history, setHistory] = useState<ImageData[]>([]);
    const [maskHistory, setMaskHistory] = useState<ImageData[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [imageLoaded, setImageLoaded] = useState(false);
    const [originalImgElement, setOriginalImgElement] = useState<HTMLImageElement | null>(null);

    // Initialize Canvas with Image
    useEffect(() => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = imageUrl;
        
        img.onload = () => {
            setOriginalImgElement(img);
            setImageLoaded(true);
            
            // Setup drawing canvas
            if (canvasRef.current) {
                const canvas = canvasRef.current;
                // Fit canvas to image aspect ratio within a max viewport
                const maxWidth = Math.min(window.innerWidth * 0.8, 800);
                const maxHeight = Math.min(window.innerHeight * 0.6, 600);
                
                let width = img.naturalWidth;
                let height = img.naturalHeight;
                
                // Calculate scaled dimensions
                const ratio = Math.min(maxWidth / width, maxHeight / height);
                const finalWidth = width * ratio;
                const finalHeight = height * ratio;

                canvas.width = width; // Internal resolution matches original for quality
                canvas.height = height;
                // Display size via CSS style
                canvas.style.width = `${finalWidth}px`;
                canvas.style.height = `${finalHeight}px`;

                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.drawImage(img, 0, 0);
                    // Save initial state for Undo
                    setHistory([ctx.getImageData(0, 0, width, height)]);
                }
            }

            // Setup hidden mask canvas (Must match dimensions exactly)
            if (maskCanvasRef.current) {
                const maskCanvas = maskCanvasRef.current;
                maskCanvas.width = img.naturalWidth;
                maskCanvas.height = img.naturalHeight;
                const mCtx = maskCanvas.getContext('2d');
                if (mCtx) {
                    // Fill with black (no mask)
                    mCtx.fillStyle = 'black';
                    mCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);
                    setMaskHistory([mCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height)]);
                }
            }
        };
    }, [imageUrl]);

    const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        if (!canvasRef.current) return { x: 0, y: 0 };
        
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        
        let clientX, clientY;
        
        if ('touches' in e) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = (e as React.MouseEvent).clientX;
            clientY = (e as React.MouseEvent).clientY;
        }

        // Convert screen coords to canvas internal resolution coords
        const x = (clientX - rect.left) * (canvas.width / rect.width);
        const y = (clientY - rect.top) * (canvas.height / rect.height);
        
        return { x, y };
    };

    const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        setIsDrawing(true);
        draw(e);
    };

    const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        if (!isDrawing || !canvasRef.current || !maskCanvasRef.current) return;
        
        const { x, y } = getCoordinates(e);
        
        const ctx = canvasRef.current.getContext('2d');
        const mCtx = maskCanvasRef.current.getContext('2d');
        
        if (ctx && mCtx) {
            // Draw Red Overlay on Visual Canvas
            ctx.globalCompositeOperation = 'source-over';
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.lineWidth = brushSize;
            ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)'; // Red 50%
            
            ctx.beginPath();
            ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
            ctx.fill();

            // Draw White on Mask Canvas
            mCtx.beginPath();
            mCtx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
            mCtx.fillStyle = 'white';
            mCtx.fill();
        }
    };
    
    const handleMouseUp = () => {
        if (!isDrawing) return;
        setIsDrawing(false);
        if (canvasRef.current && maskCanvasRef.current) {
            const ctx = canvasRef.current.getContext('2d');
            const mCtx = maskCanvasRef.current.getContext('2d');
            if (ctx && mCtx) {
                setHistory(prev => [...prev, ctx.getImageData(0, 0, canvasRef.current!.width, canvasRef.current!.height)]);
                setMaskHistory(prev => [...prev, mCtx.getImageData(0, 0, maskCanvasRef.current!.width, maskCanvasRef.current!.height)]);
            }
        }
    };

    const handleUndo = () => {
        if (history.length > 1 && canvasRef.current && maskCanvasRef.current) {
            const newHistory = [...history];
            newHistory.pop(); // Remove current state
            const prevVisual = newHistory[newHistory.length - 1];
            
            const newMaskHistory = [...maskHistory];
            newMaskHistory.pop();
            const prevMask = newMaskHistory[newMaskHistory.length - 1];

            setHistory(newHistory);
            setMaskHistory(newMaskHistory);

            const ctx = canvasRef.current.getContext('2d');
            const mCtx = maskCanvasRef.current.getContext('2d');
            
            if (ctx && prevVisual) ctx.putImageData(prevVisual, 0, 0);
            if (mCtx && prevMask) mCtx.putImageData(prevMask, 0, 0);
        }
    };

    const handleRemove = async () => {
        if (credits < 1) {
            alert("Insufficient credits.");
            return;
        }
        
        if (!originalImgElement || !maskCanvasRef.current) return;

        setIsProcessing(true);
        try {
            // Get Base64 of Original Image (Clean)
            // We create a temp canvas to draw the pure original image to get its base64
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = originalImgElement.naturalWidth;
            tempCanvas.height = originalImgElement.naturalHeight;
            const tCtx = tempCanvas.getContext('2d');
            if (!tCtx) throw new Error("Canvas error");
            tCtx.drawImage(originalImgElement, 0, 0);
            const originalBase64 = tempCanvas.toDataURL('image/png').split(',')[1];

            // Get Base64 of Mask
            const maskBase64 = maskCanvasRef.current.toDataURL('image/png').split(',')[1];

            // Call API
            const resultBase64 = await removeElementFromImage(originalBase64, 'image/png', maskBase64);
            
            // Deduct Credit
            await onDeductCredits(1);
            
            // Save
            onSave(`data:image/png;base64,${resultBase64}`);
            onClose();

        } catch (e) {
            console.error(e);
            alert("Failed to remove object. Please try again.");
        } finally {
            setIsProcessing(false);
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-fadeIn" onClick={onClose}>
            <div className="relative bg-[#1A1A1E] w-full max-w-5xl h-[90vh] rounded-3xl shadow-2xl border border-gray-800 flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-800 bg-[#2C2C2E]">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-500/20 rounded-lg">
                            <MagicWandIcon className="w-6 h-6 text-red-500" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">Magic Editor</h2>
                            <p className="text-xs text-gray-400">Brush over objects to remove them.</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-700 rounded-full text-gray-400 hover:text-white transition-colors">
                        <XIcon className="w-6 h-6" />
                    </button>
                </div>

                {/* Canvas Area */}
                <div className="flex-1 relative bg-[#121212] flex items-center justify-center overflow-hidden cursor-crosshair">
                    {/* The Main Interactive Canvas */}
                    <canvas 
                        ref={canvasRef}
                        onMouseDown={startDrawing}
                        onMouseMove={(e) => { if(isDrawing) draw(e); }}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                        onTouchStart={startDrawing}
                        onTouchMove={(e) => { if(isDrawing) draw(e); }}
                        onTouchEnd={handleMouseUp}
                        className="shadow-2xl border border-gray-700"
                    />
                    {/* Hidden Mask Canvas */}
                    <canvas ref={maskCanvasRef} className="hidden" />
                </div>

                {/* Toolbar */}
                <div className="p-6 bg-[#2C2C2E] border-t border-gray-800 flex flex-col md:flex-row items-center justify-between gap-6">
                    
                    {/* Brush Controls */}
                    <div className="flex items-center gap-6 w-full md:w-auto">
                        <div className="flex flex-col gap-2 w-full md:w-48">
                            <label className="text-xs font-bold text-gray-400 uppercase flex justify-between">
                                <span>Brush Size</span>
                                <span>{brushSize}px</span>
                            </label>
                            <input 
                                type="range" 
                                min="10" 
                                max="100" 
                                value={brushSize} 
                                onChange={(e) => setBrushSize(Number(e.target.value))}
                                className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-red-500"
                            />
                        </div>
                        
                        <button 
                            onClick={handleUndo} 
                            disabled={history.length <= 1}
                            className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-white rounded-xl hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            title="Undo"
                        >
                            <UndoIcon className="w-5 h-5" />
                            <span className="text-sm font-bold">Undo</span>
                        </button>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <div className="hidden md:block text-right mr-4">
                            <p className="text-xs text-gray-400 uppercase font-bold">Cost</p>
                            <p className="text-white font-bold flex items-center justify-end gap-1">1 <span className="text-yellow-500 text-xs">CREDIT</span></p>
                        </div>
                        
                        <button 
                            onClick={handleRemove}
                            disabled={isProcessing || history.length <= 1}
                            className="flex-1 md:flex-none px-8 py-3 bg-gradient-to-r from-red-500 to-pink-600 text-white rounded-xl font-bold hover:shadow-lg hover:scale-105 transition-all disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2"
                        >
                            {isProcessing ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    Removing...
                                </>
                            ) : (
                                <>
                                    <SparklesIcon className="w-5 h-5 text-yellow-300" />
                                    Remove Object
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};
