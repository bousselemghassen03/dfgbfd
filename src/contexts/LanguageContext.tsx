import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Define the shape of our translation map
interface TranslationMap {
  [key: string]: string;
}

// Define the shape of the LanguageContext
interface LanguageContextType {
  language: 'en' | 'fr' | 'ar'; // 'ar' for Tunisian Arabic (Darija)
  setLanguage: (lang: 'en' | 'fr' | 'ar') => void;
  t: (key: string) => string; // Translation function
  loadingTranslations: boolean;
}

// Create the context
const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Define the static texts to be translated
// This is your 'dictionary' for the default English terms
const ENGLISH_STRINGS: TranslationMap = {
  "Your Fantasy Soccer Team": "Your Fantasy Soccer Team",
  "Transfers": "Transfers",
  "Total Points": "Total Points",
  "This Gameweek": "This Gameweek",
  "Budget Left": "Budget Left",
  "Rank": "Rank",
  "Gameweek is active. No transfers allowed until gameweek ends.": "Gameweek is active. No transfers allowed until gameweek ends.",
  "Unlimited transfers available before Gameweek 1 starts.": "Unlimited transfers available before Gameweek 1 starts.",
  "Transfer window is open. You have {{transfers_remaining}} transfer(s) remaining.": "Transfer window is open. You have {{transfers_remaining}} transfer(s) remaining.",
  "Formation:": "Formation:",
  "Captain:": "Captain:",
  "Vice:": "Vice:",
  "Substitutes": "Substitutes",
  "No Jersey": "No Jersey",
  "C": "C", // Captain button
  "VC": "VC", // Vice Captain button
  "Transfer System": "Transfer System",
  "Error fetching fantasy team": "Failed to fetch your team", // Assuming this is the toast message text
  "Failed to fetch roster": "Failed to fetch roster", // Toast message
  "Captain updated": "Captain updated", // Toast message
  "Failed to set captain": "Failed to set captain", // Toast message
  "Vice captain updated": "Vice captain updated", // Toast message
  "Failed to set vice captain": "Failed to set vice captain", // Toast message
  "Enter text in any language:": "Enter text in any language:", // Example from previous app
  "Type or paste your text here...": "Type or paste your text here...", // Example
  "Translate to Tunisian Darija": "Translate to Tunisian Darija", // Example
  "Translated Text (Tunisian Darija):": "Translated Text (Tunisian Darija):", // Example
  "Your translated text will appear here...": "Your translated text will appear here...", // Example
  "Please enter text to translate.": "Please enter text to translate.", // Example
  "No translation found or unexpected API response format.": "No translation found or unexpected API response format.", // Example
  "Failed to translate:": "Failed to translate:", // Example
  // Add other static strings from MyTeam component here
  "Loading...": "Loading...", // For the loading spinner
};

// Map friendly language codes to the model's target languages
const TARGET_LANG_MAP: { [key: string]: string } = {
  'en': 'English',
  'fr': 'French',
  'ar': 'Tunisian Arabic (Darija)',
};

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguage] = useState<'en' | 'fr' | 'ar'>('en');
  const [translations, setTranslations] = useState<TranslationMap>(ENGLISH_STRINGS);
  const [loadingTranslations, setLoadingTranslations] = useState(false);

  // Gemini API key. Remember to handle this securely in a real application (e.g., environment variable)
  const GEMINI_API_KEY = "AIzaSyC0cwIi4cXEH5iy0IMWquFK3Xf2SAcioUk";

  useEffect(() => {
    const fetchTranslations = async () => {
      if (language === 'en') {
        setTranslations(ENGLISH_STRINGS);
        return;
      }

      setLoadingTranslations(true);
      const targetLang = TARGET_LANG_MAP[language];
      const newTranslations: TranslationMap = {};

      try {
        const translatePromises = Object.keys(ENGLISH_STRINGS).map(async (key) => {
          const textToTranslate = ENGLISH_STRINGS[key];
          
          // Construct the prompt for the Gemini API
          const prompt = `Translate the following text to ${targetLang}. Only provide the translated text, nothing else.
          
          Text: ${textToTranslate}`;

          const payload = { contents: [{ role: "user", parts: [{ text: prompt }] }] };
          const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

          const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || `API error for ${key}`);
          }

          const result = await response.json();
          const translated = result.candidates?.[0]?.content?.parts?.[0]?.text || textToTranslate;
          newTranslations[key] = translated;
        });

        await Promise.all(translatePromises);
        setTranslations(newTranslations);

      } catch (err) {
        console.error(`Error fetching translations for ${language}:`, err);
        // Fallback to English if translation fails
        setTranslations(ENGLISH_STRINGS);
        // Optionally, show a toast here
      } finally {
        setLoadingTranslations(false);
      }
    };

    fetchTranslations();
  }, [language]);

  // Translation function `t`
  const t = (key: string): string => {
    // Handle dynamic parts in strings like '{{transfers_remaining}}'
    if (key.includes('{{')) {
        let translatedString = translations[key] || ENGLISH_STRINGS[key] || key;
        // This simple replacement assumes the placeholders are exactly as {{key_name}}
        // More robust solutions might use a library like 'i18next'
        return translatedString;
    }
    return translations[key] || ENGLISH_STRINGS[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, loadingTranslations }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};