// SPDX-License-Identifier: MIT
pragma solidity ^0.8.5;

import "./IWPOP.sol";
import "./ISwaper.sol";

interface IPOPSwaper {

    function swaper() external view returns (ISwaper);
    function wpop() external view returns (IWPOP);
    
    function addLiquidity(
        address to, IFungibleToken token, uint256 tokenAmount
    ) payable external returns (uint256 liquidity, uint256 resultTokenAmount, uint256 resultPOPAmount);

    function addLiquidityWithPermit(
        address to, IFungibleToken token, uint256 tokenAmount,
        uint256 deadline,
        uint8 v, bytes32 r, bytes32 s
    ) payable external returns (uint256 liquidity, uint256 resultTokenAmount, uint256 resultPOPAmount);

    function subtractLiquidity(address from, address token, uint256 liquidity) external returns (uint256 tokenAmount, uint256 ethAmount);

    function swapFromPOP(address[] memory path, uint256 amountOutMin) payable external returns (uint256 amountOut);
    function swapToPOP(address[] memory path, uint256 amountIn, uint256 ethAmountOutMin) external returns (uint256 ethAmountOut);
    function swapToPOPWithPermit(address[] memory path, uint256 amountIn, uint256 ethAmountOutMin,
        uint256 deadline, uint8 v, bytes32 r, bytes32 s
    ) external returns (uint256 ethAmountOut);
}
