import { CssBaseline, Typography } from '@mui/material';
import { StyledEngineProvider, Theme, ThemeProvider, createTheme } from '@mui/material/styles';
import { FC } from 'react';

// https://mui.com/material-ui/migration/v5-style-changes/#%E2%9C%85-add-module-augmentation-for-defaulttheme-typescript
declare module '@mui/styles' {
  // biome-ignore lint/suspicious/noEmptyInterface: <explanation>
  interface DefaultTheme extends Theme {}
}

const theme = createTheme({
  // palette: {
  //   primary: {
  //     main: '#f5df4d',
  //   },
  //   secondary: {
  //     main: '#939597',
  //   },
  // },
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
