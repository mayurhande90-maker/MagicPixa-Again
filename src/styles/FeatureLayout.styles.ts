import { Theme } from './theme';

export const FeatureStyles = {
  // Main Wrapper - Occupies full available height
  wrapper: "flex flex-col h-full p-[min(1.5vh,24px)] lg:p-[min(2vh,32px)] bg-[#FFFFFF] overflow-hidden",
  
  // Header
  header: "flex-none mb-[min(1.5vh,16px)] border-b border-gray-100 pb-[min(1.2vh,12px)]",
  titleRow: "flex items-center gap-[min(1.5vh,16px)] mb-0.5",
  iconContainer: "p-[min(0.8vh,10px)] bg-gray-50 rounded-xl border border-gray-100 shadow-sm",
  titleText: `text-[clamp(16px,2.5vh,24px)] font-bold ${Theme.colors.textPrimary}`,
  description: "text-[clamp(9px,1.3vh,14px)] text-gray-500 font-medium max-w-3xl leading-snug",
  
  // Grid Container - Takes remaining space
  gridContainer: "flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-[min(2vh,32px)]",
  
  // Left Panel (Canvas) - Fixed height relative to viewport
  canvasContainer: "relative w-full h-[calc(100vh-180px)] lg:h-full flex flex-col justify-start min-h-0",
  canvasBox: "relative h-full w-full flex items-center justify-center p-[min(1.5vh,16px)] bg-white rounded-3xl border border-dashed border-gray-200 overflow-hidden group mx-auto shadow-sm",
  canvasImage: "max-w-full max-h-full rounded-xl shadow-md object-contain transition-all duration-700",
  canvasLoadingOverlay: "absolute inset-0 z-30 flex flex-col items-center justify-center bg-white/90 backdrop-blur-md animate-fadeIn",
  
  // Right Panel (Controls) - Fixed height relative to viewport
  controlsContainer: "relative flex flex-col h-[calc(100vh-180px)] lg:h-full min-h-0",
  controlsBox: "bg-[#F6F7FA] p-[min(2vh,20px)] rounded-3xl flex flex-col h-full border border-gray-100 overflow-hidden",
  controlsHeader: "flex-none flex items-center justify-between mb-[min(1.2vh,12px)]",
  controlsTitle: "text-[clamp(9px,1.2vh,12px)] font-bold text-gray-400 uppercase tracking-wider",
  controlsScrollArea: "flex-1 overflow-y-auto custom-scrollbar pr-1 relative",
  
  // Generate Button Area
  actionArea: "flex-none pt-[min(1.2vh,16px)] border-t border-gray-200 bg-[#F6F7FA] z-10",
  generateButton: `group w-full text-[clamp(12px,1.8vh,18px)] font-bold py-[min(1.5vh,16px)] rounded-2xl shadow-lg transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none flex items-center justify-center gap-2 lg:gap-3 active:scale-95 ${Theme.colors.primary} ${Theme.colors.textOnPrimary} ${Theme.colors.primaryHover} shadow-yellow-500/20`,
  costBadge: "text-center mt-1 lg:mt-1.5 flex items-center justify-center gap-1.5 lg:gap-2 text-[clamp(8px,1vh,10px)] font-bold text-gray-400 uppercase tracking-wide",
  
  // Result View
  resultContainer: "w-full h-full flex items-center justify-center bg-[#1a1a1a] rounded-3xl relative animate-fadeIn overflow-hidden shadow-inner group",
  resultImage: "w-full h-full object-contain shadow-2xl relative z-10 cursor-zoom-in transition-transform duration-300 hover:scale-[1.01]",
  resultOverlay: "absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-gray-800 to-[#1a1a1a] opacity-50",
  
  // Input Components
  inputLabel: "block text-[clamp(8px,1.1vh,11px)] font-bold text-gray-400 uppercase tracking-wider mb-1 lg:mb-1.5 ml-1",
  inputField: "w-full px-3 py-[min(1.2vh,14px)] bg-white border-2 border-gray-100 hover:border-gray-300 focus:border-[#4D7CFF] rounded-2xl outline-none transition-all font-bold text-[clamp(11px,1.5vh,14px)] text-[#1A1A1E] placeholder-gray-400",
  
  // Selection Grid
  selectionContainer: "mb-[min(2vh,20px)] animate-fadeIn",
  selectionButton: "px-2.5 py-[min(1vh,8px)] rounded-xl text-[clamp(8px,1.1vh,11px)] font-bold border transition-all duration-300 transform active:scale-95",
  selectionButtonActive: "bg-gradient-to-r from-blue-600 to-purple-600 text-white border-transparent shadow-md scale-105",
  selectionButtonInactive: "bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:bg-gray-50",
};