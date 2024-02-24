import {FC} from "react";
import packageJson from '../../../package.json';

type Repo = {
    name: string
}

import { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Home',
    description: 'Welcome to Next.js',
}

type RootLayoutProps = {
    children: React.ReactNode|React.ReactNode[]
}


const RootLayout:FC<RootLayoutProps> = ({children})=>{

    return <div>
        {children}
        {packageJson.name}
    </div>
}

export default RootLayout
