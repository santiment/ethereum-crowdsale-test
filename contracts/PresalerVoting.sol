pragma solidity ^0.4.11;

contract PresalerVoting {

    mapping (address => uint) public rawVotes;
    address[] voters;

    function votersLen() external constant returns (uint) { return voters.length; }

    function addRawVotes(address[] addrs, uint[] votes) {
        for(uint i=0; i < addrs.length; ++i){
            rawVotes[addrs[i]] = votes[i] * 1 finney;
            voters.push(addrs[i]);
        }
    }
}//contract
