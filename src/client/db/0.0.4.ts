import { TemplateDoc } from '../../shared/types';

const doc = {
  // Making it version 2 so that when the user deletes it's always a soft delete
  _id: 'repeatable:template:0.0.4:2',
  title: 'Click Me First',
  slug: { type: 'date' },
  created: Date.now(),
  markdown: `# Hello There!

Hello and welcome to my not-well-documented experiment in repeatable checklists!

## What is Going on?

Inspired by things like pilot checklists, this is [my](https://sdufresne.info) attempt at repeatable, reusable checklists.

I wanted something like this for myself to help me get into the habit of using checklists, and also as a project to work on while learning [Talon](https://talonvoice.com/).

## What Would You Use This for?

Anytime you find yourself repeatedly performing the same set of actions. A list of jobs every time you clean the house. Your pre-exercise warmups and post-exercise cooldowns. Things to check before you merge a code branch. A list of stretches you can do at your desk. Things to check before sending off that angry email.

Lots of stuff?

## How Does It Work?

You create a template for each set of steps, and use that template every time you want to perform those steps.

Templates are written in [Markdown](https://commonmark.org/help/), with the syntax addition of checkboxes by starting a new line with the \` -
  []\` tag.

- [ ] here is a checkbox you can check!

If you go back to the main page you can edit this template to see an example.

You can also link each instance to a particular thing, or "slug", for reference (and in the future, searching).

### Slugs

A slug is a way to link a particular instance of a template with something: a particular day or time, a url, or just some text.

For example: if you create a pre-merge checklist you can set the slug to a url and link to the PR.

Or you can just ignore it (it defaults to a datetime that defaults to now).

## Logging in

The app works completely offline, but optionally if you want to sync between devices you can create an account to do that.

## Anything else?

More information:

- [Some technical details](https://github.com/SCdF/sanremo/blob/main/ARCHITECTURE.md)
- [My contact details are](https://sdufresne.info).`,
} as TemplateDoc;

export default async function migrate(db: PouchDB.Database) {
  if (!(await db.get(doc._id).catch(() => undefined))) {
    return db.put(doc);
  }
}
