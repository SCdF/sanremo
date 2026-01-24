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

/**
 * Inline Template Edit page.
 *
 * Similar to Template.tsx but:
 * - Shows the repeatable's current checkbox values in preview (not empty)
 * - On save: creates new template version, migrates the source repeatable, redirects back to repeatable
 *
 * Route: /template/:templateId/from/:repeatableId
 */
function InlineTemplateEdit() {
  const template = useSelector((state) => state.docs.template);
  const repeatable = useSelector((state) => state.docs.repeatable);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const user = useSelector((state) => state.user.value);
  const handle = db(user);
  const { templateId, repeatableId } = useParams();

  useEffect(() => {
    async function loadData() {
      if (templateId && repeatableId) {
        const [loadedTemplate, loadedRepeatable] = await Promise.all([
          handle.get(templateId) as Promise<TemplateDoc>,
          handle.get(repeatableId) as Promise<RepeatableDoc>,
        ]);

        dispatch(setTemplate(loadedTemplate));
        dispatch(setRepeatable(loadedRepeatable));
      }
    }

    loadData();
    return () => {
      dispatch(clearTemplate());
      dispatch(clearRepeatable());
    };
  }, [handle, templateId, repeatableId, dispatch]);

  usePageContext({
    title: `${template?.title || 'Template'} | inline edit`,
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
        limit: 1000,
      });
      soft = !used.docs.length;
    }

    if (soft) {
      copy.deleted = true;
    } else {
      copy._deleted = true;
    }

    await handle.userPut(copy);
    navigate('/');
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement> | MouseEvent<HTMLButtonElement>) {
    event.preventDefault();

    if (!template || !repeatable) return;

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

    // Always create a new version (we came from a repeatable, so instances exist)
    templateCopy.versioned = templateCopy.updated;
    templateCopy.schemaVersion = CURRENT_SCHEMA_VERSION;

    const splitId = templateCopy._id.split(':');
    splitId[3] = String(Number(splitId[3]) + 1);
    templateCopy._id = splitId.join(':');
    delete templateCopy._rev;

    await handle.userPut(templateCopy);

    // Migrate the source repeatable to the new template version
    const repeatableCopy = Object.assign({}, repeatable);
    repeatableCopy.values = migrateRepeatableValues(repeatableCopy.values, templateCopy);
    repeatableCopy.template = templateCopy._id;
    repeatableCopy.updated = Date.now();

    await handle.userPut(repeatableCopy);

    // Navigate back to the repeatable
    navigate(`/repeatable/${repeatable._id}`);
  }

  function handleChange({ target }: ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) {
    const copy = Object.assign({}, template);
    const value = target.type === 'checkbox' ? (target as HTMLInputElement).checked : target.value;
    const name = target.name;

    if (name === 'slugType') {
      const newType = value as SlugType;
      if (newType === SlugType.String || newType === SlugType.URL) {
        copy.slug = { type: newType, placeholder: '' };
      } else {
        copy.slug = { type: newType };
      }
    } else if (name === 'slugPlaceholder') {
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

    const lineStart = value.lastIndexOf('\n', selectionStart - 1) + 1;
    const currentLine = value.slice(lineStart, selectionStart);

    const match = currentLine.match(/^(\s*[-*]\s*(?:\[[ x]\]\s*)?)/);
    if (!match) {
      return;
    }

    const prefix = match[1];
    const trimmed = currentLine.trim();

    if (trimmed === '-' || trimmed === '*' || /^[-*] \[[ x]\]$/.test(trimmed)) {
      event.preventDefault();
      const before = value.slice(0, lineStart);
      const after = value.slice(selectionStart);
      const newValue = `${before}\n${after}`;
      const newCursorPos = lineStart + 1;

      const copy = Object.assign({}, template);
      copy.markdown = newValue;
      dispatch(setTemplate(copy));

      requestAnimationFrame(() => {
        target.selectionStart = target.selectionEnd = newCursorPos;
      });
      return;
    }

    event.preventDefault();

    const before = value.slice(0, selectionStart);
    const after = value.slice(selectionStart);
    const insertPrefix = prefix.replace('[x]', '[ ]');
    const newValue = `${before}\n${insertPrefix}${after}`;
    const newCursorPos = selectionStart + 1 + insertPrefix.length;

    const copy = Object.assign({}, template);
    copy.markdown = newValue;
    dispatch(setTemplate(copy));

    requestAnimationFrame(() => {
      target.selectionStart = target.selectionEnd = newCursorPos;
    });
  }

  if (!template || !repeatable) {
    return null;
  }

  // Create preview values from the repeatable's current state
  // This shows the actual checkbox states in the preview
  const previewValues = repeatable.values;

  return (
    <form onSubmit={handleSubmit} noValidate autoComplete="off" data-testid="inline-template-edit">
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

export default InlineTemplateEdit;
