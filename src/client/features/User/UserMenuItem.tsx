import {
  Badge,
  Dialog,
  DialogContent,
  DialogTitle,
  ListItemIcon,
  MenuItem,
  Typography,
} from '@material-ui/core';
import AccountCircle from '@material-ui/icons/AccountCircle';
import React, { Fragment, useState } from 'react';
import { useSelector } from '../../store';
import UserAuthenticationWidget, { Action } from './UserAuthenticationWidget';
import { selectIsGuest } from './userSlice';

// We are doing a weird forward ref here, due to a leaky MUI menu abstraction:
// https://stackoverflow.com/questions/56307332/how-to-use-custom-functional-components-within-material-ui-menu
// tl;dr, we need to forward the menu's ref because we are at the top of the menu
const UserMenuItem = React.forwardRef<any, { onClick: () => void }>(
  ({ onClick: outerOnClick }, ref) => {
    const loggedInUser = useSelector((state) => state.user.value);

    const isGuest = useSelector(selectIsGuest);
    const requiresReauthentication = useSelector((state) => state.user.needsServerAuthentication);
    const couldAuthenticate = isGuest || requiresReauthentication;

    const [open, setOpen] = useState(false);

    const dialogOpen = () => {
      outerOnClick();
      setOpen(true);
    };
    const dialogClose = () => {
      setOpen(false);
    };

    let title, onClick, content;

    if (couldAuthenticate) {
      onClick = dialogOpen;
    } else {
      onClick = () => alert('todo');
    }

    if (isGuest) {
      title = 'Create / Login';

      content = (
        <Fragment>
          <p>Log into an existing account:</p>
          <UserAuthenticationWidget action={Action.Authenticate} />
          <p>Or create a new one:</p>
          <UserAuthenticationWidget action={Action.Create} />
        </Fragment>
      );
    } else if (requiresReauthentication) {
      title = 'Login required';

      content = (
        <UserAuthenticationWidget action={Action.Authenticate} username={loggedInUser.name} />
      );
    } else {
      title = loggedInUser.name;
    }

    // TODO: badge if you need to re authenticate (like update)
    return (
      <Fragment>
        <MenuItem onClick={onClick} innerRef={ref}>
          <ListItemIcon>
            <Badge color="secondary" variant="dot" invisible={!requiresReauthentication}>
              <AccountCircle />
            </Badge>
          </ListItemIcon>
          <Typography>{title}</Typography>
        </MenuItem>
        {couldAuthenticate && (
          <Dialog open={open} onClose={dialogClose}>
            <DialogTitle>{title}</DialogTitle>
            <DialogContent>{content}</DialogContent>
          </Dialog>
        )}
      </Fragment>
    );
  }
);

export default UserMenuItem;
