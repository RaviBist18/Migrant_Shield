export default function ContractScanIllustration() {
    return (
      <svg
        viewBox="0 0 160 160"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-96 h-96"
        aria-hidden="true"
      >
        {/* Document shadow */}
        <rect x="18" y="14" width="72" height="90" rx="4" fill="#e2e8f0" />
  
        {/* Document body */}
        <rect x="14" y="10" width="72" height="90" rx="4" fill="white" stroke="#cbd5e1" strokeWidth="1.5" />
  
        {/* Document lines */}
        <rect x="24" y="24" width="44" height="3" rx="1.5" fill="#cbd5e1" />
        <rect x="24" y="32" width="52" height="2.5" rx="1.25" fill="#e2e8f0" />
        <rect x="24" y="39" width="48" height="2.5" rx="1.25" fill="#e2e8f0" />
        <rect x="24" y="46" width="50" height="2.5" rx="1.25" fill="#e2e8f0" />
        <rect x="24" y="53" width="44" height="2.5" rx="1.25" fill="#e2e8f0" />
        <rect x="24" y="60" width="52" height="2.5" rx="1.25" fill="#e2e8f0" />
        <rect x="24" y="67" width="38" height="2.5" rx="1.25" fill="#e2e8f0" />
  
        {/* Signature line */}
        <rect x="24" y="82" width="30" height="1.5" rx="0.75" fill="#cbd5e1" />
        {/* Signature scribble */}
        <path
          d="M24 89 Q28 85 32 89 Q36 93 40 89"
          stroke="#94a3b8"
          strokeWidth="1.5"
          strokeLinecap="round"
          fill="none"
        />
  
        {/* Phone body */}
        <rect x="74" y="48" width="68" height="102" rx="10" fill="#1e293b" />
  
        {/* Phone screen */}
        <rect x="79" y="58" width="58" height="82" rx="6" fill="#f8fafc" />
  
        {/* Phone notch */}
        <rect x="100" y="51" width="16" height="4" rx="2" fill="#0f172a" />
  
        {/* Scan frame corners — top left */}
        <path d="M88 68 L88 74 M88 68 L94 68" stroke="#334155" strokeWidth="2" strokeLinecap="round" />
        {/* top right */}
        <path d="M128 68 L128 74 M128 68 L122 68" stroke="#334155" strokeWidth="2" strokeLinecap="round" />
        {/* bottom left */}
        <path d="M88 128 L88 122 M88 128 L94 128" stroke="#334155" strokeWidth="2" strokeLinecap="round" />
        {/* bottom right */}
        <path d="M128 128 L128 122 M128 128 L122 128" stroke="#334155" strokeWidth="2" strokeLinecap="round" />
  
        {/* Document inside phone screen */}
        <rect x="95" y="76" width="26" height="34" rx="2" fill="white" stroke="#cbd5e1" strokeWidth="1" />
        <rect x="99" y="82" width="18" height="1.5" rx="0.75" fill="#e2e8f0" />
        <rect x="99" y="86" width="14" height="1.5" rx="0.75" fill="#e2e8f0" />
        <rect x="99" y="90" width="16" height="1.5" rx="0.75" fill="#e2e8f0" />
        <rect x="99" y="94" width="12" height="1.5" rx="0.75" fill="#e2e8f0" />
        <rect x="99" y="98" width="15" height="1.5" rx="0.75" fill="#e2e8f0" />
  
        {/* Scan line */}
        <rect x="88" y="98" width="40" height="1.5" rx="0.75" fill="#0ea5e9" opacity="0.6" />
  
        {/* Bottom home indicator */}
        <rect x="101" y="134" width="14" height="2.5" rx="1.25" fill="#334155" />
      </svg>
    );
  }