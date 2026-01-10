import { CssBaseline } from '@mui/material';
import { createTheme, StyledEngineProvider, ThemeProvider } from '@mui/material/styles';
import type { FC } from 'react';

const theme = createTheme({
  palette: {
    primary: {
      main: '#f5df4d',
    },
    secondary: {
      main: '#939597',
    },
  },
});

const Themed: FC<{ children?: React.ReactNode }> = ({ children }) => {
  return (
    <StyledEngineProvider injectFirst>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </StyledEngineProvider>
  );
};

export default Themed;
