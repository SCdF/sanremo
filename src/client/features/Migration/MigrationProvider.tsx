import type { FC, ReactNode } from 'react';
import { useState } from 'react';
import db from '../../db';
import { useSelector } from '../../store';
import MigrationScreen from './MigrationScreen';

type MigrationProviderProps = {
  children: ReactNode;
};

/**
 * Provider component that checks for and performs database migration on startup.
 * Blocks the app with a full-screen overlay until migration is complete.
 *
 * Must be rendered inside UserProvider (needs user state to access database).
 */
const MigrationProvider: FC<MigrationProviderProps> = ({ children }) => {
  const user = useSelector((state) => state.user.value);
  const [migrationComplete, setMigrationComplete] = useState(false);

  // User should always be defined here since we're inside UserProvider
  // but guard against it just in case
  if (!user) {
    return null;
  }

  const handle = db(user);

  if (!migrationComplete) {
    return <MigrationScreen db={handle} onComplete={() => setMigrationComplete(true)} />;
  }

  return <>{children}</>;
};

export default MigrationProvider;
