import { useState, useEffect, useRef } from 'react';

/**
 * Custom hook to simulate progress for AI generation tasks.
 * Uses an asymptotic curve (Zeno's Paradox) so it never technically stops moving,
 * matching high-end mobile experiences.
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
                
                // Asymptotic curve: progress = 100 * (1 - e^(-elapsed / k))
                // Reaches ~95% at the 'duration' mark, then continues infinitely slower towards 100%
                const k = duration / 3;
                const baseProgress = 100 * (1 - Math.exp(-elapsed / k));
                
                // Add subtle "active" jitter to make it feel like real-time processing
                const jitter = (Math.sin(elapsed / 500) * 0.1) + (Math.sin(elapsed / 1200) * 0.05);
                
                setProgress(prev => {
                    const nextVal = baseProgress + jitter;
                    // Cap at 99.9% so it never looks "finished" until the server responds
                    return Math.min(99.9, Math.max(prev, nextVal));
                });
                
                timerRef.current = requestAnimationFrame(updateProgress);
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
