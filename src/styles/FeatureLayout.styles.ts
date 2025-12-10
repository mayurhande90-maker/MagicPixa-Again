
import { Theme } from './theme';

export const FeatureStyles = {
  // Main Wrapper
  wrapper: "flex flex-col p-6 lg:p-8 max-w-[1800px] mx-auto bg-[#FFFFFF]",
  
  // Header
  header: "mb-5 border-b border-gray-100 pb-4",
  titleRow: "flex items-center gap-4 mb-2",
  iconContainer: "p-3 bg-gray-50 rounded-2xl border border-gray-100 shadow-sm",
  titleText: `text-2xl font-bold ${Theme.colors.textPrimary}`,
  description: "text-sm text-gray-500 font-medium max-w-2xl",
  
  // Grid
  gridContainer: "grid grid-cols-1 lg:grid-cols-2 gap-8",
  
  // Left Panel (Canvas)
  canvasContainer: "w-full flex flex-col justify-start",
  canvasBox: "relative h-full w-full flex items-center justify-center p-4 bg-white rounded-3xl border border-dashed border-gray-200 overflow-hidden group mx-auto shadow-sm",
  canvasImage: "max-w-full max-h-full rounded-xl shadow-md object-contain transition-all duration-700",
  canvasLoadingOverlay: "absolute inset-0 z-30 flex flex-col items-center justify-center bg-white/90 backdrop-blur-md animate-fadeIn",
  
  // Right Panel (Controls)
  controlsContainer: "flex flex-col",
  controlsBox: "bg-[#F6F7FA] p-5 rounded-3xl flex-1 flex-col h-full border border-gray-100 overflow-hidden flex",
  controlsHeader: "flex items-center justify-between mb-4 flex-shrink-0",
  controlsTitle: "text-sm font-bold text-gray-400 uppercase tracking-wider",
  controlsScrollArea: "flex-1 overflow-y-auto custom-scrollbar pr-1 flex flex-col relative",
  
  // Generate Button Area
  actionArea: "pt-6 border-t border-gray-200 bg-[#F6F7FA] flex-shrink-0 z-10",
  generateButton: `group w-full text-lg font-bold py-4 rounded-2xl shadow-lg transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none flex items-center justify-center gap-3 active:scale-95 ${Theme.colors.primary} ${Theme.colors.textOnPrimary} ${Theme.colors.primaryHover} shadow-yellow-500/20`,
  costBadge: "text-center mt-2 flex items-center justify-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-wide",
  
  // Result View
  resultContainer: "w-full h-full flex items-center justify-center bg-[#1a1a1a] rounded-3xl relative animate-fadeIn overflow-hidden shadow-inner group",
  resultImage: "w-full h-full object-contain shadow-2xl relative z-10 cursor-zoom-in transition-transform duration-300 hover:scale-[1.01]",
  resultOverlay: "absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-gray-800 to-[#1a1a1a] opacity-50",
  
  // Input Components
  inputLabel: "block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1",
  inputField: "w-full px-5 py-4 bg-white border-2 border-gray-100 hover:border-gray-300 focus:border-[#4D7CFF] rounded-2xl outline-none transition-all font-medium text-[#1A1A1E] placeholder-gray-400",
  
  // Selection Grid
  selectionContainer: "mb-6 animate-fadeIn",
  selectionButton: "px-4 py-2 rounded-xl text-xs font-bold border transition-all duration-300 transform active:scale-95",
  selectionButtonActive: "bg-gradient-to-r from-blue-600 to-purple-600 text-white border-transparent shadow-md scale-105",
  selectionButtonInactive: "bg-white text-gray-600 border-gray-200 hover:border-gray-400 hover:text-gray-900 hover:shadow-sm",
};
