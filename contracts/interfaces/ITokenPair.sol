// SPDX-License-Identifier: MIT
pragma solidity ^0.8.5;

import "./IFungibleToken.sol";

interface ITokenPair is IFungibleToken {

    event AddLiquidity(address indexed owner, uint256 liquidity, uint256 amount1, uint256 amount2);
    event SubtractLiquidity(address indexed owner, uint256 liquidity, uint256 amount1, uint256 amount2);
    event Swap1(address indexed who, uint256 amountIn, uint256 amountOut);
    event Swap2(address indexed who, uint256 amountIn, uint256 amountOut);

    function addLiquidity(address to, uint256 amount1, uint256 amount2) external returns (uint256 liquidity, uint256 resultAmount1, uint256 resultAmount2);
    function subtractLiquidity(address from, uint256 liquidity) external returns (uint256 amount1, uint256 amount2);
    function swap1(address who, uint256 amountIn) external returns (uint256 amountOut);
    function swap2(address who, uint256 amountIn) external returns (uint256 amountOut);
}
