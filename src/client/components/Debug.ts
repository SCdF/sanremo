import debugModule from 'debug';
import { useEffect } from 'react';
import { useDispatch, useSelector } from '../store';
import { set as setDebug } from '../state/debugSlice';

const DEBUG_KEY = 'debug-filter';

function Debug() {
  const dispatch = useDispatch();
  const debugFilter = useSelector((state) => state.debug.value);

  useEffect(() => {
    if (debugFilter === undefined) {
      // uninitialized, look up from local store
      dispatch(setDebug(localStorage.getItem(DEBUG_KEY)));
    } else if (debugFilter === null) {
      // no debugging set
      debugModule.disable();
      localStorage.removeItem(DEBUG_KEY);
    } else {
      debugModule.enable(debugFilter);
      localStorage.setItem(DEBUG_KEY, debugFilter);
    }
  }, [debugFilter, dispatch]);

  return null;
}

export default Debug;
