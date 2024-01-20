import { CssBaseline } from '@mui/material';
import { StyledEngineProvider, ThemeProvider, createTheme } from '@mui/material/styles';
import { FC } from 'react';

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

const Themed: FC = ({ children }) => {
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
