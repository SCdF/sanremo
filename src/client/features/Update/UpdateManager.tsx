import debugModule from 'debug';
import { useEffect, useState } from 'react';

import * as serviceWorkerRegistration from '../../serviceWorkerRegistration';
import { checkForUpdate, noUpdateReady, updateReadyToInstall } from './updateSlice';
import { useDispatch, useSelector } from '../../store';

const debugUpdate = debugModule('sanremo:update');

const INITIALIZATION_DELAY = 1000 * 5;
const UPDATE_CHECK_DELAY = 1000 * 60 * 60 * 4;

function UpdateManager() {
  const dispatch = useDispatch();

  const userReadyToUpdate = useSelector((state) => state.update.userReadyToUpdate);
  const waitingToInstall = useSelector((state) => state.update.waitingToInstall);
  const lastChecked = useSelector((state) => state.update.lastChecked);

  const [registration, setRegistration] = useState(
    undefined as unknown as ServiceWorkerRegistration
  );

  useEffect(() => {
    if (registration && waitingToInstall && userReadyToUpdate) {
      debugUpdate('prepped update is set to install');
      // registration.update(); // maybe to get freshest freshest?
      registration.waiting && registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
  }, [registration, userReadyToUpdate, waitingToInstall]);

  useEffect(() => {
    const updateCheck = async () => {
      if (registration && !lastChecked) {
        debugUpdate('checking for updates');
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
        onUpdate: (reg) => {
          debugUpdate('update is possible');
          dispatch(updateReadyToInstall());
        },
        onReady: (reg) => {
          debugUpdate('service worker registered successfully');
          dispatch(noUpdateReady());
          setRegistration(reg);

          setInterval(() => {
            dispatch(checkForUpdate());
          }, UPDATE_CHECK_DELAY);
        },
      });
    };
    setTimeout(initializeServiceWorker, INITIALIZATION_DELAY);
  }, [dispatch]);

  return null;
}

export default UpdateManager;
