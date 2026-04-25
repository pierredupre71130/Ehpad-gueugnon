import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import GIRNiveauSoin from './pages/GIRNiveauSoin';
import Vaccination from './pages/Vaccination';
import PriseEnCharge from './pages/PriseEnCharge';
import FicheDispensationMorphiniques from './pages/FicheDispensationMorphiniques';
import BilansSanguins from './pages/BilansSanguins';
import ExamCalibrationGrid from './pages/ExamCalibrationGrid';
import SurveillancePoids from './pages/SurveillancePoids';
import PDFCalibration from './pages/PDFCalibration';

import UserNotRegisteredError from '@/components/UserNotRegisteredError';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <>
      <NavigationTracker />
      <Routes>
      <Route path="/" element={
        <LayoutWrapper currentPageName={mainPageKey}>
          <MainPage />
        </LayoutWrapper>
      } />
      {Object.entries(Pages).map(([path, Page]) => (
        <Route
          key={path}
          path={`/${path}`}
          element={
            <LayoutWrapper currentPageName={path}>
              <Page />
            </LayoutWrapper>
          }
        />
      ))}
      <Route path="/GIRNiveauSoin" element={<LayoutWrapper currentPageName="GIRNiveauSoin"><GIRNiveauSoin /></LayoutWrapper>} />
      <Route path="/BilansSanguins" element={<LayoutWrapper currentPageName="BilansSanguins"><BilansSanguins /></LayoutWrapper>} />
      <Route path="/PDFCalibration" element={<LayoutWrapper currentPageName="PDFCalibration"><PDFCalibration /></LayoutWrapper>} />
      <Route path="/ExamCalibrationGrid" element={<LayoutWrapper currentPageName="ExamCalibrationGrid"><ExamCalibrationGrid /></LayoutWrapper>} />
      <Route path="/SurveillancePoids" element={<LayoutWrapper currentPageName="SurveillancePoids"><SurveillancePoids /></LayoutWrapper>} />
      <Route path="/Vaccination" element={<LayoutWrapper currentPageName="Vaccination"><Vaccination /></LayoutWrapper>} />
      <Route path="/PriseEnCharge" element={<LayoutWrapper currentPageName="PriseEnCharge"><PriseEnCharge /></LayoutWrapper>} />
      <Route path="/FicheDispensationMorphiniques" element={<LayoutWrapper currentPageName="FicheDispensationMorphiniques"><FicheDispensationMorphiniques /></LayoutWrapper>} />

      <Route path="*" element={<PageNotFound />} />
    </Routes>
    </>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App