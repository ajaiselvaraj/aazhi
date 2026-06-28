import React from 'react';
import { 
  Zap, Droplet, Flame, Building2, Trash2, ShieldCheck, Network, Bot, Users, Clock
} from 'lucide-react';
import { useOrientation } from '../contexts/OrientationContext';

interface WelcomeSplashProps {
  onInteract: () => void;
}

const WelcomeSplash: React.FC<WelcomeSplashProps> = ({ onInteract }) => {
  const { isVertical } = useOrientation();

  return (
    <div 
      className="h-screen max-h-screen w-full bg-white text-slate-900 font-sans cursor-pointer overflow-hidden relative flex flex-col"
      onClick={onInteract}
    >
      {/* Background elements */}
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 pointer-events-none"></div>
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-100/50 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-emerald-50/50 rounded-full blur-[120px] pointer-events-none"></div>
      
      {/* TOP BAR */}
      <nav className={`w-full px-6 ${isVertical ? 'py-4' : 'py-6'} flex items-center justify-between z-10 shrink-0`}>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-2xl shadow-lg shadow-blue-200">
             A
          </div>
          <div>
            <h1 className="text-2xl font-black text-blue-950 tracking-tight leading-none">AAZHI</h1>
            <p className="text-[10px] uppercase font-bold text-slate-500 tracking-widest mt-1">AI Powered Citizen Service</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3 bg-white/80 backdrop-blur-md px-4 py-2 border border-slate-200 rounded-full shadow-sm">
           <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
           <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Kiosk Online</span>
        </div>
      </nav>

      {/* MAIN ADVERTISEMENT CONTENT */}
      <main className={`flex-1 min-h-0 w-full max-w-7xl mx-auto px-6 flex ${isVertical ? 'flex-col justify-evenly py-6' : 'items-center justify-between py-2'} z-10`}>
        
        {/* Text/Copy Section */}
        <div className={`${isVertical ? 'w-full flex flex-col items-center text-center mt-4' : 'w-1/2 pr-8 flex flex-col justify-center h-full'} animate-in slide-in-from-left-8 duration-700`}>
          <div className={`inline-flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 px-4 py-2 rounded-full text-xs font-black tracking-widest mb-6 shadow-sm ${isVertical ? 'self-center' : 'self-start'}`}>
            <span>🏛️</span> SUVIDHA <span className="text-green-600">2026</span>
          </div>
          
          <h1 className={`${isVertical ? 'text-6xl sm:text-7xl' : 'text-6xl lg:text-7xl'} font-black text-blue-950 tracking-tighter leading-[1.05] mb-6 drop-shadow-sm`}>
            Welcome to
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">AAZHI</span>
          </h1>
          
          <h2 className={`${isVertical ? 'text-2xl sm:text-3xl' : 'text-2xl lg:text-3xl'} text-slate-600 font-bold mb-8 leading-tight max-w-2xl`}>
            Your unified gateway to all <br className={isVertical ? 'hidden' : ''}/>
            <span className="text-emerald-600">Municipal & Civic Services</span>
          </h2>
          
          <div className={`grid grid-cols-2 gap-y-4 gap-x-4 text-slate-700 font-bold ${isVertical ? 'text-base sm:text-lg mb-4' : 'text-lg'}`}>
            <div className={`flex items-center gap-2 ${isVertical ? 'justify-end pr-4' : ''}`}><ShieldCheck className="text-green-500 w-7 h-7" /> Highly Secure</div>
            <div className={`flex items-center gap-2 ${isVertical ? 'justify-start pl-4' : ''}`}><Bot className="text-blue-500 w-7 h-7" /> AI Assisted</div>
            <div className={`flex items-center gap-2 ${isVertical ? 'justify-end pr-4' : ''}`}><Users className="text-teal-500 w-7 h-7" /> 22+ Languages</div>
            <div className={`flex items-center gap-2 ${isVertical ? 'justify-start pl-4' : ''}`}><Clock className="text-orange-500 w-7 h-7" /> 24x7 Available</div>
          </div>
        </div>
        
        {/* Visual/Kiosk Section */}
        <div className={`${isVertical ? 'w-full mt-6 flex-1 max-h-[55vh]' : 'w-1/2 h-full max-h-[85vh]'} relative flex justify-center items-center animate-in zoom-in-95 duration-1000 delay-150 py-4`}>
           {/* Abstract Floating Icons */}
           <div className={`absolute ${isVertical ? 'top-5 right-[15%]' : 'top-[10%] right-[10%]'} w-12 h-12 bg-white rounded-full shadow-2xl flex items-center justify-center animate-bounce`} style={{ animationDelay: '0ms', animationDuration: '3s' }}>
             <Flame className="text-orange-500 w-6 h-6" />
           </div>
           <div className={`absolute ${isVertical ? 'top-[30%] left-[10%]' : 'top-[25%] left-[5%]'} w-16 h-16 bg-white rounded-full shadow-2xl flex items-center justify-center animate-bounce`} style={{ animationDelay: '500ms', animationDuration: '4s' }}>
             <Droplet className="text-blue-500 w-8 h-8" />
           </div>
           <div className={`absolute ${isVertical ? 'bottom-[30%] right-[10%]' : 'bottom-[25%] right-[5%]'} w-14 h-14 bg-white rounded-full shadow-2xl flex items-center justify-center animate-bounce`} style={{ animationDelay: '1000ms', animationDuration: '3.5s' }}>
             <Trash2 className="text-purple-500 w-7 h-7" />
           </div>
           <div className={`absolute ${isVertical ? 'bottom-5 left-[15%]' : 'bottom-[10%] left-[10%]'} w-20 h-20 bg-white rounded-full shadow-2xl flex items-center justify-center animate-bounce`} style={{ animationDelay: '200ms', animationDuration: '4.5s' }}>
             <Building2 className="text-emerald-500 w-10 h-10" />
           </div>
           <div className={`absolute ${isVertical ? '-top-2 left-[20%]' : 'top-0 left-[25%]'} w-10 h-10 bg-white rounded-full shadow-2xl flex items-center justify-center animate-bounce`} style={{ animationDelay: '700ms', animationDuration: '2.5s' }}>
             <Zap className="text-yellow-500 w-5 h-5" />
           </div>

           {/* Kiosk Device Visual */}
           <div className={`relative w-full ${isVertical ? 'max-w-[260px]' : 'max-w-[340px]'} h-full max-h-[600px] bg-slate-100 rounded-[2rem] shadow-2xl border-[6px] border-white flex flex-col items-center justify-start pt-5 z-10 overflow-hidden transform perspective-1000 rotate-y-[-5deg]`}>
              {/* Camera/Sensor */}
              <div className="w-16 h-1.5 bg-slate-300 rounded-full mb-5 shrink-0"></div>
              
              {/* Kiosk Screen Simulation */}
              <div className="w-[88%] flex-1 bg-blue-950 rounded-xl shadow-inner overflow-hidden border-[6px] border-black flex flex-col relative min-h-0">
                 <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20"></div>
                 
                 <div className="flex-1 flex flex-col items-center justify-center p-4 text-center z-10 overflow-hidden">
                   <div className="w-14 h-14 bg-blue-600 rounded-full flex items-center justify-center text-white mb-5 animate-pulse shrink-0">
                     <Network className="w-7 h-7" />
                   </div>
                   <h3 className="text-white font-black text-xl lg:text-2xl tracking-widest mb-2">AAZHI</h3>
                   <p className="text-blue-200 text-[10px] font-bold uppercase tracking-widest mb-8">Govt of India</p>
                   
                   <div className="bg-white/10 backdrop-blur-sm px-5 py-2.5 rounded-full border border-white/20 text-white font-bold text-xs tracking-wider animate-bounce mt-4 whitespace-nowrap">
                     Tap To Start
                   </div>
                 </div>
              </div>
              
              {/* Bottom Emblem */}
              <div className="mt-auto mb-4 w-16 h-16 opacity-30 shrink-0">
                <img 
                  src="https://upload.wikimedia.org/wikipedia/commons/5/55/Emblem_of_India.svg" 
                  alt="Emblem" 
                  className="w-full h-full object-contain grayscale"
                />
              </div>
           </div>
        </div>
      </main>
      
      {/* GLOBAL CALL TO ACTION BANNER */}
      <div className={`w-full bg-blue-600 text-white flex items-center justify-center relative z-20 shadow-[0_-10px_30px_rgba(37,99,235,0.2)] shrink-0 ${isVertical ? 'py-5' : 'py-4'}`}>
         <div className={`${isVertical ? 'text-xl' : 'text-2xl'} font-black tracking-widest uppercase flex items-center gap-4 animate-pulse`}>
            <span>👆</span>
            Tap anywhere on screen to start
            <span>👆</span>
         </div>
      </div>
      
    </div>
  );
};

export default WelcomeSplash;
