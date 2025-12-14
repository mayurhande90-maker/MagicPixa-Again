
import { Theme } from '../theme';

export const RealtyStyles = {
  // Main Container
  container: "space-y-8 p-2 animate-fadeIn flex flex-col h-full relative",

  // Section Headers
  sectionHeader: "flex items-center gap-3 mb-4",
  stepBadge: "flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold ring-4 ring-white",
  sectionTitle: "text-sm font-bold text-gray-800 uppercase tracking-wide",

  // Strategy/Mode Cards (Bento Style)
  strategyGrid: "grid grid-cols-2 gap-3 mb-6",
  strategyCard: "relative p-4 rounded-2xl border-2 transition-all duration-300 cursor-pointer flex flex-col items-start gap-3 group overflow-hidden text-left",
  strategyCardSelected: "bg-indigo-50 border-indigo-500 ring-1 ring-indigo-500/20 shadow-md",
  strategyCardInactive: "bg-white border-gray-100 hover:border-indigo-200 hover:shadow-sm",
  
  strategyIconBox: "p-2 rounded-lg transition-colors",
  strategyIconSelected: "bg-indigo-600 text-white shadow-sm",
  strategyIconInactive: "bg-gray-100 text-gray-400 group-hover:bg-indigo-50 group-hover:text-indigo-500",
  
  strategyTitle: "font-bold text-sm",
  strategyDesc: "text-[10px] font-medium leading-tight",
  strategyDescSelected: "text-indigo-700",
  strategyDescInactive: "text-gray-400 group-hover:text-gray-600",

  // Upload Areas
  assetGrid: "grid grid-cols-2 gap-3",
  heroUploadContainer: "col-span-2 mb-2",

  // Input Groups
  inputGroup: "bg-gray-50/50 rounded-2xl p-4 border border-gray-100 space-y-4",
  inputRow: "grid grid-cols-2 gap-3",
  
  // Amenities
  amenitiesContainer: "bg-white rounded-xl border border-gray-200 overflow-hidden",
  amenityItem: "flex items-center justify-between p-2 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors",
  amenityInput: "flex-1 bg-transparent text-xs font-medium text-gray-700 placeholder-gray-400 outline-none px-2",
  addAmenityBtn: "w-full py-3 text-xs font-bold text-indigo-600 hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2",

  // Footer / Toggle Section
  expandableSection: "border-t border-gray-100 pt-4 mt-2",
  toggleHeader: "flex items-center justify-between w-full py-2 group cursor-pointer",
  toggleLabel: "text-xs font-bold text-gray-500 group-hover:text-indigo-600 transition-colors uppercase tracking-wider",
};
