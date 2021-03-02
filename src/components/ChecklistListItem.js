import { ListItem, ListItemText } from "@material-ui/core";
import { Link } from "@reach/router";
import { RelativeTime } from "./RelativeTime";

function ChecklistListItem(props) {
  const { checklistStub } = props;

  return (
    <Link to={`/checklist/${checklistStub._id}`}>
      <ListItem button={true}>
        <ListItemText
          primary={checklistStub.title}
          secondary={<RelativeTime date={checklistStub.updated} />} />
      </ListItem>
    </Link>
  );
}

export default ChecklistListItem;
