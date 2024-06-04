import { h } from 'vue'
import type { Theme } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import './styles/vars.css'
import SvgImage from './components/SvgImage.vue'
import SearchableTable from './components/SearchableTable.vue'

export default {
    extends: DefaultTheme,
    enhanceApp({ app }) {
        app.component('SvgImage', SvgImage)
        app.component('SearchableTable', SearchableTable)
    },
} satisfies Theme
