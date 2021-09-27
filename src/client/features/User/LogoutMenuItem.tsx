import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  ListItemIcon,
  MenuItem,
  Typography,
} from '@material-ui/core';
import ExitToAppIcon from '@material-ui/icons/ExitToApp';
import { Fragment, useState } from 'react';
import db from '../../db';
import { useSelector } from '../../store';
import { selectIsGuest } from './userSlice';

function LogoutMenuItem(props: { onClick: () => void }) {
  const isGuest = useSelector(selectIsGuest);
  const [open, setOpen] = useState(false);

  const user = useSelector((state) => state.user.value);
  const handle = db(user);

  async function handleLogout() {
    document.cookie = 'sanremo-client='; // ugly-wipe client-side cookie
    await handle.destroy();
    window.location.reload();
  }
  function showConfirm() {
    props.onClick();
    setOpen(true);
  }
  function hideConfirm() {
    setOpen(false);
  }

  let menuTitle, dialogTitle, dialogSentence;
  if (isGuest) {
    menuTitle = 'Wipe Local';
    dialogTitle = 'Wipe local data?';
    dialogSentence = 'Your data is not stored elsewhere: this action will delete everything.';
  } else {
    menuTitle = 'Logout';
    dialogTitle = 'Are you sure?';
    // TODO: detect not synced changes, and show a different, angrier, warning
    dialogSentence = 'You will be logged out and all your local data will be deleted.';
  }

  return (
    <Fragment>
      <MenuItem button key="logout" onClick={showConfirm}>
        <ListItemIcon>
          <ExitToAppIcon />
        </ListItemIcon>
        <Typography>{menuTitle}</Typography>
      </MenuItem>
      <Dialog open={open} onClose={hideConfirm}>
        <DialogTitle>{dialogTitle}</DialogTitle>
        <DialogContent>
          <DialogContentText>{dialogSentence}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleLogout}>{menuTitle}</Button>
          <Button onClick={hideConfirm}>Cancel</Button>
        </DialogActions>
      </Dialog>
    </Fragment>
  );
}

export default LogoutMenuItem;
