import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import SystemUpdateAltIcon from '@mui/icons-material/SystemUpdateAlt';
import { Button, ButtonGroup } from '@mui/material';
import qs from 'qs';
import React, { Fragment, useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { v4 as uuid } from 'uuid';

import { CURRENT_SCHEMA_VERSION, type RepeatableDoc, type TemplateDoc } from '../../shared/types';
import db from '../db';
import { usePageContext } from '../features/Page/pageSlice';
import { migrateRepeatableValues } from '../features/Repeatable/migrateValues';
import RepeatableRenderer from '../features/Repeatable/RepeatableRenderer';
import { getLatestTemplateVersion, isLatestVersion } from '../features/Template/templateVersions';
import { debugClient } from '../globals';
import { clearRepeatable, clearTemplate, setRepeatable, setTemplate } from '../state/docsSlice';
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

  // Track latest template version for update/edit buttons
  const [latestTemplate, setLatestTemplate] = useState<TemplateDoc | null>(null);

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
        let slug: string | number | undefined;
        if (['date', 'timestamp'].includes(template.slug.type)) {
          slug = Date.now();
        } else {
          // if (['url', 'string'].includes(template.slug.type)) {
          slug = '';
        }

        // Create values Record from template defaults
        const values: Record<string, boolean> = {};
        for (const checkboxValue of template.values) {
          values[checkboxValue.id] = checkboxValue.default;
        }

        const repeatable: RepeatableDoc = {
          _id: `repeatable:instance:${uuid()}`,
          template: templateId,
          values,
          created,
          updated,
          slug,
          schemaVersion: CURRENT_SCHEMA_VERSION,
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

        repeatable.values ??= {};

        debug('post repeatable load, pre template load');
        const template: TemplateDoc = await handle.get(repeatable.template);
        debug('post template load');

        // React 19+ automatically batches updates - no need for unstable_batchedUpdates
        dispatch(setRepeatable(repeatable));
        dispatch(setTemplate(template));
        setInitiallyOpen(!repeatable.completed);
      }
    }

    loadRepeatable();
    return () => {
      dispatch(clearRepeatable());
      dispatch(clearTemplate());
    };
  }, [dispatch, handle, repeatableId, location, navigate]);

  // Check for latest template version when repeatable loads
  useEffect(() => {
    async function checkLatestVersion() {
      if (repeatable?.template) {
        const latest = await getLatestTemplateVersion(repeatable.template, handle);
        setLatestTemplate(latest);
      }
    }
    checkLatestVersion();
  }, [repeatable?.template, handle]);

  // Set page context based on loaded template
  usePageContext({
    title: template?.title,
    back: true,
    under: 'home',
  });

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

    delete copy.completed;
    await handle.userPut(copy);
    dispatch(setRepeatable(copy));
  }

  async function handleUpdateTemplate() {
    if (!repeatable || !latestTemplate) return;

    const copy = Object.assign({}, repeatable);
    copy.values = migrateRepeatableValues(copy.values, latestTemplate);
    copy.template = latestTemplate._id;
    copy.updated = Date.now();

    await handle.userPut(copy);

    // Update both repeatable and template in redux
    dispatch(setRepeatable(copy));
    dispatch(setTemplate(latestTemplate));
    setLatestTemplate(latestTemplate); // Refresh to same value (now is latest)
  }

  function handleEditTemplate() {
    if (!repeatable || !template) return;
    navigate(`/template/${template._id}/from/${repeatable._id}`);
  }

  // PERF: stop this from referencing the repeatable or its values
  // if we can do that (ie just call changes onto redux) this func won't regenerate and force unneccessary rerenders
  const handleToggle = useCallback(
    async (checkboxId: string) => {
      const now = Date.now();
      const copy = Object.assign({}, repeatable);
      copy.values = { ...copy.values };

      copy.values[checkboxId] = !copy.values[checkboxId];

      copy.updated = now;

      await handle.userPut(copy);

      // React 19+ automatically batches updates - no need for unstable_batchedUpdates
      setEdited(true);
      dispatch(setRepeatable(copy));
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
    private buttonRef = React.createRef<HTMLButtonElement>();

    componentDidMount() {
      if (this.props.hasFocus && this.buttonRef.current) {
        this.buttonRef.current.focus();
      }
    }

    render() {
      return (
        <Button onClick={complete} color="primary" variant="contained" ref={this.buttonRef}>
          Complete
        </Button>
      );
    }
  }

  // Determine if we should show update or edit button
  const isOnLatestVersion = latestTemplate && isLatestVersion(repeatable.template, latestTemplate);
  const hasNewerVersion = latestTemplate && !isOnLatestVersion;
  const showTemplateButtons = !repeatable.completed;

  return (
    <Fragment>
      <RepeatableRenderer
        markdown={template.markdown}
        values={repeatable.values}
        onChange={repeatable.completed ? undefined : handleToggle}
        hasFocus={setRepeatableHasFocus}
        takesFocus
      />
      <ButtonGroup data-testid="repeatable-page">
        {!repeatable?.completed && <CompleteButton hasFocus={!repeatableHasFocus} />}
        {repeatable?.completed && (
          <Button onClick={uncomplete} color="primary" variant="contained">
            Un-complete
          </Button>
        )}
        <Button onClick={deleteRepeatable}>
          <DeleteIcon />
        </Button>
        {showTemplateButtons && hasNewerVersion && (
          <Button onClick={handleUpdateTemplate} title="Update to latest template version">
            <SystemUpdateAltIcon />
          </Button>
        )}
        {showTemplateButtons && isOnLatestVersion && (
          <Button onClick={handleEditTemplate} title="Edit template">
            <EditIcon />
          </Button>
        )}
      </ButtonGroup>
    </Fragment>
  );
}

export default Repeatable;
