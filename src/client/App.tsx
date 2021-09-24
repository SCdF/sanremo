import './App.scss';

import { Route, Routes } from 'react-router-dom';

import CssBaseline from '@material-ui/core/CssBaseline';
import { ThemeProvider } from '@material-ui/core/styles';
import { createTheme, Typography } from '@material-ui/core';

import { selectIsGuest } from './features/User/userSlice';

import About from './pages/About';
import History from './pages/History';
import Home from './pages/Home';
import Repeatable from './pages/Repeatable';
import Template from './pages/Template';
import Page from './features/Page/Page';
import DebugManager from './features/Debug/DebugManager';
import UpdateManager from './features/Update/UpdateManager';
import SyncManager from './features/Sync/SyncManager';
import { useSelector } from './store';
import UserProvider from './features/User/UserProvider';

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
      <UserProvider>
        {process.env.NODE_ENV !== 'development' && !isGuest && <SyncManager />}
        {process.env.NODE_ENV !== 'development' && <UpdateManager />}
        <Page>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="repeatable/:repeatableId" element={<Repeatable />} />
            <Route path="template/:templateId" element={<Template />} />
            <Route path="history" element={<History />} />
          </Routes>
          {isGuest && (
            <Typography align="center" variant="caption" color="textSecondary" display="block">
              Local account. Your data is only stored in this browser. Create an account to allow it
              to be accessed on multiple devices.
            </Typography>
          )}
        </Page>
      </UserProvider>
    </ThemeProvider>
  );
}

export default App;
