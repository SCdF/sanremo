#!/bin/sh

export PORT=5000
node ./src/server &
PID=$!
trap 'kill $PID' EXIT

jest -c ./test/e2e/jest.config.e2e.js
