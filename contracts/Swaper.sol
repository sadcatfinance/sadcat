// SPDX-License-Identifier: MIT
pragma solidity ^0.8.5;

import "./interfaces/ISwaper.sol";
import "./interfaces/IFungibleToken.sol";
import "./TokenPair.sol";
import "./libraries/String.sol";

contract Swaper is ISwaper {

    address override public dev;
    address override public devSetter;

    mapping(address => mapping(address => ITokenPair)) internal tokenToPair;
    ITokenPair[] override public pairs;

    constructor() {
        dev = msg.sender;
        devSetter = msg.sender;
    }

    function setDev(address _dev) external {
        require(msg.sender == devSetter);
        dev = _dev;
    }

    function setFeeToSetter(address _devSetter) external {
        require(msg.sender == devSetter);
        devSetter = _devSetter;
    }
    
    function calculateFee(uint256 amount) override external pure returns (uint256 fee) {
        fee = amount * 25 / 10000; // 0.25%
    }
    
    function calculateDevFee(uint256 amount) override external pure returns (uint256 devFee) {
        devFee = amount * 5 / 10000; // 0.05%
    }

    function pairCount() override external view returns (uint256) {
        return pairs.length;
    }

    function getPair(address token1, address token2) override external view returns (ITokenPair) {
        return token1 < token2 ? tokenToPair[token1][token2] : tokenToPair[token2][token1];
    }

    function addLiquidity(
        address to,
        IFungibleToken token1, uint256 amount1,
        IFungibleToken token2, uint256 amount2
    ) override public returns (uint256 liquidity, uint256 resultAmount1, uint256 resultAmount2) {
        
        if (token1 > token2) {
            (liquidity, resultAmount2, resultAmount1) = addLiquidity(to, token2, amount2, token1, amount1);
        } else {

            token1.transferFrom(msg.sender, address(this), amount1);
            token2.transferFrom(msg.sender, address(this), amount2);

            ITokenPair pair = tokenToPair[address(token1)][address(token2)];
            if (address(pair) == address(0)) {

                uint256 pairId = pairs.length;

                pair = new TokenPair(
                    String.convertUint256ToString(pairId),
                    token1,
                    token2
                );
                token1.approve(address(pair), type(uint256).max);
                token2.approve(address(pair), type(uint256).max);
                tokenToPair[address(token1)][address(token2)] = pair;
                pairs.push(pair);

                emit CreatePair(pairId, address(pair), address(token1), address(token2));
            }

            (liquidity, resultAmount1, resultAmount2) = pair.addLiquidity(to, amount1, amount2);
            
            IFungibleToken(token1).transfer(msg.sender, amount1 - resultAmount1);
            IFungibleToken(token2).transfer(msg.sender, amount2 - resultAmount2);
        }
    }
    
    function addLiquidityWithPermit(
        address to,
        IFungibleToken token1, uint256 amount1,
        IFungibleToken token2, uint256 amount2,
        uint256 deadline,
        uint8 v1, bytes32 r1, bytes32 s1,
        uint8 v2, bytes32 r2, bytes32 s2
    ) override external {
        token1.permit(msg.sender, address(this), amount1, deadline, v1, r1, s1);
        token2.permit(msg.sender, address(this), amount2, deadline, v2, r2, s2);
        addLiquidity(to, token1, amount1, token2, amount2);
    }

    function subtractLiquidity(address from, address token1, address token2, uint256 liquidity) override public returns (uint256 amount1, uint256 amount2) {
        if (token1 > token2) {
            (amount2, amount1) = subtractLiquidity(from, token2, token1, liquidity);
        } else {
            (amount1, amount2) = tokenToPair[token1][token2].subtractLiquidity(from, liquidity);
            IFungibleToken(token1).transfer(msg.sender, amount1);
            IFungibleToken(token2).transfer(msg.sender, amount2);
        }
    }

    function swap(address[] memory path, uint256 amountIn, uint256 amountOutMin) override public returns (uint256 amountOut) {
        require(path.length > 1);

        IFungibleToken(path[0]).transferFrom(msg.sender, address(this), amountIn);
        
        uint256 to = path.length - 1;
        address token1;
        address token2;
        for (uint256 i = 0; i < to; i += 1) {
            token1 = path[i];
            token2 = path[i + 1];
            if (token1 > token2) {
                amountIn = tokenToPair[token2][token1].swap2(msg.sender, amountIn);
            } else {
                amountIn = tokenToPair[token1][token2].swap1(msg.sender, amountIn);
            }
        }
        
        require(amountIn >= amountOutMin);
        IFungibleToken(token2).transfer(msg.sender, amountIn);
        return amountIn;
    }
    
    function swapWithPermit(address[] memory path, uint256 amountIn, uint256 amountOutMin,
        uint256 deadline, uint8 v, bytes32 r, bytes32 s
    ) override external returns (uint256 amountOut) {
        IFungibleToken(path[0]).permit(msg.sender, address(this), amountIn, deadline, v, r, s);
        return swap(path, amountIn, amountOutMin);
    }
}
