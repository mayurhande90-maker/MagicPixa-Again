import React, { useRef, useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { XIcon, UndoIcon, MagicWandIcon, ZoomInIcon, ZoomOutIcon, PencilIcon, CreditCoinIcon, EyeIcon } from './icons';
import { removeElementFromImage } from '../services/imageToolsService';

interface MagicEditorModalProps {
    imageUrl: string;
    onClose: () => void;
    onSave: (newImageUrl: string) => void;
    deductCredit: () => Promise<void>;
}

export const MagicEditorModal: React.FC<MagicEditorModalProps> = ({ imageUrl, onClose, onSave, deductCredit }) => {
    const imageCanvasRef = useRef<HTMLCanvasElement>(null);
    const maskCanvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    
    const [brushSize, setBrushSize] = useState(40);
    const [isSpacePanning, setIsSpacePanning] = useState(false);
    
    const [isDrawing, setIsDrawing] = useState(false);
    const [isPanning, setIsPanning] = useState(false);
    const [panStart, setPanStart] = useState({ x: 0, y: 0 });

    const [maskHistory, setMaskHistory] = useState<ImageData[]>([]);
    const [imageHistory, setImageHistory] = useState<string[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [currentImageSrc, setCurrentImageSrc] = useState(imageUrl);
    const [zoomLevel, setZoomLevel] = useState(1);
    const [imgDims, setImgDims] = useState({ w: 0, h: 0 });
    const [loadingText, setLoadingText] = useState("Initializing...");

    const MIN_ZOOM = 0.25;
    const MAX_ZOOM = 5.0;

    // Loading Animation Cycle
    useEffect(() => {
        let interval: any;
        if (isProcessing) {
            const steps = [
                "Identifying objects...",
                "Synthesizing background...",
                "Harmonizing light...",
                "Polishing pixels...",
                "Finalizing output..."
            ];
            let step = 0;
            setLoadingText(steps[0]);
            interval = setInterval(() => {
                step = (step + 1) % steps.length;
                setLoadingText(steps[step]);
            }, 2000);
        }
        return () => clearInterval(interval);
    }, [isProcessing]);

    const resetView = useCallback((width: number, height: number) => {
        if (!width || !height) return;
        
        const containerWidth = containerRef.current?.clientWidth || window.innerWidth * 0.9;
        const containerHeight = containerRef.current?.clientHeight || window.innerHeight * 0.6;

        const fitZoom = Math.min(
            (containerWidth * 0.85) / width,
            (containerHeight * 0.85) / height,
            1
        );
        
        setZoomLevel(Math.max(fitZoom, MIN_ZOOM));
        
        if (containerRef.current) {
            setTimeout(() => {
                if (containerRef.current) {
                    const scrollX = (width * fitZoom - containerRef.current.clientWidth) / 2;
                    const scrollY = (height * fitZoom - containerRef.current.clientHeight) / 2;
                    containerRef.current.scrollTo({
                        left: Math.max(0, scrollX),
                        top: Math.max(0, scrollY),
                        behavior: 'smooth'
                    });
                }
            }, 50);
        }
    }, []);

    useEffect(() => {
        const img = new Image();
        img.src = currentImageSrc;
        img.crossOrigin = "anonymous";
        img.onload = () => {
            setImgDims({ w: img.width, h: img.height });
            
            const imgCanvas = imageCanvasRef.current;
            const maskCanvas = maskCanvasRef.current;
            
            if (imgCanvas && maskCanvas) {
                imgCanvas.width = img.width;
                imgCanvas.height = img.height;
                maskCanvas.width = img.width;
                maskCanvas.height = img.height;
                
                const imgCtx = imgCanvas.getContext('2d');
                const maskCtx = maskCanvas.getContext('2d');
                
                if (imgCtx && maskCtx) {
                    imgCtx.drawImage(img, 0, 0);
                    maskCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
                    setMaskHistory([maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height)]);
                }
                
                // Only fit view if it's the very first load or if triggered manually (e.g. by handleRemove)
                // We handle fitting in handleRemove explicitly
                if (imageHistory.length === 0) {
                    resetView(img.width, img.height);
                }
            }
        };
    }, [currentImageSrc, resetView]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.code === 'Space' && !e.repeat) {
                if (document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
                    e.preventDefault();
                    setIsSpacePanning(true);
                }
            }
            if ((e.ctrlKey || e.metaKey) && e.code === 'KeyZ') {
                handleUndo();
            }
        };
        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.code === 'Space') {
                setIsSpacePanning(false);
                setIsPanning(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [maskHistory, imageHistory]);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const handleWheel = (e: WheelEvent) => {
            e.preventDefault();
            if (isProcessing) return;
            
            const zoomSensitivity = 0.0012; 
            const delta = -e.deltaY * zoomSensitivity;
            setZoomLevel(prev => Math.min(Math.max(prev + delta, MIN_ZOOM), MAX_ZOOM));
        };

        container.addEventListener('wheel', handleWheel, { passive: false });
        return () => container.removeEventListener('wheel', handleWheel);
    }, [isProcessing]);

    const saveMaskHistory = () => {
        const maskCanvas = maskCanvasRef.current;
        const ctx = maskCanvas?.getContext('2d');
        if (maskCanvas && ctx) {
            setMaskHistory(prev => [...prev, ctx.getImageData(0, 0, maskCanvas.width, maskCanvas.height)]);
        }
    };

    const handleUndo = () => {
        if (isProcessing) return;

        // 1. Check if there is a drawn mask to undo
        if (maskHistory.length > 1) {
            const newHistory = [...maskHistory];
            newHistory.pop();
            const previousState = newHistory[newHistory.length - 1];
            setMaskHistory(newHistory);
            
            const maskCanvas = maskCanvasRef.current;
            const ctx = maskCanvas?.getContext('2d', { willReadFrequently: true });
            if (maskCanvas && ctx && previousState) {
                ctx.putImageData(previousState, 0, 0);
            }
        } 
        // 2. If no mask strokes left, undo the last image generation
        else if (imageHistory.length > 0) {
            const newImgHistory = [...imageHistory];
            const previousImage = newImgHistory.pop();
            setImageHistory(newImgHistory);
            if (previousImage) {
                setCurrentImageSrc(previousImage);
            }
        }
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if (isProcessing) return;
        if (isSpacePanning || e.button === 1) {
            e.preventDefault();
            setIsPanning(true);
            setPanStart({ x: e.clientX, y: e.clientY });
        } else if (e.button === 0) {
            setIsDrawing(true);
            draw(e);
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (isProcessing) return;
        if (isPanning && containerRef.current) {
            const dx = e.clientX - panStart.x;
            const dy = e.clientY - panStart.y;
            containerRef.current.scrollLeft -= dx;
            containerRef.current.scrollTop -= dy;
            setPanStart({ x: e.clientX, y: e.clientY });
        } else if (isDrawing) {
            draw(e);
        }
    };

    const handleMouseUp = () => {
        if (isProcessing) return;
        if (isDrawing) {
            setIsDrawing(false);
            saveMaskHistory();
        }
        setIsPanning(false);
    };

    const draw = (e: React.MouseEvent) => {
        if (!isDrawing) return;
        const maskCanvas = maskCanvasRef.current;
        const ctx = maskCanvas?.getContext('2d');
        
        if (maskCanvas && ctx) {
            const rect = maskCanvas.getBoundingClientRect();
            const scaleX = maskCanvas.width / rect.width;
            const scaleY = maskCanvas.height / rect.height;
            const x = (e.clientX - rect.left) * scaleX;
            const y = (e.clientY - rect.top) * scaleY;

            ctx.lineJoin = 'round';
            ctx.lineCap = 'round';
            ctx.globalCompositeOperation = 'source-over';
            ctx.beginPath();
            ctx.arc(x, y, (brushSize / 2) * scaleX, 0, Math.PI * 2); 
            ctx.fillStyle = 'rgba(239, 68, 68, 0.6)'; 
            ctx.fill();
        }
    };

    const handleRemove = async () => {
        if (!imageCanvasRef.current || !maskCanvasRef.current) return;
        
        // Fit to screen before showing the loading overlay
        resetView(imgDims.w, imgDims.h);
        setIsProcessing(true);
        
        try {
            const maskCanvas = maskCanvasRef.current;
            const imgCanvas = imageCanvasRef.current;
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = maskCanvas.width;
            tempCanvas.height = maskCanvas.height;
            const tempCtx = tempCanvas.getContext('2d');
            
            if (tempCtx) {
                const maskData = maskCanvas.getContext('2d')?.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
                if (maskData) {
                    const pixels = maskData.data;
                    for (let i = 0; i < pixels.length; i += 4) {
                        if (pixels[i + 3] > 0) {
                            pixels[i] = 255; pixels[i + 1] = 255; pixels[i + 2] = 255; pixels[i + 3] = 255;
                        } else {
                            pixels[i] = 0; pixels[i + 1] = 0; pixels[i + 2] = 0; pixels[i + 3] = 255;
                        }
                    }
                    tempCtx.putImageData(maskData, 0, 0);
                }
            }

            const maskBase64 = tempCanvas.toDataURL('image/png').split(',')[1];
            const originalBase64 = imgCanvas.toDataURL('image/png').split(',')[1];

            const resultBase64 = await removeElementFromImage(originalBase64, 'image/png', maskBase64);
            const resultUrl = `data:image/png;base64,${resultBase64}`;
            
            await deductCredit();
            
            // Push current image to history before updating
            setImageHistory(prev => [...prev, currentImageSrc]);
            setCurrentImageSrc(resultUrl);
        } catch (error) {
            console.error("Magic Eraser failed", error);
            alert("Failed to remove element. Please try again.");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleApply = () => {
        onSave(currentImageSrc);
        onClose();
    };

    const canUndo = maskHistory.length > 1 || imageHistory.length > 0;
    const hasDrawn = maskHistory.length > 1;

    return createPortal(
        <div className="fixed inset-0 z-[300] bg-white/95 backdrop-blur-xl flex flex-col overflow-hidden animate-fadeIn">
            {/* Header */}
            <div className="flex items-center justify-between px-8 py-5 bg-white border-b border-gray-100 shrink-0 z-50">
                <div className="flex items-center gap-4">
                    <MagicWandIcon className="w-8 h-8 text-indigo-600"/>
                    <div>
                        <h2 className="text-gray-900 font-black text-xl tracking-tight leading-none">Magic Editor</h2>
                        <p className="text-gray-500 text-[11px] font-medium mt-1.5">
                            Erase unwanted objects and reconstruct the background perfectly.
                        </p>
                    </div>
                </div>
                
                <div className="flex items-center gap-4">
                    <button 
                        onClick={handleUndo} 
                        disabled={!canUndo || isProcessing}
                        className="p-3 bg-gray-50 hover:bg-gray-100 rounded-2xl text-gray-700 transition-all disabled:opacity-20 flex items-center gap-2 text-xs font-bold shadow-sm"
                        title="Undo (Ctrl+Z)"
                    >
                        <UndoIcon className="w-4 h-4" /> Undo
                    </button>
                    <div className="h-8 w-px bg-gray-100"></div>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-red-500 transition-colors">
                        <XIcon className="w-8 h-8" />
                    </button>
                </div>
            </div>

            {/* Canvas Workspace */}
            <div 
                ref={containerRef}
                className={`flex-1 relative bg-[#F8FAFC] flex items-center justify-center select-none overflow-auto custom-scrollbar ${isProcessing ? 'cursor-wait' : isSpacePanning || isPanning ? 'cursor-grab active:cursor-grabbing' : 'cursor-crosshair'}`}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                style={{ overscrollBehavior: 'none' }}
            >
                <div 
                    className="relative shadow-2xl transition-transform duration-75 ease-out origin-center"
                    style={{ 
                        width: imgDims.w, 
                        height: imgDims.h,
                        transform: `scale(${zoomLevel})` 
                    }}
                >
                    <canvas ref={imageCanvasRef} className="absolute inset-0 z-10" />
                    <canvas ref={maskCanvasRef} className="absolute inset-0 z-20 pointer-events-none opacity-60" />
                </div>

                {/* Processing Overlay */}
                {isProcessing && (
                    <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-white/70 backdrop-blur-md animate-fadeIn">
                        <div className="w-20 h-20 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mb-8"></div>
                        <div className="w-64 h-1.5 bg-gray-100 rounded-full overflow-hidden shadow-inner mb-4 border border-gray-200">
                            <div className="h-full bg-gradient-to-r from-blue-400 to-purple-500 animate-[progress_2s_ease-in-out_infinite] rounded-full"></div>
                        </div>
                        <p className="text-sm font-bold text-gray-800 tracking-[0.2em] uppercase animate-pulse">{loadingText}</p>
                        <style>{`@keyframes progress { 0% { width: 0%; margin-left: 0; } 50% { width: 100%; margin-left: 0; } 100% { width: 0%; margin-left: 100%; } }`}</style>
                    </div>
                )}
            </div>

            {/* Unified Bottom Control Bar */}
            <div className="bg-white border-t border-gray-100 px-10 py-6 flex flex-col lg:flex-row items-center justify-between gap-8 shrink-0 z-50 shadow-[0_-10px_30px_-15px_rgba(0,0,0,0.05)]">
                
                {/* Left: Brush Settings */}
                <div className="flex items-center gap-10 w-full md:w-auto">
                    <div className="flex flex-col gap-2 w-full sm:w-80">
                        <div className="flex justify-between text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
                            <span>Brush Size</span>
                            <span>{brushSize}px</span>
                        </div>
                        <input 
                            type="range" 
                            min="5" 
                            max="200" 
                            value={brushSize} 
                            onChange={(e) => setBrushSize(parseInt(e.target.value))}
                            className="w-full h-1.5 bg-gray-100 rounded-full appearance-none cursor-pointer accent-indigo-600 hover:accent-indigo-400 transition-all"
                        />
                    </div>
                </div>

                {/* Center: Instructions & Zoom Status */}
                <div className="flex items-center gap-6">
                    {/* Integrated Instructions */}
                    <div className="hidden xl:flex items-center gap-4 px-5 py-2.5 rounded-2xl bg-gray-50 border border-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-widest pointer-events-none">
                        <span className="flex items-center gap-1.5 text-indigo-500"><PencilIcon className="w-3.5 h-3.5" /> Paint</span>
                        <div className="w-1 h-1 bg-gray-300 rounded-full"></div>
                        <span>Space + Drag to Pan</span>
                        <div className="w-1 h-1 bg-gray-300 rounded-full"></div>
                        <span>Scroll to Zoom</span>
                    </div>

                    <div className="flex items-center gap-4 bg-gray-50 px-5 py-2.5 rounded-full border border-gray-100 shadow-inner">
                        <button onClick={() => setZoomLevel(prev => Math.max(prev - 0.25, MIN_ZOOM))} className="text-gray-400 hover:text-gray-900 transition-colors"><ZoomOutIcon className="w-4 h-4"/></button>
                        <span className="text-[10px] font-mono font-bold text-indigo-600 w-12 text-center">{Math.round(zoomLevel * 100)}%</span>
                        <button onClick={() => setZoomLevel(prev => Math.min(prev + 0.25, MAX_ZOOM))} className="text-gray-400 hover:text-gray-900 transition-colors"><ZoomInIcon className="w-4 h-4"/></button>
                    </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-6 w-full md:w-auto">
                    <div className="flex flex-col items-center mr-4">
                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1.5">Usage Fee</span>
                        <div className="flex items-center gap-1.5 bg-gray-50 px-4 py-2 rounded-xl border border-gray-100 shadow-inner">
                            <CreditCoinIcon className="w-3.5 h-3.5 text-yellow-500" />
                            <span className="text-xs font-black text-gray-800">2 Credits</span>
                        </div>
                    </div>

                    <div className="flex gap-3 flex-1 md:flex-none">
                        <button 
                            onClick={handleApply}
                            disabled={isProcessing}
                            className="flex-1 md:flex-none px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest text-gray-500 bg-gray-50 hover:bg-gray-100 transition-all border border-gray-200 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-20"
                        >
                            Apply Changes
                        </button>
                        <button 
                            onClick={handleRemove}
                            disabled={isProcessing || !hasDrawn}
                            className="flex-1 md:flex-none px-10 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] text-[#1A1A1E] bg-[#F9D230] hover:bg-[#dfbc2b] transition-all shadow-xl shadow-yellow-500/20 active:scale-95 disabled:bg-gray-50 disabled:text-gray-300 disabled:shadow-none"
                        >
                            Remove Selected
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};