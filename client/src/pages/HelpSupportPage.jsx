import React, { useState } from 'react';
import {
  HelpCircle,
  FileQuestion,
  ChevronDown,
  ChevronUp,
  MapPin,
  Clock,
  ShieldCheck,
  Phone,
  Mail,
  AlertTriangle,
  Building,
} from 'lucide-react';

export default function HelpSupportPage({ onNavigate }) {
  const [openFaq, setOpenFaq] = useState(null);

  const faqs = [
    {
      q: 'How do I lodge a civic issue report on CodeCivic Kota?',
      a: 'Click on "Report an Issue" in the top navigation bar. You will be guided through 4 simple steps: 1) Select the category (e.g., Potholes, Garbage, Water Leakage), 2) Write a short title and description and attach a photograph, 3) Select the location using your phone\'s GPS or click on the Kota city map, and 4) Review your information and click Submit. You will instantly receive a unique sequential Complaint ID (such as CC-2026-00001).',
    },
    {
      q: 'Do I need an account to report a problem?',
      a: 'Yes, quick registration with your name and mobile number is required so municipal teams can notify you of status updates, and so you can verify resolution evidence once the work is completed on-ground.',
    },
    {
      q: 'What is duplicate detection and how does it help?',
      a: 'When you submit a complaint, CodeCivic scans for similar existing complaints in your immediate neighbourhood. If a neighbour has already reported the issue, you can simply click "Support" to back their complaint. This prevents municipal backlogs and demonstrates to authorities that multiple citizens are affected.',
    },
    {
      q: 'What do the different complaint statuses mean?',
      a: '• SUBMITTED: The complaint is received and waiting for triage.\n• UNDER REVIEW: Municipal helpdesk is validating jurisdiction.\n• ASSIGNED: Routed to the specialized department (Sanitation, Roads, Water, etc.).\n• IN PROGRESS: Field crews have been deployed to the site.\n• RESOLVED: Authorities have completed work and uploaded photographic proof.\n• REOPENED: A citizen reported that the resolution was incomplete.\n• CLOSED: The citizen confirmed that the problem is completely fixed.',
    },
    {
      q: 'How does evidence-based resolution verification work?',
      a: 'Unlike traditional portals where complaints are closed without proof, CodeCivic requires the municipal authority to submit photographic evidence and repair notes. As the citizen who lodged the complaint, you have the final authority to inspect the site and click "Confirm Resolution" to close it, or "Report Unresolved" to automatically reopen it with high priority.',
    },
    {
      q: 'When can I request escalation for a slow complaint?',
      a: 'Every complaint is assigned an SLA (Service Level Agreement) resolution deadline based on severity (e.g., 24h for Critical emergencies, 48-72h for standard issues). If the deadline passes or 48 hours elapse without an update, an "Escalate Complaint" button appears on your tracking page to alert senior supervisory directors.',
    },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8 bg-[#F4F7F8]">
      
      {/* Header */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-[#DCE5E9] shadow-xs space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#287C78]/15 text-[#287C78] text-xs font-bold border border-[#287C78]/30">
          <HelpCircle className="w-3.5 h-3.5 text-[#D6A64F]" />
          Citizen Guidance &amp; Portal Instructions
        </div>
        <h1 className="text-2xl font-extrabold text-[#193B50]">Help &amp; Citizen Support Center</h1>
        <p className="text-xs text-[#64748B] leading-relaxed">
          Learn how to submit reports in Kota, track municipal progress, understand status codes, and verify that civic repairs were properly conducted on-ground.
        </p>
      </div>

      {/* Guide Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-[#DCE5E9] shadow-2xs space-y-2">
          <div className="w-8 h-8 rounded-lg bg-[#193B50]/10 text-[#193B50] flex items-center justify-center font-bold text-xs">
            1
          </div>
          <h3 className="text-xs font-bold text-[#193B50]">Photograph Guidelines</h3>
          <p className="text-[11px] text-[#64748B] leading-relaxed">
            Take clear, well-lit photos showing both the problem (e.g., pothole depth) and surrounding landmarks to assist field crews.
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-[#DCE5E9] shadow-2xs space-y-2">
          <div className="w-8 h-8 rounded-lg bg-[#287C78]/15 text-[#287C78] flex items-center justify-center font-bold text-xs">
            2
          </div>
          <h3 className="text-xs font-bold text-[#193B50]">Tracking Progress</h3>
          <p className="text-[11px] text-[#64748B] leading-relaxed">
            Keep your Complaint ID handy. Search anytime on the Track Complaint page to view the timestamped audit log of all actions taken.
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-[#DCE5E9] shadow-2xs space-y-2">
          <div className="w-8 h-8 rounded-lg bg-[#328568]/15 text-[#328568] flex items-center justify-center font-bold text-xs">
            3
          </div>
          <h3 className="text-xs font-bold text-[#193B50]">Verify or Reopen</h3>
          <p className="text-[11px] text-[#64748B] leading-relaxed">
            When marked resolved, examine the evidence photograph. If the fix was substandard, click "Report Unresolved" to send it back.
          </p>
        </div>
      </div>

      {/* Frequently Asked Questions */}
      <div className="bg-white rounded-2xl border border-[#DCE5E9] shadow-xs p-6 space-y-4">
        <h2 className="text-base font-bold text-[#193B50]">Frequently Asked Questions</h2>
        <div className="divide-y divide-[#DCE5E9]/60">
          {faqs.map((faq, i) => (
            <div key={i} className="py-3.5">
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full text-left flex justify-between items-center text-xs font-bold text-[#193B50] hover:text-[#287C78] transition-colors"
              >
                <span>{faq.q}</span>
                {openFaq === i ? <ChevronUp className="w-4 h-4 shrink-0 text-[#287C78]" /> : <ChevronDown className="w-4 h-4 shrink-0 text-[#64748B]" />}
              </button>
              {openFaq === i && (
                <div className="mt-2 text-xs text-[#64748B] leading-relaxed whitespace-pre-line pl-3 border-l-2 border-[#287C78]">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Emergency & Municipal Helpline Contacts */}
      <div className="bg-white rounded-2xl border border-[#DCE5E9] p-6 space-y-3">
        <h3 className="text-xs font-bold text-[#193B50] uppercase tracking-wider">
          Municipal Helpline &amp; Emergency Escalation
        </h3>
        <p className="text-xs text-[#64748B]">
          For life-threatening emergencies (e.g. collapsed bridges, sparking high-tension lines, major pipeline flooding near hospitals), contact central emergency services immediately:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs font-semibold">
          <div className="p-3 bg-[#F4F7F8] rounded-xl border border-[#DCE5E9] flex items-center gap-2.5">
            <Phone className="w-4 h-4 text-[#C65B5B]" />
            <div>
              <span className="text-[#64748B] block text-[10px]">National Emergency:</span>
              <span className="text-[#193B50] font-bold font-mono">112</span>
            </div>
          </div>

          <div className="p-3 bg-[#F4F7F8] rounded-xl border border-[#DCE5E9] flex items-center gap-2.5">
            <Phone className="w-4 h-4 text-[#287C78]" />
            <div>
              <span className="text-[#64748B] block text-[10px]">Kota Municipal Control Room:</span>
              <span className="text-[#193B50] font-bold font-mono">0744-2501000</span>
            </div>
          </div>

          <div className="p-3 bg-[#F4F7F8] rounded-xl border border-[#DCE5E9] flex items-center gap-2.5">
            <Mail className="w-4 h-4 text-[#D6A64F]" />
            <div>
              <span className="text-[#64748B] block text-[10px]">Citizen Support Email:</span>
              <span className="text-[#193B50] font-bold">support.kota@codecivic.gov.in</span>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
