import { Link, ListItem, ListItemButton, ListItemText } from '@mui/material';
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { type SlugConfig, type SlugData, SlugType, type TemplateDoc } from '../../../shared/types';
import RelativeTime from '../../components/RelativeTime';

type TemplateInfo = Pick<TemplateDoc, 'title' | 'slug'>;

export interface RepeatableListItemProps {
  _id: string;
  slug: string | number | undefined;
  timestamp?: number;
  // template can be string during loading, but should be TemplateInfo when rendered
  template: string | TemplateInfo | undefined;
}

function isTemplateInfo(template: string | TemplateInfo | undefined): template is TemplateInfo {
  return typeof template === 'object' && template !== null;
}

/**
 * Construct a type-safe SlugData from config and value.
 * Returns undefined if the value type doesn't match the config type.
 */
function toSlugData(config: SlugConfig, value: string | number | undefined): SlugData | undefined {
  if (value === undefined) return undefined;

  switch (config.type) {
    case SlugType.String:
      return typeof value === 'string'
        ? { type: SlugType.String, placeholder: config.placeholder, value }
        : undefined;
    case SlugType.URL:
      return typeof value === 'string'
        ? { type: SlugType.URL, placeholder: config.placeholder, value }
        : undefined;
    case SlugType.Date:
      return typeof value === 'number' ? { type: SlugType.Date, value } : undefined;
    case SlugType.Timestamp:
      return typeof value === 'number' ? { type: SlugType.Timestamp, value } : undefined;
  }
}

function renderSlug(slugData: SlugData) {
  switch (slugData.type) {
    case SlugType.String:
      return slugData.value;
    case SlugType.URL:
      return (
        <Link href={slugData.value} target="_blank">
          {slugData.value}
        </Link>
      );
    case SlugType.Date:
      return new Date(slugData.value).toLocaleDateString();
    case SlugType.Timestamp:
      return new Date(slugData.value).toLocaleString();
  }
}

/**
 * Display an instance of a repeatable in a list
 */
function RepeatableListItem(props: RepeatableListItemProps) {
  const navigate = useNavigate();
  const { _id, slug, timestamp, template } = props;

  // Handle case where template is still a string (loading) or undefined
  const templateObj = isTemplateInfo(template) ? template : undefined;
  const slugData = templateObj ? toSlugData(templateObj.slug, slug) : undefined;
  const displaySlug = slugData ? renderSlug(slugData) : null;

  return (
    <ListItem disablePadding>
      <ListItemButton
        disableRipple
        onClick={(e) => {
          // To let URL slugs (displayed inside this "button") have links that don't also trigger
          // this navigation
          if ((e.target as HTMLElement).nodeName !== 'A') {
            navigate(`/repeatable/${_id}`);
          }
        }}
      >
        <ListItemText
          primary={templateObj?.title}
          secondary={timestamp && <RelativeTime date={timestamp} />}
        />
        {displaySlug}
      </ListItemButton>
    </ListItem>
  );
}

export default React.memo(RepeatableListItem);
