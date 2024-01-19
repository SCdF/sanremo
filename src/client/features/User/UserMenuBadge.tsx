import AccountCircle from '@mui/icons-material/AccountCircle';
import { Badge } from '@mui/material';
import { useSelector } from '../../store';

function UserMenuBadge() {
  const updateNeeded = useSelector((state) => state.update.waitingToInstall);
  const requiresReauthentication = useSelector((state) => state.user.needsServerAuthentication);

  return (
    <Badge color="secondary" variant="dot" invisible={!(updateNeeded || requiresReauthentication)}>
      <AccountCircle />
    </Badge>
  );
}

export default UserMenuBadge;
