// SPDX-License-Identifier: MIT
pragma solidity ^0.8.5;

import "./ISadcat.sol";
import "./ITokenPair.sol";

interface IFarmFactory {

    event Add(ITokenPair indexed pair, uint256 allocPoint);
    event Set(uint256 indexed pid, uint256 allocPoint);
    event Deposit(address indexed user, uint256 indexed pid, uint256 amount);
    event Withdraw(address indexed user, uint256 indexed pid, uint256 amount);

    function sadcat() external view returns (ISadcat);
    function rewardPerBlock() external view returns (uint256);
    function startBlock() external view returns (uint256);

    function poolCount() external view returns (uint256);
    function poolInfo(uint256 pid) external view returns (
        ITokenPair pair,
        uint256 allocPoint,
        uint256 lastRewardBlock,
        uint256 accRewardPerShare
    );
    function userInfo(uint256 pid, address user) external view returns (
        uint256 amount,
        uint256 rewardDebt
    );
    function totalAllocPoint() external view returns (uint256);

    function deposit(uint256 pid, uint256 amount) external;

    function depositWithPermit(
        uint256 pid,
        uint256 amount,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external;

    function depositWithPermitMax(
        uint256 pid,
        uint256 amount,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external;

    function withdraw(uint256 pid, uint256 amount) external;
}
