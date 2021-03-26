import { navigate } from "@reach/router";
import { useEffect, useState } from "react";
import { v4 as uuid } from 'uuid';
import Page from "../components/Page";

function Template(props) {
  const [template, setTemplate] = useState({});

  const { db, templateId } = props;

  useEffect(() => {
    async function loadTemplate() {
      if (templateId === 'new') {
        const template = {
          _id: `repeatable:template:${uuid()}:1`
        };
        template.created = template.updated = template.versioned = Date.now();

        await db.put(template);

        navigate(`/repeatable/${template._id}`, {replace: true});
      } else {
        const template = await db.get(templateId);
        setTemplate(template);
      }
    }

    loadTemplate();
  })

  return (
    <Page title={`${template.title || 'New Template'} | edit`} back under='home'>
      <form onSubmit={this.handleSubmit}>

      </form>
    </Page>
  );
}

export default Template;
