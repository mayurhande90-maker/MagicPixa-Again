import React, { useRef, useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { XIcon, UndoIcon, MagicWandIcon, CheckIcon, ZoomInIcon, ZoomOutIcon, PencilIcon } from './icons';
import { removeElementFromImage } from '../services/imageToolsService';

interface MagicEditorModalProps {
    imageUrl: string;
    onClose: () => void;
    onSave: (newImageUrl: string) => void;
    deductCredit: () => Promise<void>;
}

// Correcting line 13: Type '({ imageUrl, onClose, onSave, deductCredit }: MagicEditorModalProps) => void' is not assignable to type 'FC<MagicEditorModalProps>'.
// Added comment above fix
export const MagicEditorModal: React.FC<MagicEditorModalProps> = ({ imageUrl, onClose, onSave, deductCredit }) => {
    const imageCanvasRef = useRef<HTMLCanvasElement>(null);
    const maskCanvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    
    const [brushSize, setBrushSize] = useState(30);
    const [isSpacePanning, setIsSpacePanning] = useState(false);
    
    const [isDrawing, setIsDrawing] = useState(false);
    const [isPanning, setIsPanning] = useState(false);
    const [panStart, setPanStart] = useState({ x: 0, y: 0 });

    const [history, setHistory] = useState<ImageData[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [currentImageSrc, setCurrentImageSrc] = useState(imageUrl);
    const [zoomLevel, setZoomLevel] = useState(1);
    const [imgDims, setImgDims] = useState({ w: 0, h: 0 });

    const MIN_ZOOM = 0.5;
    const MAX_ZOOM = 5.0;

    const resetView = useCallback((width: number, height: number) => {
        const fitZoom = Math.min(
            (window.innerWidth * 0.85) / width,
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
    }, []);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const handleWheel = (e: WheelEvent) => {
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                if (isProcessing) return;
                const zoomSensitivity = 0.002; 
                const delta = -e.deltaY * zoomSensitivity;
                setZoomLevel(prev => {
                    const newZoom = prev + delta;
                    return Math.min(Math.max(newZoom, MIN_ZOOM), MAX_ZOOM);
                });
            }
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
            const ctx = maskCanvas?.getContext('2d');
            if (maskCanvas && ctx && previousState) {
                ctx.putImageData(previousState, 0, 0);
            }
        }
    };

    const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 0.25, MAX_ZOOM)); 
    const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 0.25, MIN_ZOOM)); 

    const handleMouseDown = (e: React.MouseEvent) => {
        if (isProcessing) return;

        if (isSpacePanning || e.button === 1) {
            e.preventDefault();
            setIsPanning(true);
            setPanStart({ x: e.clientX, y: e.clientY });
        } 
        else if (e.button === 0) {
            setIsDrawing(true);
            draw(e);
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (isProcessing) return;

        if (isPanning && containerRef.current) {
            e.preventDefault();
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
        if (isPanning) {
            setIsPanning(false);
        }
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

            ctx.globalCompositeOperation = 'source-over';
            ctx.beginPath();
            ctx.arc(x, y, (brushSize / 2) * scaleX, 0, Math.PI * 2); 
            ctx.fillStyle = 'rgba(255, 0, 0, 0.5)'; 
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
            
            const maskCtx = maskCanvas.getContext('2d');
            // Correcting line 259: Cannot find name 'mask'
            // Added comment above fix
            if (maskCtx) {
                maskCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
                setHistory([maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height)]);
            }
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

    // Correcting line 13: Type '... => void' is not assignable to type 'FC ...'
    // Added return statement for the component to fix the type error
    // Added comment above fix
    return createPortal(
        <div className="fixed inset-0 z-[300] bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center p-4">
            {/* Header / Toolbar */}
            <div className="w-full max-w-6xl flex items-center justify-between mb-4 bg-white/5 p-4 rounded-2xl border border-white/10 backdrop-blur-md">
                <div className="flex items-center gap-6">
                    <div className="flex flex-col">
                        <span className="text-white font-bold text-sm">Magic Eraser</span>
                        <span className="text-white/40 text-[10px] uppercase font-black tracking-widest">Powered by Gemini 3 Pro</span>
                    </div>
                    <div className="h-8 w-px bg-white/10"></div>
                    
                    {/* Brush Size */}
                    <div className="flex items-center gap-3">
                        <PencilIcon className="w-4 h-4 text-white/60" />
                        <input 
                            type="range" 
                            min="5" 
                            max="100" 
                            value={brushSize} 
                            onChange={(e) => setBrushSize(parseInt(e.target.value))}
                            className="w-24 accent-indigo-500"
                        />
                        <span className="text-white/60 text-xs font-mono w-8">{brushSize}px</span>
                    </div>

                    <div className="h-8 w-px bg-white/10"></div>

                    {/* Undo */}
                    <button 
                        onClick={handleUndo} 
                        disabled={history.length <= 1 || isProcessing}
                        className="p-2 text-white hover:bg-white/10 rounded-lg disabled:opacity-30 transition-all"
                        title="Undo (Ctrl+Z)"
                    >
                        <UndoIcon className="w-5 h-5" />
                    </button>

                    <div className="h-8 w-px bg-white/10"></div>

                    {/* Zoom */}
                    <div className="flex items-center gap-1 bg-black/20 rounded-lg p-1">
                        <button onClick={handleZoomOut} className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-md transition-all"><ZoomOutIcon className="w-4 h-4"/></button>
                        <span className="text-white/60 text-[10px] font-mono px-1">{Math.round(zoomLevel * 100)}%</span>
                        <button onClick={handleZoomIn} className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-md transition-all"><ZoomInIcon className="w-4 h-4"/></button>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button 
                        onClick={onClose}
                        className="px-4 py-2 text-white/60 hover:text-white font-bold text-xs transition-colors"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={handleRemove}
                        disabled={history.length <= 1 || isProcessing}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-indigo-500/20 flex items-center gap-2 disabled:opacity-50 transition-all active:scale-95"
                    >
                        {isProcessing ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        ) : (
                            <><MagicWandIcon className="w-4 h-4"/> Remove Element</>
                        )}
                    </button>
                    <button 
                        onClick={handleApply}
                        disabled={isProcessing}
                        className="bg-[#F9D230] hover:bg-[#dfbc2b] text-[#1A1A1E] px-6 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-yellow-500/20 flex items-center gap-2 active:scale-95 transition-all"
                    >
                        <CheckIcon className="w-4 h-4"/> Apply Changes
                    </button>
                </div>
            </div>

            {/* Canvas Container */}
            <div 
                ref={containerRef}
                className={`w-full max-w-6xl h-[70vh] bg-neutral-900 rounded-3xl border border-white/5 overflow-auto custom-scrollbar relative flex items-center justify-center select-none ${isSpacePanning || isPanning ? 'cursor-grab active:cursor-grabbing' : 'cursor-crosshair'}`}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
            >
                <div 
                    className="relative shadow-2xl transition-transform duration-75 ease-out origin-center"
                    style={{ 
                        width: imgDims.w, 
                        height: imgDims.h,
                        transform: `scale(${zoomLevel})` 
                    }}
                >
                    {/* Source Image Canvas */}
                    <canvas 
                        ref={imageCanvasRef} 
                        className="absolute inset-0 z-10"
                    />
                    {/* Mask Drawing Canvas */}
                    <canvas 
                        ref={maskCanvasRef} 
                        className="absolute inset-0 z-20 opacity-70 pointer-events-none"
                    />
                </div>

                {/* Instructions Overlay */}
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 text-[10px] font-bold text-white/60 pointer-events-none uppercase tracking-wider">
                    <span>Paint over items to remove</span>
                    <div className="w-1 h-1 bg-white/20 rounded-full"></div>
                    <span>Hold Space to pan</span>
                    <div className="w-1 h-1 bg-white/20 rounded-full"></div>
                    <span>Scroll to zoom</span>
                </div>
            </div>
        </div>,
        document.body
    );
};
