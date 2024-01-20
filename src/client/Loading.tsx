import { Backdrop, CircularProgress } from '@mui/material';

import { FC } from 'react';

const Loading: FC<{ open?: boolean }> = ({ open }) => {
  return (
    <Backdrop
      sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }}
      open={open !== undefined ? open : true}
    >
      <CircularProgress />
    </Backdrop>
  );
};

export default Loading;
