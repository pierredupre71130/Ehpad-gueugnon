/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import Consignes from './pages/Consignes';
import ConsignesNuit from './pages/ConsignesNuit';
import EtiquettesRepas from './pages/EtiquettesRepas';
import FichesDePoste from './pages/FichesDePoste';
import FichesDePosteAccueil from './pages/FichesDePosteAccueil';
import GestionResidents from './pages/GestionResidents';
import Home from './pages/Home';
import PAP from './pages/PAP';
import PVI from './pages/PVI';
import SuiviAntalgiques from './pages/SuiviAntalgiques';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Consignes": Consignes,
    "ConsignesNuit": ConsignesNuit,
    "EtiquettesRepas": EtiquettesRepas,
    "FichesDePoste": FichesDePoste,
    "FichesDePosteAccueil": FichesDePosteAccueil,
    "GestionResidents": GestionResidents,
    "Home": Home,
    "PAP": PAP,
    "PVI": PVI,
    "SuiviAntalgiques": SuiviAntalgiques,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};