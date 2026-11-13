"use client";

import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { translations } from "./translations";

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources: {
      en: {
        translation: translations.en,
      },
      te: {
        translation: translations.te,
      },
    },
    lng: "en",
    fallbackLng: "en",
    interpolation: {
      escapeValue: false, // React already escapes values
    },
  });
}

export default i18n;

