
import { Theme } from './theme';

export const AdminStyles = {
  container: "p-6 max-w-7xl mx-auto pb-24",
  
  // Header
  header: "flex flex-col md:flex-row justify-between mb-8 gap-4",
  title: `text-3xl font-bold ${Theme.colors.textPrimary} flex items-center gap-3`,
  
  // Tabs
  tabsContainer: "flex bg-white p-1 rounded-xl shadow-sm border border-gray-200 overflow-x-auto",
  tabButton: "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap",
  tabActive: "bg-indigo-600 text-white shadow-md",
  tabInactive: "text-gray-500 hover:bg-gray-100",
  
  // Card
  card: "bg-white p-6 rounded-2xl border border-gray-200 shadow-sm",
  cardTitle: "text-xs font-bold text-gray-400 uppercase",
  cardValue: `text-2xl font-black ${Theme.colors.textPrimary}`,
  
  // Table
  tableContainer: "bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden",
  tableHeader: "p-4 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-gray-50/50",
  tableHeadRow: "bg-gray-50 text-gray-500 font-bold uppercase text-[10px] tracking-wider",
  tableCell: "p-4 align-top",
  tableRow: "hover:bg-gray-50 transition-colors group",
};
