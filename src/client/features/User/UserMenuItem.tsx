import AccountCircle from '@mui/icons-material/AccountCircle';
import {
  Badge,
  Dialog,
  DialogContent,
  DialogTitle,
  ListItemIcon,
  MenuItem,
  Typography,
} from '@mui/material';
import React, { type FC, Fragment } from 'react';
import { useSelector } from '../../store';
import UserAuthenticationWidget, { Action } from './UserAuthenticationWidget';
import { selectIsGuest } from './userSlice';

// We are doing a weird forward ref here, due to a leaky MUI menu abstraction:
// https://stackoverflow.com/questions/56307332/how-to-use-custom-functional-components-within-material-ui-menu
// tl;dr, we need to forward the menu's ref because we are at the top of the menu
export const UserMenuItem = React.forwardRef<HTMLLIElement, { onClick: () => void }>(
  ({ onClick }, ref) => {
    const username = useSelector((state) => state.user.value?.name);
    const isGuest = useSelector(selectIsGuest);
    const requiresReauthentication = useSelector((state) => state.user.needsServerAuthentication);

    let title: string;

    if (isGuest) {
      title = 'Create / Login';
    } else if (requiresReauthentication) {
      title = 'Login required';
    } else {
      title = username;
    }

    return (
      <MenuItem onClick={onClick} ref={ref}>
        <ListItemIcon>
          <Badge color="secondary" variant="dot" invisible={!requiresReauthentication}>
            <AccountCircle />
          </Badge>
        </ListItemIcon>
        <Typography>{title}</Typography>
      </MenuItem>
    );
  },
);

export const UserMenuDialog: FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const username = useSelector((state) => state.user.value?.name);
  const isGuest = useSelector(selectIsGuest);
  const requiresReauthentication = useSelector((state) => state.user.needsServerAuthentication);

  let title: string;
  let content: React.ReactElement | undefined;

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

    content = <UserAuthenticationWidget action={Action.Authenticate} username={username} />;
  } else {
    title = username;
  }

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>{content}</DialogContent>
    </Dialog>
  );
};
