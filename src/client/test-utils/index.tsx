import type { EnhancedStore } from '@reduxjs/toolkit';
import { render as renderRtl } from '@testing-library/react';
import type { ReactElement } from 'react';
import { Provider } from 'react-redux';
import type { RootState } from '../store';
import Themed from '../Themed';

export function render(children: ReactElement) {
  return renderRtl(<Themed>{children}</Themed>);
}

export function withStore(store: EnhancedStore<RootState>, children: ReactElement) {
  return <Provider store={store}>{children}</Provider>;
}
