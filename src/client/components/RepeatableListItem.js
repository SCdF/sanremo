import { Link, ListItem, ListItemText } from "@material-ui/core";
import RelativeTime from "./RelativeTime";

/**
 * Display an instance of a repeatable in a list
 *
 * @param {string} _id id of the document
 * @param {object} slug value of the slug
 * @param {timestamp} timestamp timestamp you want to display and sort by
 * @param {object} template the template this repeatable uses. Specific needs below
 * @param {string} template.title title of the repeatable
 * @param {string} template.slug.type datatype of the slug
 */
function RepeatableListItem(props) {
  const {
    _id,
    slug,
    timestamp,
    template
  } = props;
  const {
    title,
  } = template;

  return (
    <Link href={`/repeatable/${_id}`} underline="none" color="textPrimary">
      <ListItem button disableRipple>
        <ListItemText
          primary={title}
          secondary={<RelativeTime date={timestamp} />} />
          {slug}
      </ListItem>
    </Link>
  );
}

export default RepeatableListItem;
