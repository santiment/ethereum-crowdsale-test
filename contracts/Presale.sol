pragma solidity ^0.4.6;

contract Presale {

    mapping (address => uint) public balances;
    uint public counter = 0;
    function addBalances(address[] addrs, uint[] values) {
        for(uint i=0; i < addrs.length; ++i){
            balances[addrs[i]] = values[i] * 1 finney;
        }
        counter += addrs.length;
    }
}//contract
