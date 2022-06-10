#!/usr/bin/env bash

npm run build
cp package.json ./dist
cp README.md ./dist
cp LICENSE ./dist

# or, if you need to have package.json "main" entry different,
# e.g. for being able to use `npm link`, you need to replace "main" 

sed 's#dist/"#"main": ""#' package.json > ./dist/package.json
cd ./dist
