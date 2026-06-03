export type Lang = 'en' | 'ne';

export interface LandingTranslations {
  nav: {
    brand: string;
    langToggle: string;
    quickExit: string;
    cta: string;
    navHome: string;
    navUpload: string;
    navHistory: string;
  };
  hero: {
    badge: string;
    headline: string;
    subheadline: string;
    trustPill: string;
    privacyNote: string;
    ctaPrimary: string;
    ctaSecondary: string;
  };
  capabilities: {
    label: string;
    items: { icon: string; value: string; desc: string }[];
  };
  howItWorks: {
    sectionLabel: string;
    heading: string;
    steps: { number: string; title: string; desc: string }[];
  };
  violations: {
    sectionLabel: string;
    heading: string;
    subheading: string;
    items: { title: string; desc: string }[];
  };
  jurisdictions: {
    sectionLabel: string;
    heading: string;
    iloStatement: string;
    destinations: string[];
  };
  faq: {
    sectionLabel: string;
    heading: string;
    items: { question: string; answer: string }[];
  };
  ngo: {
    heading: string;
    desc: string;
    cta: string;
  };
  footer: {
    disclaimer: string;
    links: { label: string; href: string }[];
    copyright: string;
  };
  auth: {
    emailLabel: string;
    emailPlaceholder: string;
    sendCode: string;
    sending: string;
    privacyNote: string;
    backToHome: string;
    otpHeading: string;
    otpSub: string;
    otpPlaceholder: string;
    verify: string;
    verifying: string;
    resend: string;
    signInHeading: string;
    signInSub: string;
    verificationLabel: string;
  };
  upload: {
    heading: string;
    subheading: string;
    tapToSelect: string;
    tapSub: string;
    errorType: string;
    errorSize: string;
    securityNote: string;
    dashboardLink: string;
  };
  dashboard: {
    title: string;
    welcomeBack: string;
    uploadContract: string;
    signOut: string;
    totalContracts: string;
    totalSub: string;
    analysed: string;
    analysedSub: string;
    criticalFlags: string;
    criticalSub: string;
    processing: string;
    processingSub: string;
    contractRecords: string;
    viewAll: string;
    colWorker: string;
    colEmployer: string;
    colCountry: string;
    colDate: string;
    colStatus: string;
    colRisk: string;
    colFlags: string;
    statusCompleted: string;
    statusProcessing: string;
    statusQueued: string;
    statusFailed: string;
    actionView: string;
    actionRetry: string;
    notSpecified: string;
    emptyHeading: string;
    emptyDesc: string;
    emptyCta: string;
    clearFilter: string;
    showing: string;
    of: string;
    records: string;
    riskHigh: string;
    riskMedium: string;
    riskLow: string;
  };
  history: {
    title: string;
    records: string;
    searchPlaceholder: string;
    filterAll: string;
    filterCompleted: string;
    filterProcessing: string;
    filterQueued: string;
    filterFailed: string;
    emptyHeading: string;
    emptyDesc: string;
    notSpecified: string;
    risk: string;
  };
  report: {
    title: string;
    analysedAt: string;
    verdict_critical: string;
    verdict_caution: string;
    verdict_safe: string;
    badge_high: string;
    badge_review: string;
    badge_safe: string;
    aiConfidence: string;
    lowConfidence: string;
    requestReview: string;
    reviewSubmitted: string;
    downloadPdf: string;
    shareReport: string;
    linkCopied: string;
    riskFlags: string;
    noFlags: string;
    noFlagsSub: string;
    notReady: string;
    notReadySub: string;
    uploadAgain: string;
    viewProgress: string;
    failedLoad: string;
    retry: string;
    disclaimer: string;
    disclaimerBody: string;
    confidence: string;
  }
  settings: {
    title: string;
    signedInAs: string;
    accountSection: string;
    emailLabel: string;
    resetPassword: string;
    resetSent: string;
    sending: string;
    legalSection: string;
    privacyPolicy: string;
    terms: string;
    partnerNGOs: string;
    signOut: string;
    dangerZone: string;
    deleteAccount: string;
    generalSection: string;
    appearance: string;
    language: string;
  };
}

