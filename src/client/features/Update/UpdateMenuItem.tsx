import GetAppIcon from '@mui/icons-material/GetApp';
import { Badge, ListItemIcon, MenuItem, Typography } from '@mui/material';
import { useSelector } from '../../store';
import { triggerUpdate } from './registration';

function UpdateMenuItem(props: { onClick: () => void }) {
  const updateNeeded = useSelector((state) => state.update.waitingToInstall);

  function handleOnClick() {
    triggerUpdate();
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
