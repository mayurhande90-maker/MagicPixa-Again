import { Theme } from './theme';

export const HomeStyles = {
  main: "bg-[#FFFFFF] pb-20 lg:pb-0",
  
  // Hero Section
  heroSection: "text-center py-20 px-4",
  heroContainer: "relative max-w-5xl mx-auto bg-white p-8 sm:p-12 md:p-20 rounded-3xl shadow-sm border border-gray-200/80 overflow-hidden",
  heroBackgroundGrid: "absolute inset-0 bg-grid-slate-200/50 [mask-image:linear-gradient(to_bottom,white_90%,transparent)]",
  heroBlob1: "absolute -top-40 -left-40 w-96 h-96 bg-blue-200/50 rounded-full blur-3xl animate-blob",
  heroBlob2: "absolute -bottom-40 -right-40 w-96 h-96 bg-purple-200/50 rounded-full blur-3xl animate-blob animation-delay-2000",
  heroContent: "relative z-10 max-w-4xl mx-auto",
  heroTitle: `text-4xl md:text-6xl font-bold ${Theme.colors.textPrimary} mb-4 leading-tight`,
  heroSubtitle: `text-lg md:text-xl ${Theme.colors.textSecondary} max-w-2xl mx-auto mb-10`,
  heroButton: `${Theme.colors.primary} ${Theme.colors.textOnPrimary} ${Theme.shapes.button} py-3 px-8 hover:scale-105 hover:shadow-xl shadow-lg shadow-yellow-500/30 ${Theme.colors.primaryHover}`,
  
  // Audience Section (Redesigned for "Expensive" look)
  audienceSection: "py-32 px-4 bg-white",
  audienceContainer: "max-w-7xl mx-auto",
  audienceHeader: "text-center mb-20 max-w-3xl mx-auto",
  audienceGrid: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6",
  audienceCard: "bg-white p-10 rounded-[2.5rem] border border-gray-100 transition-all duration-700 hover:shadow-[0_40px_80px_-20px_rgba(0,0,0,0.08)] hover:-translate-y-2 flex flex-col items-start text-left group relative overflow-hidden",
  audienceIconContainer: "w-14 h-14 rounded-2xl bg-[#F6F7FA] flex items-center justify-center mb-10 group-hover:scale-110 transition-transform duration-500 group-hover:bg-indigo-50",
  audienceTitle: "text-2xl font-black text-gray-900 mb-2 tracking-tight leading-tight",
  audienceHook: "text-xs font-black text-indigo-600 uppercase tracking-[0.2em] mb-4 opacity-80",
  audienceDescription: "text-sm text-gray-500 font-medium leading-relaxed opacity-90",
  audienceCardAccent: "absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500",

  // Features Section
  featuresSection: `${Theme.layout.sectionPadding} ${Theme.colors.bgSurface}`,
  featuresContainer: "max-w-6xl mx-auto text-center bg-white p-8 sm:p-12 md:p-16 rounded-3xl shadow-sm border border-gray-200/80",
  sectionHeader: `text-4xl md:text-5xl font-black ${Theme.colors.textPrimary} mb-4 tracking-tight`,
  sectionSubheader: `text-lg ${Theme.colors.textSecondary} mb-12 font-medium opacity-80`,
  featureGrid: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8",
  featureCard: `relative bg-white p-8 ${Theme.shapes.card} text-left transition-transform duration-300`,
  featureCardEnabled: "transform hover:-translate-y-2 cursor-pointer",
  featureCardDisabled: "opacity-60 cursor-not-allowed",
  featureIconContainer: "w-16 h-16 rounded-xl flex items-center justify-center mb-6",
  featureTitle: `text-xl font-bold ${Theme.colors.textPrimary} mb-2`,
  featureDescription: Theme.colors.textSecondary,
  
  // Reviews
  reviewsSection: `${Theme.layout.sectionPadding} bg-white`,
  reviewsContainer: "max-w-6xl mx-auto text-center",
  reviewsGrid: "grid grid-cols-1 md:grid-cols-2 gap-8",
  reviewCard: `${Theme.colors.bgSurface} p-8 ${Theme.shapes.card} text-left`,
  
  // Pricing
  pricingSection: `${Theme.layout.sectionPadding} ${Theme.colors.bgSurface}`,
  pricingGrid: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 items-stretch mt-8",
  pricingCard: `bg-white p-6 rounded-2xl shadow-sm border-2 text-left flex flex-col transition-all duration-300 transform hover:-translate-y-2 relative`,
  
  // Variants
  pricingCardActive: "border-indigo-600 bg-indigo-50/10 shadow-2xl ring-4 ring-indigo-500/10 scale-[1.03] z-10",
  pricingCardPopular: "border-[#F9D230] shadow-lg shadow-yellow-500/10",
  pricingCardStandard: "border-gray-200/80",
  
  // Buttons
  pricingButton: `w-full mt-auto py-3 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2`,
  pricingButtonPopular: `${Theme.colors.primary} ${Theme.colors.textOnPrimary} ${Theme.colors.primaryHover}`,
  pricingButtonStandard: "bg-gray-100 text-[#1A1A1E] hover:bg-gray-200",
  pricingButtonActive: "bg-indigo-600 text-white cursor-default shadow-md",

  // Badges
  activeBadge: "absolute -top-4 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-[10px] font-bold px-4 py-1.5 rounded-full uppercase tracking-wider shadow-md border-4 border-white",
};