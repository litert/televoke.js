#!/usr/bin/env bash
SCRIPT_ROOT=$(cd $(dirname $0); pwd)

cd $SCRIPT_ROOT

while true
do
    sleep 1;
    ./compose.sh restart nginx
done
