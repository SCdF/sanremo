import { Fragment, useCallback, useEffect, useState } from 'react';
import React from 'react';
import ReactDOM from 'react-dom';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

import { Button, ButtonGroup } from '@material-ui/core';
import DeleteIcon from '@material-ui/icons/Delete';

import qs from 'qs';
import { v4 as uuid } from 'uuid';

import { RepeatableDoc, TemplateDoc } from '../../shared/types';
import db from '../db';
import { set as setContext } from '../features/Page/pageSlice';
import RepeatableRenderer from '../features/Repeatable/RepeatableRenderer';
import { debugClient } from '../globals';
import { clearRepeatable, clearTemplate, setRepeatable } from '../state/docsSlice';
import { setTemplate } from '../state/docsSlice';
import { useDispatch, useSelector } from '../store';

const debug = debugClient('repeatable');

function Repeatable() {
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
  const user = useSelector((state) => state.user.value);
  const handle = db(user);

  useEffect(() => {
    async function loadRepeatable() {
      if (repeatableId === 'new') {
        const templateId = qs.parse(location.search, { ignoreQueryPrefix: true })
          .template as string;
        const template: TemplateDoc = await handle.get(templateId);

        const created = Date.now();
        const updated = created;
        let slug;
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

        await handle.userPut(repeatable);
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

        debug('post repeatable load, pre template load');
        const template: TemplateDoc = await handle.get(repeatable.template);
        debug('post template load');

        ReactDOM.unstable_batchedUpdates(() => {
          dispatch(
            setContext({
              title: template.title,
              back: true,
              under: 'home',
            }),
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
  }, [dispatch, handle, repeatableId, location, navigate]);

  async function deleteRepeatable() {
    const copy = Object.assign({}, repeatable);

    copy._deleted = true;
    await handle.userPut(copy);

    navigate('/');
  }

  async function complete() {
    const copy = Object.assign({}, repeatable);

    copy.completed = Date.now();
    await handle.userPut(copy);

    if (edited || initiallyOpen) {
      navigate('/');
    } else {
      dispatch(setRepeatable(copy));
    }
  }

  async function uncomplete() {
    const copy = Object.assign({}, repeatable);

    // biome-ignore lint/performance/noDelete: TODO work out if we can just cahnge this
    delete copy.completed;
    await handle.userPut(copy);
    dispatch(setRepeatable(copy));
  }

  // PERF: stop this from referencing the repeatable or its values
  // if we can do that (ie just call changes onto redux) this func won't regenerate and force unneccessary rerenders
  const handleToggle = useCallback(
    async (idx: number) => {
      const now = Date.now();
      const copy = Object.assign({}, repeatable);
      copy.values = Array.from(copy.values);

      copy.values[idx] = !copy.values[idx];

      copy.updated = now;

      await handle.userPut(copy);

      ReactDOM.unstable_batchedUpdates(() => {
        setEdited(true);
        dispatch(setRepeatable(copy));
      });
    },
    [dispatch, handle, repeatable],
  );

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
          // biome-ignore lint/suspicious/noAssignInExpressions: FIXME come back to this madness
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
