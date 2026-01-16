export const Theme = {
  colors: {
    primary: "bg-[#F9D230]",
    primaryHover: "hover:bg-[#dfbc2b]",
    textOnPrimary: "text-[#1A1A1E]",
    
    accent: "text-[#4D7CFF]",
    accentBg: "bg-[#4D7CFF]",
    
    textPrimary: "text-[#1A1A1E]",
    textSecondary: "text-[#5F6368]",
    textLight: "text-gray-400",
    
    bgMain: "bg-[#FFFFFF]",
    bgSurface: "bg-[#F6F7FA]",
    bgSurfaceDark: "bg-[#1A1A1E]",
    
    border: "border-gray-200/80",
    borderLight: "border-gray-100",
  },
  shapes: {
    card: "rounded-2xl shadow-sm border border-gray-200/80",
    cardHover: "transition-transform duration-300 transform hover:-translate-y-2 hover:shadow-md",
    button: "rounded-xl font-semibold transition-all duration-300 transform active:scale-95",
    input: "rounded-xl border-2 border-gray-100 focus:border-[#4D7CFF] outline-none transition-all",
  },
  layout: {
    maxWidth: "max-w-7xl mx-auto",
    sectionPadding: "py-20 px-4",
  }
};