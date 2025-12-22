
export const ProfessionalHomeStyles = {
  // World-Class Background
  main: "bg-[#FDFDFF] text-slate-900 overflow-x-hidden min-h-screen relative font-sans",
  meshGradient: "absolute inset-0 pointer-events-none opacity-60 bg-[radial-gradient(at_0%_0%,rgba(79,70,229,0.08)_0%,transparent_50%),radial-gradient(at_100%_0%,rgba(236,72,153,0.05)_0%,transparent_50%),radial-gradient(at_50%_100%,rgba(59,130,246,0.05)_0%,transparent_50%)]",
  grainTexture: "absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/natural-paper.png')] opacity-[0.4] pointer-events-none mix-blend-multiply",
  
  // Hero
  heroWrapper: "relative pt-32 pb-40 px-4 overflow-hidden",
  heroContainer: "max-w-6xl mx-auto text-center relative z-10 flex flex-col items-center",
  heroBadge: "inline-flex items-center gap-2 bg-white/40 backdrop-blur-xl border border-indigo-100/50 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.25em] mb-10 text-indigo-600 shadow-sm animate-fadeIn",
  heroTitle: "text-6xl md:text-[92px] font-black mb-8 leading-[0.9] tracking-tighter text-slate-950",
  heroSubtitle: "text-lg md:text-xl text-slate-500 max-w-2xl mx-auto leading-relaxed mb-12 font-medium px-4",
  heroActionGroup: "flex flex-col sm:flex-row items-center justify-center gap-6 mb-24",
  
  // Premium Interactive Elements
  primaryButton: "group relative bg-indigo-600 text-white px-12 py-5 rounded-[2rem] font-black text-lg transition-all hover:scale-105 active:scale-95 shadow-2xl shadow-indigo-500/30 overflow-hidden border border-indigo-400/50",
  buttonGlow: "absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000",
  secondaryButton: "px-10 py-5 rounded-[2rem] font-black text-lg border border-slate-200 bg-white/50 backdrop-blur-md hover:bg-white hover:border-slate-300 transition-all active:scale-95 text-slate-600 hover:text-slate-950 shadow-sm",

  // Visual Showreel
  showreelGrid: "grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 px-4 max-w-[1600px] mx-auto opacity-80 hover:opacity-100 transition-opacity duration-700",
  showreelItem: "aspect-[3/4] rounded-3xl overflow-hidden shadow-2xl border border-white/50 group relative transform hover:-translate-y-2 transition-all duration-500",
  showreelLabel: "absolute bottom-4 left-4 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest text-slate-800 shadow-sm opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all",

  // Section Layouts
  sectionPadding: "py-32 px-4 relative",
  contentWrapper: "max-w-7xl mx-auto",
  sectionTitle: "text-4xl md:text-6xl font-black tracking-tighter mb-4 text-slate-950",
  sectionSubtitle: "text-slate-500 text-lg md:text-xl max-w-2xl font-medium mb-16",

  // Bento Glass Design
  bentoGrid: "grid grid-cols-1 lg:grid-cols-12 gap-6 mt-16",
  glassCard: "bg-white/40 backdrop-blur-2xl border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[3rem] overflow-hidden group transition-all duration-500 hover:shadow-2xl hover:shadow-indigo-500/5",
  
  // Department Styling
  deptHeader: "flex items-center gap-4 mb-8",
  deptIcon: "w-14 h-14 bg-indigo-600 text-white rounded-[1.5rem] flex items-center justify-center shadow-lg shadow-indigo-200 group-hover:scale-110 transition-transform",
  
  featureList: "space-y-4",
  featureItem: "flex items-center justify-between p-5 rounded-[2rem] bg-white/60 border border-transparent hover:border-indigo-100 hover:bg-white transition-all group/item hover:shadow-xl hover:shadow-indigo-500/5",
  featureName: "font-black text-sm text-slate-800 group-hover/item:text-indigo-600 transition-colors",
  featureDesc: "text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1",

  // Comparison Module
  comparisonTable: "w-full rounded-[3rem] bg-white/60 backdrop-blur-xl border border-white shadow-2xl overflow-hidden",
  compRow: "grid grid-cols-2 border-b border-slate-100 last:border-0",
  compCell: "p-8 md:p-12",
  compHeader: "text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 mb-6 block",
};
