**Let's write a plan** to support editing the template used while editing a repeatable, and having that repeatble use that new version.

Currently you can edit a template as a separate action, and you can create a repeatble instance and check boxes. That repeatable will be attached to a specific version of the template. If you edit a template existing repeatables won't get that new template, only newly created repeatables, and there is no way to upgrade a repeatable instance to the newest template version.

# User facing feature summary

- We want to add a button beside the delete button when editing repeatables that is EITHER an edit button or an update button, displayed as either a pencil icon for edit (used elsewhere), or an update icon.
- IF the repeatble you are viewing doesn't have the newest version of the template, you see the update button, which let's you update this repeatable to the latest template
- IF the repeatable is on the latest version of the template, you see the edit button, which let's you edit the template, and will automatically update the repeatable you were editing upon save of editing the template

# Important complex feature: intelligent template migration

- templates have an array of false booleans that are duplicated when creating a repeatable instance.
- What happens if we add or remove a checkbox? How will the repeatable, when it's migrated, know where to put the true booleans it already has? For example, if the repeatable instance is.
```
repeatable
- [x] first check
- [x] second check
- [ ] third unchecked
```
and then we migrate the template to be
```
repeatable
- [ ] first check
- [ ] check in the middle
- [ ] second check
- [ ] third unchecked
```
We'd want, when saving this new template with the extra field, so keep the 'first check' and 'second check' checkboxes checked.

Let's think about how we can deal with this. Come up with three options, with their pros and cons. Some options I can think of you are free to dismiss:

- when creating a checkbox somehow give it a unique id, with new checkboxes getting new ids when updating a repeatable, and so instead of storing an array of booleans it's a map
- when migrating a repeatable, inspect the contents of the markdown and use fuzzy matching on the label beside the checkbox to probabalistily determine what should stay checked.

Feel free to search the internet for ideas.

Note that if you wish to change data structures we will also need a migration strategy to run on startup for the data stored in PouchDB, which will require a progress bar screen that sits atop the app until it's done.

# User facing feature details

This presumes we have some migration strategy as discussed above.

## Update button

This will show if the repeatble is not on the latest template version. Clicking it performs the migration described above, which will then update state and, now that the template version is the latest, show the edit button

## Edit button

This will show if the repeatable is on the latest version of the template. Clicking it lets you edit the template, with the current repeatable in context. So, if you have some checkboxes checked, they will show in the preview as checked. Look at the existing URL structure and use a new URL that makes sense given the others. When you save the template, the repeatable will be migrated, and you will be redirected back to the normal repeatable view.

Consider this, write a plan, including tests.

If you have any questions, let me know and we will workshop this plan.

Store it in inline-edit.md.
