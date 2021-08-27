import { Button } from '@material-ui/core';
import { Fragment } from 'react';
import { useDispatch } from 'react-redux';
import { useSelector } from '../../store';
import { requestSync } from './syncSlice';

function SyncPanel() {
  const dispatch = useDispatch();

  const state = useSelector((state) => state.sync.state);

  return (
    <Fragment>
      <p>State: {state}</p>
      <Button variant="contained" onClick={() => dispatch(requestSync())}>
        Force Sync
      </Button>
    </Fragment>
  );
}

export default SyncPanel;