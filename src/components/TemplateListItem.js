import { Button, ButtonGroup } from "@material-ui/core";
import EditIcon from '@material-ui/icons/Edit';
import { navigate } from "@reach/router";

export default function TemplateListItem(props) {
  const { template: { _id: id, title } } = props;

  function createNewInstance() {
    navigate(`/checklist/new?template=${id}`);
  }

  function editTemplate() {
    navigate(`/hacks/${id}/edit`);
  }

  return (
    <ButtonGroup>
      <Button color='primary' variant='contained' onClick={createNewInstance}>{title}</Button>
      <Button onClick={editTemplate}><EditIcon /></Button>
    </ButtonGroup>
  );
}
