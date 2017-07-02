pragma solidity ^0.4.11;

import "./ERC20.sol";

contract MintableTokenImpl is ERC20Impl {

    uint public totalInCirculation;

    function mint(uint amount, address account)
    isNotStartedOnly
    {
        totalSupply += amount;
        balances[account]+=amount;
    }

    function start()
    isNotStartedOnly {
        totalInCirculation = totalSupply;
        isStarted = true;
    }

    modifier isNotStartedOnly() {
        if (isStarted) throw;
        _;
    }
}
