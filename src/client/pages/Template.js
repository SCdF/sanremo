import { useEffect, useState } from "react";
import { navigate } from "@reach/router";
import { Button, ButtonGroup, FormGroup, makeStyles, MenuItem, TextField } from "@material-ui/core";
import DeleteIcon from '@material-ui/icons/Delete';

import { v4 as uuid } from 'uuid';

import Page from "../components/Page";

const useStyles = makeStyles((theme) => ({
  root: {
    '& .MuiTextField-root': {
      margin: theme.spacing(1),
    },
  },
  dropdown: {
    width: '15ch'
  }
}));

function Template(props) {
  const classes = useStyles();
  const [template, setTemplate] = useState();

  const { db, templateId } = props;

  useEffect(() => {
    async function loadTemplate() {
      if (templateId === 'new') {
        const template = {
          _id: `repeatable:template:${uuid()}:1`,
          title: '',
          slug: {
            type: 'date',
            label: 'Date',
            placeholder: ''
          },
          markdown: '',
          values: []
        };
        template.created = template.updated = template.versioned = Date.now();

        await db.put(template);

        navigate(`/template/${template._id}`, {replace: true});
      } else {
        const template = await db.get(templateId);

        setTemplate(template);
      }
    }

    loadTemplate();
  }, [db, templateId]);

  async function handleDelete(event) {
    event?.preventDefault();

    // If we have used any version of this template we need to soft delete instead of hard delete
    const unversionedId = template._id.substring(0, template._id.lastIndexOf(':'));
    const used = await db.find({
      selector: {template: {$gt: unversionedId, $lte: `${unversionedId}\uffff`}}
    });
    if (used.docs.length) {
      // TODO: consider: should we also update datetimes, bump version?
      template.deleted = true;
    } else {
      template._deleted = true;
    }

    await db.put(template);
    navigate('/');
  }

  async function handleSubmit(event) {
    event?.preventDefault();

    const copy = Object.assign({}, template);
    copy.updated = Date.now();

    const used = await db.find({
      selector: {
        template: copy._id
      }
    });

    if (used.docs.length) {
      copy.versioned = copy.updated;

      const splitId = copy._id.split(':');
      splitId[3] = parseInt(splitId[3]) + 1;
      copy._id = splitId.join(':');
      delete copy._rev;
    }

    await db.put(copy);

    navigate(-1);
  }

  async function handleChange({target}) {
    const copy = Object.assign({}, template);
    const value = target.type === 'checkbox' ? target.checked : target.value;
    const name = target.name;

    if (name === 'slugType') {
      copy.slug.type = value;
    } else if (name === 'slugLabel') {
      copy.slug.label = value;
    } else if (name === 'slugPlaceholder') {
      copy.slug.placeholder = value;
    } else {
      copy[name] = value;
    }

    setTemplate(copy);
  }

  if (!template) {
    return null;
  }

  return (
    <Page title={`${template.title || 'New Template'} | edit`} back under='home'>
      <form onSubmit={handleSubmit} noValidate autoComplete="off" className={classes.root}>
        <TextField required variant="filled" fullWidth
          label="Title" name="title"
          value={template.title} onChange={handleChange} />

        <FormGroup row>
          <TextField required variant="filled" select
            className={classes.dropdown}
            label="Type of slug" name="slugType"
            value={template.slug.type} onChange={handleChange}>

            <MenuItem key="url" value="url">url</MenuItem>
            <MenuItem key="date" value="date">date</MenuItem>
            <MenuItem key="timestamp" value="timestamp">datetime</MenuItem>
            <MenuItem key="string" value="string">string (plain text)</MenuItem>
          </TextField>
          <TextField required variant="filled"
            label="Display label for slug" name="slugLabel"
            value={template.slug.label} onChange={handleChange} />
          {['string', 'url'].includes(template.slug.type) &&
          <TextField variant="filled"
            label={`Placeholder text for ${template.slug.type}`} name="slugPlaceholder"
            value={template.slug.placeholder} onChange={handleChange} />
          }
        </FormGroup>
        <TextField required variant="filled" fullWidth
          multiline rows="10"
          label="Markdown" name="markdown"
          value={template.markdown} onChange={handleChange} />

      <ButtonGroup>
        <Button onClick={handleSubmit} color='primary' variant='contained'>Save</Button>
        <Button onClick={handleDelete}><DeleteIcon /></Button>
      </ButtonGroup>
      </form>
    </Page>
  );
}

export default Template;
