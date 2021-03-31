import { navigate } from "@reach/router";
import { useEffect, useState } from "react";
import { v4 as uuid } from 'uuid';
import Page from "../components/Page";

function Template(props) {
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
            label: '',
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

  async function handleSubmit() {
    // TODO: store metadata

    await db.put(template);

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
      <form onSubmit={handleSubmit}>
        <label htmlFor="title">
          Title:
          <input type="text" name="title" value={template.title} onChange={handleChange}/>
        </label>
        <fieldset>
          <legend>Slug</legend>
          <label htmlFor="slugType">
            Slug type:
            <select name="slugType" value={template.slug.type} onChange={handleChange}>
              <option value=""></option>
              <option value="url">url</option>
              <option value="date">date</option>
              <option value="timestamp">datetime</option>
              <option value="string">plain text</option>
            </select>
          </label>
          <label htmlFor="slugLabel">
            Slug label:
            <input type="text" name="slugLabel" value={template.slug.label} onChange={handleChange}/>
          </label>
          <label htmlFor="slugPlaceholder">
            Placeholder text:
            <input type="text" name="slugPlaceholder" value={template.slug.placeholder} onChange={handleChange}/>
          </label>
        </fieldset>
        <label htmlFor="markdown">
          Markdown:
          <textarea name="markdown" cols="75" rows="10" value={template.markdown} onChange={handleChange}/>
        </label>
        <input type="submit" value="Save" />
      </form>
    </Page>
  );
}

export default Template;
