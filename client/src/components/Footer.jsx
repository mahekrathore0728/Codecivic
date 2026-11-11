import React from 'react';
import { ShieldAlert, MapPin, Phone, Mail, ExternalLink } from 'lucide-react';

export default function Footer({ onNavigate }) {
  return (
    <footer className="bg-[#193B50] text-[#DCE5E9] border-t border-[#254A63] text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          
          {/* Column 1: Portal Brand */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center border border-white/20">
                <ShieldAlert className="w-5 h-5 text-[#D6A64F]" />
              </div>
              <span className="font-bold text-base text-white tracking-wide">CodeCivic</span>
            </div>
            <p className="text-[11px] text-[#DCE5E9]/80 leading-relaxed">
              Crowdsourced Civic Issue Reporting and Resolution System. Enabling citizens of Kota to report, track, and verify public service improvements.
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
            <h4 className="font-bold text-white uppercase text-[11px] tracking-wider">Kota Municipal Works</h4>
            <ul className="space-y-1.5 text-[11px] text-[#DCE5E9]/80">
              <li>Potholes &amp; Road Remediation</li>
              <li>Solid Waste Clearance &amp; Dumpsters</li>
              <li>Stormwater Culverts &amp; Drainage</li>
              <li>Chambal Pipeline Leaks &amp; Pressure</li>
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
                <span>Toll-Free Control Room: 0744-2501000</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-[#D6A64F]" />
                <span>support.kota@codecivic.gov.in</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-[#D6A64F]" />
                <span>Nagar Nigam Headquarters, Kota, Rajasthan</span>
              </div>
            </div>
          </div>

        </div>

        <div className="mt-8 pt-6 border-t border-[#254A63] flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-[#DCE5E9]/60">
          <div>
            &copy; {new Date().getFullYear()} CodeCivic Governance Portal. Production civic tech infrastructure for Nagar Nigam Kota &amp; Pan-India.
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