export const translations: Record<Lang, LandingTranslations> = {
  en: {
    nav: {
      brand: 'MigrantShield',
      langToggle: 'NE',
      quickExit: '⚠ Quick Exit',
      cta: 'Check My Contract',
      navHome: 'Home',
      navUpload: 'Upload',
      navHistory: 'History',
    },
    hero: {
      badge: 'Free for all migrant workers worldwide',
      headline: 'Know Your Rights Before You Sign',
      subheadline:
        'MigrantShield uses AI to scan your employment contract for illegal clauses, hidden fees, passport confiscation, and exploitation — in minutes, for free.',
      trustPill: '🔒 Safe, Free & Confidential — No account required to check your contract.',
      privacyNote:
        '🔒 Your privacy is protected. Zero data tracking. No information is ever shared with your employer or immigration authorities.',
      ctaPrimary: 'Check My Contract',
      ctaSecondary: 'Learn How It Works',
    },
    capabilities: {
      label: 'Platform Capabilities',
      items: [
        { icon: '⏱', value: 'Under 2 Minutes', desc: 'Processing Time' },
        { icon: '💰', value: 'Always Free', desc: 'No hidden charges, ever' },
        { icon: '🔒', value: 'Encrypted & Private', desc: 'Data protected end-to-end' },
        { icon: '📄', value: 'PDF, JPG, PNG, WEBP', desc: 'Supported file formats' },
      ],
    },
    howItWorks: {
      sectionLabel: 'How It Works',
      heading: 'Three Steps to Safety',
      steps: [
        {
          number: '01',
          title: 'Upload Your Contract',
          desc: 'Take a photo or upload a PDF of your employment contract. We support documents in Arabic, English, Malay, Hindi, and more.',
        },
        {
          number: '02',
          title: 'AI Scans for Violations',
          desc: 'Our system checks for illegal recruitment fees, passport confiscation, unauthorized wage deductions, excessive working hours, and unlawful termination clauses.',
        },
        {
          number: '03',
          title: 'Get Your Report',
          desc: 'Receive a plain-language report with a risk score, flagged clauses, legal references, and clear steps to protect yourself — downloadable as a PDF.',
        },
      ],
    },
    violations: {
      sectionLabel: 'What We Detect',
      heading: 'Common Contract Violations',
      subheading:
        'Our system is trained to identify the most common forms of exploitation found in migrant worker employment contracts.',
      items: [
        {
          title: 'Illegal Recruitment Fees',
          desc: 'Clauses requiring workers to pay fees for their own placement, transportation, or visa processing — prohibited under ILO standards.',
        },
        {
          title: 'Passport Retention',
          desc: "Any clause permitting an employer to hold, confiscate, or control a worker's passport or identity documents.",
        },
        {
          title: 'Unauthorized Wage Deductions',
          desc: 'Deductions for accommodation, food, or equipment that reduce pay below the legal minimum wage threshold.',
        },
        {
          title: 'Excessive Working Hours',
          desc: 'Schedules exceeding legal maximums without proper overtime compensation as required by local labour law.',
        },
        {
          title: 'Unlawful Termination Clauses',
          desc: 'Terms that allow employers to terminate without notice or cause, with no compensation or appeal rights.',
        },
        {
          title: 'Forced Accommodation Deductions',
          desc: 'Mandatory housing arrangements with costs deducted from salary at rates above fair market value.',
        },
      ],
    },
    jurisdictions: {
      sectionLabel: 'Supported Jurisdictions',
      heading: 'Legal Frameworks We Cover',
      iloStatement:
        'Built to align with International Labour Organization (ILO) Fair Recruitment Principles and destination-country labour regulations.',
      destinations: [
        'Qatar',
        'United Arab Emirates',
        'Malaysia',
        'Singapore',
        'Saudi Arabia',
        'Oman',
        'Kuwait',
        'Bahrain',
      ],
    },
    faq: {
      sectionLabel: 'Frequently Asked Questions',
      heading: 'Your Questions Answered',
      items: [
        {
          question: 'Is it completely free?',
          answer:
            'Yes. MigrantShield is a non-profit platform. There are no fees, subscriptions, or hidden charges — now or ever. This service exists solely to protect migrant workers.',
        },
        {
          question: 'Who has access to view my contract?',
          answer:
            'Only you. Your contract is processed securely by our AI system and is never shared with your employer, recruitment agency, immigration authorities, or any third party. All file transfers are encrypted in transit (TLS) and at rest.',
        },
        {
          question: 'What document file types are supported?',
          answer:
            'We support PDF, JPG, PNG, and WEBP formats. You can upload a scanned copy, a photo taken with your phone camera, or a digital PDF. Our system handles multi-language documents including Arabic, English, Malay, and Hindi.',
        },
        {
          question: 'How long does the AI analysis take?',
          answer:
            'Most contracts are analysed in under 2 minutes. During periods of high demand, processing may take slightly longer. You will receive a full report with your risk score, flagged clauses, and recommended actions once complete.',
        },
      ],
    },
    ngo: {
      heading: 'Are you a case worker or legal aid professional?',
      desc: 'MigrantShield provides dedicated access pathways for NGOs, legal aid organisations, and field case workers supporting migrant worker communities.',
      cta: 'NGO & Case Worker Access',
    },
    footer: {
      disclaimer:
        'Automated AI Analysis Only — Not Legal Advice. MigrantShield identifies potential contract risks for informational purposes. Always consult a qualified legal professional before making decisions about your employment contract.',
      links: [
        { label: 'Privacy Policy', href: '/privacy' },
        { label: 'Help', href: '/help' },
        { label: 'Settings', href: '/settings' },
      ],
      copyright: `© ${new Date().getFullYear()} MigrantShield. Free, always.`,
    },
    auth: {
      emailLabel: 'Email Address',
      emailPlaceholder: 'you@example.com',
      sendCode: 'Send Login Code →',
      sending: 'Sending...',
      privacyNote: 'Your email is used only for login. We never share your data or send marketing emails.',
      backToHome: '← Back to Home',
      otpHeading: 'Enter Verification Code',
      otpSub: 'We sent a secure 6-digit code to your email.',
      otpPlaceholder: '000000',
      verify: 'Verify Code →',
      verifying: 'Verifying...',
      resend: 'Resend Code',
      signInHeading: 'Sign in to MigrantShield',
      signInSub: 'Enter your email to receive a secure one-time login code.',
      verificationLabel: 'Verification Code',
    },
    upload: {
      heading: 'Upload Contract',
      subheading: 'Upload your employment contract for risk analysis. Supported formats: JPG, PNG, WEBP, PDF. Maximum size: 15MB.',
      tapToSelect: 'Tap to select or photograph contract',
      tapSub: 'Camera, gallery, or file picker',
      errorType: 'Unsupported file type. Please upload a JPG, PNG, WEBP, or PDF file.',
      errorSize: 'File too large. Maximum size is 15MB.',
      securityNote: 'Your contract is encrypted and stored securely. Only you can access it.',
      dashboardLink: 'Go to Dashboard',
    },
    dashboard: {
      title: 'Dashboard',
      welcomeBack: 'Welcome back',
      uploadContract: 'Upload Contract',
      signOut: 'Sign Out',
      totalContracts: 'Total Contracts',
      totalSub: 'All time',
      analysed: 'Analysed',
      analysedSub: 'Completed',
      criticalFlags: 'Critical Flags',
      criticalSub: 'Across all contracts',
      processing: 'Processing',
      processingSub: 'In queue',
      contractRecords: 'Contract Records',
      viewAll: 'View All',
      colWorker: 'Worker',
      colEmployer: 'Employer',
      colCountry: 'Country',
      colDate: 'Date',
      colStatus: 'Status',
      colRisk: 'Risk',
      colFlags: 'Flags',
      statusCompleted: 'Completed',
      statusProcessing: 'Processing',
      statusQueued: 'Queued',
      statusFailed: 'Failed',
      actionView: 'View',
      actionRetry: 'Retry',
      notSpecified: 'Not Specified',
      emptyHeading: 'No Contracts Yet',
      emptyDesc: 'Upload your employment contract to check for illegal clauses and hidden risks before you sign.',
      emptyCta: 'Upload Your First Contract',
      clearFilter: 'Clear Filter',
      showing: 'Showing',
      of: 'of',
      records: 'records',
      riskHigh: 'HIGH',
      riskMedium: 'MEDIUM',
      riskLow: 'LOW',
    },
    history: {
      title: 'Contract History',
      records: 'records',
      searchPlaceholder: 'Search worker or employer...',
      filterAll: 'All',
      filterCompleted: 'Completed',
      filterProcessing: 'Processing',
      filterQueued: 'Queued',
      filterFailed: 'Failed',
      emptyHeading: 'No contracts found',
      emptyDesc: 'Try a different filter or upload a new contract.',
      notSpecified: 'Not Specified',
      risk: 'Risk',
    },
    report: {
      title: 'Contract Risk Report',
      analysedAt: 'Analyzed',
      verdict_critical: 'CRITICAL',
      verdict_caution: 'CAUTION',
      verdict_safe: 'SAFE',
      badge_high: 'High Risk Contract',
      badge_review: 'Review Recommended',
      badge_safe: 'Contract Appears Safe',
      aiConfidence: 'AI Confidence Score',
      lowConfidence: 'AI confidence is below 85%. Some findings may be incomplete. Human review recommended.',
      requestReview: 'Request Human Legal Review',
      reviewSubmitted: 'Human review requested. A legal advisor will contact you.',
      downloadPdf: 'Download PDF',
      shareReport: 'Share Report',
      linkCopied: 'Link Copied!',
      riskFlags: 'Risk Flags',
      noFlags: 'No risk flags identified.',
      noFlagsSub: 'This contract appears structurally safe. Always verify with a legal professional.',
      notReady: 'Report Not Ready',
      notReadySub: 'Analysis is still in progress.',
      uploadAgain: 'Upload Again',
      viewProgress: 'View Progress',
      failedLoad: 'Failed to Load Report',
      retry: 'Retry',
      disclaimer: 'Automated Translation Aid Only — Not Legal Advice.',
      disclaimerBody: 'AI analysis may miss context, nuance, or jurisdiction-specific law. Results are indicative only. MigrantShield accepts no liability for actions taken based on this report.',
      confidence: 'confidence',
    },
    settings: {
      title: 'Settings',
      signedInAs: 'Signed in as',
      accountSection: 'Account',
      emailLabel: 'Email',
      resetPassword: 'Reset Password',
      resetSent: 'Reset link sent — check your inbox.',
      sending: 'Sending…',
      legalSection: 'Legal & Resources',
      privacyPolicy: 'Privacy Policy',
      terms: 'Terms of Service',
      partnerNGOs: 'Partner NGOs',
      signOut: 'Sign Out',
      dangerZone: 'Danger Zone',
      deleteAccount: 'Delete Account',
      generalSection: 'General',
      appearance: 'Appearance',
      language: 'Language',
    },
  },

  ne: {
    nav: {
      brand: 'MigrantShield',
      langToggle: 'EN',
      quickExit: '⚠ तुरुन्त बाहिर',
      cta: 'सम्झौता जाँच गर्नुहोस्',
      navHome: 'गृह',
      navUpload: 'अपलोड',
      navHistory: 'इतिहास',
    },
    hero: {
      badge: 'विश्वभरका सबै प्रवासी कामदारहरूका लागि निःशुल्क',
      headline: 'सुरक्षित सम्झौता, सुरक्षित भविष्य: हस्ताक्षर गर्नु अघि जाँच गर्नुहोस्',
      subheadline:
        'MigrantShield ले AI प्रयोग गरी तपाईंको रोजगार सम्झौतामा अवैध धाराहरू, लुकेका शुल्कहरू, राहदानी जफत र शोषण पत्ता लगाउँछ — मिनेटमा, निःशुल्क।',
      trustPill: '🔒 सुरक्षित, निःशुल्क र गोपनीय — सम्झौता जाँच गर्न कुनै खाता आवश्यक छैन।',
      privacyNote:
        '🔒 तपाईंको गोपनीयता सुरक्षित छ। कुनै डेटा ट्र्याकिङ छैन। तपाईंको जानकारी कहिल्यै नियोक्ता वा आप्रवासन अधिकारीहरूसँग साझा गरिँदैन।',
      ctaPrimary: 'सम्झौता जाँच गर्नुहोस्',
      ctaSecondary: 'कसरी काम गर्छ हेर्नुहोस्',
    },
    capabilities: {
      label: 'प्लेटफर्म क्षमताहरू',
      items: [
        { icon: '⏱', value: '२ मिनेटभन्दा कम', desc: 'प्रशोधन समय' },
        { icon: '💰', value: 'सधैं निःशुल्क', desc: 'कुनै लुकेको शुल्क छैन' },
        { icon: '🔒', value: 'इन्क्रिप्टेड र निजी', desc: 'डेटा पूर्णतः सुरक्षित' },
        { icon: '📄', value: 'PDF, JPG, PNG, WEBP', desc: 'समर्थित फाइल ढाँचाहरू' },
      ],
    },
    howItWorks: {
      sectionLabel: 'कसरी काम गर्छ',
      heading: 'सुरक्षाका तीन चरणहरू',
      steps: [
        {
          number: '०१',
          title: 'सम्झौता अपलोड गर्नुहोस्',
          desc: 'आफ्नो रोजगार सम्झौताको फोटो खिच्नुहोस् वा PDF अपलोड गर्नुहोस्। हामी अरबी, अंग्रेजी, मलय, हिन्दी लगायतका भाषाका कागजातहरू समर्थन गर्छौं।',
        },
        {
          number: '०२',
          title: 'AI ले उल्लङ्घनहरू जाँच गर्छ',
          desc: 'हाम्रो प्रणालीले अवैध भर्ती शुल्क, राहदानी जफत, अनधिकृत तलब कटौती, अत्यधिक काम गर्ने घन्टा र गैरकानूनी बर्खास्ती धाराहरू जाँच गर्छ।',
        },
        {
          number: '०३',
          title: 'आफ्नो रिपोर्ट पाउनुहोस्',
          desc: 'जोखिम स्कोर, चिन्हित धाराहरू, कानूनी सन्दर्भहरू र आफूलाई सुरक्षित राख्ने स्पष्ट कदमहरू सहित सरल भाषामा रिपोर्ट पाउनुहोस् — PDF मा डाउनलोड गर्न मिल्ने।',
        },
      ],
    },
    violations: {
      sectionLabel: 'हामी के पत्ता लगाउँछौं',
      heading: 'सामान्य सम्झौता उल्लङ्घनहरू',
      subheading:
        'हाम्रो प्रणाली प्रवासी कामदारहरूको रोजगार सम्झौतामा पाइने सबैभन्दा सामान्य शोषणका रूपहरू पहिचान गर्न तालिम पाएको छ।',
      items: [
        {
          title: 'अवैध भर्ती शुल्क',
          desc: 'कामदारहरूलाई आफ्नै नियुक्ति, यातायात वा भिसा प्रशोधनका लागि शुल्क तिर्न आवश्यक पार्ने धाराहरू — ILO मानकहरू अन्तर्गत निषेधित।',
        },
        {
          title: 'राहदानी जफत',
          desc: 'नियोक्तालाई कामदारको राहदानी वा परिचय पत्र राख्न, जफत गर्न वा नियन्त्रण गर्न अनुमति दिने कुनै पनि धारा।',
        },
        {
          title: 'अनधिकृत तलब कटौती',
          desc: 'बास, खाना वा उपकरणका लागि कटौती जसले तलबलाई न्यूनतम ज्याला सीमाभन्दा तल झार्छ।',
        },
        {
          title: 'अत्यधिक काम गर्ने घन्टा',
          desc: 'स्थानीय श्रम कानूनले तोकेको उचित ओभरटाइम क्षतिपूर्ति बिना कानूनी अधिकतम भन्दा बढी तालिकाहरू।',
        },
        {
          title: 'गैरकानूनी बर्खास्ती धाराहरू',
          desc: 'नियोक्तालाई कुनै सूचना वा कारण बिना, कुनै क्षतिपूर्ति वा अपिल अधिकार नदिई बर्खास्त गर्न अनुमति दिने सर्तहरू।',
        },
        {
          title: 'जबरजस्ती आवास कटौती',
          desc: 'उचित बजार मूल्यभन्दा बढी दरमा तलबबाट काटिने अनिवार्य आवास व्यवस्थाहरू।',
        },
      ],
    },
    jurisdictions: {
      sectionLabel: 'समर्थित क्षेत्राधिकारहरू',
      heading: 'हामी समेट्ने कानूनी ढाँचाहरू',
      iloStatement:
        'अन्तर्राष्ट्रिय श्रम संगठन (ILO) को उचित भर्ती सिद्धान्तहरू र गन्तव्य देशका श्रम नियमहरूसँग मिल्ने गरी निर्मित।',
      destinations: [
        'कतार',
        'संयुक्त अरब इमिरेट्स',
        'मलेसिया',
        'सिंगापुर',
        'साउदी अरेबिया',
        'ओमान',
        'कुवेत',
        'बहराइन',
      ],
    },
    faq: {
      sectionLabel: 'बारम्बार सोधिने प्रश्नहरू',
      heading: 'तपाईंका प्रश्नहरूको जवाफ',
      items: [
        {
          question: 'के यो पूर्णतः निःशुल्क छ?',
          answer:
            'हो। MigrantShield एक गैर-नाफामुखी प्लेटफर्म हो। कुनै शुल्क, सदस्यता वा लुकेका शुल्कहरू छैनन् — अहिले वा कहिल्यै पनि। यो सेवा केवल प्रवासी कामदारहरूको सुरक्षाका लागि अवस्थित छ।',
        },
        {
          question: 'मेरो सम्झौता हेर्ने अधिकार कसलाई छ?',
          answer:
            'केवल तपाईंलाई। तपाईंको सम्झौता हाम्रो AI प्रणालीद्वारा सुरक्षित रूपमा प्रशोधित हुन्छ र कहिल्यै तपाईंको नियोक्ता, भर्ती एजेन्सी, आप्रवासन अधिकारी वा कुनै तेस्रो पक्षसँग साझा गरिँदैन।',
        },
        {
          question: 'कुन फाइल ढाँचाहरू समर्थित छन्?',
          answer:
            'हामी PDF, JPG, PNG र WEBP ढाँचाहरू समर्थन गर्छौं। तपाईं स्क्यान गरिएको प्रति, फोन क्यामेराले खिचेको फोटो वा डिजिटल PDF अपलोड गर्न सक्नुहुन्छ।',
        },
        {
          question: 'AI विश्लेषणमा कति समय लाग्छ?',
          answer:
            'अधिकांश सम्झौताहरू २ मिनेटभन्दा कममा विश्लेषण गरिन्छन्। पूरा भएपछि तपाईंले आफ्नो जोखिम स्कोर, चिन्हित धाराहरू र सिफारिस गरिएका कार्यहरू सहित पूर्ण रिपोर्ट पाउनुहुनेछ।',
        },
      ],
    },
    ngo: {
      heading: 'के तपाईं केस वर्कर वा कानूनी सहायता पेशेवर हुनुहुन्छ?',
      desc: 'MigrantShield ले NGO हरू, कानूनी सहायता संस्थाहरू र प्रवासी कामदार समुदायहरूलाई समर्थन गर्ने फिल्ड केस वर्करहरूका लागि समर्पित पहुँच मार्गहरू प्रदान गर्छ।',
      cta: 'NGO र केस वर्कर पहुँच',
    },
    footer: {
      disclaimer:
        'स्वचालित AI विश्लेषण मात्र — कानूनी सल्लाह होइन। MigrantShield ले सूचनात्मक उद्देश्यका लागि सम्भावित सम्झौता जोखिमहरू पहिचान गर्छ।',
      links: [
        { label: 'गोपनीयता नीति', href: '/privacy' },
        { label: 'सहायता', href: '/help' },
        { label: 'सेटिङहरू', href: '/settings' },
      ],
      copyright: `© ${new Date().getFullYear()} MigrantShield। सधैं निःशुल्क।`,
    },
    auth: {
      emailLabel: 'इमेल ठेगाना',
      emailPlaceholder: 'tapai@example.com',
      sendCode: 'लगइन कोड पठाउनुहोस् →',
      sending: 'पठाउँदै...',
      privacyNote: 'तपाईंको इमेल केवल लगइनका लागि प्रयोग गरिन्छ। हामी कहिल्यै तपाईंको डेटा साझा गर्दैनौं।',
      backToHome: '← गृहपृष्ठमा फर्कनुहोस्',
      otpHeading: 'प्रमाणीकरण कोड प्रविष्ट गर्नुहोस्',
      otpSub: 'हामीले तपाईंको इमेलमा ६ अङ्कको सुरक्षित कोड पठाएका छौं।',
      otpPlaceholder: '000000',
      verify: 'कोड प्रमाणित गर्नुहोस् →',
      verifying: 'प्रमाणित गर्दै...',
      resend: 'कोड पुनः पठाउनुहोस्',
      signInHeading: 'MigrantShield मा साइन इन गर्नुहोस्',
      signInSub: 'सुरक्षित एक-पटक लगइन कोड प्राप्त गर्न इमेल प्रविष्ट गर्नुहोस्।',
      verificationLabel: 'प्रमाणीकरण कोड',
    },
    upload: {
      heading: 'सम्झौता अपलोड गर्नुहोस्',
      subheading: 'जोखिम विश्लेषणका लागि आफ्नो रोजगार सम्झौता अपलोड गर्नुहोस्। समर्थित ढाँचाहरू: JPG, PNG, WEBP, PDF। अधिकतम आकार: १५MB।',
      tapToSelect: 'सम्झौता छान्न वा फोटो खिच्न थिच्नुहोस्',
      tapSub: 'क्यामेरा, ग्यालेरी, वा फाइल पिकर',
      errorType: 'असमर्थित फाइल प्रकार। कृपया JPG, PNG, WEBP, वा PDF अपलोड गर्नुहोस्।',
      errorSize: 'फाइल धेरै ठूलो छ। अधिकतम आकार १५MB हो।',
      securityNote: 'तपाईंको सम्झौता इन्क्रिप्ट गरी सुरक्षित राखिएको छ। केवल तपाईंले मात्र पहुँच गर्न सक्नुहुन्छ।',
      dashboardLink: 'ड्यासबोर्डमा जानुहोस्',
    },
    dashboard: {
      title: 'ड्यासबोर्ड',
      welcomeBack: 'फिर्ता स्वागत छ',
      uploadContract: 'सम्झौता अपलोड गर्नुहोस्',
      signOut: 'साइन आउट',
      totalContracts: 'कुल सम्झौताहरू',
      totalSub: 'सबै समय',
      analysed: 'विश्लेषण गरिएको',
      analysedSub: 'पूरा भयो',
      criticalFlags: 'गम्भीर चेतावनीहरू',
      criticalSub: 'सबै सम्झौतामा',
      processing: 'प्रशोधन हुँदै',
      processingSub: 'पङ्क्तिमा',
      contractRecords: 'सम्झौता अभिलेखहरू',
      viewAll: 'सबै हेर्नुहोस्',
      colWorker: 'कामदार',
      colEmployer: 'नियोक्ता',
      colCountry: 'देश',
      colDate: 'मिति',
      colStatus: 'स्थिति',
      colRisk: 'जोखिम',
      colFlags: 'चेतावनी',
      statusCompleted: 'पूरा भयो',
      statusProcessing: 'प्रशोधन हुँदै',
      statusQueued: 'पङ्क्तिमा',
      statusFailed: 'असफल',
      actionView: 'हेर्नुहोस्',
      actionRetry: 'पुनः प्रयास',
      notSpecified: 'उल्लेख छैन',
      emptyHeading: 'अहिलेसम्म कुनै सम्झौता छैन',
      emptyDesc: 'हस्ताक्षर गर्नु अघि अवैध धाराहरू र लुकेका जोखिमहरू जाँच गर्न आफ्नो रोजगार सम्झौता अपलोड गर्नुहोस्।',
      emptyCta: 'पहिलो सम्झौता अपलोड गर्नुहोस्',
      clearFilter: 'फिल्टर हटाउनुहोस्',
      showing: 'देखाउँदै',
      of: 'को',
      records: 'अभिलेखहरू',
      riskHigh: 'उच्च',
      riskMedium: 'मध्यम',
      riskLow: 'न्यून',
    },
    history: {
      title: 'सम्झौता इतिहास',
      records: 'रेकर्डहरू',
      searchPlaceholder: 'कामदार वा रोजगारदाता खोज्नुहोस्...',
      filterAll: 'सबै',
      filterCompleted: 'पूर्ण',
      filterProcessing: 'प्रशोधन',
      filterQueued: 'पंक्तिबद्ध',
      filterFailed: 'असफल',
      emptyHeading: 'कुनै सम्झौता फेला परेन',
      emptyDesc: 'फरक फिल्टर प्रयास गर्नुहोस् वा नयाँ सम्झौता अपलोड गर्नुहोस्।',
      notSpecified: 'उल्लेख छैन',
      risk: 'जोखिम',
    },
    report: {
      title: 'सम्झौता जोखिम रिपोर्ट',
      analysedAt: 'विश्लेषण गरिएको',
      verdict_critical: 'गम्भीर',
      verdict_caution: 'सावधान',
      verdict_safe: 'सुरक्षित',
      badge_high: 'उच्च जोखिम सम्झौता',
      badge_review: 'समीक्षा सिफारिस गरिन्छ',
      badge_safe: 'सम्झौता सुरक्षित देखिन्छ',
      aiConfidence: 'AI विश्वास स्कोर',
      lowConfidence: 'AI विश्वास ८५% भन्दा कम छ। केही निष्कर्ष अपूर्ण हुन सक्छ। मानव समीक्षा सिफारिस गरिन्छ।',
      requestReview: 'मानव कानुनी समीक्षा अनुरोध गर्नुहोस्',
      reviewSubmitted: 'मानव समीक्षा अनुरोध गरियो। कानुनी सल्लाहकारले सम्पर्क गर्नेछन्।',
      downloadPdf: 'PDF डाउनलोड गर्नुहोस्',
      shareReport: 'रिपोर्ट साझा गर्नुहोस्',
      linkCopied: 'लिङ्क कपी भयो!',
      riskFlags: 'जोखिम संकेतहरू',
      noFlags: 'कुनै जोखिम संकेत फेला परेन।',
      noFlagsSub: 'यो सम्झौता संरचनात्मक रूपमा सुरक्षित देखिन्छ। कानुनी विशेषज्ञसँग सधैं पुष्टि गर्नुहोस्।',
      notReady: 'रिपोर्ट तयार छैन',
      notReadySub: 'विश्लेषण अझै जारी छ।',
      uploadAgain: 'फेरि अपलोड गर्नुहोस्',
      viewProgress: 'प्रगति हेर्नुहोस्',
      failedLoad: 'रिपोर्ट लोड गर्न असफल',
      retry: 'पुनः प्रयास गर्नुहोस्',
      disclaimer: 'स्वचालित अनुवाद सहायता मात्र — कानुनी सल्लाह होइन।',
      disclaimerBody: 'AI विश्लेषणले सन्दर्भ, बारीकता, वा क्षेत्राधिकार-विशिष्ट कानून छुटाउन सक्छ। परिणामहरू संकेतात्मक मात्र हुन्। MigrantShield यस रिपोर्टमा आधारित कार्यहरूको लागि कुनै दायित्व स्वीकार गर्दैन।',
      confidence: 'विश्वास',
    },
    settings: {
      title: 'सेटिङहरू',
      signedInAs: 'साइन इन भएको',
      accountSection: 'खाता',
      emailLabel: 'इमेल',
      resetPassword: 'पासवर्ड रिसेट गर्नुहोस्',
      resetSent: 'रिसेट लिङ्क पठाइयो — इनबक्स जाँच गर्नुहोस्।',
      sending: 'पठाउँदै…',
      legalSection: 'कानूनी र स्रोतहरू',
      privacyPolicy: 'गोपनीयता नीति',
      terms: 'सेवा सर्तहरू',
      partnerNGOs: 'साझेदार NGO हरू',
      signOut: 'साइन आउट',
      dangerZone: 'खतरा क्षेत्र',
      deleteAccount: 'खाता मेटाउनुहोस्',
      generalSection: 'सामान्य',
      appearance: 'रूप',
      language: 'भाषा',
    },
  },
};