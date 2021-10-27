import { Button, ButtonGroup, ListItem } from '@material-ui/core';
import EditIcon from '@material-ui/icons/Edit';
import { makeStyles } from '@material-ui/core/styles';
import { Link } from 'react-router-dom';
import React from 'react';

const useStyles = makeStyles((theme) => ({
  horizontal: {
    display: 'inline-block',
    paddingRight: 0,
    width: 'auto',
  },
}));

function TemplateListItem(props) {
  const classes = useStyles();

  const { _id, title } = props;

  if (!_id) {
    return (
      <ListItem className={classes.horizontal}>
        <Button component={Link} to="/template/new" variant="contained" color="secondary">
          New
        </Button>
      </ListItem>
    );
  }

  return (
    <ListItem className={classes.horizontal}>
      <ButtonGroup>
        <Button
          to={`/repeatable/new?template=${_id}`}
          component={Link}
          color="primary"
          variant="contained"
        >
          {title}
        </Button>
        <Button to={`/template/${_id}`} component={Link} aria-label="edit">
          <EditIcon />
        </Button>
      </ButtonGroup>
    </ListItem>
  );
}

export default React.memo(TemplateListItem);
