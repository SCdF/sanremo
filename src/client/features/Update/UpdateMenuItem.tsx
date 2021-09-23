import GetAppIcon from '@material-ui/icons/GetApp';
import { Badge, ListItemIcon, MenuItem, Typography } from '@material-ui/core';
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
      <MenuItem button key="update" onClick={handleOnClick}>
        <ListItemIcon>
          <Badge color="secondary" variant="dot" invisible={!updateNeeded}>
            <GetAppIcon />
          </Badge>
        </ListItemIcon>
        <Typography>Update</Typography>
      </MenuItem>
    );
  } else {
    return null;
  }
}

export default UpdateMenuItem;
