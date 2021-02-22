import { AppBar, Box, Container, IconButton, makeStyles, Paper, Toolbar, Typography } from "@material-ui/core";
// TODO: configure babel properly so we can use { ArrowBack } etc instead
// https://material-ui.com/guides/minimizing-bundle-size/#option-2
import ArrowBack from "@material-ui/icons/ArrowBack";
import { Link } from "@reach/router";

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
              <Link to={props.back} tabIndex='-1'>
                {/* this should be white not black! */}
                <IconButton edge='start'><ArrowBack /></IconButton>
              </Link>
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
