export const ProfessionalHomeStyles = {
  main: "bg-[#FAFAFB] text-slate-900 overflow-x-hidden min-h-screen relative font-sans",
  meshGradient: "absolute inset-0 pointer-events-none opacity-40 bg-[radial-gradient(at_0%_0%,rgba(79,70,229,0.1)_0%,transparent_50%),radial-gradient(at_100%_0%,rgba(59,130,246,0.08)_0%,transparent_50%),radial-gradient(at_50%_100%,rgba(236,72,153,0.05)_0%,transparent_50%)]",
  grainTexture: "absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/natural-paper.png')] opacity-[0.2] pointer-events-none mix-blend-multiply",
  
  // Hero
  heroWrapper: "relative pt-32 pb-40 px-4",
  heroContainer: "max-w-6xl mx-auto text-center relative z-10 flex flex-col items-center mb-32",
  heroBadge: "inline-flex items-center gap-2 bg-white/60 backdrop-blur-xl border border-white px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.25em] mb-10 text-indigo-600 shadow-[0_4px_20px_rgba(0,0,0,0.03)]",
  heroTitle: "text-6xl md:text-[100px] font-black mb-8 leading-[0.9] tracking-tighter text-slate-950",
  heroSubtitle: "text-lg md:text-xl text-slate-500 max-w-2xl mx-auto leading-relaxed mb-12 font-medium px-4",
  heroActionGroup: "flex flex-col sm:flex-row items-center justify-center gap-6",
  
  primaryButton: "group relative bg-indigo-600 text-white px-10 py-5 rounded-2xl font-black text-lg transition-all hover:scale-105 active:scale-95 shadow-2xl shadow-indigo-500/20 overflow-hidden flex items-center justify-center",
  buttonGlow: "absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000",
  secondaryButton: "px-10 py-5 rounded-2xl font-black text-lg border border-slate-200 bg-white/50 backdrop-blur-md hover:bg-white hover:border-slate-300 transition-all active:scale-95 text-slate-600 hover:text-slate-950",

  // Masonry Grid (Leonardo-style Wall)
  masonryContainer: "max-w-[1600px] mx-auto px-4",
  masonryGrid: "grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 auto-rows-[250px] gap-4",
  masonryItem: "group relative rounded-3xl overflow-hidden shadow-2xl border border-white transition-all duration-500 hover:scale-[1.02] hover:z-20",
  masonryOverlay: "absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all p-6 flex flex-col justify-end text-white",

  // Section Layouts
  sectionPadding: "py-32 px-4 relative bg-white/40",
  contentWrapper: "max-w-7xl mx-auto",
  sectionTitle: "text-4xl md:text-6xl font-black tracking-tighter mb-4 text-slate-950 leading-none",
  sectionSubtitle: "text-slate-500 text-lg md:text-xl max-w-2xl font-medium",

  // Bento Grid System
  bentoGrid: "grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 auto-rows-[200px] gap-6",
  bentoCard: "group relative bg-white rounded-[2.5rem] border border-gray-100 shadow-[0_4px_30px_rgb(0,0,0,0.03)] p-10 flex flex-col justify-between transition-all duration-500 hover:shadow-2xl hover:shadow-indigo-500/5 hover:-translate-y-1 cursor-pointer overflow-hidden",
  
  bentoLg: "md:col-span-2 md:row-span-2", // 2x2
  bentoMd: "md:col-span-2 md:row-span-1", // 2x1
  bentoSm: "md:col-span-1 md:row-span-1", // 1x1

  bentoIconBox: "w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner transition-transform group-hover:scale-110 duration-500",
  bentoArrow: "absolute top-10 right-10 w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all duration-300 shadow-sm",
};
