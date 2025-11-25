
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

export const MagicEditorModal: React.FC<MagicEditorModalProps> = ({ imageUrl, onClose, onSave, deductCredit }) => {
    const imageCanvasRef = useRef<HTMLCanvasElement>(null);
    const maskCanvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    
    const [brushSize, setBrushSize] = useState(30);
    const [isSpacePanning, setIsSpacePanning] = useState(false);
    
    const [isDrawing, setIsDrawing] = useState(false);
    const [isPanning, setIsPanning] = useState(false);
    const [panStart, setPanStart] = useState({ x: 0, y: 0 });

    // History now stores the ImageData of the MASK canvas only, as the base image doesn't change during edit
    const [history, setHistory] = useState<ImageData[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [currentImageSrc, setCurrentImageSrc] = useState(imageUrl);
    const [zoomLevel, setZoomLevel] = useState(1);
    
    // Image Dimensions
    const [imgDims, setImgDims] = useState({ w: 0, h: 0 });

    // Zoom Limits
    const MIN_ZOOM = 0.5;
    const MAX_ZOOM = 5.0;

    // Helper to Fit Image to Screen
    const resetView = useCallback((width: number, height: number) => {
        const fitZoom = Math.min(
            (window.innerWidth * 0.85) / width,
            (window.innerHeight * 0.7) / height,
            1
        );
        setZoomLevel(Math.max(fitZoom, MIN_ZOOM));
        
        // Center scroll
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

    // Initialize Canvases
    useEffect(() => {
        const img = new Image();
        img.src = currentImageSrc;
        img.crossOrigin = "anonymous";
        img.onload = () => {
            setImgDims({ w: img.width, h: img.height });
            
            const imgCanvas = imageCanvasRef.current;
            const maskCanvas = maskCanvasRef.current;
            
            if (imgCanvas && maskCanvas) {
                // Set internal resolution to native image size
                imgCanvas.width = img.width;
                imgCanvas.height = img.height;
                maskCanvas.width = img.width;
                maskCanvas.height = img.height;
                
                const imgCtx = imgCanvas.getContext('2d');
                const maskCtx = maskCanvas.getContext('2d');
                
                if (imgCtx && maskCtx) {
                    imgCtx.drawImage(img, 0, 0);
                    // Clear mask initially
                    maskCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
                    // Save initial empty mask state
                    setHistory([maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height)]);
                }
                
                // Initial Auto-Fit only if this is the first load (zoomLevel is 1)
                if (zoomLevel === 1) {
                    resetView(img.width, img.height);
                }
            }
        };
    }, [currentImageSrc, resetView]);

    // Keyboard Listeners for Spacebar Panning
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.code === 'Space' && !e.repeat) {
                e.preventDefault(); // Prevent page scroll
                setIsSpacePanning(true);
            }
        };
        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.code === 'Space') {
                e.preventDefault();
                setIsSpacePanning(false);
                setIsPanning(false); // Stop panning if key released mid-drag
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, []);

    // Scroll Handling (Scroll = Zoom, no Ctrl required)
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const handleWheel = (e: WheelEvent) => {
            e.preventDefault(); // Always prevent default scroll
            
            if (isProcessing) return; // Disable zoom during processing

            // Direct Zoom with Wheel
            const zoomSensitivity = 0.002; 
            const delta = -e.deltaY * zoomSensitivity;

            setZoomLevel(prev => {
                const newZoom = prev + delta;
                return Math.min(Math.max(newZoom, MIN_ZOOM), MAX_ZOOM);
            });
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
            newHistory.pop(); // Remove current
            const previousState = newHistory[newHistory.length - 1];
            setHistory(newHistory);
            
            const maskCanvas = maskCanvasRef.current;
            const ctx = maskCanvas?.getContext('2d');
            if (maskCanvas && ctx && previousState) {
                ctx.putImageData(previousState, 0, 0);
            }
        }
    };

    // Zoom Logic (Buttons)
    const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 0.25, MAX_ZOOM)); 
    const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 0.25, MIN_ZOOM)); 

    // Interaction Handlers
    const handleMouseDown = (e: React.MouseEvent) => {
        if (isProcessing) return; // Block interactions

        // Pan Trigger: Spacebar held OR Middle Mouse Button
        if (isSpacePanning || e.button === 1) {
            e.preventDefault();
            setIsPanning(true);
            setPanStart({ x: e.clientX, y: e.clientY });
        } 
        // Draw Trigger: Left Mouse Button
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

    // Draw Function
    const draw = (e: React.MouseEvent) => {
        if (!isDrawing) return;
        const maskCanvas = maskCanvasRef.current;
        const ctx = maskCanvas?.getContext('2d');
        
        if (maskCanvas && ctx) {
            const rect = maskCanvas.getBoundingClientRect();
            
            // Calculate scale ratio between visual size and internal resolution
            const scaleX = maskCanvas.width / rect.width;
            const scaleY = maskCanvas.height / rect.height;

            const x = (e.clientX - rect.left) * scaleX;
            const y = (e.clientY - rect.top) * scaleY;

            ctx.globalCompositeOperation = 'source-over';
            ctx.beginPath();
            
            // Draw relative to visual brush size
            const scaledBrush = brushSize * scaleX;
            
            ctx.arc(x, y, scaledBrush / 2, 0, Math.PI * 2); 
            
            // Draw Solid Red. The opacity is handled by CSS on the canvas element.
            ctx.fillStyle = '#FF0000'; 
            ctx.fill();
        }
    };

    // Generate Mask & Process
    const handleRemove = async () => {
        if (!imageCanvasRef.current || !maskCanvasRef.current) return;
        
        // 1. IMMEDIATE UI FEEDBACK: Reset View & Start Loader
        resetView(imgDims.w, imgDims.h);
        setIsProcessing(true);

        try {
            await deductCredit();

            const maskCanvas = maskCanvasRef.current;
            const imgCanvas = imageCanvasRef.current;
            
            // 2. Generate Binary Mask for AI
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = maskCanvas.width;
            tempCanvas.height = maskCanvas.height;
            const tempCtx = tempCanvas.getContext('2d');
            
            if (tempCtx) {
                const maskData = maskCanvas.getContext('2d')?.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
                if (maskData) {
                    const pixels = maskData.data;
                    for (let i = 0; i < pixels.length; i += 4) {
                        // Alpha channel check. If drawn (alpha > 0), make it BLACK (Remove). Else WHITE (Keep).
                        if (pixels[i + 3] > 0) {
                            pixels[i] = 0;     // R
                            pixels[i + 1] = 0; // G
                            pixels[i + 2] = 0; // B
                            pixels[i + 3] = 255; // Alpha full
                        } else {
                            pixels[i] = 255;   // R
                            pixels[i + 1] = 255; // G
                            pixels[i + 2] = 255; // B
                            pixels[i + 3] = 255; // Alpha full
                        }
                    }
                    tempCtx.putImageData(maskData, 0, 0);
                }
            }

            const maskBase64 = tempCanvas.toDataURL('image/png').split(',')[1];
            const originalBase64 = imgCanvas.toDataURL('image/png').split(',')[1];

            // Send to AI
            const resultBase64 = await removeElementFromImage(originalBase64, 'image/png', maskBase64);
            const resultUrl = `data:image/png;base64,${resultBase64}`;
            
            setCurrentImageSrc(resultUrl);
            
        } catch (e) {
            console.error(e);
            alert("Edit failed. Please try again.");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDone = () => {
        // Only trigger save if the image actually changed
        if (currentImageSrc !== imageUrl) {
            onSave(currentImageSrc);
        }
        onClose();
    };

    // Determine Cursor Style
    let cursorStyle = 'cursor-default';
    if (isProcessing) {
        cursorStyle = 'cursor-wait';
    } else if (isSpacePanning || isPanning) {
        cursorStyle = 'cursor-grab';
        if (isPanning) document.body.style.cursor = 'grabbing';
    } else {
        cursorStyle = 'cursor-crosshair';
        document.body.style.cursor = 'default';
    }

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
                        <p className="text-xs text-gray-500 mt-1 ml-11">Highlight unwanted objects to remove them instantly.</p>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        {history.length > 1 && !isProcessing && (
                            <button 
                                onClick={handleUndo} 
                                className="p-2 rounded-full hover:bg-gray-100 text-gray-500 hover:text-[#1A1A1E] transition-colors flex items-center gap-2 text-sm font-medium"
                                title="Undo last stroke"
                            >
                                <UndoIcon className="w-5 h-5"/> Undo
                            </button>
                        )}
                        <button 
                            onClick={onClose} 
                            disabled={isProcessing}
                            className="p-2 rounded-full hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
                            title="Close without saving"
                        >
                            <XIcon className="w-6 h-6"/>
                        </button>
                    </div>
                </div>

                {/* Main Workspace */}
                <div 
                    ref={containerRef}
                    className={`flex-1 bg-[#f0f0f0] relative flex items-center justify-center ${cursorStyle} ${isProcessing ? 'overflow-hidden' : 'overflow-auto'}`}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    style={{ overscrollBehavior: 'none' }} // Prevent browser back swipe
                >
                    <div className="relative m-auto p-20"> 
                        {/* DUAL CANVAS SYSTEM */}
                        <div style={{ position: 'relative', width: imgDims.w * zoomLevel, height: imgDims.h * zoomLevel }}>
                            {/* Bottom: Base Image */}
                            <canvas
                                ref={imageCanvasRef}
                                className="shadow-2xl bg-white pointer-events-none"
                                style={{ 
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    width: '100%',
                                    height: '100%',
                                    imageRendering: 'auto',
                                    zIndex: 1
                                }}
                            />
                            {/* Top: Mask Layer (Opacity 0.5) */}
                            <canvas
                                ref={maskCanvasRef}
                                className="pointer-events-none"
                                style={{ 
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    width: '100%',
                                    height: '100%',
                                    imageRendering: 'auto',
                                    opacity: 0.5, // Visual opacity only
                                    zIndex: 2
                                }}
                            />
                        </div>
                    </div>

                    {/* Floating Controls */}
                    {!isProcessing && (
                        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 z-20">
                            <div className="flex items-center gap-4 bg-white/90 backdrop-blur shadow-2xl p-3 rounded-2xl border border-gray-200">
                                <div className="flex items-center gap-3 text-gray-500 px-2">
                                    <PencilIcon className={`w-5 h-5 ${!isSpacePanning ? 'text-[#4D7CFF]' : ''}`} />
                                    <div className="h-4 w-px bg-gray-300"></div>
                                    <span className="text-xs font-bold uppercase tracking-wider">{isSpacePanning ? 'Pan Mode' : 'Draw Mode'}</span>
                                </div>

                                <div className="w-px h-8 bg-gray-200"></div>

                                {/* Zoom Controls */}
                                <div className="flex items-center gap-2">
                                    <button onClick={handleZoomOut} className="p-2 hover:bg-gray-100 rounded-lg text-gray-600"><ZoomOutIcon className="w-5 h-5"/></button>
                                    <span className="text-xs font-mono font-bold text-gray-500 w-12 text-center">{Math.round(zoomLevel * 100)}%</span>
                                    <button onClick={handleZoomIn} className="p-2 hover:bg-gray-100 rounded-lg text-gray-600"><ZoomInIcon className="w-5 h-5"/></button>
                                </div>
                            </div>
                            <span className="text-[10px] font-bold bg-black/50 backdrop-blur-sm text-white px-3 py-1 rounded-full border border-white/10 shadow-sm">
                                Scroll to Zoom • Hold Spacebar to Pan
                            </span>
                        </div>
                    )}

                    {isProcessing && (
                        <div className="absolute inset-0 bg-white/80 flex flex-col items-center justify-center z-50 backdrop-blur-sm fixed cursor-wait">
                            <div className="w-20 h-20 border-4 border-[#F9D230] border-t-transparent rounded-full animate-spin mb-6"></div>
                            <p className="text-[#1A1A1E] font-bold text-2xl tracking-widest animate-pulse">REMOVING...</p>
                            <p className="text-gray-500 text-sm mt-2">AI is synthesizing background texture...</p>
                        </div>
                    )}
                </div>

                {/* Footer Controls */}
                <div className="px-8 py-4 bg-white border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-6 shrink-0 z-10">
                    <div className="flex items-center gap-6 w-full sm:w-auto">
                        <div className={`flex flex-col gap-2 w-full sm:w-64 transition-opacity ${isSpacePanning || isProcessing ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
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
                            disabled={isProcessing}
                            className="flex-1 sm:flex-none px-8 py-3 rounded-xl font-bold text-green-600 bg-green-50 hover:bg-green-100 transition-colors border border-green-200 flex items-center gap-2 disabled:opacity-50"
                        >
                            <CheckIcon className="w-5 h-5"/> Done
                        </button>

                        <button 
                            onClick={handleRemove} 
                            disabled={isProcessing}
                            className="flex-1 sm:flex-none bg-[#1A1A1E] text-white px-8 py-3 rounded-xl font-bold hover:bg-black transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl active:scale-95 disabled:opacity-50 disabled:transform-none disabled:cursor-wait"
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
