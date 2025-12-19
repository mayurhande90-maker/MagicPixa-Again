import React, { useRef, useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
/* Fixed: Imported missing CreditCoinIcon */
import { XIcon, UndoIcon, MagicWandIcon, CheckIcon, ZoomInIcon, ZoomOutIcon, PencilIcon, HandRaisedIcon, CreditCoinIcon } from './icons';
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

    const [history, setHistory] = useState<ImageData[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [currentImageSrc, setCurrentImageSrc] = useState(imageUrl);
    const [zoomLevel, setZoomLevel] = useState(1);
    const [imgDims, setImgDims] = useState({ w: 0, h: 0 });
    const [loadingText, setLoadingText] = useState("Initializing...");

    const MIN_ZOOM = 0.5;
    const MAX_ZOOM = 4.0;

    // Loading Animation Cycle
    useEffect(() => {
        let interval: any;
        if (isProcessing) {
            const steps = [
                "Pixa is identifying objects...",
                "Synthesizing background textures...",
                "Harmonizing light and shadows...",
                "Polishing pixels for realism...",
                "Finalizing high-res output..."
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
        const fitZoom = Math.min(
            (window.innerWidth * 0.9) / width,
            (window.innerHeight * 0.7) / height,
            1
        );
        setZoomLevel(Math.max(fitZoom, MIN_ZOOM));
        
        if (containerRef.current) {
            setTimeout(() => {
                if (containerRef.current) {
                    const scrollX = (width * fitZoom - containerRef.current.clientWidth) / 2;
                    const scrollY = (height * fitZoom - containerRef.current.clientHeight) / 2;
                    containerRef.current.scrollTo(Math.max(0, scrollX), Math.max(0, scrollY));
                }
            }, 10);
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
                    // Reset mask on image change
                    maskCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
                    setHistory([maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height)]);
                }
                
                if (zoomLevel === 1) {
                    resetView(img.width, img.height);
                }
            }
        };
    }, [currentImageSrc, resetView]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.code === 'Space' && !e.repeat) {
                e.preventDefault();
                setIsSpacePanning(true);
            }
            if (e.ctrlKey && e.code === 'KeyZ') {
                handleUndo();
            }
        };
        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.code === 'Space') {
                e.preventDefault();
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
    }, [history]);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const handleWheel = (e: WheelEvent) => {
            e.preventDefault();
            if (isProcessing) return;
            const zoomSensitivity = 0.001; 
            const delta = -e.deltaY * zoomSensitivity;
            setZoomLevel(prev => Math.min(Math.max(prev + delta, MIN_ZOOM), MAX_ZOOM));
        };

        container.addEventListener('wheel', handleWheel, { passive: false });
        return () => container.removeEventListener('wheel', handleWheel);
    }, [isProcessing]);

    const saveHistory = () => {
        const maskCanvas = maskCanvasRef.current;
        const ctx = maskCanvas?.getContext('2d');
        if (maskCanvas && ctx) {
            setHistory(prev => [...prev, ctx.getImageData(0, 0, maskCanvas.width, maskCanvas.height)]);
        }
    };

    const handleUndo = () => {
        if (history.length > 1) {
            const newHistory = [...history];
            newHistory.pop();
            const previousState = newHistory[newHistory.length - 1];
            setHistory(newHistory);
            
            const maskCanvas = maskCanvasRef.current;
            const ctx = maskCanvas?.getContext('2d', { willReadFrequently: true });
            if (maskCanvas && ctx && previousState) {
                ctx.putImageData(previousState, 0, 0);
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
            saveHistory();
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
                        // Binary mask: If alpha > 0 (drawn), make it white, else black
                        if (pixels[i + 3] > 0) {
                            pixels[i] = 255;
                            pixels[i + 1] = 255;
                            pixels[i + 2] = 255;
                            pixels[i + 3] = 255;
                        } else {
                            pixels[i] = 0;
                            pixels[i + 1] = 0;
                            pixels[i + 2] = 0;
                            pixels[i + 3] = 255;
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

    const hasDrawn = history.length > 1;

    return createPortal(
        <div className="fixed inset-0 z-[300] bg-black/95 backdrop-blur-xl flex flex-col overflow-hidden animate-fadeIn">
            {/* Minimal Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-black/20 border-b border-white/5 shrink-0 z-50">
                <div className="flex items-center gap-4">
                    <MagicWandIcon className="w-8 h-8"/>
                    <div>
                        <h2 className="text-white font-black text-lg tracking-tight">Magic Editor</h2>
                        <p className="text-white/40 text-[10px] uppercase font-bold tracking-widest">Powered by Gemini 3 Pro</p>
                    </div>
                </div>
                
                <div className="flex items-center gap-3">
                    <button 
                        onClick={handleUndo} 
                        disabled={!hasDrawn || isProcessing}
                        className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-white/70 hover:text-white transition-all disabled:opacity-20 flex items-center gap-2 text-xs font-bold"
                        title="Undo (Ctrl+Z)"
                    >
                        <UndoIcon className="w-4 h-4" /> Undo
                    </button>
                    <div className="w-px h-6 bg-white/10"></div>
                    <button onClick={onClose} className="p-2 text-white/40 hover:text-white transition-colors">
                        <XIcon className="w-6 h-6" />
                    </button>
                </div>
            </div>

            {/* Canvas Workspace */}
            <div 
                ref={containerRef}
                className={`flex-1 relative bg-neutral-900/50 flex items-center justify-center select-none overflow-auto custom-scrollbar ${isProcessing ? 'cursor-wait' : isSpacePanning || isPanning ? 'cursor-grab active:cursor-grabbing' : 'cursor-crosshair'}`}
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

                {/* Shared Generation Animation Overlay */}
                {isProcessing && (
                    <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-black/70 backdrop-blur-md animate-fadeIn">
                        <div className="w-20 h-20 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mb-8"></div>
                        <div className="w-64 h-1.5 bg-gray-700 rounded-full overflow-hidden shadow-inner mb-4">
                            <div className="h-full bg-gradient-to-r from-blue-400 to-purple-500 animate-[progress_2s_ease-in-out_infinite] rounded-full"></div>
                        </div>
                        <p className="text-sm font-bold text-white tracking-[0.2em] uppercase animate-pulse">{loadingText}</p>
                        <style>{`@keyframes progress { 0% { width: 0%; margin-left: 0; } 50% { width: 100%; margin-left: 0; } 100% { width: 0%; margin-left: 100%; } }`}</style>
                    </div>
                )}
            </div>

            {/* Unified Bottom Control Bar */}
            <div className="bg-[#1A1A1E] border-t border-white/10 px-8 py-6 flex flex-col md:flex-row items-center justify-between gap-8 shrink-0 z-50">
                
                {/* Left: Interactions & Brush */}
                <div className="flex items-center gap-8 w-full md:w-auto">
                    <div className="flex bg-white/5 p-1 rounded-2xl border border-white/5">
                        <button 
                            onClick={() => setIsSpacePanning(false)}
                            className={`p-3 rounded-xl transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest ${!isSpacePanning ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-white/40 hover:text-white'}`}
                        >
                            <PencilIcon className="w-4 h-4"/> Edit
                        </button>
                        <button 
                            onClick={() => setIsSpacePanning(true)}
                            className={`p-3 rounded-xl transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest ${isSpacePanning ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-white/40 hover:text-white'}`}
                        >
                            <HandRaisedIcon className="w-4 h-4"/> Pan
                        </button>
                    </div>

                    <div className="h-10 w-px bg-white/5"></div>

                    <div className="flex flex-col gap-2 w-full sm:w-64">
                        <div className="flex justify-between text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">
                            <span>Brush Size</span>
                            <span>{brushSize}px</span>
                        </div>
                        <input 
                            type="range" 
                            min="10" 
                            max="150" 
                            value={brushSize} 
                            onChange={(e) => setBrushSize(parseInt(e.target.value))}
                            className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-white hover:accent-indigo-400 transition-all"
                        />
                    </div>
                </div>

                {/* Center: Zoom Status */}
                <div className="hidden lg:flex items-center gap-4 bg-white/5 px-4 py-2 rounded-full border border-white/5">
                    <button onClick={() => setZoomLevel(prev => Math.max(prev - 0.25, MIN_ZOOM))} className="text-white/40 hover:text-white transition-colors"><ZoomOutIcon className="w-4 h-4"/></button>
                    <span className="text-[10px] font-mono font-bold text-indigo-400 w-12 text-center">{Math.round(zoomLevel * 100)}%</span>
                    <button onClick={() => setZoomLevel(prev => Math.min(prev + 0.25, MAX_ZOOM))} className="text-white/40 hover:text-white transition-colors"><ZoomInIcon className="w-4 h-4"/></button>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="flex flex-col items-center mr-4">
                        <span className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] mb-1">Cost</span>
                        <div className="flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
                            <CreditCoinIcon className="w-3.5 h-3.5 text-indigo-400" />
                            <span className="text-xs font-black text-white">2 Credits</span>
                        </div>
                    </div>

                    <div className="flex gap-3 flex-1 md:flex-none">
                        <button 
                            onClick={handleApply}
                            disabled={isProcessing}
                            className="flex-1 md:flex-none px-8 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest text-indigo-400 bg-indigo-400/10 hover:bg-indigo-400/20 transition-all border border-indigo-400/20 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-20"
                        >
                            Apply Results
                        </button>
                        <button 
                            onClick={handleRemove}
                            disabled={isProcessing || !hasDrawn}
                            className="flex-1 md:flex-none px-10 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest text-black bg-[#F9D230] hover:bg-[#dfbc2b] transition-all shadow-xl shadow-yellow-500/10 active:scale-95 disabled:bg-white/5 disabled:text-white/20 disabled:shadow-none"
                        >
                            Remove Selected
                        </button>
                    </div>
                </div>
            </div>
            
            {/* Shortcuts Guide Overlay */}
            <div className="absolute bottom-32 left-1/2 -translate-x-1/2 flex items-center gap-4 px-4 py-2 rounded-full bg-black/40 backdrop-blur-md border border-white/5 text-[9px] font-bold text-white/30 uppercase tracking-widest pointer-events-none">
                <span>Hold Space to Pan</span>
                <div className="w-1 h-1 bg-white/10 rounded-full"></div>
                <span>Scroll to Zoom</span>
                <div className="w-1 h-1 bg-white/10 rounded-full"></div>
                <span>Ctrl+Z to Undo</span>
            </div>
        </div>,
        document.body
    );
};