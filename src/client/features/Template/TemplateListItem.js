import EditIcon from '@mui/icons-material/Edit';
import { Button, ButtonGroup, ListItem } from '@mui/material';
import { makeStyles } from '@mui/styles';
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
          role="button"
          color="primary"
          variant="contained"
        >
          {title}
        </Button>
        <Button to={`/template/${_id}`} component={Link} role="button" aria-label="edit">
          <EditIcon />
        </Button>
      </ButtonGroup>
    </ListItem>
  );
}

export default React.memo(TemplateListItem);
