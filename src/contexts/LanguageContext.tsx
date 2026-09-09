'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { safeLocalStorage } from '@/lib/storage';

type Language = 'en' | 'bn';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const translations: Record<Language, Record<string, string>> = {
  en: {
    appName: 'PracPedia',
    appSub: 'Practical Encyclopedia',
    lobby: 'Classrooms Lobby',
    activeScholars: 'Active Scholars',
    onlineSuffix: 'online',
    chatRooms: 'Chat Rooms',
    generalLounge: 'General Lounge',
    generalLoungeDesc: 'Class-wide notices and general Q&A',
    dashboard: 'Dashboard Portal',
    adminPortal: 'Administrators Portal',
    discussion: 'Classroom Discussion',
    aiAcademy: 'AI Academy Study',
    editProfile: 'Edit My Profile',
    practicalFocusTimes: 'Practical Focus Times',
    noPracticalFolders: 'No practical folders available.',
    activeStudyDesk: 'Active Study Desk',
    thisSession: 'This Session',
    cumulativeDesk: 'Cumulative Desk',
    cloudEnv: 'Cloud Environment',
    storageEng: 'Storage Eng',
    activePages: 'Active Pages',
    signOut: 'Sign Out Console',
    session: 'Session',
    live: 'Live',
    synced: 'Synced',
    addFolder: 'Add Practical Folder',
    resignDuty: 'Resign Admin Duty',

    liveClassChat: 'Live Class Chat',
    secureNode: 'SECURE CONNECTION',
    activeStream: 'Active Stream',
    networkAlert: 'Network Alert',
    networkLoss: 'Network loss during discussion transmission. Retrying is suggested.',
    academicRoom: 'Universal Academic Room',
    noPostsYet: 'No collaborative posts resolved yet. Type a question or select a preset help card below!',
    teacher: 'Teacher',
    student: 'Student',
    quickChip1: '🧪 Need help with today\'s lab experiment!',
    quickChip2: '📊 Solving CQ Question structure...',
    quickChip3: '📐 Can someone share the derivation formula?',
    quickChip4: '📚 Ready for practice review!',
    placeholderGeneral: 'Broadcast questions to students & class teachers...',
    placeholderChannel: 'Post study query in',
    deleteMessage: 'Delete this message',

    academyTitleMain: 'PracPedia AI Academy &',
    academyTitleSub: 'PracPedia AI Academy',
    academyDesc:
      'Step into a premium learning deck aligned with the Bangladesh NCTB Board and International Board Standards. Master complex Newtonian mechanics, organic synthesis protocols, biological pathways, and C algorithms with instant interactive lessons.',
    responseLanguage: 'Response Language',
    boardBlueprint: '1. BOARD BLUEPRINT ACCORDION',
    customizeSubjectNotice:
      'This subject is customized or dynamic! Enter a specific theory or topic in the query field below to generate customized lessons.',
    units: 'Units',
    facultyUnit: 'FACULTY UNIT',
    sciencePaper: 'Science Paper',
    nctbSyllabus: 'NCTB Syllabus',
    internationalAp: 'International AP',
    customTopicPlaceholder: 'Or search, or lock standard textbook concept (e.g. Carnot Engine entropy index)...',
    searchBtn: 'Search Lesson',
    exploreLesson: 'Explore Lesson',
    quickMco: 'Quick MCQ Exam',
    solveCq: 'Solve Creative Question',
    academicTutor: 'Personal AI Academic Tutor',
    askAnythingPlaceholder: 'Ask Gemini anything about this chapter topic...',
    copiableNotice: 'Copy Code',
    learningPillTitle: 'Interactive Quick Action Prompts',
  },
  bn: {
    appName: 'প্র্যাকপেডিয়া',
    appSub: 'ব্যবহারিক বিশ্বকোষ',
    lobby: 'ক্লাসরুম লবি',
    activeScholars: 'সক্রিয় শিক্ষার্থী',
    onlineSuffix: 'অনলাইন',
    chatRooms: 'চ্যাট রুম',
    generalLounge: 'সাধারণ লাউঞ্জ',
    generalLoungeDesc: 'শ্রেণী-ভিত্তিক নোটিশ এবং সাধারণ প্রশ্নোত্তর',
    dashboard: 'ড্যাশবোর্ড পোর্টাল',
    adminPortal: 'প্রশাসক পোর্টাল',
    discussion: 'শ্রেণীকক্ষ আলোচনা',
    aiAcademy: 'এআই একাডেমি স্টাডি',
    editProfile: 'আমার প্রোফাইল',
    practicalFocusTimes: 'ব্যবহারিক অনুশীলনের সময়',
    noPracticalFolders: 'কোন ব্যবহারিক ফোল্ডার পাওয়া যায়নি।',
    activeStudyDesk: 'সক্রিয় পড়ার টেবিল',
    thisSession: 'এই সেশন',
    cumulativeDesk: 'মোট পড়ার সময়',
    cloudEnv: 'ক্লাউড পরিবেশ',
    storageEng: 'স্টোরেজ ইঞ্জিন',
    activePages: 'সক্রিয় পেইজসমূহ',
    signOut: 'সাইন আউট করুন',
    session: 'সেশন',
    live: 'লাইভ',
    synced: 'সংযুক্ত',
    addFolder: 'নতুন ব্যবহারিক ফোল্ডার',
    resignDuty: 'প্রশাসক ত্যাগ করুন',

    liveClassChat: 'লাইভ ক্লাস চ্যাট',
    secureNode: 'নিরাপদ সংযোগ',
    activeStream: 'সক্রিয় স্ট্রিম',
    networkAlert: 'নেটওয়ার্ক সতর্কতা',
    networkLoss: 'আলোচনা প্রেরণে নেটওয়ার্ক ত্রুটি। আবার চেষ্টা করার পরামর্শ দেওয়া হচ্ছে।',
    academicRoom: 'সার্বজনীন একাডেমিক রুম',
    noPostsYet: 'এখনো কোনো পোস্ট করা হয়নি। নিচে একটি প্রশ্ন টাইপ করুন বা সাহায্যকারী প্রশ্নটি নির্বাচন করুন!',
    teacher: 'শিক্ষক',
    student: 'শিক্ষার্থী',
    quickChip1: '🧪 আজকের ল্যাব পরীক্ষা নিয়ে সাহায্য দরকার!',
    quickChip2: '📊 সৃজনশীল প্রশ্নের কাঠামো সমাধান...',
    quickChip3: '📐 কেউ কি প্রতিপাদন সূত্রটি শেয়ার করতে পারেন?',
    quickChip4: '📚 অনুশীলনী পর্যালোচনার জন্য প্রস্তুত!',
    placeholderGeneral: 'শিক্ষার্থী এবং শিক্ষকদের কাছে আপনার প্রশ্নটি পাঠান...',
    placeholderChannel: 'পোস্ট করুন',
    deleteMessage: 'এই বার্তাটি মুছুন',

    academyTitleMain: 'আউরা ইন্টেলেক্ট ও',
    academyTitleSub: 'আইসিটি বিজ্ঞান একাডেমি',
    academyDesc:
      'বাংলাদেশ এনসিটিবি বোর্ড এবং আন্তর্জাতিক বোর্ডের সিলেবাস সমৃদ্ধ প্রিমিয়াম লার্নিং ডেকে আপনাকে স্বাগতম। নিউটনীয় মেকানিক্স, জৈব সংশ্লেষণ পদ্ধতি, জীববিজ্ঞান এবং সি প্রোগ্রামিং ল্যাঙ্গুয়েজকে সহজ পাঠে আয়ত্ত করুন।',
    responseLanguage: 'প্রতিক্রিয়া ভাষা',
    boardBlueprint: '১. বোর্ড ব্লুপ্রিন্ট অ্যাকর্ডিয়ান',
    customizeSubjectNotice:
      'এই বিষয়টি কাস্টমাইজড বা ডায়নামিক! কাস্টমাইজড পাঠ তৈরি করতে নিচের ফিল্ডে নির্দিষ্ট কোনো তত্ত্ব বা বিষয় টাইপ করুন।',
    units: 'টি ইউনিট',
    facultyUnit: 'ফ্যাকাল্টি ইউনিট',
    sciencePaper: 'বিজ্ঞান পত্র',
    nctbSyllabus: 'এনসিটিবি সিলেবাস',
    internationalAp: 'আন্তর্জাতিক এপি',
    customTopicPlaceholder: 'অথবা খুঁজুন, নির্দিষ্ট কোনো পাঠ্যবই সংক্রান্ত তত্ত্ব (যেমন: কার্নো ইঞ্জিনের এন্ট্রপি)...',
    searchBtn: 'পাঠ অনুসন্ধান',
    exploreLesson: 'পাঠ বিশ্লেষণ',
    quickMco: 'কুইক এমসিকিউ পরীক্ষা',
    solveCq: 'সৃজনশীল প্রশ্ন সমাধান করুন',
    academicTutor: 'ব্যক্তিগত এআই একাডেমিক টিউটর',
    askAnythingPlaceholder: 'এই চ্যাপ্টারের যেকোনো বিষয় সম্পর্কে জেমিনীকে জিজ্ঞেস করুন...',
    copiableNotice: 'কোড কপি করুন',
    learningPillTitle: 'ইন্টারেক্টিভ কুইক অ্যাকশন প্রম্পটসমূহ',
  },
};

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Initialize with default — hydration-safe (server and client render the same).
  const [language, setLanguageState] = useState<Language>('en');

  // Load saved language after mount (avoids hydration mismatch)
  useEffect(() => {
    try {
      const saved = safeLocalStorage.getItem('app_language');
      if (saved === 'en' || saved === 'bn') setLanguageState(saved);
    } catch {
      // ignore
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    safeLocalStorage.setItem('app_language', lang);
  };

  const t = (key: string): string => {
    const term = translations[language][key];
    if (term) return term;
    return translations['en'][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
