import { ChangeEvent, FormEvent, MouseEvent, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

import { Button, ButtonGroup, Grid, MenuItem, TextField } from '@material-ui/core';
import DeleteIcon from '@material-ui/icons/Delete';

import { v4 as uuid } from 'uuid';

import { set as setContext } from '../features/Page/pageSlice';
import { clear as clearTemplate, set as setTemplate } from '../features/Template/templateSlice';
import { useDispatch, useSelector } from '../store';
import { SlugType, TemplateDoc } from '../../shared/types';
import RepeatableRenderer from '../features/Repeatable/RepeatableRenderer';
import db from '../db';

function Template() {
  const template = useSelector((state) => state.template.doc);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const user = useSelector((state) => state.user.value);
  const handle = db(user);
  const { templateId } = useParams();

  useEffect(() => {
    async function loadTemplate() {
      if (templateId === 'new') {
        const now = Date.now();
        const template: TemplateDoc = {
          _id: `repeatable:template:${uuid()}:1`,
          title: '',
          slug: {
            type: SlugType.Timestamp,
            placeholder: '',
          },
          markdown: '',
          created: now,
          updated: now,
          versioned: now,
          values: [],
        };

        // FIXME: Can we write to the DB directly? Have this as a custom (non-redux-update-reactionary) Saga action?
        await handle.userPutDeleteMe(template);

        navigate(`/template/${template._id}`, { replace: true });
      } else if (templateId) {
        const template: TemplateDoc = await handle.get(templateId);

        dispatch(setTemplate(template));
      }
    }

    loadTemplate();
    return () => {
      dispatch(clearTemplate());
    };
  }, [handle, templateId, navigate, dispatch]);

  useEffect(() => {
    dispatch(
      setContext({
        title: `${template?.title || 'New Template'} | edit`,
        back: true,
        under: 'home',
      })
    );
  }, [dispatch, template?.title]);

  async function handleDelete(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();

    const copy = Object.assign({}, template);

    // Soft delete if there is more than one version or we are using this one
    let soft;
    const unversionedId = Number(copy._id.substring(0, copy._id.lastIndexOf(':')));
    if (unversionedId > 1) {
      soft = true;
    } else {
      const used = await handle.find({
        selector: { template: { $gt: `${unversionedId}`, $lte: `${unversionedId}\uffff` } },
      });
      soft = !used.docs.length;
    }

    if (soft) {
      // TODO: consider: should we also update datetimes, bump version?
      copy.deleted = true;
    } else {
      copy._deleted = true;
    }

    // FIXME: work out how to make this a redux / redux-saga action, we have data querying above
    await handle.userPutDeleteMe(copy);
    navigate('/');
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement> | MouseEvent<HTMLButtonElement>) {
    event.preventDefault();

    const copy = Object.assign({}, template);
    copy.updated = Date.now();

    const used = await handle.find({
      selector: {
        template: copy._id,
      },
    });

    if (used.docs.length) {
      copy.versioned = copy.updated;

      const splitId = copy._id.split(':');
      splitId[3] = String(Number(splitId[3]) + 1);
      copy._id = splitId.join(':');
      delete copy._rev;
    }

    // FIXME: work out how to make this a redux / redux-saga action, we have data querying above
    await handle.userPutDeleteMe(copy);

    navigate(-1);
  }

  // TODO: replace this with slice actions so we don't have to do dumb (and slow presumably) copies
  async function handleChange({ target }: ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) {
    const copy = Object.assign({}, template);
    const value = target.type === 'checkbox' ? (target as HTMLInputElement).checked : target.value;
    const name = target.name;

    if (name === 'slugType') {
      copy.slug = Object.assign({}, copy.slug);
      copy.slug.type = value as SlugType;
    } else if (name === 'slugPlaceholder') {
      copy.slug = Object.assign({}, copy.slug);

      copy.slug.placeholder = value as string;
    } else {
      // @ts-ignore
      copy[name] = value;
    }

    dispatch(setTemplate(copy));
  }

  if (!template) {
    return null;
  }

  return (
    <form onSubmit={handleSubmit} noValidate autoComplete="off">
      <Grid container spacing={2}>
        <Grid item xs={12}>
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
        <Grid item xs={12} sm={4}>
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
        {['string', 'url'].includes(template.slug.type) && (
          <Grid item xs={12} sm={8}>
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
        <Grid item md={6} sm={12} xs={12}>
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
          />
        </Grid>
        <Grid item md={6} sm={12} xs={12}>
          <RepeatableRenderer hasFocus={() => null} onChange={() => null} />
        </Grid>
        <Grid item xs={12}>
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
