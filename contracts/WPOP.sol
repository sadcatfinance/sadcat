// SPDX-License-Identifier: MIT
pragma solidity ^0.8.5;

import "./FungibleToken.sol";
import "./interfaces/IWPOP.sol";

contract WPOP is FungibleToken("Wrapped POP", "WPOP", "1"), IWPOP {

    receive() external payable {
        deposit();
    }

    function deposit() payable override public {
        _mint(msg.sender, msg.value);
        emit Deposit(msg.sender, msg.value);
    }

    function withdraw(uint256 value) override external {
        _burn(msg.sender, value);
        payable(msg.sender).transfer(value);
        emit Withdraw(msg.sender, value);
    }
}
