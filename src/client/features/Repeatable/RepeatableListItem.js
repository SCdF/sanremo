import { Link, ListItem, ListItemText } from '@material-ui/core';
import { useNavigate } from 'react-router-dom';
import RelativeTime from '../../components/RelativeTime';

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
  const navigate = useNavigate();
  const { _id, slug, timestamp, template } = props;
  const {
    title,
    slug: { type },
  } = template || { slug: {} }; // weird reloading edge cases can sometimes generate calls to empty items

  let displaySlug;
  if (type === 'string') {
    displaySlug = slug;
  } else if (type === 'url') {
    displaySlug = (
      <Link href={slug} target="_blank">
        {slug}
      </Link>
    );
  } else if (type === 'date') {
    displaySlug = new Date(slug).toLocaleDateString();
  } else if (type === 'timestamp') {
    displaySlug = new Date(slug).toLocaleString();
  }

  return (
    <ListItem
      button
      disableRipple
      onClick={(e) => {
        // To let URL slugs (displayed inside this "button") have links that don't also trigger
        // this navigation
        if (e.target.nodeName !== 'A') {
          navigate(`/repeatable/${_id}`);
        }
      }}
    >
      <ListItemText primary={title} secondary={<RelativeTime date={timestamp} />} />
      {displaySlug}
    </ListItem>
  );
}

export default RepeatableListItem;
