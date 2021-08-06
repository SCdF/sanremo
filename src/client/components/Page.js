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
import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';

import Sync from './Sync';

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
 *
 * @param {string} title the title you want the window to have
 * @param {JSX} header optional. Components to display in the toolbar header. Otherwise the title is used
 * @param {boolean} back whether you can go "back" in the browser sense
 * @param {string} under identifier for the sidebar heading this page appears under
 */
function Page(props) {
  const { db, children, back, title, under, header } = props;
  const [anchorEl, setAnchorEl] = useState(null);
  const loggedInUser = useSelector((state) => state.user.value);
  const classes = useStyles();
  const navigate = useNavigate();

  const isMenuOpen = !!anchorEl;

  useEffect(() => (document.title = title ? `${title} | Sanremo` : 'Sanremo'));

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
          <Typography>{loggedInUser.name}</Typography>
        </MenuItem>
        <Divider />
        <MenuItem button key="home" selected={under === 'home'} onClick={() => navigate('/')}>
          <ListItemIcon>
            <CheckBoxIcon />
          </ListItemIcon>
          <Typography>Active</Typography>
        </MenuItem>
        <MenuItem button key="history" selected={under === 'history'} onClick={() => navigate('/history')}>
          <ListItemIcon>
            <HistoryIcon />
          </ListItemIcon>
          <Typography>History</Typography>
        </MenuItem>
        <MenuItem button key="about" selected={under === 'about'} onClick={() => navigate('/about')}>
          <ListItemIcon>
            <InfoIcon />
          </ListItemIcon>
          <Typography>About</Typography>
        </MenuItem>
      </Menu>
    </div>
  );

  return (
    <Container disableGutters maxWidth="xl">
      <AppBar position="sticky">
        <Toolbar>
          {back && (
            // TODO: we should probably rethink this back button logic
            // If we know our own URL we can work this one out? Anything but '/' should mean going back?
            <IconButton edge="start" color="inherit" onClick={() => navigate(-1)}>
              <ArrowBack />
            </IconButton>
          )}
          <Typography variant="h6">{header || title}</Typography>
          <div className={classes.grow} />
          <Sync db={db} />
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
