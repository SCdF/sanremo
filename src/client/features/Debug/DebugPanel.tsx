import { ChangeEvent } from 'react';
import { useDispatch, useSelector } from '../../store';
import { set as setDebug } from './debugSlice';
import { TextField } from '@material-ui/core';

function DebugPanel() {
  const dispatch = useDispatch();
  const debug = useSelector((state) => state.debug.value);

  const handleDebugChange = (event: ChangeEvent<HTMLInputElement>) => {
    dispatch(setDebug(event.target.value));
  };

  return <TextField label="Debug Level" onChange={handleDebugChange} value={debug} />;
}

export default DebugPanel;
