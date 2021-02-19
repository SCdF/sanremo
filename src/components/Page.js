import { AppBar, Box, Container, IconButton, Toolbar, Typography } from "@material-ui/core";
// TODO: configure babel properly so we can use { ArrowBack } etc instead
// https://material-ui.com/guides/minimizing-bundle-size/#option-2
import ArrowBack from "@material-ui/icons/ArrowBack";
import { Link } from "@reach/router";

function Page(props) {
  return (
    <Container maxwidth='md'>
      <AppBar position="static">
        <Toolbar>
          {props.back && 
            <Link to={props.back}>
              {/* this should be white not black! */}
              <IconButton edge='start'><ArrowBack /></IconButton>
            </Link>
          }
          <Typography variant='h6'>
            {props.title}
          </Typography>
        </Toolbar>
      </AppBar>
      <Box>
        {props.children}
      </Box>
    </Container>
  );
}

export default Page;