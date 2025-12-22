
export const ProfessionalHomeStyles = {
  // Light Mode Base with Texture
  main: "bg-[#F8F9FB] text-slate-900 overflow-x-hidden min-h-screen relative",
  
  // High-End Background Effects (Light Theme optimized)
  meshGradient: "absolute inset-0 pointer-events-none opacity-40 bg-[radial-gradient(circle_at_50%_0%,rgba(99,102,241,0.08)_0%,transparent_50%),radial-gradient(circle_at_0%_100%,rgba(79,70,229,0.05)_0%,transparent_50%)]",
  gridTexture: "absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/graphy-light.png')] opacity-[0.4] pointer-events-none",
  
  // Hero Section
  heroWrapper: "relative pt-32 pb-48 px-4 overflow-hidden",
  heroContainer: "max-w-6xl mx-auto text-center relative z-10",
  heroBadge: "inline-flex items-center gap-2 bg-indigo-600/5 backdrop-blur-md border border-indigo-100 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-12 text-indigo-600 animate-fadeIn",
  heroTitle: "text-5xl md:text-8xl font-black mb-8 leading-[0.95] tracking-tighter text-slate-900",
  heroSubtitle: "text-lg md:text-xl text-slate-500 max-w-2xl mx-auto leading-relaxed mb-12 font-medium px-4",
  heroActionGroup: "flex flex-col sm:flex-row items-center justify-center gap-5",
  
  // Premium Buttons (Dark for Contrast on Light BG)
  primaryButton: "group relative bg-[#1A1A1E] text-white px-12 py-5 rounded-2xl font-black text-lg transition-all hover:scale-105 active:scale-95 shadow-2xl shadow-indigo-500/20 overflow-hidden",
  buttonGlow: "absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000",
  secondaryButton: "px-10 py-5 rounded-2xl font-black text-lg border border-slate-200 bg-white hover:bg-slate-50 transition-all active:scale-95 text-slate-600 hover:text-slate-900 shadow-sm",

  // Visual Comparison
  comparisonWrapper: "mt-32 max-w-5xl mx-auto px-4 animate-fadeInUp",
  comparisonBox: "relative aspect-[21/9] rounded-[2.5rem] overflow-hidden border border-slate-200 shadow-2xl group bg-white",
  comparisonLabelLeft: "absolute top-8 left-8 z-20 bg-white/80 backdrop-blur-md px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border border-slate-100 text-slate-900 shadow-sm",
  comparisonLabelRight: "absolute top-8 right-8 z-20 bg-indigo-600 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-500/40 text-white",

  // Bento Grid Section
  sectionPadding: "py-32 px-4 relative",
  contentWrapper: "max-w-7xl mx-auto",
  sectionTitle: "text-4xl md:text-6xl font-black tracking-tighter mb-4 text-slate-900",
  sectionSubtitle: "text-slate-500 text-lg md:text-xl max-w-2xl font-medium",

  // ROI Bento (Preserved Dark Boxes for contrast)
  bentoGrid: "grid grid-cols-1 lg:grid-cols-3 gap-6 mt-16",
  bentoMain: "lg:col-span-2 bg-[#1A1A1E] p-12 rounded-[3rem] border border-white/5 relative overflow-hidden group text-white",
  bentoSide: "bg-indigo-600 p-12 rounded-[3rem] relative overflow-hidden flex flex-col justify-between group text-white shadow-xl shadow-indigo-500/20",
  
  // Departments Grid
  deptGrid: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-16",
  deptCard: "bg-[#1A1A1E] border border-white/5 p-8 rounded-[2.5rem] hover:shadow-2xl transition-all hover:-translate-y-2 group text-white",
  deptIcon: "w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center mb-8 border border-white/10 transition-transform group-hover:scale-110",
  
  featureItem: "flex items-center justify-between p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-transparent hover:border-white/10 transition-all mb-3 group/item",
  featureName: "font-bold text-sm text-gray-200 group-hover/item:text-white transition-colors",
  featureDesc: "text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-0.5",

  // Persona Tiles (Clean Light Cards)
  personaCard: "p-12 rounded-[3rem] bg-white border border-slate-100 hover:border-indigo-500/30 transition-all duration-500 hover:shadow-2xl hover:shadow-indigo-500/5 group shadow-sm",
  personaIcon: "w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center mb-8 border border-slate-100 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors",
};
