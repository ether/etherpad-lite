import i18next, {TFunction} from 'i18next'
import Backend from 'i18next-fs-backend';


export let i18nextvar: TFunction
const  i18next2 = i18next
    .use(Backend)
    .init({
        fallbackLng: 'en', // Default language fallback
        backend: {
            loadPath: 'locales/{{lng}}.json', // Path pattern to load locale files
        },
    }).then(t=>{
        i18nextvar = t
    });
