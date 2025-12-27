
import { Theme } from './theme';

export const BillingStyles = {
  container: "p-[min(3.5vh,24px)] sm:p-[min(4.5vh,32px)] lg:p-[min(6vh,48px)] pb-32 w-full max-w-7xl mx-auto animate-fadeIn",
  
  // Header
  headerTitle: `text-[clamp(24px,4.5vh,36px)] font-bold ${Theme.colors.textPrimary}`,
  headerSubtitle: `text-[clamp(12px,1.8vh,18px)] ${Theme.colors.textSecondary} mt-2`,
  
  // Credit Card (Hero)
  creditCard: "bg-gradient-to-br from-[#4D7CFF] to-indigo-600 text-white p-[min(5.5vh,44px)] rounded-[2.5rem] shadow-xl relative overflow-hidden mb-[min(4.5vh,48px)]",
  creditCardDecor1: "absolute -top-4 -right-4 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none",
  creditCardDecor2: "absolute bottom-0 left-0 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none",
  creditCardContent: "relative z-10",
  creditBigNumber: "text-[clamp(48px,11vh,92px)] font-black leading-none",
  
  // Packs Grid
  packGrid: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[min(3.5vh,24px)] items-stretch mt-8",
  packCard: `bg-white p-[min(4vh,36px)] rounded-[2.5rem] shadow-sm border-2 text-left flex flex-col transition-all duration-300 transform hover:-translate-y-2 relative`,
  
  // Variants
  packCardActive: "border-indigo-600 bg-indigo-50/10 shadow-2xl ring-4 ring-indigo-500/10 scale-[1.03] z-10",
  packCardPopular: "border-[#F9D230] shadow-lg shadow-yellow-500/10",
  packCardStandard: "border-gray-200/80",
  
  // Typography
  packTitle: `text-[clamp(16px,2.2vh,20px)] font-bold ${Theme.colors.textPrimary} mb-2`,
  packPrice: `text-[clamp(20px,2.8vh,28px)] font-bold ${Theme.colors.textPrimary}`,
  
  // Buttons
  packButton: `w-full mt-auto py-[min(2vh,16px)] rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2`,
  packButtonPopular: `${Theme.colors.primary} ${Theme.colors.textOnPrimary} ${Theme.colors.primaryHover}`,
  packButtonStandard: "bg-gray-100 text-[#1A1A1E] hover:bg-gray-200",
  packButtonActive: "bg-indigo-600 text-white cursor-default shadow-md",

  // Badges
  activeBadge: "absolute -top-4 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-[10px] font-bold px-4 py-1.5 rounded-full uppercase tracking-wider shadow-md border-4 border-white",
  
  // History
  historyContainer: "bg-white p-2 rounded-2xl border border-gray-200/80 shadow-sm",
  historyItem: "flex justify-between items-center text-sm p-[min(1.8vh,16px)] rounded-xl hover:bg-gray-50 transition-colors group border border-transparent hover:border-gray-100",
  historyDateGroup: "text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3 mt-4 ml-2 sticky top-0 bg-white z-10 py-2",
};
