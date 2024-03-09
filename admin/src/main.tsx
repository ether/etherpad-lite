import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import {createBrowserRouter, createRoutesFromElements, Route, RouterProvider} from "react-router-dom";
import {HomePage} from "./pages/HomePage.tsx";
import {SettingsPage} from "./pages/SettingsPage.tsx";
import {LoginScreen} from "./pages/LoginScreen.tsx";
import {HelpPage} from "./pages/HelpPage.tsx";

const router = createBrowserRouter(createRoutesFromElements(
    <><Route element={<App/>}>
        <Route index element={<HomePage/>}/>
        <Route path="/plugins" element={<HomePage/>}/>
        <Route path="/settings" element={<SettingsPage/>}/>
        <Route path="/help" element={<HelpPage/>}/>
    </Route><Route path="/login">
        <Route index element={<LoginScreen/>}/>
    </Route></>
))


ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
      <RouterProvider router={router}>
      </RouterProvider>
  </React.StrictMode>,
)
