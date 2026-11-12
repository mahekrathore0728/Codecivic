import React from 'react';
import { Shield, MapPin, Phone, Mail, ExternalLink } from 'lucide-react';

export default function Footer({ onNavigate }) {
  return (
    <footer className="bg-[#193B50] text-[#DCE5E9] border-t border-[#254A63] text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          
          {/* Column 1: Portal Brand */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <img src="/logo-icon.svg" alt="CodeCivic" className="w-8 h-8" />
              <span className="font-bold text-base text-white tracking-wide">CodeCivic</span>
            </div>
            <p className="text-[11px] text-[#DCE5E9]/80 leading-relaxed">
              Pan-India Civic Issue Reporting and Resolution Platform. Connecting citizens across all 28 States and 8 Union Territories directly with their municipal authorities.
            </p>
          </div>

          {/* Column 2: Quick Links */}
          <div className="space-y-2">
            <h4 className="font-bold text-white uppercase text-[11px] tracking-wider">Citizen Navigation</h4>
            <ul className="space-y-1.5 text-[11px]">
              <li>
                <button onClick={() => onNavigate('home')} className="hover:text-white transition-colors">
                  Portal Home
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('report')} className="hover:text-white transition-colors">
                  Report a Civic Issue
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('explore')} className="hover:text-white transition-colors">
                  Explore Community Issues
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('track')} className="hover:text-white transition-colors">
                  Track Complaint Progress
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('help')} className="hover:text-white transition-colors">
                  Citizen Help &amp; FAQs
                </button>
              </li>
            </ul>
          </div>

          {/* Column 3: Common Categories */}
          <div className="space-y-2">
            <h4 className="font-bold text-white uppercase text-[11px] tracking-wider">Civic Services</h4>
            <ul className="space-y-1.5 text-[11px] text-[#DCE5E9]/80">
              <li>Road Damage &amp; Pothole Remediation</li>
              <li>Solid Waste Clearance &amp; Dumpsters</li>
              <li>Stormwater Culverts &amp; Drainage</li>
              <li>Drinking Water Pipeline Leaks &amp; Pressure</li>
              <li>Streetlight Safety &amp; Illumination</li>
              <li>Public Sanitation &amp; Hygiene</li>
            </ul>
          </div>

          {/* Column 4: Contact & Grievance */}
          <div className="space-y-2">
            <h4 className="font-bold text-white uppercase text-[11px] tracking-wider">Municipal Helpdesk</h4>
            <div className="space-y-1.5 text-[11px] text-[#DCE5E9]/80">
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-[#D6A64F]" />
                <span>Citizen Helpline: 1800-180-CIVIC</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-[#D6A64F]" />
                <span>support@codecivic.gov.in</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-[#D6A64F]" />
                <span>Pan-India Civic Redressal Network</span>
              </div>
            </div>
          </div>

        </div>

        <div className="mt-8 pt-6 border-t border-[#254A63] flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-[#DCE5E9]/60">
          <div>
            &copy; {new Date().getFullYear()} CodeCivic Governance Portal &bull; <span className="text-[#D6A64F]/90 font-medium">This is a demonstration deployment. Data may be reset periodically.</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => onNavigate('/admin/login')}
              className="text-[#D6A64F] hover:underline font-semibold flex items-center gap-1"
            >
              <Shield className="w-3 h-3" />
              <span>Officer / Admin Portal</span>
            </button>
            <span>•</span>
            <span>Citizens • Platform Automation • Authorities</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
