#!/bin/sh

react-scripts test --watchAll=false
npm run build
PORT=3000 node ./src/server &
PID=$!
trap 'kill $PID' EXIT

npm run test:e2e
