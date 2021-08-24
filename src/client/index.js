import './index.css';

import debugModule from 'debug';

import React from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';

import App from './App';
import store from './store';

import * as serviceWorkerRegistration from './serviceWorkerRegistration';
import reportWebVitals from './reportWebVitals';
import { updateNeeded } from './state/updateSlice';

ReactDOM.render(
  <Provider store={store}>
    <BrowserRouter>
      <React.StrictMode>
        <App />
      </React.StrictMode>
    </BrowserRouter>
  </Provider>,
  document.getElementById('root')
);

const debugUpdate = debugModule('sanremo:update');

navigator.serviceWorker.onmessage = (event) => {
  if (event?.data?.type === 'reload_ready') {
    window.location.reload();
  }
};

serviceWorkerRegistration.register({
  onUpdate: (reg) => {
    debugUpdate('updated is possible');
    store.dispatch(updateNeeded());
    store.subscribe(() => {
      if (store.getState().update.requested) {
        debugUpdate('user requested update');
        reg.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
    });
  },
  onReady: (reg) => {
    debugUpdate('service worker registered successfully');
    setInterval(() => {
      debugUpdate('checking for updates');
      reg.update();
    }, 1000 * 60 * 60 * 4);
  },
});

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
