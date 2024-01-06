import { Button, ButtonGroup, ListItem } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import EditIcon from '@material-ui/icons/Edit';
import React from 'react';
import { Link } from 'react-router-dom';

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
        {/* If we don't have this ButtonGroup the New button is like 1px off vertically compared to
            template links (which do you ButtonGroups)*/}
        <ButtonGroup>
          <Button component={Link} to="/template/new" variant="contained" color="secondary">
            New
          </Button>
        </ButtonGroup>
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
