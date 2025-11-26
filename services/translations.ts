

import React, { createContext, useContext, useState, ReactNode } from 'react';

export type Language = 'en' | 'te' | 'hi' | 'ta';

export const LANGUAGES: { code: Language; label: string; native: string }[] = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'te', label: 'Telugu', native: 'తెలుగు' },
  { code: 'hi', label: 'Hindi', native: 'हिंदी' },
  { code: 'ta', label: 'Tamil', native: 'தமிழ்' },
];

const dictionary: Record<Language, Record<string, string>> = {
  en: {
    'app.title': 'SmartPaddy',
    'app.subtitle': 'Field Monitor',
    'nav.fields': 'Fields',
    'nav.alerts': 'Alerts',
    'nav.tools': 'Tools',
    'nav.logs': 'Logs',
    'nav.weather': 'Weather',
    'nav.settings': 'Settings',
    'status.last_updated': 'Last Updated',
    'weather.local': 'Local Weather',
    'btn.refresh': 'Refresh',
    'btn.arrange': 'Arrange',
    'btn.done': 'Done',
    'filter.all': 'All Fields',
    'filter.lora': 'LoRa Network',
    'filter.gsm': 'GSM',
    'filter.wifi': 'WiFi',
    'empty.title': 'No Fields Found',
    'empty.subtitle': 'Try adjusting the device filters above.',
    'unit.cm': 'cm',
    'water.level': 'Water Level',
    'water.above': 'Above Soil',
    'water.below': 'Below Soil',
    'crop.days_old': 'Days Old',
    'link.details': 'View Details',
    'alert.center': 'Action Center',
    'alert.subtitle': 'Prioritized tasks and warnings for your fields.',
    'tools.title': 'Agri-Tools',
    'tools.subtitle': 'Calculators and Reports.',
    'settings.title': 'System Settings',
    'settings.subtitle': 'Configure thresholds and connections.',
  },
  te: {
    'app.title': 'స్మార్ట్ పాడీ',
    'app.subtitle': 'పొలం పర్యవేక్షణ',
    'nav.fields': 'పొలాలు',
    'nav.alerts': 'హెచ్చరికలు',
    'nav.tools': 'పనిముట్లు',
    'nav.logs': 'రికార్డులు',
    'nav.weather': 'వాతావరణం',
    'nav.settings': 'అమరికలు',
    'status.last_updated': 'చివరి అప్‌డేట్',
    'weather.local': 'స్థానిక వాతావరణం',
    'btn.refresh': 'రీఫ్రెష్',
    'btn.arrange': 'అమర్చండి',
    'btn.done': 'పూర్తయింది',
    'filter.all': 'అన్ని పొలాలు',
    'filter.lora': 'లోరా నెట్‌వర్క్',
    'filter.gsm': 'GSM',
    'filter.wifi': 'WiFi',
    'empty.title': 'పొలాలు కనుగొనబడలేదు',
    'empty.subtitle': 'పైన ఉన్న ఫిల్టర్‌లను మార్చి చూడండి.',
    'unit.cm': 'సెం.మీ',
    'water.level': 'నీటి మట్టం',
    'water.above': 'నేల పైన',
    'water.below': 'నేల కింద',
    'crop.days_old': 'రోజుల పంట',
    'link.details': 'వివరాలు చూడండి',
    'alert.center': 'చర్య కేంద్రం',
    'alert.subtitle': 'మీ పొలాల కోసం ముఖ్యమైన పనులు.',
    'tools.title': 'వ్యవసాయ పనిముట్లు',
    'tools.subtitle': 'కాలిక్యులేటర్లు మరియు నివేదికలు.',
    'settings.title': 'సిస్టమ్ అమరికలు',
    'settings.subtitle': 'సెన్సార్ మరియు కనెక్షన్ సెట్టింగ్‌లు.',
  },
  hi: {
    'app.title': 'स्मार्ट पैडी',
    'app.subtitle': 'खेत निगरानी',
    'nav.fields': 'खेत',
    'nav.alerts': 'चेतावनी',
    'nav.tools': 'उपकरण',
    'nav.logs': 'लॉग्स',
    'nav.weather': 'मौसम',
    'nav.settings': 'सेटिंग्स',
    'status.last_updated': 'अंतिम अपडेट',
    'weather.local': 'स्थानीय मौसम',
    'btn.refresh': 'रिफ्रेश',
    'btn.arrange': 'व्यवस्थित करें',
    'btn.done': 'हो गया',
    'filter.all': 'सभी खेत',
    'filter.lora': 'लोरा नेटवर्क',
    'filter.gsm': 'जीएसएम',
    'filter.wifi': 'वाई-फाई',
    'empty.title': 'कोई खेत नहीं मिला',
    'empty.subtitle': 'कृपया फ़िल्टर जांचें।',
    'unit.cm': 'से.मी.',
    'water.level': 'जल स्तर',
    'water.above': 'मिट्टी के ऊपर',
    'water.below': 'मिट्टी के नीचे',
    'crop.days_old': 'दिन पुरानी फसल',
    'link.details': 'विवरण देखें',
    'alert.center': 'कार्य केंद्र',
    'alert.subtitle': 'आपकी खेतों के लिए प्राथमिकता वाले कार्य।',
    'tools.title': 'कृषि उपकरण',
    'tools.subtitle': 'कैलकुलेटर और रिपोर्ट।',
    'settings.title': 'सिस्टम सेटिंग्स',
    'settings.subtitle': 'थ्रेसहोल्ड और कनेक्शन कॉन्फ़िगर करें।',
  },
  ta: {
    'app.title': 'ஸ்மார்ட் பேடி',
    'app.subtitle': 'கள கண்காணிப்பு',
    'nav.fields': 'வயல்கள்',
    'nav.alerts': 'எச்சரிக்கைகள்',
    'nav.tools': 'கருவிகள்',
    'nav.logs': 'பதிவுகள்',
    'nav.weather': 'வானிலை',
    'nav.settings': 'அமைப்புகள்',
    'status.last_updated': 'கடைசியாக புதுப்பிக்கப்பட்டது',
    'weather.local': 'உள்ளூர் வானிலை',
    'btn.refresh': 'புதுப்பி',
    'btn.arrange': 'வரிசைப்படுத்து',
    'btn.done': 'முடிந்தது',
    'filter.all': 'அனைத்து வயல்கள்',
    'filter.lora': 'LoRa நெட்வொர்க்',
    'filter.gsm': 'GSM',
    'filter.wifi': 'WiFi',
    'empty.title': 'வயல்கள் இல்லை',
    'empty.subtitle': 'வடிப்பான்களை சரிபார்க்கவும்.',
    'unit.cm': 'செ.மீ',
    'water.level': 'நீர் மட்டம்',
    'water.above': 'மண்ணுக்கு மேல்',
    'water.below': 'மண்ணுக்கு கீழே',
    'crop.days_old': 'நாட்கள்',
    'link.details': 'விவரங்களைப் பார்க்கவும்',
    'alert.center': 'செயல் மையம்',
    'alert.subtitle': 'முக்கியமான எச்சரிக்கைகள்.',
    'tools.title': 'வேளாண் கருவிகள்',
    'tools.subtitle': 'கணக்கீடுகள் மற்றும் அறிக்கைகள்.',
    'settings.title': 'அமைப்பு அமைப்புகள்',
    'settings.subtitle': 'அளவுருக்களை உள்ளமைக்கவும்.',
  }
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('en');

  const t = (key: string): string => {
    return dictionary[language][key] || dictionary['en'][key] || key;
  };

  // Fixed: Use React.createElement instead of JSX in .ts file to avoid parsing errors
  return React.createElement(
    LanguageContext.Provider,
    { value: { language, setLanguage, t } },
    children
  );
};

export const useTranslation = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
};
