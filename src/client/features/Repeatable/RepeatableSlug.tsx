import { ChangeEvent } from 'react';
import React from 'react';
import { Input, makeStyles } from '@material-ui/core';
import { setRepeatable } from '../../state/docsSlice';
import { RootState, useDispatch, useSelector } from '../../store';
import db from '../../db';

export const useStyles = makeStyles((theme) => ({
  inputRoot: {
    paddingLeft: '0.5em',
    color: 'inherit',
  },
}));

function RepeatableSlug() {
  const classes = useStyles();
  const dispatch = useDispatch();

  const user = useSelector((state) => state.user.value);
  const handle = db(user);

  const repeatable = useSelector((state) => state.docs.repeatable);
  const template = useSelector((state) => state.docs.template);

  function changeSlug({ target }: ChangeEvent) {
    const copy = Object.assign({}, repeatable);
    // @ts-ignore FIXME: check if nodeValue works
    const targetValue = target.value;
    const value = ['date', 'timestamp'].includes(template!.slug.type)
      ? new Date(targetValue).getTime()
      : targetValue;

    copy.slug = value;

    dispatch(setRepeatable(copy));
  }

  async function storeSlugChange() {
    const copy = Object.assign({}, repeatable);

    await handle.userPut(copy);
    dispatch(setRepeatable(copy));
  }

  if (!(repeatable && template)) {
    return null;
  }

  let slug;
  if (['url', 'string'].includes(template.slug.type)) {
    slug = (
      <Input
        type="text"
        classes={{ root: classes.inputRoot }}
        placeholder={template.slug.placeholder}
        value={repeatable.slug}
        onChange={changeSlug}
        onBlur={storeSlugChange}
      />
    );
  } else if ('date' === template.slug.type) {
    // FIXME: Clean This Up! The format required for the native date input type cannot
    // be manufactured from the native JavaScript date type. If we were in raw HTML
    // we could post-set it with Javascript by using valueAsNumber, but not in situ
    const slugDate = new Date(repeatable.slug);
    const awkwardlyFormattedSlug = [
      slugDate.getFullYear(),
      (slugDate.getMonth() + 1 + '').padStart(2, '0'),
      (slugDate.getDate() + '').padStart(2, '0'),
    ].join('-');

    slug = (
      <Input
        type="date"
        classes={{ root: classes.inputRoot }}
        value={awkwardlyFormattedSlug}
        onChange={changeSlug}
        onBlur={storeSlugChange}
      />
    );
  } else if ('timestamp' === template.slug.type) {
    // FIXME: Clean This Up! The format required for the native date input type cannot
    // be manufactured from the native JavaScript date type. If we were in raw HTML
    // we could post-set it with Javascript by using valueAsNumber, but not in situ
    const slugDate = new Date(repeatable.slug);
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

    slug = (
      <Input
        type="datetime-local"
        classes={{ root: classes.inputRoot }}
        value={awkwardlyFormattedSlug}
        onChange={changeSlug}
        onBlur={storeSlugChange}
      />
    );
  }

  return (
    <div>
      {template.title}
      <i> for </i>
      {slug}
    </div>
  );
}
RepeatableSlug.relevant = (state: RootState) => {
  return state.docs.repeatable && state.docs.template;
};
export { RepeatableSlug };
