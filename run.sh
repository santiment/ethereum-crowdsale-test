#!/bin/bash
#
# consider running testrpc from ethereum.js
#
#testrpc \
#--port 8555 \
#--gasLimit 0x46e7c4 \
#--account="0xe0c7f9f836e07e8e593cd5c4c9308184106de3a2d3386ac82df174a1a520be32,100000000000000000000" \

build/contracts/*.json ; truffle migrate --network development && truffle test
