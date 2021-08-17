import Sync from './Sync';

import axios from 'axios';
import { io, Socket } from 'socket.io-client';
import db from '../db';

jest.mock('axios')
jest.mock('../db')

describe('sync component', () => {
  it('upon instantiation does a full sync then opens a socket', () => {
    .// 2.
  });
});
