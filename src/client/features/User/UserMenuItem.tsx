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
import { Fragment, useState } from 'react';
import { useSelector } from '../../store';
import UserAuthentication, { Action } from './UserAuthentication';
import { selectIsGuest } from './userSlice';

function UserMenuItem(props: { onClick: () => void }) {
  const loggedInUser = useSelector((state) => state.user.value);

  const isGuest = useSelector(selectIsGuest);
  const requiresReauthentication = useSelector((state) => state.user.needsServerAuthentication);
  const couldAuthenticate = isGuest || requiresReauthentication;

  const [open, setOpen] = useState(false);

  const dialogOpen = () => {
    props.onClick();
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
        <UserAuthentication action={Action.Authenticate} />
        <p>Or create a new one:</p>
        <UserAuthentication action={Action.Create} />
      </Fragment>
    );
  } else if (requiresReauthentication) {
    title = 'Login required';

    content = <UserAuthentication action={Action.Authenticate} username={loggedInUser.name} />;
  } else {
    title = loggedInUser.name;
  }

  // TODO: badge if you need to re authenticate (like update)
  return (
    <Fragment>
      <MenuItem onClick={onClick}>
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
export default UserMenuItem;
