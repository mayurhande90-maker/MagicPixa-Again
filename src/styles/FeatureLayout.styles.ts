
import { Theme } from './theme';

export const FeatureStyles = {
  // Main Wrapper - Occupies full available height
  wrapper: "flex flex-col h-full p-3 lg:p-6 bg-[#FFFFFF] overflow-hidden",
  
  // Header
  header: "flex-none mb-3 lg:mb-4 border-b border-gray-100 pb-2 lg:pb-3",
  titleRow: "flex items-center gap-3 lg:gap-4 mb-1",
  iconContainer: "p-2 lg:p-2.5 bg-gray-50 rounded-xl border border-gray-100 shadow-sm",
  titleText: `text-lg lg:text-2xl font-bold ${Theme.colors.textPrimary}`,
  description: "text-[10px] lg:text-sm text-gray-500 font-medium max-w-3xl",
  
  // Grid Container - Takes remaining space
  gridContainer: "flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-8",
  
  // Left Panel (Canvas) - Fixed height relative to viewport
  canvasContainer: "relative w-full h-[calc(100vh-180px)] lg:h-full flex flex-col justify-start min-h-0",
  canvasBox: "relative h-full w-full flex items-center justify-center p-3 lg:p-4 bg-white rounded-3xl border border-dashed border-gray-200 overflow-hidden group mx-auto shadow-sm",
  canvasImage: "max-w-full max-h-full rounded-xl shadow-md object-contain transition-all duration-700",
  canvasLoadingOverlay: "absolute inset-0 z-30 flex flex-col items-center justify-center bg-white/90 backdrop-blur-md animate-fadeIn",
  
  // Right Panel (Controls) - Fixed height relative to viewport
  controlsContainer: "relative flex flex-col h-[calc(100vh-180px)] lg:h-full min-h-0",
  controlsBox: "bg-[#F6F7FA] p-3 lg:p-5 rounded-3xl flex flex-col h-full border border-gray-100 overflow-hidden",
  controlsHeader: "flex-none flex items-center justify-between mb-3 lg:mb-4",
  controlsTitle: "text-[10px] lg:text-xs font-bold text-gray-400 uppercase tracking-wider",
  controlsScrollArea: "flex-1 overflow-y-auto custom-scrollbar pr-1 relative",
  
  // Generate Button Area
  actionArea: "flex-none pt-3 lg:pt-5 border-t border-gray-200 bg-[#F6F7FA] z-10",
  generateButton: `group w-full text-sm lg:text-lg font-bold py-2.5 lg:py-4 rounded-2xl shadow-lg transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none flex items-center justify-center gap-2 lg:gap-3 active:scale-95 ${Theme.colors.primary} ${Theme.colors.textOnPrimary} ${Theme.colors.primaryHover} shadow-yellow-500/20`,
  costBadge: "text-center mt-1.5 lg:mt-2 flex items-center justify-center gap-1.5 lg:gap-2 text-[9px] lg:text-[10px] font-bold text-gray-400 uppercase tracking-wide",
  
  // Result View
  resultContainer: "w-full h-full flex items-center justify-center bg-[#1a1a1a] rounded-3xl relative animate-fadeIn overflow-hidden shadow-inner group",
  resultImage: "w-full h-full object-contain shadow-2xl relative z-10 cursor-zoom-in transition-transform duration-300 hover:scale-[1.01]",
  resultOverlay: "absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-gray-800 to-[#1a1a1a] opacity-50",
  
  // Input Components
  inputLabel: "block text-[9px] lg:text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 lg:mb-1.5 ml-1",
  inputField: "w-full px-3 py-2.5 lg:px-5 lg:py-4 bg-white border-2 border-gray-100 hover:border-gray-300 focus:border-[#4D7CFF] rounded-2xl outline-none transition-all font-bold text-xs lg:text-base text-[#1A1A1E] placeholder-gray-400",
  
  // Selection Grid
  selectionContainer: "mb-3 lg:mb-5 animate-fadeIn",
  selectionButton: "px-2.5 py-1 lg:px-4 lg:py-2 rounded-xl text-[9px] lg:text-xs font-bold border transition-all duration-300 transform active:scale-95",
  selectionButtonActive: "bg-gradient-to-r from-blue-600 to-purple-600 text-white border-transparent shadow-md scale-105",
  selectionButtonInactive: "bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:bg-gray-50",
};
