import { AppBar, Box, Container, IconButton, makeStyles, Paper, Toolbar, Typography } from "@material-ui/core";
// TODO: configure babel properly so we can use { ArrowBack } etc instead
// https://material-ui.com/guides/minimizing-bundle-size/#option-2
import ArrowBack from "@material-ui/icons/ArrowBack";
import MenuIcon from "@material-ui/icons/Menu";
import { navigate } from "@reach/router";

const useStyles = makeStyles(() => ({
  mainbox: {
    'padding': '12px'
  }
}));

function Page(props) {
  const styles = useStyles();

  return (
    <Container maxWidth="sm" disableGutters>
      <Paper elevation={3}>
        <AppBar position="static">
          <Toolbar>
            {props.back &&
              <IconButton edge='start' color='inherit' onClick={() => navigate(-1)}><ArrowBack /></IconButton>
            }
            {!props.back &&
              <IconButton edge='start' color='inherit'><MenuIcon /></IconButton>
            }
            <Typography variant='h6'>
              {props.title}
            </Typography>
          </Toolbar>
        </AppBar>
        <Box className={styles.mainbox}>
          {props.children}
        </Box>
      </Paper>
    </Container>
  );
}

export default Page;
