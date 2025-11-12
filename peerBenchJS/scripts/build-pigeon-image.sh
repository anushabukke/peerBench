#!/usr/bin/env bash

TAG=${1:-latest}
ROOT_DIR=$(git rev-parse --show-toplevel)

docker build -f $ROOT_DIR/Dockerfile.pigeon -t pigeon:$TAG $ROOT_DIR