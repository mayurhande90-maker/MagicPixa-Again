
import { Theme } from './theme';

export const BillingStyles = {
  container: "p-4 sm:p-6 lg:p-8 pb-20 w-full max-w-7xl mx-auto",
  
  // Header
  headerTitle: `text-3xl font-bold ${Theme.colors.textPrimary}`,
  headerSubtitle: `text-lg ${Theme.colors.textSecondary} mt-2`,
  
  // Credit Card (Hero)
  creditCard: "bg-gradient-to-br from-[#4D7CFF] to-indigo-600 text-white p-8 rounded-3xl shadow-xl relative overflow-hidden mb-12",
  creditCardDecor1: "absolute -top-4 -right-4 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none",
  creditCardDecor2: "absolute bottom-0 left-0 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none",
  creditCardContent: "relative z-10",
  creditBigNumber: "text-7xl font-black",
  
  // Packs Grid
  packGrid: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 items-stretch",
  packCard: `bg-white p-6 rounded-2xl shadow-sm border-2 text-left flex flex-col transition-transform transform hover:-translate-y-2`,
  packCardPopular: "border-[#F9D230] shadow-lg shadow-yellow-500/10",
  packCardStandard: "border-gray-200/80",
  packTitle: `text-xl font-bold ${Theme.colors.textPrimary} mb-2`,
  packPrice: `text-2xl font-bold ${Theme.colors.textPrimary}`,
  packButton: `w-full mt-auto py-3 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2`,
  packButtonPopular: `${Theme.colors.primary} ${Theme.colors.textOnPrimary} ${Theme.colors.primaryHover}`,
  packButtonStandard: "bg-gray-100 text-[#1A1A1E] hover:bg-gray-200",
  
  // History
  historyContainer: "bg-white p-2 rounded-2xl border border-gray-200/80 shadow-sm",
  historyItem: "flex justify-between items-center text-sm p-3 rounded-xl hover:bg-gray-50 transition-colors group border border-transparent hover:border-gray-100",
  historyDateGroup: "text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 mt-4 ml-2 sticky top-0 bg-white z-10 py-2",
};
