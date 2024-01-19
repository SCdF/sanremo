import { EnhancedStore } from '@reduxjs/toolkit';
import { render as renderRtl } from '@testing-library/react';
import { ReactElement } from 'react';
import { Provider } from 'react-redux';

import Themed from '../Themed';
import { RootState } from '../store';

export function render(children: ReactElement) {
  renderRtl(<Themed>{children}</Themed>);
}

export function withStore(store: EnhancedStore<RootState>, children: ReactElement) {
  return <Provider store={store}>{children}</Provider>;
}
