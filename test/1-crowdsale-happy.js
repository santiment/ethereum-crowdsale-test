const Promise = require("bluebird");

const Presale       = artifacts.require("./Presale.sol");
const PresalerVoting = artifacts.require("./PresalerVoting.sol");
const CFIWhiteList  = artifacts.require("./WhiteList.sol");
const SANWhiteList  = artifacts.require("./SantimentWhiteList.sol");
const MintableTokenImpl = artifacts.require("./MintableTokenImpl.sol");
const CrowdsaleMinter = artifacts.require("./CrowdsaleMinter.sol");

const web3 = Presale.web3;

contract('CrowdsaleMinter', function(accounts) {
    let presale, presalerVoting, cfiWhiteList, sanWhiteList, crowdsaleMinter, mintableToken;
    let COMMUNITY_SALE_START, PRIORITY_SALE_START, PUBLIC_SALE_START, PUBLIC_SALE_END, WITHDRAWAL_END;

    it("should be in BEFORE_START state", function () {
        console.log(web3.eth.blockNumber, COMMUNITY_SALE_START);
        assert.isBelow(web3.eth.blockNumber, COMMUNITY_SALE_START, "blocknr mitmatch");
        return crowdsaleMinter.state()
        .then(state => assert.equal('BEFORE_START',state,'state mismatch'));
    });

    it("should fail to donate in BEFORE_START", function (done) {
        console.log(web3.eth.blockNumber, COMMUNITY_SALE_START);
        assert.isBelow(web3.eth.blockNumber, COMMUNITY_SALE_START, "blocknr mitmatch");
        crowdsaleMinter.state()
        .then(state => {
            assert.equal('BEFORE_START',state,'state mismatch');
            return web3_transfer(accounts[3], crowdsaleMinter.address, 100);
        }).then(tx => done('Exception expected'))
          .catch(e => done());
    });

    it("should be in COMMUNITY_SALE state", function () {
        console.log(web3.eth.blockNumber, COMMUNITY_SALE_START);
        assert.isAtMost(web3.eth.blockNumber, COMMUNITY_SALE_START,"blocknr mitmatch");
        return crowdsaleMinter.state()
          .then(state => assert.equal('COMMUNITY_SALE',state,'state mismatch'));
    });

    it("should donate in COMMUNITY_SALE", function (done) {
        console.log(web3.eth.blockNumber, COMMUNITY_SALE_START);
        assert.isAtMost(web3.eth.blockNumber, COMMUNITY_SALE_START,"blocknr mitmatch");
        crowdsaleMinter.state()
        .then(state => {
            assert.equal('COMMUNITY_SALE',state,'state mismatch');
            return web3_transfer(accounts[3], crowdsaleMinter.address, 1000);
        }).then(tx => done())
    });

    //========== SETUP ==============

    before("should setup infrastructuring contract", function() {
        return Promise.all([
            Presale.deployed()
            .then(instance => (presale=instance).addBalances(
                [accounts[1], accounts[2], accounts[3], accounts[4]],
                [500,10000,20000,400])),
            PresalerVoting.deployed()
            .then(instance => (presalerVoting=instance).addRawVotes(
                [accounts[1], accounts[2], accounts[3]],
                [9,5000,1000])),
            CFIWhiteList.deployed()
            .then(instance => (cfiWhiteList=instance).addPack(
                [accounts[1], accounts[2], accounts[3]]
                ,0)),
            SANWhiteList.deployed()
            .then(instance => (sanWhiteList=instance).addPack(
                [accounts[3], accounts[4], accounts[5], accounts[6]],
                [100,200,300,400],
                [1100,1200,1300,1400]
                ,0)),
            MintableTokenImpl.deployed()
            .then(instance => (mintableToken=instance))
        ]).then(txs=>{
            return Promise.all([
                presale.counter(),
                presalerVoting.votersLen(),
                cfiWhiteList.recordNr(),
                sanWhiteList.recordNum(),
                mintableToken.isStarted()
            ]).spread( (n1,n2,n3,n4,b5)=>{
                assert.equal(4,n1.toNumber(),"mismatched presale.counter()");
                assert.equal(3,n2.toNumber(),"mismatched presalerVoting.votersLen()");
                assert.equal(3,n3.toNumber(),"mismatched cfiWhiteList.recordNr()");
                assert.equal(4,n4.toNumber(),"mismatched sanWhiteList.recordNum()");
                assert.equal(false,b5,"mismatched mintableToken.isStarted()");
                console.log("setup - OK");
            });
        }).then(tx => CrowdsaleMinter.deployed())
          .then(instance => (crowdsaleMinter=instance).configure(
                COMMUNITY_SALE_START = web3.eth.blockNumber + 2,
                PRIORITY_SALE_START  = COMMUNITY_SALE_START + 4,
                PUBLIC_SALE_START    = PRIORITY_SALE_START + 5,
                PUBLIC_SALE_END      = PUBLIC_SALE_START + 6,
                WITHDRAWAL_END       = PUBLIC_SALE_END,
                accounts[1], //TEAM_GROUP_WALLET,
                accounts[2], //ADVISERS_AND_FRIENDS_WALLET,
                mintableToken.address,
                cfiWhiteList.address,
                sanWhiteList.address,
                presale.address,
                presalerVoting.address
           )).then(()=>crowdsaleMinter.state())
              .then(state => {
                  assert.equal("BEFORE_START",state,"state mismatched: ");
              });
    });


    //============= Library =================

    const web3_sendTx = Promise.promisify(web3.eth.sendTransaction, {context: web3});
    const web3_transfer = (_from, _to, _finney) => web3_sendTx({
        from: _from,
        to: _to,
        value: web3.toWei(_finney,'finney'),
        gas:200000
    });


    const web3_sendAsync = Promise.promisify(web3.currentProvider.sendAsync, {context: web3.currentProvider});
    const evm_call = (method, params=[]) => web3_sendAsync({
        jsonrpc: "2.0",
        method: method,
        params: params,
        id: new Date().getTime()
    })
    const evm_mine         = ()     => evm_call('evm_mine')
    const evm_increaseTime = (tsec) => evm_call('evm_increaseTime', [tsec.isBigNumber ? tsec.toNumber() : tsec]);
    const evm_snapshot     = ()     => evm_call('evm_snapshot').then(r => {snapshotNrStack.push(r.result); return r});
    const evm_revert       = (num)  => evm_call('evm_revert', [num || snapshotNrStack.pop()]);
    const snapshotNrStack  = [];  //workaround for broken evm_revert without shapshot provided.

});
