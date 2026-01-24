import DeleteIcon from '@mui/icons-material/Delete';
import { Button, ButtonGroup, Grid, MenuItem, TextField } from '@mui/material';
import {
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent,
  type MouseEvent,
  useEffect,
} from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { v4 as uuid } from 'uuid';

import {
  CURRENT_SCHEMA_VERSION,
  type RepeatableDoc,
  SlugType,
  type TemplateDoc,
} from '../../shared/types';
import db from '../db';
import { usePageContext } from '../features/Page/pageSlice';
import { migrateRepeatableValues } from '../features/Repeatable/migrateValues';
import RepeatableRenderer from '../features/Repeatable/RepeatableRenderer';
import { ensureCheckboxIds, parseCheckboxIds } from '../features/Template/checkboxIds';
import { clearRepeatable, clearTemplate, setRepeatable, setTemplate } from '../state/docsSlice';
import { useDispatch, useSelector } from '../store';

function Template() {
  const template = useSelector((state) => state.docs.template);
  const repeatable = useSelector((state) => state.docs.repeatable);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const user = useSelector((state) => state.user.value);
  const handle = db(user);
  const { templateId, repeatableId } = useParams();

  // When editing from a repeatable context, we show the repeatable's values in preview
  const isInlineEdit = !!repeatableId;

  useEffect(() => {
    async function loadData() {
      if (templateId === 'new') {
        const now = Date.now();
        const template: TemplateDoc = {
          _id: `repeatable:template:${uuid()}:1`,
          title: '',
          slug: {
            type: SlugType.Timestamp,
          },
          markdown: '',
          created: now,
          updated: now,
          versioned: now,
          values: [],
          schemaVersion: CURRENT_SCHEMA_VERSION,
        };

        await handle.userPut(template);

        navigate(`/template/${template._id}`, { replace: true });
      } else if (templateId) {
        const template: TemplateDoc = await handle.get(templateId);
        dispatch(setTemplate(template));

        // If we're editing from a repeatable context, load the repeatable too
        if (repeatableId) {
          const repeatable: RepeatableDoc = await handle.get(repeatableId);
          dispatch(setRepeatable(repeatable));
        }
      }
    }

    loadData();
    return () => {
      dispatch(clearTemplate());
      if (repeatableId) {
        dispatch(clearRepeatable());
      }
    };
  }, [handle, templateId, repeatableId, navigate, dispatch]);

  usePageContext({
    title: `${template?.title || 'New Template'} | ${isInlineEdit ? 'inline edit' : 'edit'}`,
    back: true,
    under: 'home',
  });

  async function handleDelete(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();

    const copy = Object.assign({}, template);

    // Soft delete if there is more than one version or we are using this one
    let soft: boolean;
    const unversionedId = Number(copy._id.substring(0, copy._id.lastIndexOf(':')));
    if (unversionedId > 1) {
      soft = true;
    } else {
      const used = await handle.find({
        selector: { template: { $gt: `${unversionedId}`, $lte: `${unversionedId}\uffff` } },
        limit: 1000, // PouchDB 9+ requires explicit limit (default is 25)
      });
      soft = !used.docs.length;
    }

    if (soft) {
      // TODO: consider: should we also update datetimes, bump version?
      copy.deleted = true;
    } else {
      copy._deleted = true;
    }

    await handle.userPut(copy);
    navigate('/');
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement> | MouseEvent<HTMLButtonElement>) {
    event.preventDefault();

    if (!template) return;

    const templateCopy = Object.assign({}, template);
    templateCopy.updated = Date.now();

    // Ensure all checkboxes have IDs embedded in the markdown
    templateCopy.markdown = ensureCheckboxIds(templateCopy.markdown);

    // Parse checkbox IDs and update the values array
    const checkboxInfos = parseCheckboxIds(templateCopy.markdown);
    const existingValues = new Map(templateCopy.values.map((v) => [v.id, v.default]));
    templateCopy.values = checkboxInfos.map((info) => ({
      id: info.id,
      default: existingValues.get(info.id) ?? false,
    }));

    // Determine if we need to create a new version
    let needsNewVersion: boolean;
    if (isInlineEdit) {
      // When editing from a repeatable context, we always create a new version
      needsNewVersion = true;
    } else {
      // Check if this template is used by any repeatables
      const used = await handle.find({
        selector: {
          template: templateCopy._id,
        },
        limit: 1000,
      });
      needsNewVersion = used.docs.length > 0;
    }

    if (needsNewVersion) {
      templateCopy.versioned = templateCopy.updated;
      templateCopy.schemaVersion = CURRENT_SCHEMA_VERSION;

      const splitId = templateCopy._id.split(':');
      splitId[3] = String(Number(splitId[3]) + 1);
      templateCopy._id = splitId.join(':');
      delete templateCopy._rev;
    }

    await handle.userPut(templateCopy);

    // If we came from a repeatable, migrate it to the new template version
    if (isInlineEdit && repeatable) {
      const repeatableCopy = Object.assign({}, repeatable);
      repeatableCopy.values = migrateRepeatableValues(repeatableCopy.values, templateCopy);
      repeatableCopy.template = templateCopy._id;
      repeatableCopy.updated = Date.now();

      await handle.userPut(repeatableCopy);

      // Navigate back to the repeatable
      navigate(`/repeatable/${repeatable._id}`);
    } else {
      navigate(-1);
    }
  }

  // TODO: replace this with slice actions so we don't have to do dumb (and slow presumably) copies
  async function handleChange({ target }: ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) {
    const copy = Object.assign({}, template);
    const value = target.type === 'checkbox' ? (target as HTMLInputElement).checked : target.value;
    const name = target.name;

    if (name === 'slugType') {
      const newType = value as SlugType;
      // When changing type, create appropriate slug config
      if (newType === SlugType.String || newType === SlugType.URL) {
        copy.slug = { type: newType, placeholder: '' };
      } else {
        copy.slug = { type: newType };
      }
    } else if (name === 'slugPlaceholder') {
      // Only String and URL types support placeholder
      if (copy.slug.type === SlugType.String || copy.slug.type === SlugType.URL) {
        copy.slug = { ...copy.slug, placeholder: value as string };
      }
    } else {
      // @ts-expect-error
      copy[name] = value;
    }

    dispatch(setTemplate(copy));
  }

  function handleMarkdownKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'Enter') {
      return;
    }

    const target = event.target as HTMLTextAreaElement;
    const { value, selectionStart } = target;

    // Find the start of the current line
    const lineStart = value.lastIndexOf('\n', selectionStart - 1) + 1;
    const currentLine = value.slice(lineStart, selectionStart);

    // Match bullet point (* or -) or checkbox at start of line
    const match = currentLine.match(/^(\s*[-*]\s*(?:\[[ x]\]\s*)?)/);
    if (!match) {
      return;
    }

    const prefix = match[1];
    const trimmed = currentLine.trim();

    // If the line is just the prefix (empty item), clear it instead of continuing
    if (trimmed === '-' || trimmed === '*' || /^[-*] \[[ x]\]$/.test(trimmed)) {
      event.preventDefault();
      const before = value.slice(0, lineStart);
      const after = value.slice(selectionStart);
      const newValue = `${before}\n${after}`;
      const newCursorPos = lineStart + 1;

      const copy = Object.assign({}, template);
      copy.markdown = newValue;
      dispatch(setTemplate(copy));

      // Set cursor position after React updates the value
      requestAnimationFrame(() => {
        target.selectionStart = target.selectionEnd = newCursorPos;
      });
      return;
    }

    event.preventDefault();

    const before = value.slice(0, selectionStart);
    const after = value.slice(selectionStart);
    // For checkboxes, always insert unchecked version
    const insertPrefix = prefix.replace('[x]', '[ ]');
    const newValue = `${before}\n${insertPrefix}${after}`;
    const newCursorPos = selectionStart + 1 + insertPrefix.length;

    const copy = Object.assign({}, template);
    copy.markdown = newValue;
    dispatch(setTemplate(copy));

    // Set cursor position after React updates the value
    requestAnimationFrame(() => {
      target.selectionStart = target.selectionEnd = newCursorPos;
    });
  }

  if (!template) {
    return null;
  }

  // When editing from a repeatable context, wait for the repeatable to load
  if (isInlineEdit && !repeatable) {
    return null;
  }

  // Use repeatable's values in preview when editing inline, otherwise show unchecked
  const previewValues = isInlineEdit && repeatable ? repeatable.values : {};

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      autoComplete="off"
      data-testid={isInlineEdit ? 'inline-template-edit' : 'template-page'}
    >
      <Grid container spacing={2}>
        <Grid size={12}>
          <TextField
            required
            variant="filled"
            fullWidth
            label="Title"
            name="title"
            value={template.title}
            onChange={handleChange}
          />
        </Grid>
      </Grid>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <TextField
            required
            variant="filled"
            select
            size="small"
            fullWidth
            label="Type of slug"
            name="slugType"
            value={template.slug.type}
            onChange={handleChange}
          >
            <MenuItem key="url" value="url">
              url
            </MenuItem>
            <MenuItem key="date" value="date">
              date
            </MenuItem>
            <MenuItem key="timestamp" value="timestamp">
              datetime
            </MenuItem>
            <MenuItem key="string" value="string">
              string (plain text)
            </MenuItem>
          </TextField>
        </Grid>
        {(template.slug.type === SlugType.String || template.slug.type === SlugType.URL) && (
          <Grid size={{ xs: 12, sm: 8 }}>
            <TextField
              variant="filled"
              fullWidth
              size="small"
              label={`Placeholder text for ${template.slug.type}`}
              name="slugPlaceholder"
              value={template.slug.placeholder}
              onChange={handleChange}
            />
          </Grid>
        )}
      </Grid>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <TextField
            required
            variant="filled"
            fullWidth
            multiline
            minRows="10"
            label="Markdown"
            name="markdown"
            value={template.markdown}
            onChange={handleChange}
            onKeyDown={handleMarkdownKeyDown}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <RepeatableRenderer markdown={template.markdown} values={previewValues} />
        </Grid>
        <Grid size={12}>
          <ButtonGroup>
            <Button onClick={handleSubmit} color="primary" variant="contained">
              Save
            </Button>
            <Button onClick={handleDelete}>
              <DeleteIcon />
            </Button>
          </ButtonGroup>
        </Grid>
      </Grid>
    </form>
  );
}

export default Template;
