import { Fragment } from 'react';
import PageVisibility from 'react-page-visibility';
import { useLocation } from 'react-router-dom';

import { CircularProgress, Fade, IconButton, Tooltip, makeStyles } from '@material-ui/core';
import CloudDoneRoundedIcon from '@material-ui/icons/CloudDoneRounded';
import CloudOffRoundedIcon from '@material-ui/icons/CloudOffRounded';
import CloudRoundedIcon from '@material-ui/icons/CloudRounded';
import ErrorOutlineRoundedIcon from '@material-ui/icons/ErrorOutlineRounded';

import { useDispatch, useSelector } from '../../store';
import { selectIsGuest } from '../User/userSlice';
import { State, requestSync } from './syncSlice';

const useStyles = makeStyles((theme) => ({
  progress: {
    position: 'absolute',
  },
}));

function SyncWidget() {
  const classes = useStyles();

  const dispatch = useDispatch();

  const location = useLocation();

  const isGuest = useSelector(selectIsGuest);

  const state = useSelector((state) => state.sync.state);
  const error = useSelector((state) => state.sync.error);
  const progress = useSelector((state) => state.sync.progress);

  if (isGuest) {
    return null;
  }

  const handleVisibilityChange = async (isVisible: boolean) => {
    // TODO: we aren't actually using this right now. Investigate whether or not we should be
    // disconnecting or reconnecting sockets here
  };

  const fadeOutConnected = state === State.connected && location.pathname !== '/about';
  // TODO: map the states more cleanly in an if else block (we are missing some)
  return (
    <PageVisibility onChange={handleVisibilityChange}>
      {/* instantly "fade in" other states, slowly fade out connected state */}
      <Fade in={!fadeOutConnected} timeout={fadeOutConnected ? 2000 : 0}>
        <IconButton color="inherit" onClick={() => dispatch(requestSync())}>
          {state === State.error && error && (
            <Tooltip title={`${error.name}: ${error.message}, tap to try again`}>
              <ErrorOutlineRoundedIcon />
            </Tooltip>
          )}
          {state === State.disconnected && <CloudOffRoundedIcon />}
          {state === State.syncing && (
            <Fragment>
              <CloudRoundedIcon />
              {/* inner constantly animating progress */}
              <CircularProgress color="secondary" className={classes.progress} size="33px" />
              {/* outer percentage progress */}
              <CircularProgress
                color="secondary"
                className={classes.progress}
                variant="determinate"
                value={progress}
              />
            </Fragment>
          )}
          {state === State.connected && <CloudDoneRoundedIcon />}
        </IconButton>
      </Fade>
    </PageVisibility>
  );
}

export default SyncWidget;
