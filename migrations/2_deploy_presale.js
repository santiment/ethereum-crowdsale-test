var Presale = artifacts.require("./Presale.sol");
var PresalerVoting = artifacts.require("./PresalerVoting.sol");
var CFIWhiteList = artifacts.require("./WhiteList.sol");
var SantimentWhiteList = artifacts.require("./SantimentWhiteList.sol");
var MintableTokenImpl = artifacts.require("./MintableTokenImpl.sol");
var CrowdsaleMinter = artifacts.require("./CrowdsaleMinter.sol");


module.exports = function(deployer) {
  deployer.deploy(Presale);
  deployer.deploy(PresalerVoting);
  deployer.deploy(CFIWhiteList);
  deployer.deploy(SantimentWhiteList);
  deployer.deploy(MintableTokenImpl);
  deployer.deploy(CrowdsaleMinter);
};
