import { useState, useEffect, useRef } from 'react';

/**
 * Custom hook to simulate progress for AI generation tasks.
 * Uses a 3-phase realistic progress engine:
 * 1. Phase 1 (0-60%): Fast initial progress.
 * 2. Phase 2 (60-85%): Steady medium-paced progress.
 * 3. Phase 3 (85-98%): Asymptotic slow-down.
 * 4. Final: Jump to 100% when loading finishes.
 */
export const useSimulatedProgress = (isLoading: boolean) => {
    const [progress, setProgress] = useState(0);
    const timerRef = useRef<number | null>(null);

    useEffect(() => {
        if (isLoading) {
            setProgress(0);
            
            const updateProgress = () => {
                setProgress(prev => {
                    let nextVal = prev;
                    if (prev < 60) {
                        nextVal += 0.8; // Phase 1: Fast
                    } else if (prev < 85) {
                        nextVal += 0.3; // Phase 2: Steady
                    } else if (prev < 98) {
                        // Phase 3: Asymptotic slow-down
                        // The closer to 98, the slower it moves
                        const remaining = 98 - prev;
                        nextVal += remaining * 0.01; 
                    }
                    
                    // Cap at 98.5% until loading finishes
                    return Math.min(98.5, nextVal);
                });
                
                timerRef.current = requestAnimationFrame(updateProgress);
            };
            
            timerRef.current = requestAnimationFrame(updateProgress);
        } else {
            if (timerRef.current) {
                cancelAnimationFrame(timerRef.current);
            }
            // When loading finishes, jump to 100 if we were actually loading
            setProgress(prev => prev > 0 ? 100 : 0);
        }

        return () => {
            if (timerRef.current) {
                cancelAnimationFrame(timerRef.current);
            }
        };
    }, [isLoading]);

    return progress;
};
