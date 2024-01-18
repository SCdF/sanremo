import { StyledEngineProvider, Theme, ThemeProvider, createTheme } from '@mui/material/styles';

import { render as renderRtl } from '@testing-library/react';

import { Provider } from 'react-redux';
import Themed from '../Themed';

// biome-ignore lint/suspicious/noExplicitAny: FIXME
export default function wrappedRender(store: any, children: any) {
  const theme = createTheme({});
  renderRtl(
    <Themed>
      <Provider store={store}>{children}</Provider>
    </Themed>,
  );
}
