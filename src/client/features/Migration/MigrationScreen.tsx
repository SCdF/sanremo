import { Box, LinearProgress, Typography } from '@mui/material';
import { useCallback, useEffect, useState } from 'react';
import type { MigrationProgress } from './migrateDocs';
import { migrateDatabase, needsMigration } from './migrateDocs';

export type MigrationScreenProps = {
  db: PouchDB.Database;
  onComplete: () => void;
};

/**
 * Full-screen overlay that blocks the app until migration completes.
 * Shows progress bar and handles errors with retry capability.
 */
function MigrationScreen({ db, onComplete }: MigrationScreenProps) {
  const [checking, setChecking] = useState(true);
  const [migrating, setMigrating] = useState(false);
  const [progress, setProgress] = useState<MigrationProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleProgress = useCallback((p: MigrationProgress) => {
    setProgress(p);
  }, []);

  const runMigration = useCallback(async () => {
    setError(null);
    setMigrating(true);

    try {
      await migrateDatabase(db, handleProgress);
      onComplete();
    } catch (err) {
      console.error('Migration failed:', err);
      setError(err instanceof Error ? err.message : 'Migration failed');
      setMigrating(false);
    }
  }, [db, handleProgress, onComplete]);

  useEffect(() => {
    async function checkAndMigrate() {
      try {
        const needs = await needsMigration(db);
        setChecking(false);

        if (needs) {
          await runMigration();
        } else {
          onComplete();
        }
      } catch (err) {
        console.error('Migration check failed:', err);
        setError(err instanceof Error ? err.message : 'Failed to check migration status');
        setChecking(false);
      }
    }

    checkAndMigrate();
  }, [db, onComplete, runMigration]);

  // Calculate progress percentage
  let progressPercent = 0;
  let progressText = 'Checking database...';

  // FIXME: migration screen shouldn't understand internals of progress like this
  if (progress) {
    if (progress.phase === 'templates') {
      progressPercent = (progress.current / progress.total) * 50;
      progressText = `Migrating templates: ${progress.current} / ${progress.total}`;
    } else {
      progressPercent = 50 + (progress.current / progress.total) * 50;
      progressText = `Migrating repeatables: ${progress.current} / ${progress.total}`;
    }
  } else if (migrating) {
    progressText = 'Starting migration...';
  }

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        bgcolor: 'background.paper',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        p: 4,
      }}
    >
      <Typography variant="h5" gutterBottom>
        Updating Database
      </Typography>

      {checking && <Typography color="text.secondary">Checking database version...</Typography>}

      {migrating && !error && (
        <>
          <Box sx={{ width: '100%', maxWidth: 400, mt: 2 }}>
            <LinearProgress variant="determinate" value={progressPercent} />
          </Box>
          <Typography sx={{ mt: 1 }} color="text.secondary">
            {progressText}
          </Typography>
        </>
      )}

      {error && (
        <>
          <Typography color="error" sx={{ mt: 2 }}>
            {error}
          </Typography>
          <Typography
            component="button"
            onClick={runMigration}
            sx={{
              mt: 2,
              cursor: 'pointer',
              color: 'primary.main',
              textDecoration: 'underline',
              border: 'none',
              background: 'none',
              fontSize: 'inherit',
            }}
          >
            Retry
          </Typography>
        </>
      )}
    </Box>
  );
}

export default MigrationScreen;
