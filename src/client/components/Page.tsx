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
import AccountCircle from '@material-ui/icons/AccountCircle';
import ArrowBack from '@material-ui/icons/ArrowBack';
import CheckBoxIcon from '@material-ui/icons/CheckBox';
import HistoryIcon from '@material-ui/icons/History';
import InfoIcon from '@material-ui/icons/Info';

import { useNavigate } from 'react-router-dom';
import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';

import Sync from './Sync';
import store, { RootState } from '../store';
import { PageContext } from '../state/pageSlice';
import { RepeatableSlug } from '../pages/Repeatable';

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
function Page(props: { db: PouchDB.Database; children: React.ReactNode }) {
  const classes = useStyles();
  const navigate = useNavigate();

  const { db, children } = props;

  const [anchorEl, setAnchorEl] = useState(null);

  const loggedInUser = useSelector((state: RootState) => state.user.value);
  const context: PageContext = useSelector((state: RootState) => state.page.value);

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

  const menu = (
    <div>
      <Menu
        anchorEl={anchorEl}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        open={isMenuOpen}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => alert(`TODO! ${JSON.stringify(loggedInUser)}`)}>
          <ListItemIcon>
            <AccountCircle />
          </ListItemIcon>
          <Typography>{loggedInUser?.name}</Typography>
        </MenuItem>
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
      </Menu>
    </div>
  );

  let title;
  if (RepeatableSlug.relevant(store.getState())) {
    title = <RepeatableSlug db={db} />;
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
          {process.env.NODE_ENV === 'production' && <Sync db={db} />}
          <IconButton edge="end" color="inherit" onClick={handleMenuOpen}>
            <AccountCircle />
          </IconButton>
        </Toolbar>
      </AppBar>
      {menu}
      <main className={classes.main}>{children}</main>
    </Container>
  );
}

export default Page;
