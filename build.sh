#!/bin/sh

set -e

npm ci

# npm test
tsc
