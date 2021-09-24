import {
  AppBar,
  Container,
  Divider,
  IconButton,
  ListItemIcon,
  makeStyles,
  Menu,
  MenuItem,
  Toolbar,
  Typography,
} from '@material-ui/core';
// TODO: configure babel properly so we can use { ArrowBack } etc instead
// https://material-ui.com/guides/minimizing-bundle-size/#option-2
import ArrowBack from '@material-ui/icons/ArrowBack';
import CheckBoxIcon from '@material-ui/icons/CheckBox';
import HistoryIcon from '@material-ui/icons/History';
import InfoIcon from '@material-ui/icons/Info';

import { useNavigate } from 'react-router-dom';
import React, { FC, useEffect, useState } from 'react';

import SyncWidget from '../Sync/SyncWidget';
import store, { useSelector } from '../../store';
import { PageContext } from './pageSlice';
import { RepeatableSlug } from '../Repeatable/RepeatableSlug';
import UpdateMenuItem from '../Update/UpdateMenuItem';
import UserMenuBadge from '../User/UserMenuBadge';
import UserMenuItem from '../User/UserMenuItem';
import LogoutMenuItem from '../User/LogoutMenuItem';

const useStyles = makeStyles((theme) => ({
  grow: {
    flexGrow: 1,
  },
  main: {
    padding: theme.spacing(1),
  },
}));

/**
 * Wrapper for Pages. Manages headers, sidebar etc
 */
const Page: FC = ({ children }) => {
  const classes = useStyles();
  const rrdNavigate = useNavigate();

  const [anchorEl, setAnchorEl] = useState(null);

  const context: PageContext = useSelector((state) => state.page.value);

  const isMenuOpen = !!anchorEl;

  useEffect(() => {
    document.title = context.title ? `${context.title} | Sanremo` : 'Sanremo';
  });

  // @ts-ignore TODO: work out types for this
  function handleMenuOpen(event) {
    setAnchorEl(event.currentTarget);
  }
  function handleMenuClose() {
    setAnchorEl(null);
  }
  function navigate(to: string | number) {
    handleMenuClose();
    // @ts-ignore
    rrdNavigate(to);
  }

  const menu = (
    <div>
      <Menu
        anchorEl={anchorEl}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        keepMounted
        open={isMenuOpen}
        onClose={handleMenuClose}
      >
        <UserMenuItem onClick={handleMenuClose} />
        <Divider />
        <MenuItem
          button
          key="home"
          selected={context.under === 'home'}
          onClick={() => navigate('/')}
        >
          <ListItemIcon>
            <CheckBoxIcon />
          </ListItemIcon>
          <Typography>Active</Typography>
        </MenuItem>
        <MenuItem
          button
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
          button
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
    </div>
  );

  let title;
  if (RepeatableSlug.relevant(store.getState())) {
    title = <RepeatableSlug />;
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
          <div className={classes.grow} />
          <SyncWidget />
          <IconButton edge="end" color="inherit" onClick={handleMenuOpen}>
            <UserMenuBadge />
          </IconButton>
        </Toolbar>
      </AppBar>
      {menu}
      <main className={classes.main}>{children}</main>
    </Container>
  );
};

export default Page;
