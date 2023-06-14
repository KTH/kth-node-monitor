#!/bin/sh

set -e

npm ci

# npm test
tsc

rm -rf node_modules
