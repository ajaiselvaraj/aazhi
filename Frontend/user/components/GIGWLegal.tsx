import React from 'react';
import { ArrowLeft, Shield, FileText, Info, Mail, Map, ExternalLink } from 'lucide-react';

interface LegalPageProps {
  type: 'sitemap' | 'privacy' | 'contact' | 'disclaimer' | 'accessibility';
  onBack: () => void;
}

const GIGWLegal: React.FC<LegalPageProps> = ({ type, onBack }) => {
  const content = {
    sitemap: {
      title: 'Sitemap',
      icon: <Map className="text-blue-500" />,
      text: 'Index of all pages available on the Suvidha platform for easy navigation.'
    },
    privacy: {
      title: 'Privacy Policy',
      icon: <Shield className="text-green-500" />,
      text: 'Our commitment to protecting your personal data, including Aadhaar and mobile information according to IT Act 2000.'
    },
    contact: {
      title: 'Contact Us',
      icon: <Mail className="text-orange-500" />,
      text: 'National Helpdesk: 1800-XXX-XXXX. Email: support.suvidha@nic.in. Head Office: New Delhi, India.'
    },
    disclaimer: {
      title: 'Disclaimer',
      icon: <Info className="text-red-500" />,
      text: 'Information provided on this portal is for guidance only. Please verify with official government gazette for legal matters.'
    },
    accessibility: {
      title: 'Accessibility Statement',
      icon: <FileText className="text-purple-500" />,
      text: 'This website is compliant with GIGW and WCAG 2.0 Level AA standards to ensure inclusivity for all citizens.'
    }
  };

  const active = content[type];

  return (
    <div className="min-h-screen bg-[#F8F9FB] p-8 md:p-16 font-sans">
      <div className="max-w-4xl mx-auto bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden">
        <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white rounded-2xl shadow-sm">
              {active.icon}
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">{active.title}</h1>
          </div>
          <button 
            onClick={onBack}
            className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 rounded-2xl font-bold text-slate-600 hover:bg-slate-50 transition shadow-sm"
          >
            <ArrowLeft size={18} /> Back
          </button>
        </div>
        
        <div className="p-12 prose prose-slate max-w-none">
          <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 mb-8">
            <p className="text-blue-900 font-bold text-lg mb-0">{active.text}</p>
          </div>
          
          <h2 className="text-xl font-bold text-slate-800 mb-4 uppercase tracking-wider">Official Compliance Notice</h2>
          <p className="text-slate-600 leading-relaxed mb-6">
            This page is a mandatory requirement under the **Guidelines for Indian Government Websites (GIGW)**. 
            The Suvidha platform (Project AAZHI) ensures that all digital services are delivered with transparency and 
            accordance to the National Informatics Centre (NIC) standards.
          </p>

          <div className="grid md:grid-cols-2 gap-6 mt-12">
            <div className="p-6 border border-slate-100 rounded-3xl bg-slate-50/30">
              <h3 className="font-bold text-slate-800 mb-2">Accessibility</h3>
              <p className="text-sm text-slate-500">Certified for Screen Readers (NVDA/JAWS) and high contrast modes.</p>
            </div>
            <div className="p-6 border border-slate-100 rounded-3xl bg-slate-50/30">
              <h3 className="font-bold text-slate-800 mb-2">Legal Validity</h3>
              <p className="text-sm text-slate-500">All digital certificates issued are legally valid under the Digital India initiative.</p>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-slate-100 flex justify-between items-center text-xs font-bold text-slate-400">
             <span>GIGW Compliance: Level AA</span>
             <span className="flex items-center gap-1">National Portal of India <ExternalLink size={12}/></span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GIGWLegal;
