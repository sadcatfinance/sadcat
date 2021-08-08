// SPDX-License-Identifier: MIT
pragma solidity ^0.8.5;

import "./FungibleToken.sol";
import "./interfaces/IFungibleToken.sol";
import "./interfaces/ITokenPair.sol";
import "./interfaces/ISwaper.sol";
import "./libraries/Math.sol";

contract TokenPair is FungibleToken, ITokenPair {

    uint256 public constant MINIMUM_LIQUIDITY = 1e3;

    ISwaper public swaper;
    IFungibleToken public token1;
    IFungibleToken public token2;

    constructor(
        string memory id,
        IFungibleToken _token1,
        IFungibleToken _token2
    ) FungibleToken(
        string(abi.encodePacked("TokenPair #", id)),
        string(abi.encodePacked("PAIR-", id)),
        "1"
    ) {
        require(_token1 != _token2);
        swaper = ISwaper(msg.sender);
        token1 = _token1;
        token2 = _token2;
    }

    modifier onlySwaper {
        require(msg.sender == address(swaper));
        _;
    }
    
    function addLiquidity(address to, uint256 amount1, uint256 amount2) onlySwaper override public returns (uint256 liquidity, uint256 resultAmount1, uint256 resultAmount2) {
        
        uint256 balance1 = token1.balanceOf(address(this));
        uint256 balance2 = token2.balanceOf(address(this));
        
        resultAmount1 = balance2 == 0 ? amount1 : (balance1 * amount2 / balance2);
        resultAmount2 = balance1 == 0 ? amount2 : (balance2 * amount1 / balance1);

        if (amount1 < resultAmount1) { resultAmount1 = amount1; }
        if (amount2 < resultAmount2) { resultAmount2 = amount2; }
        
        token1.transferFrom(msg.sender, address(this), resultAmount1);
        token2.transferFrom(msg.sender, address(this), resultAmount2);

        uint256 _totalSupply = totalSupply();
        if (_totalSupply == 0) {
            liquidity = Math.sqrt(resultAmount1 * resultAmount2) - MINIMUM_LIQUIDITY;
            _mint(address(this), MINIMUM_LIQUIDITY);
        } else {
            liquidity = Math.sqrt(resultAmount1 * resultAmount2);
        }
        _mint(to, liquidity);

        emit AddLiquidity(to, liquidity, resultAmount1, resultAmount2);
    }
    
    function subtractLiquidity(address from, uint256 liquidity) onlySwaper override external returns (uint256 amount1, uint256 amount2) {
        
        uint256 balance1 = token1.balanceOf(address(this));
        uint256 balance2 = token2.balanceOf(address(this));

        uint256 _totalSupply = totalSupply();
        amount1 = balance1 * liquidity / _totalSupply;
        amount2 = balance2 * liquidity / _totalSupply;

        token1.transfer(msg.sender, amount1);
        token2.transfer(msg.sender, amount2);

        _burn(from, liquidity);

        emit SubtractLiquidity(from, liquidity, amount1, amount2);
    }

    function swap1(address who, uint256 amountIn) onlySwaper override public returns (uint256 amountOut) {

        uint256 balance1 = token1.balanceOf(address(this));
        uint256 balance2 = token2.balanceOf(address(this));

        amountOut = balance2 * amountIn / balance1;
        uint256 feeIn = swaper.calculateFee(amountIn);
        uint256 feeOut = swaper.calculateFee(amountOut);
        amountOut -= feeOut;

        token1.transferFrom(msg.sender, address(this), amountIn);
        token1.transfer(swaper.feeTo(), feeIn);
        token2.transfer(msg.sender, amountOut);
        token2.transfer(swaper.feeTo(), feeOut);
        
        emit Swap1(who, amountIn, amountOut);
    }

    function swap2(address who, uint256 amountIn) onlySwaper override public returns (uint256 amountOut) {

        uint256 balance2 = token2.balanceOf(address(this));
        uint256 balance1 = token1.balanceOf(address(this));

        amountOut = balance1 * amountIn / balance2;
        uint256 feeIn = swaper.calculateFee(amountIn);
        uint256 feeOut = swaper.calculateFee(amountOut);
        amountOut -= feeOut;

        token2.transferFrom(msg.sender, address(this), amountIn);
        token2.transfer(swaper.feeTo(), feeIn);
        token1.transfer(msg.sender, amountOut);
        token1.transfer(swaper.feeTo(), feeOut);
        
        emit Swap1(who, amountIn, amountOut);
    }
}
