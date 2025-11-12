#!/usr/bin/env bash

TAG=${1:-latest}
ROOT_DIR=$(git rev-parse --show-toplevel)

docker run -d --env-file $ROOT_DIR/apps/pigeon/.env --name pigeon pigeon:$TAG