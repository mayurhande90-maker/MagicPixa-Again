import { useState, useEffect, useRef } from 'react';

/**
 * Custom hook to simulate progress for AI generation tasks.
 * Starts at 0, goes up to 99% using a non-linear easing curve to feel realistic.
 * Jumps to 100% when finished.
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
                
                // Normalized time (0 to 1)
                const t = Math.min(1, elapsed / duration);
                
                // Realistic easing: starts fast, then significantly slows down (Ease-Out Quartic)
                // This makes the initial phase feel responsive and the final phase feel like "heavy lifting"
                const easedT = 1 - Math.pow(1 - t, 4);
                
                // Calculate target progress (0 to 99)
                let nextProgress = easedT * 99;
                
                // Add subtle "active" jitter to make it feel like real-time processing
                // Uses a combination of sine waves to create non-repetitive movement
                const jitter = (Math.sin(elapsed / 400) * 0.15) + (Math.sin(elapsed / 1000) * 0.1);
                
                // Ensure we don't go backwards and stay within 0-99 range
                setProgress(prev => {
                    const val = Math.max(prev, nextProgress + jitter);
                    return Math.min(99, val);
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
            // When loading finishes, we jump to 100
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
