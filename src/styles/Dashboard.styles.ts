
import { Theme } from './theme';

export const DashboardStyles = {
  container: "p-[min(2.5vh,24px)] lg:p-[min(4vh,40px)] max-w-[1600px] mx-auto animate-fadeIn pb-32",
  
  // Header
  header: "flex flex-col md:flex-row md:items-center justify-between mb-[min(3vh,32px)] gap-4",
  welcomeTitle: `text-[clamp(24px,4vh,32px)] font-bold ${Theme.colors.textPrimary}`,
  welcomeSubtitle: "text-gray-500 text-[clamp(11px,1.5vh,14px)] mt-1",
  
  // Hero Area (Latest Creation vs Empty State)
  heroGrid: "grid grid-cols-1 lg:grid-cols-5 gap-[min(2vh,16px)] mb-[min(4vh,48px)] items-stretch",
  latestCreationCard: "lg:col-span-3 bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden relative flex flex-col h-[clamp(350px,50vh,500px)]",
  emptyStateCard: "h-full bg-gradient-to-br from-[#1A1A1E] to-[#2a2a2e] p-[min(4vh,32px)] flex flex-col md:flex-row justify-between items-center text-white relative overflow-hidden",
  
  // Stats Column
  statsColumn: "lg:col-span-2 flex flex-col gap-[min(1.5vh,16px)] h-full",
  
  // Loyalty Card
  loyaltyCard: "shrink-0 h-[clamp(130px,20vh,165px)] bg-white p-[min(2.5vh,20px)] rounded-3xl shadow-sm border border-gray-200 flex flex-col justify-between relative overflow-hidden group",
  loyaltyTitle: `text-[clamp(18px,2.8vh,24px)] font-black ${Theme.colors.textPrimary}`,
  progressBarBg: "w-full bg-gray-100 rounded-full h-[min(1vh,10px)] overflow-hidden",
  progressBarFill: "h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-1000 ease-out rounded-full relative",
  
  // Daily Quest
  questCard: `rounded-3xl p-[min(2.5vh,20px)] shadow-md border relative overflow-hidden group h-full flex flex-col justify-between transition-all hover:shadow-xl`,
  questCardLocked: "bg-green-50 border-green-200",
  questCardActive: "bg-gradient-to-br from-[#2C2C2E] to-[#1C1C1E] border-gray-700 text-white",
  
  // Tools Grid
  toolsSectionTitle: "text-[clamp(10px,1.4vh,13px)] font-bold text-gray-400 uppercase tracking-wider mb-[min(2vh,24px)]",
  toolsGrid: "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-[min(2vh,16px)]",
  toolCard: `flex flex-col items-center text-center p-[min(2.5vh,24px)] rounded-2xl transition-all duration-300 border group`,
  toolCardEnabled: "bg-white border-gray-200 hover:border-blue-300 hover:shadow-lg hover:-translate-y-1",
  toolCardDisabled: "bg-gray-50 border-gray-100 opacity-60 cursor-not-allowed",
  toolIconContainer: "w-[clamp(32px,5vh,48px)] h-[clamp(32px,5vh,48px)] rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110 shadow-sm",
};
