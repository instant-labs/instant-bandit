#!/usr/bin/env bash

cp package.json ./dist
cp README.md ./dist
cp LICENSE ./dist
cp docker-compose.dev.yml ./dist

# or, if you need to have package.json "main" entry different,
# e.g. for being able to use `npm link`, you need to replace "main" 

sed 's#dist/"#"main": ""#' package.json > ./dist/package.json
cd ./dist
