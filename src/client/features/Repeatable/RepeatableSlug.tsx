import { Input } from '@mui/material';
import { makeStyles } from '@mui/styles';
import { ChangeEvent, useState } from 'react';
import { RepeatableDoc, TemplateDoc } from '../../../shared/types';
import db from '../../db';
import { setRepeatable } from '../../state/docsSlice';
import { RootState, useDispatch, useSelector } from '../../store';

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
  const [slug, setSlug] = useState(repeatable?.slug);

  const template = useSelector((state) => state.docs.template);

  function changeSlug({ target }: ChangeEvent) {
    // @ts-ignore FIXME: check if nodeValue works
    const targetValue = target.value;
    // we know that if anyone calls this function template has a value
    const value = ['date', 'timestamp'].includes((template as TemplateDoc).slug.type)
      ? new Date(targetValue).getTime()
      : targetValue;

    setSlug(value);
  }

  async function storeSlugChange() {
    // we know that if anyone calls this function repeatable has a value
    const copy = Object.assign({}, repeatable as RepeatableDoc);

    copy.slug = slug;

    await handle.userPut(copy);
    dispatch(setRepeatable(copy));
  }

  if (!(repeatable && template)) {
    return null;
  }

  let slugInput;
  if (['url', 'string'].includes(template.slug.type)) {
    slugInput = (
      <Input
        type="text"
        classes={{ root: classes.inputRoot }}
        placeholder={template.slug.placeholder}
        value={slug}
        onChange={changeSlug}
        onBlur={storeSlugChange}
      />
    );
  } else if ('date' === template.slug.type) {
    // FIXME: Clean This Up! The format required for the native date input type cannot
    // be manufactured from the native JavaScript date type. If we were in raw HTML
    // we could post-set it with Javascript by using valueAsNumber, but not in situ
    const slugDate = new Date(slug as number);
    const awkwardlyFormattedSlug = [
      slugDate.getFullYear(),
      `${slugDate.getMonth() + 1}`.padStart(2, '0'),
      `${slugDate.getDate()}`.padStart(2, '0'),
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
    const slugDate = new Date(slug as number);
    const awkwardlyFormattedSlug = `${[
      slugDate.getFullYear(),
      `${slugDate.getMonth() + 1}`.padStart(2, '0'),
      `${slugDate.getDate()}`.padStart(2, '0'),
    ].join('-')}T${[
      `${slugDate.getHours()}`.padStart(2, '0'),
      `${slugDate.getMinutes()}`.padStart(2, '0'),
    ].join(':')}`;

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
  return state.docs.repeatable && state.docs.template?.slug?.type;
};
export { RepeatableSlug };
