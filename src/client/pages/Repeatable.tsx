import { Fragment, useCallback, useEffect, useState } from 'react';
import React from 'react';
import ReactDOM from 'react-dom';
import { useParams, useNavigate, useLocation } from 'react-router-dom';

import { Button, ButtonGroup } from '@material-ui/core';
import DeleteIcon from '@material-ui/icons/Delete';

import { v4 as uuid } from 'uuid';
import qs from 'qs';

import {
  clear as clearRepeatable,
  complete,
  deleteIt,
  set as setRepeatable,
  uncomplete,
} from '../features/Repeatable/repeatableSlice';
import { clear as clearTemplate, set as setTemplate } from '../features/Template/templateSlice';
import { set as setContext } from '../features/Page/pageSlice';
import { useDispatch, useSelector } from '../store';
import { RepeatableDoc, TemplateDoc } from '../../shared/types';
import RepeatableRenderer from '../features/Repeatable/RepeatableRenderer';
import { debugClient } from '../globals';
import db from '../db';

const debug = debugClient('repeatable');

function Repeatable() {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const hydrated = useSelector((state) => state.repeatable.doc && state.template.doc);
  const deleted = useSelector((state) => state.repeatable.doc?._deleted);
  const completed = useSelector((state) => state.repeatable.doc?.completed);
  const dirty = useSelector((state) => state.repeatable.dirty);

  // Used for determining how complete / uncomplete function
  const [initiallyOpen, setInitiallyOpen] = useState(false); // On first load, was the repeatable uncompleted?
  const [edited, setEdited] = useState(false); // Have we made changes to the repeatable

  const [repeatableHasFocus, setRepeatableHasFocus] = useState(true);
  const [initialFocusIdx, setInitialFocusIdx] = useState(0);

  const location = useLocation();

  const { repeatableId } = useParams();
  const user = useSelector((state) => state.user.value);
  const handle = db(user);

  useEffect(() => {
    async function loadRepeatable() {
      if (repeatableId === 'new') {
        const templateId = qs.parse(location.search, { ignoreQueryPrefix: true })
          .template as string;
        const template: TemplateDoc = await handle.get(templateId);

        let created, updated, slug;
        created = updated = Date.now();
        if (['date', 'timestamp'].includes(template.slug.type)) {
          slug = Date.now();
        } else {
          // if (['url', 'string'].includes(template.slug.type)) {
          slug = '';
        }
        const repeatable: RepeatableDoc = {
          _id: `repeatable:instance:${uuid()}`,
          template: templateId,
          values: template.values,
          created,
          updated,
          slug,
        };

        // FIXME: Can we write to the DB directly? Have this as a custom (non-redux-update-reactionary) Saga action?
        await handle.userPutDeleteMe(repeatable);
        navigate(`/repeatable/${repeatable._id}`, { replace: true });
      } else if (repeatableId) {
        debug('pre repeatable load');
        let repeatable: RepeatableDoc;
        try {
          repeatable = await handle.get(repeatableId);
        } catch (error) {
          console.warn(`Repeatable ${repeatableId} failed to load`, error);
          return navigate('/');
        }

        // repeatable.values ??= [];
        repeatable.values = repeatable.values || [];

        // Initially auto-select the value AFTER whatever the last entered value is
        let initialFocusIdx = 0;
        for (let i = repeatable.values.length - 1; i >= 0; i--) {
          if (repeatable.values[i]) {
            initialFocusIdx = i + 1;
            break;
          }
        }

        debug('post repeatable load, pre template load');
        const template: TemplateDoc = await handle.get(repeatable.template);
        debug('post template load');

        ReactDOM.unstable_batchedUpdates(() => {
          dispatch(
            setContext({
              title: template.title,
              back: true,
              under: 'home',
            })
          );
          dispatch(setRepeatable(repeatable));
          dispatch(setTemplate(template));
          setInitialFocusIdx(initialFocusIdx);
          setInitiallyOpen(!repeatable.completed);
        });
      }
    }

    loadRepeatable();
    return () => {
      dispatch(clearRepeatable());
      dispatch(clearTemplate());
    };
  }, [dispatch, handle, repeatableId, location, navigate]);

  const handleChange = useCallback(() => setEdited(true), []);

  async function handleDelete() {
    dispatch(deleteIt({ now: Date.now() }));
  }

  useEffect(() => {
    if (completed && !dirty && (edited || initiallyOpen)) {
      navigate('/');
    }
  }, [completed, dirty, edited, initiallyOpen, navigate]);
  async function handleComplete() {
    dispatch(complete({ now: Date.now() }));
  }

  async function handleUncomplete() {
    dispatch(uncomplete({ now: Date.now() }));
  }

  if (!hydrated) {
    return null;
  }

  if (deleted && !dirty) {
    navigate('/');
    return null;
  }

  // There is actually an autoFocus property on button, but it doesn't work.
  // Instead, this is the current workaround. See the following:
  // https://github.com/mui-org/material-ui/issues/3008#issuecomment-284223777
  // TODO: use https://kentcdodds.com/blog/useeffect-vs-uselayouteffect#uselayouteffect and write this as a fn
  class CompleteButton extends React.Component<{ hasFocus: boolean }> {
    componentDidMount() {
      if (this.props.hasFocus) {
        //@ts-ignore
        ReactDOM.findDOMNode(this.button).focus();
      }
    }

    render() {
      return (
        <Button
          onClick={handleComplete}
          color="primary"
          variant="contained"
          //@ts-ignore
          ref={(node) => (this.button = node)}
        >
          Complete
        </Button>
      );
    }
  }

  return (
    <Fragment>
      <RepeatableRenderer
        onChange={completed ? undefined : handleChange}
        hasFocus={setRepeatableHasFocus}
        initialFocusIdx={initialFocusIdx}
        takesFocus
      />
      <ButtonGroup>
        {!completed && <CompleteButton hasFocus={!repeatableHasFocus} />}
        {completed && (
          <Button onClick={handleUncomplete} color="primary" variant="contained">
            Un-complete
          </Button>
        )}
        <Button onClick={handleDelete}>
          <DeleteIcon />
        </Button>
      </ButtonGroup>
    </Fragment>
  );
}

export default Repeatable;
