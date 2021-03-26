import { Button, ButtonGroup } from "@material-ui/core";
import EditIcon from '@material-ui/icons/Edit';

export default function TemplateListItem(props) {
  const { _id, title } = props;

  return (
    <ButtonGroup>
      <Button href={`/repeatable/new?template=${_id}`} component='button' color='primary' variant='contained'>
        {title}
      </Button>
      <Button href={`/template/${_id}`} aria-label="edit">
        <EditIcon />
      </Button>
    </ButtonGroup>
  );
}
