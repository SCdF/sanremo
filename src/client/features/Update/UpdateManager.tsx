import { useEffect, useState } from 'react';
import { debugClient } from '../../globals';

import * as serviceWorkerRegistration from '../../serviceWorkerRegistration';
import { useDispatch, useSelector } from '../../store';
import { checkForUpdate, noUpdateReady, updateReadyToInstall } from './updateSlice';

const debug = debugClient('update');

// TODO: benchmark this and see if it's actually worth it
// the idea is that your browser can concentrate on loading the app and do this later
// unclear if this makes a meaningful difference to performance though
const INITIALIZATION_DELAY = 1 * 5000;
const UPDATE_CHECK_INTERVAL = 1000 * 60 * 60 * 4;

function UpdateManager() {
  const dispatch = useDispatch();

  const userReadyToUpdate = useSelector((state) => state.update.userReadyToUpdate);
  const waitingToInstall = useSelector((state) => state.update.waitingToInstall);
  const lastChecked = useSelector((state) => state.update.lastChecked);

  const [registration, setRegistration] = useState(
    undefined as unknown as ServiceWorkerRegistration,
  );

  useEffect(() => {
    if (registration && waitingToInstall && userReadyToUpdate) {
      debug('prepped update is set to install');
      // registration.update(); // maybe to get freshest freshest?
      registration.waiting?.postMessage({ type: 'SKIP_WAITING' });
    }
  }, [registration, userReadyToUpdate, waitingToInstall]);

  useEffect(() => {
    const updateCheck = async () => {
      if (registration && !lastChecked) {
        debug('checking for updates');
        const reg = (await registration.update()) as unknown as ServiceWorkerRegistration;
        if (reg?.waiting) {
          dispatch(updateReadyToInstall());
        } else {
          dispatch(noUpdateReady());
        }
      }
    };
    updateCheck();
  }, [dispatch, lastChecked, registration]);

  useEffect(() => {
    const initializeServiceWorker = () => {
      navigator.serviceWorker.onmessage = (event) => {
        if (event?.data?.type === 'reload_ready') {
          window.location.reload();
        }
      };

      serviceWorkerRegistration.register({
        onUpdate: (_reg) => {
          debug('update is possible');
          dispatch(updateReadyToInstall());
        },
        onReady: (reg) => {
          debug('service worker registered successfully');
          dispatch(noUpdateReady());
          setRegistration(reg);

          setInterval(() => {
            dispatch(checkForUpdate());
          }, UPDATE_CHECK_INTERVAL);
        },
      });
    };
    setTimeout(initializeServiceWorker, INITIALIZATION_DELAY);
  }, [dispatch]);

  return null;
}

export default UpdateManager;
