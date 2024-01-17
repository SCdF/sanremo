import GetAppIcon from '@mui/icons-material/GetApp';
import { Badge, ListItemIcon, MenuItem, Typography } from '@mui/material';
import { useDispatch, useSelector } from '../../store';
import { userReadyToUpdate } from './updateSlice';

function UpdateMenuItem(props: { onClick: () => void }) {
  const dispatch = useDispatch();
  const updateNeeded = useSelector((state) => state.update.waitingToInstall);

  function handleOnClick() {
    dispatch(userReadyToUpdate());
    props.onClick();
  }

  if (updateNeeded) {
    return (
      <MenuItem key="update" onClick={handleOnClick}>
        <ListItemIcon>
          <Badge color="secondary" variant="dot" invisible={!updateNeeded}>
            <GetAppIcon />
          </Badge>
        </ListItemIcon>
        <Typography>Update</Typography>
      </MenuItem>
    );
  }
  return null;
}

export default UpdateMenuItem;
