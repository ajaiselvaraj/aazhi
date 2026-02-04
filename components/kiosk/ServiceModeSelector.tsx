import React from 'react';
import { LayoutGrid, Users } from 'lucide-react';

interface Props {
    serviceName: string;
    onSelect: (mode: 'SELF' | 'COUNTER') => void;
    onBack: () => void;
}

const ServiceModeSelector: React.FC<Props> = ({ serviceName, onSelect, onBack }) => {
    return (
        <div className="max-w-3xl mx-auto space-y-12 py-10 animate-in slide-in-from-bottom-8">
            <div className="text-center">
                <h2 className="text-4xl font-black text-slate-900 mb-4 uppercase tracking-tighter">How would you like to proceed?</h2>
                <p className="text-slate-500 font-bold">Choose a processing mode for {serviceName}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <button
                    onClick={() => onSelect('SELF')}
                    className="bg-white p-12 rounded-[3rem] shadow-xl border-4 border-transparent hover:border-blue-600 transition flex flex-col items-center group text-center relative overflow-hidden"
                >
                    <div className="absolute top-0 right-0 bg-blue-600 text-white text-[10px] font-black px-4 py-1 rounded-bl-xl uppercase tracking-widest">Recommended</div>
                    <div className="w-24 h-24 bg-blue-50 text-blue-600 rounded-[2rem] flex items-center justify-center mb-6 group-hover:scale-110 transition">
                        <LayoutGrid size={48} />
                    </div>
                    <h3 className="text-2xl font-black text-slate-900 mb-2 uppercase">Self Service</h3>
                    <p className="text-xs text-slate-500 font-bold">Fastest. Digital Processing. Immediate Token.</p>
                    <div className="mt-8 px-6 py-2 bg-slate-100 rounded-full text-[10px] font-black text-slate-600">EST. WAIT: 0 MINS</div>
                </button>

                <button
                    onClick={() => onSelect('COUNTER')}
                    className="bg-white p-12 rounded-[3rem] shadow-xl border-4 border-transparent hover:border-orange-500 transition flex flex-col items-center group text-center"
                >
                    <div className="w-24 h-24 bg-orange-50 text-orange-600 rounded-[2rem] flex items-center justify-center mb-6 group-hover:scale-110 transition">
                        <Users size={48} />
                    </div>
                    <h3 className="text-2xl font-black text-slate-900 mb-2 uppercase">Counter Help</h3>
                    <p className="text-xs text-slate-500 font-bold">Get a Token for physical counter assistance.</p>
                    <div className="mt-8 px-6 py-2 bg-orange-100 text-orange-700 rounded-full text-[10px] font-black animate-pulse">EST. WAIT: 15 MINS</div>
                </button>
            </div>
            <div className="text-center">
                <button onClick={onBack} className="text-slate-400 font-black text-[10px] uppercase tracking-widest hover:text-slate-900">Go Back</button>
            </div>
        </div>
    );
};

export default ServiceModeSelector;
