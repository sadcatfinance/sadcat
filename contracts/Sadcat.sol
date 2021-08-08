// SPDX-License-Identifier: MIT
pragma solidity ^0.8.5;

import "./FungibleToken.sol";
import "./interfaces/ISadcat.sol";
import "./interfaces/IFarmFactory.sol";

contract Sadcat is FungibleToken, ISadcat {

    IFarmFactory public factory;
    
    constructor() FungibleToken("Sadcat", "SAD", "1") {
        factory = IFarmFactory(msg.sender);
    }

    modifier onlyFactory {
        require(msg.sender == address(factory));
        _;
    }

    function mint(address to, uint256 amount) onlyFactory external override {
        _mint(to, amount);
    }
}
