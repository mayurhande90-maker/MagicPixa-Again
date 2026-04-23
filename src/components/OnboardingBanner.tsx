import React from 'react';
import { motion } from 'motion/react';
import { Sparkles, ArrowRight } from 'lucide-react';

interface OnboardingBannerProps {
  onClick: () => void;
}

export const OnboardingBanner: React.FC<OnboardingBannerProps> = ({ onClick }) => {
  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[90] pointer-events-auto"
    >
      <button
        onClick={onClick}
        className="group relative flex items-center gap-3 px-6 py-3 rounded-full bg-white/70 backdrop-blur-xl border border-white/40 shadow-[0_8px_32px_rgba(0,0,0,0.12)] hover:shadow-[0_12px_48px_rgba(99,102,241,0.2)] transition-all duration-500 overflow-hidden"
      >
        {/* Shimmer effect */}
        <div className="absolute inset-0 w-full h-full">
          <motion.div
            animate={{ x: ['100%', '-100%'] }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            className="absolute top-0 w-1/2 h-full bg-gradient-to-r from-transparent via-white/40 to-transparent skew-x-[-20deg]"
          />
        </div>

        {/* Progress Ring */}
        <div className="relative w-8 h-8 flex items-center justify-center">
          <svg className="w-full h-full -rotate-90">
            <circle
              cx="16"
              cy="16"
              r="14"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              className="text-indigo-100"
            />
            <motion.circle
              cx="16"
              cy="16"
              r="14"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeDasharray="88"
              initial={{ strokeDashoffset: 88 }}
              animate={{ strokeDashoffset: 88 * 0.2 }} // 80% complete
              transition={{ duration: 1.5, delay: 0.5 }}
              className="text-indigo-600"
            />
          </svg>
          <span className="absolute text-[10px] font-bold text-indigo-700">80%</span>
        </div>

        <div className="flex flex-col items-start leading-tight">
          <span className="text-[13px] font-extrabold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            Profile almost ready
          </span>
          <span className="text-[11px] text-gray-500 font-medium max-w-[200px] truncate md:max-w-none">
            Link phone to stay accessible on all devices.
          </span>
        </div>

        <div className="ml-2 w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all">
          <ArrowRight className="w-4 h-4" />
        </div>

        {/* Outer glow pulse */}
        <motion.div
          animate={{ opacity: [0.2, 0.4, 0.2], scale: [1, 1.05, 1] }}
          transition={{ duration: 3, repeat: Infinity }}
          className="absolute inset-0 rounded-full bg-indigo-400/10 blur-xl -z-10"
        />
      </button>
    </motion.div>
  );
};
