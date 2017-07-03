const Promise = require("bluebird");

const Presale       = artifacts.require("./Presale.sol");
const PresalerVoting = artifacts.require("./PresalerVoting.sol");
const CFIWhiteList  = artifacts.require("./WhiteList.sol");
const SANWhiteList  = artifacts.require("./SantimentWhiteList.sol");
const MintableTokenImpl = artifacts.require("./MintableTokenImpl.sol");
const CrowdsaleMinter = artifacts.require("./CrowdsaleMinter.sol");

const web3 = Presale.web3;

const TOKEN_PER_ETH = 1000;

contract('CrowdsaleMinter', function(accounts) {
    let presale, presalerVoting, cfiWhiteList, sanWhiteList, crowdsaleMinter, mintableToken;
    let COMMUNITY_SALE_START, PRIORITY_SALE_START, PUBLIC_SALE_START, PUBLIC_SALE_END, WITHDRAWAL_END;
    let TEAM_GROUP_WALLET, ADVISERS_AND_FRIENDS_WALLET;
    let MIN_TOTAL_AMOUNT_TO_RECEIVE, COMMUNITY_PLUS_PRIORITY_SALE_CAP_ETH, MAX_TOTAL_AMOUNT_TO_RECEIVE;

    it("should be in BEFORE_START state", function () {
        console.log('now> ',web3.eth.blockNumber, COMMUNITY_SALE_START);
        assert.isBelow(web3.eth.blockNumber, COMMUNITY_SALE_START, "expected: blockNr <= COMMUNITY_SALE_START");
        return crowdsaleMinter.state()
        .then(state => assert.equal('BEFORE_START',state,'state mismatch'));
    });

    it("should fail to donate in BEFORE_START", function (done) {
        console.log('next> ',web3.eth.blockNumber+1, COMMUNITY_SALE_START);
        assert.isBelow(web3.eth.blockNumber+1, COMMUNITY_SALE_START, "expected: blockNr <= COMMUNITY_SALE_START"); //next block
        crowdsaleMinter.state()
        .then(state => {
            assert.equal('BEFORE_START',state,'state mismatch');
            return web3_transfer(accounts[3], crowdsaleMinter.address, 1000);
        }).then(tx => done('Exception expected, transaction found: ' + tx))
          .catch(e => done());
    });

    it("should be in COMMUNITY_SALE state", function () {
        return evm_mine()
        .then(tx => {
            console.log('now> ',web3.eth.blockNumber, COMMUNITY_SALE_START);
            assert.isAtLeast(web3.eth.blockNumber, COMMUNITY_SALE_START,"expected: blockNr >= COMMUNITY_SALE_START");
            assert.isBelow(web3.eth.blockNumber, PRIORITY_SALE_START,"expected: blockNr < PRIORITY_SALE_START");
            return crowdsaleMinter.state()
              .then(state => assert.equal('COMMUNITY_SALE',state,'state mismatch'));
        });
    });

    it("should donate in COMMUNITY_SALE", function () {
        console.log(web3.eth.blockNumber, COMMUNITY_SALE_START);
        assert.isAtLeast(web3.eth.blockNumber, COMMUNITY_SALE_START,"expected: blockNr >= COMMUNITY_SALE_START");
        assert.isBelow(web3.eth.blockNumber, PRIORITY_SALE_START,"expected: blockNr < PRIORITY_SALE_START");
        return crowdsaleMinter.state()
        .then(state => {
            assert.equal('COMMUNITY_SALE',state,'state mismatch');
            return web3_transfer(accounts[3], crowdsaleMinter.address, 1000);
        }).then(tx => Promise.all([
                    crowdsaleMinter.total_received_amount(),
                    crowdsaleMinter.balances(accounts[3]),
                    mintableToken.balanceOf(accounts[3]),
                    mintableToken.totalSupply()
                ]).spread( (bn_total_received_amount, bn_balanceEth, bn_balanceTk, bn_totalSupply) => {
                    assert.equal(1000,toEther(bn_total_received_amount),'ERR total_received_amount: ');
                    assert.equal(1000,toEther(bn_balanceEth),'ERR balance minter: ');
                    assert.equal(1000000,toSAN(bn_balanceTk),'ERR balance token: ');
                    assert.equal(1000000,toSAN(bn_totalSupply),'ERR totalSupply: ');
                })
          );
    });

    it("should be in PRIORITY_SALE state", function () {
        return evm_mine()
        .then(tx => {
            console.log(web3.eth.blockNumber, PRIORITY_SALE_START);
            assert.isAtLeast(web3.eth.blockNumber, PRIORITY_SALE_START,"blocknr mitmatch");
            assert.isBelow(web3.eth.blockNumber, PUBLIC_SALE_START,"expected: blockNr < PUBLIC_SALE_START");
            return crowdsaleMinter.state()
              .then(state => assert.equal('PRIORITY_SALE',state,'state mismatch'));
        });
    });

    it("should donate in PRIORITY_SALE state", function () {
        console.log('next>',web3.eth.blockNumber+1, PRIORITY_SALE_START);
        assert.isAtLeast(web3.eth.blockNumber, PRIORITY_SALE_START,"expected: blockNr: >= PRIORITY_SALE_START");
        assert.isBelow(web3.eth.blockNumber, PUBLIC_SALE_START,"expected: blockNr: < PUBLIC_SALE_START");
        return crowdsaleMinter.state()
        .then(state => {
            assert.equal('PRIORITY_SALE',state,'state mismatch');
            return web3_transfer(accounts[1], crowdsaleMinter.address, 510);
        }).then(tx => Promise.all([
                    crowdsaleMinter.total_received_amount(),
                    crowdsaleMinter.balances(accounts[1]),
                    mintableToken.balanceOf(accounts[1]),
                    mintableToken.totalSupply()
                ]).spread( (bn_total_received_amount, bn_balanceEth, bn_balanceTk, bn_totalSupply) => {
                    assert.equal(1510,toEther(bn_total_received_amount),'ERR total_received_amount: ');
                    assert.equal(510,toEther(bn_balanceEth),'ERR balance minter: ');
                    assert.equal(510000,toSAN(bn_balanceTk),'ERR balance token: ');
                    assert.equal(1510000,toSAN(bn_totalSupply),'ERR totalSupply: ');
                })
          );
    });

    it("should be in PUBLIC_SALE state", function () {
        return evm_mine()
        .then(tx => {
            console.log(web3.eth.blockNumber, PUBLIC_SALE_START);
            assert.isAtMost(web3.eth.blockNumber, PUBLIC_SALE_START,"expected: blockNr >= PUBLIC_SALE_START");
            return crowdsaleMinter.state()
              .then(state => assert.equal('PUBLIC_SALE',state,'state mismatch'));
        });
    });

    it("should donate in PUBLIC_SALE state", function () {
        console.log('next>',web3.eth.blockNumber+1, PUBLIC_SALE_START);
        assert.isAtLeast(web3.eth.blockNumber+1, PUBLIC_SALE_START,"expected: blockNr >= PUBLIC_SALE_START");
        assert.isAtMost(web3.eth.blockNumber+1, PUBLIC_SALE_END,"expected: blockNr < PUBLIC_SALE_END");
        return crowdsaleMinter.state()
        .then(state => {
            assert.equal('PUBLIC_SALE',state,'state mismatch');
            return web3_transfer(accounts[1], crowdsaleMinter.address, 510);
        }).then(tx => Promise.all([
                    crowdsaleMinter.total_received_amount(),
                    crowdsaleMinter.balances(accounts[1]),
                    mintableToken.balanceOf(accounts[1]),
                    mintableToken.totalSupply()
                ]).spread( (bn_total_received_amount, bn_balanceEth, bn_balanceTk, bn_totalSupply) => {
                    assert.equal(2020,toEther(bn_total_received_amount),'ERR total_received_amount: ');
                    assert.equal(1020,toEther(bn_balanceEth),'ERR balance minter: ');
                    assert.equal(1020000,toSAN(bn_balanceTk),'ERR balance token: ');
                    assert.equal(2020000,toSAN(bn_totalSupply),'ERR totalSupply: ');
                })
          );
    });

    it("should be in BONUS_MINTING state", function () {
        return evm_mine()
        .then(tx => {
            console.log(web3.eth.blockNumber, PUBLIC_SALE_END);
            assert.isAbove(web3.eth.blockNumber, PUBLIC_SALE_END,"expected: blockNr > PUBLIC_SALE_END");
            assert.isBelow(web3.eth.blockNumber, WITHDRAWAL_END,"expected: blockNr < WITHDRAWAL_END");
            return Promise.all([
                crowdsaleMinter.state(),
                crowdsaleMinter.total_received_amount()
            ]).spread((state, bn_total_received_amount) => {
                  assert.equal(2020,toEther(bn_total_received_amount),'mismatch total_received_amount ');
                  assert.equal('BONUS_MINTING',state,'state mismatch');
              });
        });
    });

    it("should fail to donate after PUBLIC_SALE_END", function (done) {
        console.log('next> ',web3.eth.blockNumber+1, PUBLIC_SALE_END);
        assert.isAbove(web3.eth.blockNumber, PUBLIC_SALE_END,"expected: blockNr > PUBLIC_SALE_END");
        assert.isBelow(web3.eth.blockNumber, WITHDRAWAL_END,"expected: blockNr < WITHDRAWAL_END");
        crowdsaleMinter.state()
        .then(state => {
            assert.equal('BONUS_MINTING',state,'state mismatch');
            return web3_transfer(accounts[3], crowdsaleMinter.address, 1000);
        }).then(tx => done('Exception expected, transaction found: ' + tx))
          .catch(e => done());
    });

    it("should mint all Bonuses in BONUS_MINTING state", function () {
        console.log(web3.eth.blockNumber, PUBLIC_SALE_END);
        assert.isAbove(web3.eth.blockNumber, PUBLIC_SALE_END,"expected: blockNr > PUBLIC_SALE_END");
        assert.isBelow(web3.eth.blockNumber, WITHDRAWAL_END,"expected: blockNr < WITHDRAWAL_END");
        return crowdsaleMinter.state()
        .then(state => {
            assert.equal('BONUS_MINTING',state,'state mismatch');
            return crowdsaleMinter.mintAllBonuses();
        }).then(tx => {
            let gasUsed = tx.receipt.gasUsed;
            console.log('mintAllBonuses.gasUsed> ', gasUsed);
            return Promise.all([
                crowdsaleMinter.round_remainder(),
                mintableToken.balanceOf(TEAM_GROUP_WALLET),
                mintableToken.balanceOf(ADVISERS_AND_FRIENDS_WALLET),
                mintableToken.totalSupply()
            ]).spread((bn_round_remainder, bn_team, bn_friends, bn_totalSupply) => {
                  let round_remainder = toFinney(bn_round_remainder);
                  let team = toSAN(bn_team);
                  let friends = toSAN(bn_friends);
                  let totalSupply = toSAN(bn_totalSupply);
                  console.log('remainder>',round_remainder);
                  console.log('team>',team);
                  console.log('friends>',friends);
                  console.log('total>',totalSupply);
                  console.log('team/total>',team*100/totalSupply);
                  console.log('friends/total>',friends*100/totalSupply);
                  assert.isBelow(18-team*100/totalSupply, 0.1, 'APPROX team/totalSupply ratio mismatched');
                  assert.isBelow(10-friends*100/totalSupply, 0.1, 'APPROX friends/totalSupply ratio mismatched');
                  assert.isBelow(18-(team+round_remainder)*100/(totalSupply+round_remainder), 0.000001, 'EXACT team/totalSupply ratio mismatched');
                  assert.isBelow(10-friends*100/(totalSupply+round_remainder), 0.000001, 'EXACT friends/totalSupply ratio mismatched');
            });
        });
    });

    //========== SETUP ==============

    before("should setup infrastructuring contract", function() {
        const PRESALE_AMOUNTS = new Array(PRESALE_ADDRESSES.length);
        PRESALE_AMOUNTS.fill(10000);
        return Promise.all([
            Presale.deployed()
            .then(instance => (presale=instance).addBalances(PRESALE_ADDRESSES, PRESALE_AMOUNTS)),
            PresalerVoting.deployed()
            .then(instance => (presalerVoting=instance).addRawVotes(
                [accounts[1], accounts[2], accounts[3]],
                [9,5000,1000])),
            SANWhiteList.deployed()
            .then(instance => (sanWhiteList=instance).addPack(
                [accounts[3], accounts[4], accounts[5], accounts[6]],
                [100000,200000,300000,400000],
                [1100000,1200000,1300000,1400000]
                ,0)),
            CFIWhiteList.deployed()
            .then(instance => (cfiWhiteList=instance).addPack(
                [accounts[1], accounts[2], accounts[3]]
                ,0)),
            MintableTokenImpl.deployed()
            .then(instance => (mintableToken=instance))
        ]).then(txs=>{
            return Promise.all([
                presale.counter(),
                presalerVoting.votersLen(),
                cfiWhiteList.recordNr(),
                sanWhiteList.recordNum(),
                mintableToken.isStarted(),
                sanWhiteList.allowed(accounts[3])
            ]).spread( (n1,n2,n3,n4,b5,a6)=>{
                assert.equal(38,n1.toNumber(),"mismatched presale.counter()");
                assert.equal(3,n2.toNumber(),"mismatched presalerVoting.votersLen()");
                assert.equal(3,n3.toNumber(),"mismatched cfiWhiteList.recordNr()");
                assert.equal(4,n4.toNumber(),"mismatched sanWhiteList.recordNum()");
                assert.equal(false,b5,"mismatched mintableToken.isStarted()");
                assert.equal(100000,a6[0].toNumber(),"...");
                assert.equal(1100000,a6[1].toNumber(),"...");
                console.log("setup - OK");
            });
        }).then(tx => CrowdsaleMinter.deployed())
          .then(instance => (crowdsaleMinter=instance).configure(
                MIN_TOTAL_AMOUNT_TO_RECEIVE          = web3.toWei(1000,'ether'),
                COMMUNITY_PLUS_PRIORITY_SALE_CAP_ETH = web3.toWei(7000,'ether'),
                MAX_TOTAL_AMOUNT_TO_RECEIVE          = web3.toWei(10000,'ether'),
                COMMUNITY_SALE_START = web3.eth.blockNumber + 3,
                PRIORITY_SALE_START  = COMMUNITY_SALE_START + 2,
                PUBLIC_SALE_START    = PRIORITY_SALE_START + 2,
                PUBLIC_SALE_END      = PUBLIC_SALE_START + 1,
                WITHDRAWAL_END       = PUBLIC_SALE_END + 5,
                TEAM_GROUP_WALLET           = accounts[10],
                ADVISERS_AND_FRIENDS_WALLET = accounts[11],
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

    const toFinney = wei => web3.fromWei(wei,'finney').toNumber();
    const toEther = wei => web3.fromWei(wei,'ether').toNumber();
    const toSAN    = san => web3.fromWei(san,'ether').toNumber();

    const web3_sendTx = Promise.promisify(web3.eth.sendTransaction, {context: web3});
    const web3_transfer = (_from, _to, _finney) => web3_sendTx({
        from: _from,
        to: _to,
        value: web3.toWei(_finney,'ether'),
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
    const PRESALE_ADDRESSES = [
            "0xF55DFd2B02Cf3282680C94BD01E9Da044044E6A2",
            "0x0D40B53828948b340673674Ae65Ee7f5D8488e33",
            "0x0ea690d466d6bbd18F124E204EA486a4Bf934cbA",
            "0x6d25B9f40b92CcF158250625A152574603465192",
            "0x481Da0F1e89c206712BCeA4f7D6E60d7b42f6C6C",
            "0x416EDa5D6Ed29CAc3e6D97C102d61BC578C5dB87",
            "0xD78Ac6FFc90E084F5fD563563Cc9fD33eE303f18",
            "0xe6714ab523acEcf9b85d880492A2AcDBe4184892",
            "0x285A9cA5fE9ee854457016a7a5d3A3BB95538093",
            "0x600ca6372f312B081205B2C3dA72517a603a15Cc",
            "0x2b8d5C9209fBD500Fd817D960830AC6718b88112",
            "0x4B15Dd23E5f9062e4FB3a9B7DECF653C0215e560",
            "0xD67449e6AB23c1f46dea77d3f5E5D47Ff33Dc9a9",
            "0xd0ADaD7ed81AfDa039969566Ceb8423E0ab14d90",
            "0x245f27796a44d7E3D30654eD62850ff09EE85656",
            "0x639D6eC2cef4d6f7130b40132B3B6F5b667e5105",
            "0x5e9a69B8656914965d69d8da49c3709F0bF2B5Ef",
            "0x0832c3B801319b62aB1D3535615d1fe9aFc3397A",
            "0xf6Dd631279377205818C3a6725EeEFB9D0F6b9F3",
            "0x47696054e71e4c3f899119601a255a7065C3087B",
            "0xf107bE6c6833f61A24c64D63c8A7fcD784Abff06",
            "0x056f072Bd2240315b708DBCbDDE80d400f0394a1",
            "0x9e5BaeC244D8cCD49477037E28ed70584EeAD956",
            "0x40A0b2c1B4E30F27e21DF94e734671856b485966",
            "0x84f0620A547a4D14A7987770c4F5C25d488d6335",
            "0x036Ac11c161C09d94cA39F7B24C1bC82046c332B",
            "0x2912A18C902dE6f95321D6d6305D7B80Eec4C055",
            "0xE1Ad30971b83c17E2A24c0334CB45f808AbEBc87",
            "0x07f35b7FE735c49FD5051D5a0C2e74c9177fEa6d",
            "0x11669Cce6AF3ce1Ef3777721fCC0eef0eE57Eaba",
            "0xBDbaF6434d40D6355B1e80e40Cc4AB9C68D96116",
            "0x17125b59ac51cEe029E4bD78D7f5947D1eA49BB2",
            "0xA382A3A65c3F8ee2b726A2535B3c34A89D9094D4",
            "0xAB78c8781fB64Bed37B274C5EE759eE33465f1f3",
            "0xE74F2062612E3cAE8a93E24b2f0D3a2133373884",
            "0x505120957A9806827F8F111A123561E82C40bC78",
            "0x00A46922B1C54Ae6b5818C49B97E03EB4BB352e1",
            "0xE76fE52a251C8F3a5dcD657E47A6C8D16Fdf4bFA"
        ];

});
