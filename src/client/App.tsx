import './App.scss';

import { Suspense, lazy } from 'react';
import { Route, Routes } from 'react-router-dom';

import { Typography } from '@mui/material';

import Loading from './Loading';
import Themed from './Themed';
import DebugManager from './features/Debug/DebugManager';
import Page from './features/Page/Page';
import SyncManager from './features/Sync/SyncManager';
import UpdateManager from './features/Update/UpdateManager';
import UserProvider from './features/User/UserProvider';
import { selectIsGuest } from './features/User/userSlice';
import { useSelector } from './store';

const About = lazy(() => import('./pages/About'));
const History = lazy(() => import('./pages/History'));
const Home = lazy(() => import('./pages/Home'));
const Repeatable = lazy(() => import('./pages/Repeatable'));
const Template = lazy(() => import('./pages/Template'));

function App() {
  const isGuest = useSelector(selectIsGuest);

  return (
    <Themed>
      <DebugManager />
      {process.env.NODE_ENV !== 'development' && <UpdateManager />}
      <UserProvider>
        <SyncManager />
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
    </Themed>
  );
}

export default App;
