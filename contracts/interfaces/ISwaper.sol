// SPDX-License-Identifier: MIT
pragma solidity ^0.8.5;

import "./ITokenPair.sol";
import "./IFungibleToken.sol";

interface ISwaper {

    event CreatePair(uint256 indexed pairId, address pairAddress, address indexed token1, address indexed token2);

    function dev() external view returns (address);
    function devSetter() external view returns (address);
    function calculateFee(uint256 amount) external view returns (uint256 fee);
    function calculateDevFee(uint256 amount) external view returns (uint256 devFee);
    
    function pairCount() external view returns (uint256);
    function pairs(uint256 index) external view returns (ITokenPair);
    function getPair(address token1, address token2) external view returns (ITokenPair pair);

    function addLiquidity(
        address to,
        IFungibleToken token1, uint256 amount1,
        IFungibleToken token2, uint256 amount2
    ) external returns (uint256 liquidity, uint256 resultAmount1, uint256 resultAmount2);

    function addLiquidityWithPermit(
        address to,
        IFungibleToken token1, uint256 amount1,
        IFungibleToken token2, uint256 amount2,
        uint256 deadline,
        uint8 v1, bytes32 r1, bytes32 s1,
        uint8 v2, bytes32 r2, bytes32 s2
    ) external;

    function subtractLiquidity(address from, address token1, address token2, uint256 liquidity) external returns (uint256 amount1, uint256 amount2);

    function swap(address[] memory path, uint256 amountIn, uint256 amountOutMin) external returns (uint256 amountOut);
    function swapWithPermit(address[] memory path, uint256 amountIn, uint256 amountOutMin,
        uint256 deadline, uint8 v, bytes32 r, bytes32 s
    ) external returns (uint256 amountOut);
}
