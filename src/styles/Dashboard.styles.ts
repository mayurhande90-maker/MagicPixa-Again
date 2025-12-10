
import { Theme } from './theme';

export const DashboardStyles = {
  container: "p-6 lg:p-10 max-w-[1600px] mx-auto animate-fadeIn",
  
  // Header
  header: "flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4",
  welcomeTitle: `text-3xl font-bold ${Theme.colors.textPrimary}`,
  welcomeSubtitle: "text-gray-500 mt-1",
  
  // Hero Area (Latest Creation vs Empty State)
  heroGrid: "grid grid-cols-1 lg:grid-cols-5 gap-4 mb-12 items-stretch",
  latestCreationCard: "lg:col-span-3 bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden relative flex flex-col h-[450px]",
  emptyStateCard: "h-full bg-gradient-to-br from-[#1A1A1E] to-[#2a2a2e] p-8 flex flex-col md:flex-row justify-between items-center text-white relative overflow-hidden",
  
  // Stats Column
  statsColumn: "lg:col-span-2 flex flex-col gap-4 h-full",
  
  // Loyalty Card
  loyaltyCard: "shrink-0 h-[155px] bg-white p-4 rounded-3xl shadow-sm border border-gray-200 flex flex-col justify-between relative overflow-hidden group",
  loyaltyTitle: `text-xl font-black ${Theme.colors.textPrimary}`,
  progressBarBg: "w-full bg-gray-100 rounded-full h-2.5 overflow-hidden",
  progressBarFill: "h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-1000 ease-out rounded-full relative",
  
  // Daily Quest
  questCard: `rounded-3xl p-4 shadow-md border relative overflow-hidden group h-full flex flex-col justify-between transition-all hover:shadow-xl`,
  questCardLocked: "bg-green-50 border-green-200",
  questCardActive: "bg-gradient-to-br from-[#2C2C2E] to-[#1C1C1E] border-gray-700 text-white",
  
  // Tools Grid
  toolsSectionTitle: "text-sm font-bold text-gray-400 uppercase tracking-wider mb-6",
  toolsGrid: "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4",
  toolCard: `flex flex-col items-center text-center p-5 rounded-2xl transition-all duration-300 border group`,
  toolCardEnabled: "bg-white border-gray-200 hover:border-blue-300 hover:shadow-lg hover:-translate-y-1",
  toolCardDisabled: "bg-gray-50 border-gray-100 opacity-60 cursor-not-allowed",
  toolIconContainer: "w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110 shadow-sm",
};
