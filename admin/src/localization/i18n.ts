import i18n from 'i18next'
import {initReactI18next} from "react-i18next";
import LanguageDetector from 'i18next-browser-languagedetector'


import { BackendModule } from 'i18next';

const LazyImportPlugin: BackendModule = {
    type: 'backend',
    init: function (services, backendOptions, i18nextOptions) {
    },
    read: async function (language, namespace, callback) {
        console.log(import.meta.env.BASE_URL+`/locales/${language}.json`)
        const localeJSON = await fetch(import.meta.env.BASE_URL+`/locales/${language}.json`)
        let json;

        try {
            json = JSON.parse(await localeJSON.text())
        } catch(e) {
             callback(true, null);
        }


        callback(null, json);
    },

    save: function (language, namespace, data) {
    },

    create: function (languages, namespace, key, fallbackValue) {
        /* save the missing translation */
    },
};

i18n
    .use(LanguageDetector)
    .use(LazyImportPlugin)
    .use(initReactI18next)
    .init(
        {
            backend:{
                loadPath: import.meta.env.BASE_URL+'/locales/{{lng}}-{{ns}}.json'
            },
            fallbackLng: 'en'
        }
    )

export default i18n