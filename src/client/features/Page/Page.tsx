// PERF: configure babel properly so we can use { ArrowBack } etc instead
// https://material-ui.com/guides/minimizing-bundle-size/#option-2
import ArrowBack from '@mui/icons-material/ArrowBack';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import HistoryIcon from '@mui/icons-material/History';
import InfoIcon from '@mui/icons-material/Info';
import {
  AppBar,
  Box,
  Container,
  Divider,
  IconButton,
  ListItemIcon,
  Menu,
  MenuItem,
  Toolbar,
  Typography,
} from '@mui/material';

import React, { FC, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import store, { useSelector } from '../../store';
import { RepeatableSlug } from '../Repeatable/RepeatableSlug';
import SyncWidget from '../Sync/SyncWidget';
import UpdateMenuItem from '../Update/UpdateMenuItem';
import LogoutMenuItem from '../User/LogoutMenuItem';
import UserMenuBadge from '../User/UserMenuBadge';
import { UserMenuDialog, UserMenuItem } from '../User/UserMenuItem';
import { selectIsGuest } from '../User/userSlice';
import { PageContext } from './pageSlice';

/**
 * Wrapper for Pages. Manages headers, sidebar etc
 */
const Page: FC = ({ children }) => {
  const rrdNavigate = useNavigate();

  const context: PageContext = useSelector((state) => state.page.value);

  const [anchorEl, setAnchorEl] = useState(null as unknown as HTMLButtonElement);
  const isMenuOpen = !!anchorEl;

  // Due to a MUI bug, Page has to be aware of the user dialogue, as it cannot be contained
  // inside the UserMenuItem, as a Dialog cannot be inside a Menu
  // FIXME https://github.com/mui-org/material-ui/issues/20173
  // This means we've had to pull in a lot more stuff into Page than we wanted
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const isGuest = useSelector(selectIsGuest);
  const requiresReauthentication = useSelector((state) => state.user.needsServerAuthentication);
  const canSeeUserDialog = userDialogOpen && (isGuest || requiresReauthentication);

  useEffect(() => {
    document.title = context.title ? `${context.title} | Sanremo` : 'Sanremo';
  }, [context]);

  function handleMenuOpen(event: React.MouseEvent<HTMLButtonElement>) {
    setAnchorEl(event.currentTarget);
  }
  function handleMenuClose() {
    setAnchorEl(null as unknown as HTMLButtonElement);
  }
  function navigate(to: string | number) {
    handleMenuClose();
    /*
    export declare type To = string | PartialPath;
    export interface NavigateFunction {
      (to: To, options?: NavigateOptions): void;
      (delta: number): void;
    }
    */
    // @ts-ignore this should work??? See above. Guessing it's because it crosses two definitions
    rrdNavigate(to);
  }
  function showUserDialog() {
    handleMenuClose();
    setUserDialogOpen(true);
  }

  let title;
  if (RepeatableSlug.relevant(store.getState())) {
    title = (
      <div>
        {context.title} <i>for</i> <RepeatableSlug />
      </div>
    );
  } else {
    title = context.title;
  }

  return (
    <Container disableGutters maxWidth="xl">
      <AppBar position="sticky">
        <Toolbar>
          {context.back && (
            // TODO: we should probably rethink this back button logic
            // If we know our own URL we can work this one out? Anything but '/' should mean going back?
            <IconButton edge="start" color="inherit" onClick={() => navigate(-1)}>
              <ArrowBack />
            </IconButton>
          )}
          <Typography variant="h6">{title}</Typography>
          <Box sx={{ flexGrow: 1 }} />
          <SyncWidget />
          <IconButton edge="end" color="inherit" onClick={handleMenuOpen}>
            <UserMenuBadge />
          </IconButton>
        </Toolbar>
      </AppBar>
      <Menu
        anchorEl={anchorEl}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        keepMounted
        open={isMenuOpen}
        onClose={handleMenuClose}
      >
        <UserMenuItem onClick={showUserDialog} />
        <Divider />
        <MenuItem key="home" selected={context.under === 'home'} onClick={() => navigate('/')}>
          <ListItemIcon>
            <CheckBoxIcon />
          </ListItemIcon>
          <Typography>Active</Typography>
        </MenuItem>
        <MenuItem
          key="history"
          selected={context.under === 'history'}
          onClick={() => navigate('/history')}
        >
          <ListItemIcon>
            <HistoryIcon />
          </ListItemIcon>
          <Typography>History</Typography>
        </MenuItem>
        <MenuItem
          key="about"
          selected={context.under === 'about'}
          onClick={() => navigate('/about')}
        >
          <ListItemIcon>
            <InfoIcon />
          </ListItemIcon>
          <Typography>About</Typography>
        </MenuItem>
        <UpdateMenuItem onClick={handleMenuClose} />
        <LogoutMenuItem onClick={handleMenuClose} />
      </Menu>
      {/*
      We have to hide / show aggressively (instead of using open) because otherwise once the user logs
      in there will be a split second where it shows invalid data even though it's set to open=false
       */}
      {canSeeUserDialog && <UserMenuDialog open={true} onClose={() => setUserDialogOpen(false)} />}
      <Box sx={{ margin: 1 }} component="main">
        {children}
      </Box>
    </Container>
  );
};

export default Page;
