import { AppBar, Box, Container, Toolbar, Typography } from "@material-ui/core";

function Page(props) {
  return (
    <Container maxwidth='md'>
      <AppBar position="static">
        <Toolbar>
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