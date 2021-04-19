import { Button, ButtonGroup, ListItem } from "@material-ui/core";
import EditIcon from '@material-ui/icons/Edit';
import { makeStyles } from '@material-ui/core/styles';

const useStyles = makeStyles((theme) => ({
  horizontal: {
    display: 'inline-block',
    'padding-right': 0,
    width: 'auto'
  }
}));

export default function TemplateListItem(props) {
  const classes = useStyles();

  const { _id, title } = props;

  if (!_id) {
    return (
      <ListItem key="new" className={classes.horizontal}>
        <Button href="/template/new"
          component="button"
          variant="contained"
          color="secondary">
          New
        </Button>
      </ListItem>
    );
  }

  return (
    <ListItem className={classes.horizontal}>
      <ButtonGroup>
        <Button href={`/repeatable/new?template=${_id}`} component='button' color='primary' variant='contained'>
          {title}
        </Button>
        <Button href={`/template/${_id}`} aria-label="edit">
          <EditIcon />
        </Button>
      </ButtonGroup>
    </ListItem>
  );
}
