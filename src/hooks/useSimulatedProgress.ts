import { useState, useEffect, useRef } from 'react';

/**
 * Custom hook to simulate progress for AI generation tasks.
 * Starts at 0, goes up to 99% over a specified duration, then jumps to 100% when finished.
 */
export const useSimulatedProgress = (isLoading: boolean, duration: number = 15000) => {
    const [progress, setProgress] = useState(0);
    const timerRef = useRef<any>(null);
    const startTimeRef = useRef<number>(0);

    useEffect(() => {
        if (isLoading) {
            setProgress(0);
            startTimeRef.current = Date.now();
            
            const updateProgress = () => {
                const elapsed = Date.now() - startTimeRef.current;
                const percentage = Math.min(99, (elapsed / duration) * 100);
                
                // Slow down as we get closer to 99%
                if (percentage > 90) {
                    const remaining = 99 - percentage;
                    const slowedPercentage = percentage + (remaining * 0.05);
                    setProgress(slowedPercentage);
                } else {
                    setProgress(percentage);
                }
                
                if (percentage < 99) {
                    timerRef.current = requestAnimationFrame(updateProgress);
                }
            };
            
            timerRef.current = requestAnimationFrame(updateProgress);
        } else {
            if (timerRef.current) {
                cancelAnimationFrame(timerRef.current);
            }
            // When loading finishes, we jump to 100 briefly before it disappears
            if (progress > 0) {
                setProgress(100);
            }
        }

        return () => {
            if (timerRef.current) {
                cancelAnimationFrame(timerRef.current);
            }
        };
    }, [isLoading]);

    return progress;
};
