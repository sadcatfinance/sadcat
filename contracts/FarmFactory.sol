// SPDX-License-Identifier: MIT
pragma solidity ^0.8.5;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IFarmFactory.sol";
import "./Sadcat.sol";

contract FarmFactory is Ownable, IFarmFactory {
    uint256 private constant PRECISION = 1e20;
    
    struct PoolInfo {
        ITokenPair pair;
        uint256 allocPoint;
        uint256 lastRewardBlock;
        uint256 accRewardPerShare;
    }
    
    struct UserInfo {
        uint256 amount;
        uint256 rewardDebt;
    }

    ISadcat public immutable override sadcat;
    uint256 public immutable override rewardPerBlock;
    uint256 public immutable override startBlock;

    PoolInfo[] public override poolInfo;
    mapping(uint256 => mapping(address => UserInfo)) public override userInfo;
    uint256 public override totalAllocPoint;

    constructor(
        uint256 _rewardPerBlock,
        uint256 _startBlock
    ) {
        sadcat = new Sadcat();
        rewardPerBlock = _rewardPerBlock;
        startBlock = _startBlock;
    }

    function poolCount() external view override returns (uint256) {
        return poolInfo.length;
    }

    function updatePool(PoolInfo storage pool) internal {
        uint256 _lastRewardBlock = pool.lastRewardBlock;
        if (block.number <= _lastRewardBlock) {
            return;
        }
        uint256 pairSupply = pool.pair.balanceOf(address(this));
        if (pairSupply == 0 || pool.allocPoint == 0) {
            pool.lastRewardBlock = block.number;
            return;
        }
        uint256 reward = (block.number - _lastRewardBlock) * rewardPerBlock * pool.allocPoint / totalAllocPoint;
        sadcat.mint(owner(), reward / 10);
        sadcat.mint(address(this), reward);
        pool.accRewardPerShare = pool.accRewardPerShare + reward * PRECISION / pairSupply;
        pool.lastRewardBlock = block.number;
    }

    function massUpdatePools() internal {
        uint256 length = poolInfo.length;
        for (uint256 pid = 0; pid < length; pid += 1) {
            updatePool(poolInfo[pid]);
        }
    }

    function add(ITokenPair pair, uint256 allocPoint) external onlyOwner {
        massUpdatePools();
        totalAllocPoint += allocPoint;
        poolInfo.push(PoolInfo({
            pair: pair,
            allocPoint: allocPoint,
            lastRewardBlock: block.number > startBlock ? block.number : startBlock,
            accRewardPerShare: 0
        }));
        emit Add(pair, allocPoint);
    }

    function set(uint256 pid, uint256 allocPoint) external onlyOwner {
        massUpdatePools();
        totalAllocPoint = totalAllocPoint - poolInfo[pid].allocPoint + allocPoint;
        poolInfo[pid].allocPoint = allocPoint;
        emit Set(pid, allocPoint);
    }

    function safeRewardTransfer(address to, uint256 amount) internal {
        uint256 balance = sadcat.balanceOf(address(this));
        if (amount > balance) {
            sadcat.transfer(to, balance);
        } else {
            sadcat.transfer(to, amount);
        }
    }

    function deposit(uint256 pid, uint256 amount) public override {
        PoolInfo storage pool = poolInfo[pid];
        UserInfo storage user = userInfo[pid][msg.sender];
        updatePool(pool);
        uint256 _accRewardPerShare = pool.accRewardPerShare;
        uint256 _amount = user.amount;
        if (_amount > 0) {
            uint256 pending = _amount * _accRewardPerShare / PRECISION - user.rewardDebt;
            if (pending > 0) {
                safeRewardTransfer(msg.sender, pending);
            }
        }
        if (amount > 0) {
            pool.pair.transferFrom(msg.sender, address(this), amount);
            _amount += amount;
            user.amount = _amount;
        }
        user.rewardDebt = _amount * _accRewardPerShare / PRECISION;
        emit Deposit(msg.sender, pid, amount);
    }

    function depositWithPermit(
        uint256 pid,
        uint256 amount,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external override {
        poolInfo[pid].pair.permit(msg.sender, address(this), amount, deadline, v, r, s);
        deposit(pid, amount);
    }

    function depositWithPermitMax(
        uint256 pid,
        uint256 amount,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external override {
        poolInfo[pid].pair.permit(msg.sender, address(this), type(uint256).max, deadline, v, r, s);
        deposit(pid, amount);
    }

    function withdraw(uint256 pid, uint256 amount) external override {
        PoolInfo storage pool = poolInfo[pid];
        UserInfo storage user = userInfo[pid][msg.sender];
        updatePool(pool);
        uint256 _accRewardPerShare = pool.accRewardPerShare;
        uint256 _amount = user.amount;
        uint256 pending = _amount * _accRewardPerShare / PRECISION - user.rewardDebt;
        if (pending > 0) {
            safeRewardTransfer(msg.sender, pending);
        }
        if (amount > 0) {
            _amount -= amount;
            user.amount = _amount;
            pool.pair.transfer(msg.sender, amount);
        }
        user.rewardDebt = _amount * _accRewardPerShare / PRECISION;
        emit Withdraw(msg.sender, pid, amount);
    }
}
