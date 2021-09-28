import { Backdrop, CircularProgress, makeStyles } from '@material-ui/core';
import { FC } from 'react';

const useStyles = makeStyles((theme) => ({
  backdrop: {
    zIndex: theme.zIndex.drawer + 1,
    color: '#fff',
  },
}));

const Loading: FC<{ open?: boolean }> = ({ open }) => {
  const classes = useStyles();

  return (
    <Backdrop open={open !== undefined ? open : true} className={classes.backdrop}>
      <CircularProgress />
    </Backdrop>
  );
};

export default Loading;
