
import React from 'react';
import { ArrowLeft, BookOpen, Cpu, Shield, Globe, Users, Target, HelpCircle } from 'lucide-react';

interface Props {
  onBack: () => void;
}

const Documentation: React.FC<Props> = ({ onBack }) => {
  return (
    <div className="max-w-4xl mx-auto p-6 bg-white shadow-xl rounded-2xl overflow-y-auto max-h-[90vh]">
      <button 
        onClick={onBack}
        className="flex items-center gap-2 text-blue-600 mb-6 font-semibold hover:underline"
      >
        <ArrowLeft size={20} /> Back to Kiosk
      </button>

      <div className="space-y-12 pb-12">
        <header className="border-b pb-6">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Project AAZHI - Documentation</h1>
          <p className="text-xl text-blue-600 italic">Smart Urban Digital Helpdesk Assistant (SUVIDHA)</p>
        </header>

        <section>
          <h2 className="text-2xl font-bold flex items-center gap-2 mb-4 text-gray-800"><Target className="text-red-500" /> A. Problem Statement</h2>
          <p className="text-gray-700 leading-relaxed">
            Urban governance in India faces "The Last Mile Delivery Crisis." Citizens often spend hours in long queues at electricity boards or municipal offices.
            Challenges include:
            <ul className="list-disc ml-6 mt-2">
              <li>Language barriers for semi-literate or non-native residents.</li>
              <li>Opaque tracking systems (where is my application?).</li>
              <li>Dependency on 'brokers' or middle-men for simple services.</li>
              <li>High operational load on limited government staff for routine queries.</li>
            </ul>
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold flex items-center gap-2 mb-4 text-gray-800"><Cpu className="text-blue-500" /> C. Proposed Solution Overview</h2>
          <p className="text-gray-700">
            <strong>AAZHI</strong> is an AI-powered, touch-based self-service kiosk. It acts as a unified digital window for multiple utilities. 
            Key differentiator: Integration of <strong>Gemini AI</strong> for multi-modal guidance, meaning even if a user doesn't know the exact department, 
            they can ask the assistant.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold flex items-center gap-2 mb-4 text-gray-800"><Shield className="text-green-500" /> E. Security & Privacy</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg border">
              <h3 className="font-bold mb-2">Citizen Data</h3>
              <p className="text-sm">End-to-end encryption for document uploads. Periodic data purging for kiosk cache.</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg border">
              <h3 className="font-bold mb-2">Audit Trails</h3>
              <p className="text-sm">Every interaction logged with a unique transaction ID for transparency and anti-corruption measures.</p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold flex items-center gap-2 mb-4 text-gray-800"><Globe className="text-indigo-500" /> L. Why the name "AAZHI"?</h2>
          <p className="text-gray-700">
            In Tamil, <strong>'Aazhi' (ஆழி)</strong> means <em>Ocean</em> or <em>Universal Ring</em>. It signifies the vast reach of government services 
            and the "Circle of Governance" where feedback from citizens flows back into the system to improve it. It represents stability and depth.
          </p>
        </section>

        <section className="bg-blue-50 p-6 rounded-xl border-l-4 border-blue-600">
          <h2 className="text-2xl font-bold flex items-center gap-2 mb-4 text-gray-900"><HelpCircle className="text-blue-600" /> N. Judge Q&A (Sample)</h2>
          <div className="space-y-4">
            <div>
              <p className="font-bold italic">"How will elderly people use a touch screen?"</p>
              <p className="text-sm text-gray-700">Answer: Through our "Sahayika" AI Voice assistant and simplified high-contrast UI with large icons.</p>
            </div>
            <div>
              <p className="font-bold italic">"What if the internet fails in semi-urban areas?"</p>
              <p className="text-sm text-gray-700">Answer: AAZHI uses an Offline-First cache. Service requests are stored locally and synced when the connection is restored.</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Documentation;
