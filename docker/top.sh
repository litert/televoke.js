#!/usr/bin/env bash
SCRIPT_ROOT=$(cd $(dirname $0); pwd)

TOP_PIDS=''

for i in $(ps -A -o pid,cmd | grep examples | grep -Eo '^ *[0-9]+')
do
     TOP_PIDS="$TOP_PIDS -p $i";
done

top $TOP_PIDS
