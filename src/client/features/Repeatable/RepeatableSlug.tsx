import React, { ChangeEvent, useState } from 'react';
import { Input, makeStyles } from '@material-ui/core';

import { RootState, useDispatch, useSelector } from '../../store';
import { updateSlug } from './repeatableSlice';

export const useStyles = makeStyles((theme) => ({
  inputRoot: {
    paddingLeft: '0.5em',
    color: 'inherit',
  },
}));

function RepeatableSlug() {
  const classes = useStyles();
  const dispatch = useDispatch();

  const reduxSlug = useSelector((state) => state.repeatable.doc?.slug);
  const [localSlug, setLocalSlug] = useState(reduxSlug!);

  const hydrated = useSelector((state) => state.repeatable.doc && state.template.doc);
  const template = useSelector((state) => state.template.doc);

  function changeSlug({ target }: ChangeEvent) {
    // @ts-ignore FIXME: check if nodeValue works
    const targetValue = target.value;
    const value = ['date', 'timestamp'].includes(template!.slug.type)
      ? new Date(targetValue).getTime()
      : targetValue;

    setLocalSlug(value);
  }

  function storeSlugChange() {
    dispatch(updateSlug(localSlug));
  }

  // using both hydrated and template here to force TypeScript to realise that template is not optional past this point
  if (!(hydrated && template)) {
    return null;
  }

  let slugInput;
  if (['url', 'string'].includes(template.slug.type)) {
    slugInput = (
      <Input
        type="text"
        classes={{ root: classes.inputRoot }}
        placeholder={template.slug.placeholder}
        value={localSlug}
        onChange={changeSlug}
        onBlur={storeSlugChange}
      />
    );
  } else if ('date' === template.slug.type) {
    // FIXME: Clean This Up! The format required for the native date input type cannot
    // be manufactured from the native JavaScript date type. If we were in raw HTML
    // we could post-set it with Javascript by using valueAsNumber, but not in situ
    const slugDate = new Date(localSlug);
    const awkwardlyFormattedSlug = [
      slugDate.getFullYear(),
      (slugDate.getMonth() + 1 + '').padStart(2, '0'),
      (slugDate.getDate() + '').padStart(2, '0'),
    ].join('-');

    slugInput = (
      <Input
        type="date"
        // TODO: make sure this works for accessibility
        inputProps={{ role: 'entry' }}
        classes={{ root: classes.inputRoot }}
        value={awkwardlyFormattedSlug}
        onChange={changeSlug}
        onBlur={storeSlugChange}
      />
    );
  } /*if ('timestamp' === template.slug.type)*/ else {
    // FIXME: Clean This Up! The format required for the native date input type cannot
    // be manufactured from the native JavaScript date type. If we were in raw HTML
    // we could post-set it with Javascript by using valueAsNumber, but not in situ
    const slugDate = new Date(localSlug);
    const awkwardlyFormattedSlug =
      [
        slugDate.getFullYear(),
        (slugDate.getMonth() + 1 + '').padStart(2, '0'),
        (slugDate.getDate() + '').padStart(2, '0'),
      ].join('-') +
      'T' +
      [
        (slugDate.getHours() + '').padStart(2, '0'),
        (slugDate.getMinutes() + '').padStart(2, '0'),
      ].join(':');

    slugInput = (
      <Input
        type="datetime-local"
        // TODO: make sure this works for accessibility
        inputProps={{ role: 'entry' }}
        classes={{ root: classes.inputRoot }}
        value={awkwardlyFormattedSlug}
        onChange={changeSlug}
        onBlur={storeSlugChange}
      />
    );
  }

  return slugInput;
}
RepeatableSlug.relevant = (state: RootState) => {
  return state.repeatable.doc && state.template.doc?.slug.type;
};
export { RepeatableSlug };
