import { Fragment, useEffect, useState } from 'react';
import React from 'react';
import ReactDOM from 'react-dom';
import { useParams, useNavigate, useLocation } from 'react-router-dom';

import { Button, ButtonGroup } from '@material-ui/core';
import DeleteIcon from '@material-ui/icons/Delete';

import { v4 as uuid } from 'uuid';
import qs from 'qs';

import { clearRepeatable, clearTemplate, setRepeatable } from '../state/docsSlice';
import { setTemplate } from '../state/docsSlice';
import { set as setContext } from '../features/Page/pageSlice';
import { useDispatch, useSelector } from '../store';
import { RepeatableDoc, TemplateDoc } from '../../shared/types';
import { Database } from '../db';
import RepeatableRenderer from '../features/Repeatable/RepeatableRenderer';

const debug = require('debug')('sanremo:client:repeatable');

function Repeatable(props: { db: Database }) {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const repeatable = useSelector((state) => state.docs.repeatable);
  const template = useSelector((state) => state.docs.template);

  // Used for determining how complete / uncomplete function
  const [initiallyOpen, setInitiallyOpen] = useState(false); // On first load, was the repeatable uncompleted?
  const [edited, setEdited] = useState(false); // Have we made changes to the repeatable

  const [repeatableHasFocus, setRepeatableHasFocus] = useState(true);

  const location = useLocation();

  const { repeatableId } = useParams();
  const { db } = props;

  useEffect(() => {
    async function loadRepeatable() {
      if (repeatableId === 'new') {
        const templateId = qs.parse(location.search, { ignoreQueryPrefix: true })
          .template as string;
        const template: TemplateDoc = await db.get(templateId);

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

        await db.userPut(repeatable);
        navigate(`/repeatable/${repeatable._id}`, { replace: true });
      } else {
        debug('pre repeatable load');
        let repeatable: RepeatableDoc;
        try {
          repeatable = await db.get(repeatableId);
        } catch (error) {
          console.warn(`Repeatable ${repeatableId} failed to load`, error);
          return navigate('/');
        }

        // repeatable.values ??= [];
        repeatable.values = repeatable.values || [];

        debug('post repeatable load, pre template load');
        const template: TemplateDoc = await db.get(repeatable.template);
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
          setInitiallyOpen(!repeatable.completed);
        });
      }
    }

    loadRepeatable();
    return () => {
      dispatch(clearRepeatable());
      dispatch(clearTemplate());
    };
  }, [dispatch, db, repeatableId, location, navigate]);

  async function deleteRepeatable() {
    const copy = Object.assign({}, repeatable);

    copy._deleted = true;
    await db.userPut(copy);

    navigate('/');
  }

  async function complete() {
    const copy = Object.assign({}, repeatable);

    copy.completed = Date.now();
    await db.userPut(copy);

    if (edited || initiallyOpen) {
      navigate('/');
    } else {
      dispatch(setRepeatable(copy));
    }
  }

  async function uncomplete() {
    const copy = Object.assign({}, repeatable);

    delete copy.completed;
    await db.userPut(copy);
    dispatch(setRepeatable(copy));
  }

  async function handleToggle(idx: number) {
    const now = Date.now();
    const copy = Object.assign({}, repeatable);
    copy.values = Array.from(copy.values);

    copy.values[idx] = !!!copy.values[idx];

    copy.updated = now;

    await db.userPut(copy);

    ReactDOM.unstable_batchedUpdates(() => {
      if (!edited) setEdited(true);
      dispatch(setRepeatable(copy));
    });
  }

  if (!(repeatable && template)) {
    return null;
  }

  if (repeatable?._deleted) {
    navigate('/');
    return null;
  }

  // There is actually an autoFocus property on button, but it doesn't work.
  // Instead, this is the current workaround. See the following:
  // https://github.com/mui-org/material-ui/issues/3008#issuecomment-284223777
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
          onClick={complete}
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
        markdown={template.markdown}
        values={repeatable.values}
        onChange={repeatable.completed ? undefined : handleToggle}
        hasFocus={setRepeatableHasFocus}
        takesFocus
      />
      <ButtonGroup>
        {!repeatable?.completed && <CompleteButton hasFocus={!repeatableHasFocus} />}
        {repeatable?.completed && (
          <Button onClick={uncomplete} color="primary" variant="contained">
            Un-complete
          </Button>
        )}
        <Button onClick={deleteRepeatable}>
          <DeleteIcon />
        </Button>
      </ButtonGroup>
    </Fragment>
  );
}

export default Repeatable;
