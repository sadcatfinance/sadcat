// SPDX-License-Identifier: MIT
pragma solidity ^0.8.5;

import "./interfaces/IPOPSwaper.sol";
import "./interfaces/ISwaper.sol";
import "./interfaces/IWPOP.sol";

contract POPSwaper is IPOPSwaper {

    ISwaper override public swaper;
    IWPOP override public wpop;

    mapping(address => bool) private approved;

    constructor(ISwaper _swaper, IWPOP _wpop) {
        swaper = _swaper;
        wpop = _wpop;
        wpop.approve(address(swaper), type(uint256).max);
    }

    receive() external payable {}

    function addLiquidity(
        address to, IFungibleToken token, uint256 tokenAmount
    ) payable override public returns (uint256 liquidity, uint256 resultTokenAmount, uint256 resultPOPAmount) {
        
        token.transferFrom(msg.sender, address(this), tokenAmount);
        if (approved[address(token)] != true) {
            token.approve(address(swaper), type(uint256).max);
            approved[address(token)] = true;
        }
        wpop.deposit{value: msg.value}();
        
        (liquidity, resultTokenAmount, resultPOPAmount) = swaper.addLiquidity(to, token, tokenAmount, wpop, msg.value);
        
        IFungibleToken(token).transfer(msg.sender, tokenAmount - resultTokenAmount);
        uint256 remainPOPAmount = msg.value - resultPOPAmount;
        wpop.withdraw(remainPOPAmount);
        payable(msg.sender).transfer(remainPOPAmount);
    }

    function addLiquidityWithPermit(
        address to, IFungibleToken token, uint256 tokenAmount,
        uint256 deadline,
        uint8 v, bytes32 r, bytes32 s
    ) payable override external returns (uint256 liquidity, uint256 resultTokenAmount, uint256 resultPOPAmount) {
        token.permit(msg.sender, address(this), tokenAmount, deadline, v, r, s);
        return addLiquidity(to, token, tokenAmount);
    }

    function subtractLiquidity(address from, address token, uint256 liquidity) override external returns (uint256 tokenAmount, uint256 ethAmount) {
        (tokenAmount, ethAmount) = swaper.subtractLiquidity(from, token, address(wpop), liquidity);
        IFungibleToken(token).transfer(msg.sender, tokenAmount);
        wpop.withdraw(ethAmount);
        payable(msg.sender).transfer(ethAmount);
    }

    function swapFromPOP(address[] memory path, uint256 amountOutMin) payable override external returns (uint256 amountOut) {
        wpop.deposit{value: msg.value}();
        address[] memory _path = new address[](2);
        _path[0] = address(wpop);
        _path[1] = path[0];
        uint256 amountIn = swaper.swap(_path, msg.value, 0);
        if (path.length == 1) {
            require(amountIn >= amountOutMin);
            IFungibleToken(path[0]).transfer(msg.sender, amountIn);
        } else {
            amountOut = swaper.swap(path, amountIn, amountOutMin);
            IFungibleToken(path[path.length - 1]).transfer(msg.sender, amountOut);
        }
    }

    function swapToPOP(address[] memory path, uint256 amountIn, uint256 ethAmountOutMin) override public returns (uint256 ethAmountOut) {
        IFungibleToken(path[0]).transferFrom(msg.sender, address(this), amountIn);
        if (path.length > 1) {
            amountIn = swaper.swap(path, amountIn, 0);
        }
        address[] memory _path = new address[](2);
        _path[0] = path[path.length - 1];
        _path[1] = address(wpop);
        ethAmountOut = swaper.swap(_path, amountIn, ethAmountOutMin);
        wpop.withdraw(ethAmountOut);
        payable(msg.sender).transfer(ethAmountOut);
    }
    
    function swapToPOPWithPermit(address[] memory path, uint256 amountIn, uint256 ethAmountOutMin,
        uint256 deadline, uint8 v, bytes32 r, bytes32 s
    ) override external returns (uint256 ethAmountOut) {
        IFungibleToken(path[0]).permit(msg.sender, address(this), amountIn, deadline, v, r, s);
        return swapToPOP(path, amountIn, ethAmountOutMin);
    }
}
