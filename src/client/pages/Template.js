import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';

import ReactMarkdown from 'react-markdown';

import { Button, ButtonGroup, Grid, MenuItem, TextField } from '@material-ui/core';
import DeleteIcon from '@material-ui/icons/Delete';

import { v4 as uuid } from 'uuid';

import { set as setContext } from '../state/pageSlice';
import { setTemplate } from '../state/docsSlice';
import { markStale } from '../state/syncSlice';

function Template(props) {
  const template = useSelector((state) => state.docs.template);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { db } = props;
  const { templateId } = useParams();

  useEffect(() => {
    async function loadTemplate() {
      if (templateId === 'new') {
        const template = {
          _id: `repeatable:template:${uuid()}:1`,
          title: '',
          slug: {
            type: 'date',
            placeholder: '',
          },
          markdown: '',
          values: [],
        };
        template.created = template.updated = template.versioned = Date.now();

        await db.userPut(template);
        dispatch(markStale(template));

        navigate(`/template/${template._id}`, { replace: true });
      } else {
        const template = await db.get(templateId);

        dispatch(setTemplate(template));
      }
    }

    loadTemplate();
    return () => {
      dispatch(setTemplate());
    };
  }, [db, templateId, navigate, dispatch]);
  useEffect(() => {
    dispatch(
      setContext({
        title: `${template?.title || 'New Template'} | edit`,
        back: true,
        under: 'home',
      })
    );
  });

  async function handleDelete(event) {
    event?.preventDefault();

    const copy = Object.assign({}, template);

    // If we have used any version of this template we need to soft delete instead of hard delete
    const unversionedId = copy._id.substring(0, copy._id.lastIndexOf(':'));
    const used = await db.find({
      selector: { template: { $gt: unversionedId, $lte: `${unversionedId}\uffff` } },
    });
    if (used.docs.length) {
      // TODO: consider: should we also update datetimes, bump version?
      copy.deleted = true;
    } else {
      copy._deleted = true;
    }

    await db.userPut(copy);
    dispatch(markStale(copy));
    navigate('/');
  }

  async function handleSubmit(event) {
    event?.preventDefault();

    const copy = Object.assign({}, template);
    copy.updated = Date.now();

    const used = await db.find({
      selector: {
        template: copy._id,
      },
    });

    if (used.docs.length) {
      copy.versioned = copy.updated;

      const splitId = copy._id.split(':');
      splitId[3] = parseInt(splitId[3]) + 1;
      copy._id = splitId.join(':');
      delete copy._rev;
    }

    await db.userPut(copy);

    navigate(-1);
  }

  async function handleChange({ target }) {
    const copy = Object.assign({}, template);
    const value = target.type === 'checkbox' ? target.checked : target.value;
    const name = target.name;

    if (name === 'slugType') {
      copy.slug.type = value;
    } else if (name === 'slugPlaceholder') {
      copy.slug.placeholder = value;
    } else {
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
        <Grid item xs={2}>
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
        <Grid item xs={10}>
          {['string', 'url'].includes(template.slug.type) && (
            <TextField
              variant="filled"
              fullWidth
              size="small"
              label={`Placeholder text for ${template.slug.type}`}
              name="slugPlaceholder"
              value={template.slug.placeholder}
              onChange={handleChange}
            />
          )}
        </Grid>
        <Grid item md={6} sm={12}>
          <TextField
            required
            variant="filled"
            fullWidth
            multiline
            rows="10"
            label="Markdown"
            name="markdown"
            value={template.markdown}
            onChange={handleChange}
          />
        </Grid>
        <Grid item md={6} sm={12}>
          {/* TODO: correctly render markdown with checkboxes etc */}
          <ReactMarkdown>{template.markdown}</ReactMarkdown>
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
