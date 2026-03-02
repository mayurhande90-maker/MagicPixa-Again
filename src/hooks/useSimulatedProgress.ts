import { useState, useEffect, useRef } from 'react';

/**
 * Custom hook to simulate progress for AI generation tasks.
 * Uses staged phases to feel realistic:
 * 1. 0-20%: Rapid jump (Initialization)
 * 2. 20-70%: Steady crawl (Core Generation)
 * 3. 70-95%: Slowdown (Refining)
 * 4. 95-99%: Micro-movements (Finalizing)
 */
export const useSimulatedProgress = (isLoading: boolean, duration: number = 20000) => {
    const [progress, setProgress] = useState(0);
    const timerRef = useRef<number | null>(null);
    const startTimeRef = useRef<number>(0);

    useEffect(() => {
        if (isLoading) {
            setProgress(0);
            startTimeRef.current = Date.now();
            
            const updateProgress = () => {
                const elapsed = Date.now() - startTimeRef.current;
                const t = Math.min(1, elapsed / duration);
                
                let baseProgress = 0;
                
                // Staged Progress Logic
                if (t < 0.1) {
                    // Phase 1: 0% - 20% (Rapid jump in first 10% of time)
                    baseProgress = (t / 0.1) * 20;
                } else if (t < 0.6) {
                    // Phase 2: 20% - 70% (Steady crawl for next 50% of time)
                    baseProgress = 20 + ((t - 0.1) / 0.5) * 50;
                } else if (t < 0.9) {
                    // Phase 3: 70% - 95% (Significant slowdown for next 30% of time)
                    baseProgress = 70 + ((t - 0.6) / 0.3) * 25;
                } else {
                    // Phase 4: 95% - 99% (Very slow micro-movements for last 10% of time)
                    baseProgress = 95 + ((t - 0.9) / 0.1) * 4;
                }
                
                // Add subtle "active" jitter to make it feel like real-time processing
                const jitter = (Math.sin(elapsed / 400) * 0.15) + (Math.sin(elapsed / 1000) * 0.1);
                
                setProgress(prev => {
                    const nextVal = baseProgress + jitter;
                    // Ensure we don't go backwards and stay within 0-99 range
                    return Math.min(99, Math.max(prev, nextVal));
                });
                
                if (t < 1) {
                    timerRef.current = requestAnimationFrame(updateProgress);
                }
            };
            
            timerRef.current = requestAnimationFrame(updateProgress);
        } else {
            if (timerRef.current) {
                cancelAnimationFrame(timerRef.current);
            }
            // When loading finishes, jump to 100
            setProgress(prev => prev > 0 ? 100 : 0);
        }

        return () => {
            if (timerRef.current) {
                cancelAnimationFrame(timerRef.current);
            }
        };
    }, [isLoading, duration]);

    return progress;
};
