import './App.scss';

import { Typography } from '@mui/material';
import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { MigrationProvider } from './features/Migration';
import Page from './features/Page/Page';
import SyncManager from './features/Sync/SyncManager';
import UpdateManager from './features/Update/UpdateManager';
import UserProvider from './features/User/UserProvider';
import { selectIsGuest } from './features/User/userSlice';
import Loading from './Loading';
import { useSelector } from './store';
import Themed from './Themed';

const About = lazy(() => import('./pages/About'));
const History = lazy(() => import('./pages/History'));
const Home = lazy(() => import('./pages/Home'));
const InlineTemplateEdit = lazy(() => import('./pages/InlineTemplateEdit'));
const Repeatable = lazy(() => import('./pages/Repeatable'));
const Template = lazy(() => import('./pages/Template'));

function App() {
  const isGuest = useSelector(selectIsGuest);

  return (
    <Themed>
      {process.env.NODE_ENV !== 'development' && <UpdateManager />}
      <UserProvider>
        <MigrationProvider>
          <SyncManager />
          <Page>
            <Suspense fallback={<Loading />}>
              <Routes>
                <Route path="about" element={<About />} />
                <Route path="repeatable/:repeatableId" element={<Repeatable />} />
                <Route path="template/:templateId" element={<Template />} />
                <Route
                  path="template/:templateId/from/:repeatableId"
                  element={<InlineTemplateEdit />}
                />
                <Route path="history" element={<History />} />
                <Route path="*" element={<Home />} />
              </Routes>
            </Suspense>
          </Page>
          {isGuest && (
            <Typography align="center" variant="caption" color="textSecondary" display="block">
              Data only stored in this browser. Create an account to enable access from other
              devices.
            </Typography>
          )}
        </MigrationProvider>
      </UserProvider>
    </Themed>
  );
}

export default App;
