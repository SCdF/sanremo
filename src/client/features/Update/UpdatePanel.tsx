import { Fragment } from 'react';

import { Button, ButtonGroup, CircularProgress, Tooltip } from '@material-ui/core';

import { useDispatch, useSelector } from '../../store';
import { checkForUpdate, userReadyToUpdate } from './updateSlice';

import RelativeTime from '../../components/RelativeTime';

function UpdatePanel() {
  const dispatch = useDispatch();

  const waitingToInstall = useSelector((state) => state.update.waitingToInstall);
  const lastChecked = useSelector((state) => state.update.lastChecked) as number;

  const forceUpdateCheck = () => {
    dispatch(checkForUpdate());
  };
  const updateNow = () => {
    dispatch(userReadyToUpdate());
  };

  return (
    <Fragment>
      <p>
        Last checked:
        {(lastChecked && (
          <Tooltip title={<RelativeTime date={lastChecked} />}>
            <span>{new Date(lastChecked).toLocaleString()}</span>
          </Tooltip>
        )) || <CircularProgress size={24} />}
      </p>
      <ButtonGroup>
        <Button variant="contained" onClick={forceUpdateCheck}>
          Force Update Check
        </Button>
        <Button variant="contained" onClick={updateNow} disabled={!waitingToInstall}>
          Update now
        </Button>
      </ButtonGroup>
    </Fragment>
  );
}

export default UpdatePanel;
