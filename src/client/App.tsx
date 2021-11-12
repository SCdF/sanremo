import './App.scss';

import { Suspense, lazy } from 'react';

import { Route, Routes } from 'react-router-dom';

import CssBaseline from '@material-ui/core/CssBaseline';
import { ThemeProvider } from '@material-ui/core/styles';
import { createTheme, Typography } from '@material-ui/core';

import { useSelector } from './store';
import { selectIsGuest } from './features/User/userSlice';

import Page from './features/Page/Page';
import DebugManager from './features/Debug/DebugManager';
import UpdateManager from './features/Update/UpdateManager';
import UserProvider from './features/User/UserProvider';
import Loading from './Loading';

const About = lazy(() => import('./pages/About'));
const History = lazy(() => import('./pages/History'));
const Home = lazy(() => import('./pages/Home'));
const Repeatable = lazy(() => import('./pages/Repeatable'));
const Template = lazy(() => import('./pages/Template'));

const theme = createTheme({
  // palette: {
  //   primary: {
  //     main: '#f5df4d',
  //   },
  //   secondary: {
  //     main: '#939597',
  //   },
  // },
});

function App() {
  const isGuest = useSelector(selectIsGuest);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <DebugManager />
      {/* 'development' === `npm run dev`, so auto-reloading */}
      {process.env.NODE_ENV !== 'development' && <UpdateManager />}
      <UserProvider>
        <Page>
          <Suspense fallback={<Loading />}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/about" element={<About />} />
              <Route path="repeatable/:repeatableId" element={<Repeatable />} />
              <Route path="template/:templateId" element={<Template />} />
              <Route path="history" element={<History />} />
            </Routes>
          </Suspense>
        </Page>
        {isGuest && (
          <Typography align="center" variant="caption" color="textSecondary" display="block">
            Data only stored in this browser. Create an account to enable access from other devices.
          </Typography>
        )}
      </UserProvider>
    </ThemeProvider>
  );
}

export default App;
