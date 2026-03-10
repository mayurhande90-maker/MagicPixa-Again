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
    const startTimeRef = useRef<number | null>(null);
    const timerRef = useRef<number | null>(null);

    useEffect(() => {
        if (isLoading) {
            startTimeRef.current = performance.now();
            setProgress(0);
            
            const updateProgress = () => {
                if (!startTimeRef.current) return;
                
                const now = performance.now();
                const elapsed = (now - startTimeRef.current) / 1000; // in seconds
                let nextVal = 0;

                if (elapsed <= 10) {
                    // 0s to 10s: 0% to 20%
                    nextVal = (elapsed / 10) * 20;
                } else if (elapsed <= 20) {
                    // 10s to 20s: 20% to 50%
                    nextVal = 20 + ((elapsed - 10) / 10) * 30;
                } else if (elapsed <= 35) {
                    // 20s to 35s: 50% to 85%
                    nextVal = 50 + ((elapsed - 20) / 15) * 35;
                } else {
                    // 35s+: Slow crawl towards 99%
                    // We want to move from 85% to 99% very slowly
                    const crawlElapsed = elapsed - 35;
                    // Asymptotic crawl: 85 + 14 * (1 - e^(-t/30))
                    nextVal = 85 + (14 * (1 - Math.exp(-crawlElapsed / 30))); 
                }
                
                setProgress(Math.min(99, nextVal));
                timerRef.current = requestAnimationFrame(updateProgress);
            };
            
            timerRef.current = requestAnimationFrame(updateProgress);
        } else {
            if (timerRef.current) {
                cancelAnimationFrame(timerRef.current);
            }
            // When loading finishes, jump to 100 if we were actually loading
            setProgress(prev => prev > 0 ? 100 : 0);
            startTimeRef.current = null;
        }

        return () => {
            if (timerRef.current) {
                cancelAnimationFrame(timerRef.current);
            }
        };
    }, [isLoading]);

    return progress;
};
