import { Badge } from '@material-ui/core';
import AccountCircle from '@material-ui/icons/AccountCircle';
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
