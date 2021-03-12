import { Link, ListItem, ListItemText } from "@material-ui/core";
import RelativeTime from "./RelativeTime";

function ChecklistListItem(props) {
  const { checklistStub } = props;

  return (
    <Link href={`/checklist/${checklistStub._id}`} underline="none">
      <ListItem button disableRipple>
        <ListItemText
          primary={checklistStub.title}
          secondary={<RelativeTime date={checklistStub.updated} />} />
      </ListItem>
    </Link>
  );
}

export default ChecklistListItem;
