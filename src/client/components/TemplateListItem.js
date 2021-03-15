import { Button, ButtonGroup } from "@material-ui/core";
import EditIcon from '@material-ui/icons/Edit';

export default function TemplateListItem(props) {
  const { template: { _id: id, title } } = props;

  return (
    <ButtonGroup>
      <Button component='button' color='primary' variant='contained' href={`/checklist/new?template=${id}`}>{title}</Button>
      <Button href={`/hacks/${id}/edit`} aria-label="edit"><EditIcon /></Button>
    </ButtonGroup>
  );
}
