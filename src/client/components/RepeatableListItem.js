import { Link, ListItem, ListItemText } from "@material-ui/core";
import RelativeTime from "./RelativeTime";

function RepeatableListItem(props) {
  const {
    _id,
    slug,
    updated,
    template
  } = props;
  const {
    title,
    'slug.type': slugType
  } = template;

  return (
    <Link href={`/checklist/${_id}`} underline="none">
      <ListItem button disableRipple>
        <ListItemText
          primary={title}
          secondary={<RelativeTime date={updated} />} />
          {/* TODO: actually deploy slug info usefully */}
          {slugType}
          {slug}
      </ListItem>
    </Link>
  );
}

export default RepeatableListItem;
