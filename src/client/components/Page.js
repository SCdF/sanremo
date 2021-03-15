import { AppBar, Container, Divider, Drawer, Hidden, IconButton, List, ListItem, ListItemIcon, ListItemText, makeStyles, Toolbar, Typography } from "@material-ui/core";
// TODO: configure babel properly so we can use { ArrowBack } etc instead
// https://material-ui.com/guides/minimizing-bundle-size/#option-2
import ArrowBack from "@material-ui/icons/ArrowBack";
import MenuIcon from "@material-ui/icons/Menu";
import CheckBoxIcon from '@material-ui/icons/CheckBox';
import HistoryIcon from '@material-ui/icons/History';
import InfoIcon from '@material-ui/icons/Info';
import { navigate } from "@reach/router";
import { useState } from "react";
import { useEffect } from "react";

const drawerWidth = 240;

// TODO: go through each param here and understand them, there is too much magic here!
// Ripped whole cloth from: https://material-ui.com/components/drawers/#responsive-drawer
// FIXME: I hate this it's awful
// we should be able to have one copy of the side bar, display when wide enough, or
// use JS to add / remove a 'sit above' CSS class when in mobile
// We should NOT need to have the content twice
const useStyles = makeStyles((theme) => ({
  root: {
    display: 'flex',
  },
  drawer: {
    [theme.breakpoints.up('sm')]: {
      width: drawerWidth,
      flexShrink: 0,
    },
  },
  appBar: {
    [theme.breakpoints.up('sm')]: {
      width: `calc(100% - ${drawerWidth}px)`,
      marginLeft: drawerWidth,
    },
  },
  menuButton: {
    marginRight: theme.spacing(2),
    [theme.breakpoints.up('sm')]: {
      display: 'none',
    },
  },
  // necessary for content to be below app bar
  toolbar: theme.mixins.toolbar,
  drawerPaper: {
    width: drawerWidth,
  },
  content: {
    flexGrow: 1,
    padding: theme.spacing(1),
  },
}));

function Page(props) {
  const classes = useStyles();
  const [mobileOpen, setMobileOpen] = useState(false);

  const { window, children, back, title, under } = props;

  const container = window !== undefined ? () => window().document.body : undefined;

  useEffect(() => document.title = title ? `${title} | Sanremo` : 'Sanremo');

  function handleDrawerToggle() {
    setMobileOpen(!mobileOpen);
  }

  const drawerContent = (
    <div>
      <div className={classes.toolbar} />
      <Divider />
      <List>
        <ListItem button key='home' selected={under === 'home'} onClick={() => navigate('/')}>
          <ListItemIcon><CheckBoxIcon /></ListItemIcon>
          <ListItemText primary='Checklists' />
        </ListItem>
        <ListItem button key='history' selected={under === 'history'} onClick={() => navigate('/history')}>
          <ListItemIcon><HistoryIcon /></ListItemIcon>
          <ListItemText primary='History' />
        </ListItem>
        <ListItem button key='about' selected={under === 'about'} onClick={() => navigate('/about')}>
          <ListItemIcon><InfoIcon /></ListItemIcon>
          <ListItemText primary='About' />
        </ListItem>
      </List>
    </div>
  );

  return (
    <Container disableGutters className={classes.root}>
      <AppBar position="fixed" className={classes.appBar}>
        <Toolbar>
          {back &&
            // TODO: we should probably rethink this back button logic
            // If we know our own URL we can work this one out? Anything but '/' should mean going back?
            <IconButton edge='start' color='inherit' onClick={() => navigate(-1)} className={classes.menuButton}><ArrowBack /></IconButton>
          }
          {!back &&
            <IconButton edge='start' color='inherit' onClick={handleDrawerToggle} className={classes.menuButton}><MenuIcon /></IconButton>
          }
          <Typography variant='h6'>
            {title}
          </Typography>
        </Toolbar>
      </AppBar>
      <nav className={classes.drawer} aria-label="mailbox folders">
      {/* The implementation can be swapped with js to avoid SEO duplication of links. */}
      <Hidden smUp implementation="css">
        <Drawer
          container={container}
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          classes={{
            paper: classes.drawerPaper,
          }}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile.
          }}
        >
          {drawerContent}
        </Drawer>
      </Hidden>
      <Hidden xsDown implementation="css">
        <Drawer
          classes={{
            paper: classes.drawerPaper,
          }}
          variant="permanent"
          open
        >
          {drawerContent}
        </Drawer>
      </Hidden>
    </nav>
    <main className={classes.content}>
      <div className={classes.toolbar} />
      {children}
    </main>
  </Container>
  );
}

export default Page;
