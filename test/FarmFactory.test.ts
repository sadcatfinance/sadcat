import { Contract } from "@ethersproject/contracts";
import { expect } from "chai";
import { ecsign } from "ethereumjs-util";
import { BigNumber, constants } from "ethers";
import { waffle } from "hardhat";
import FarmFactoryArtifact from "../artifacts/contracts/FarmFactory.sol/FarmFactory.json";
import SadcatArtifact from "../artifacts/contracts/Sadcat.sol/Sadcat.json";
import SwaperArtifact from "../artifacts/contracts/Swaper.sol/Swaper.json";
import TestCoinArtifact from "../artifacts/contracts/test/TestCoin.sol/TestCoin.json";
import TokenPairArtifact from "../artifacts/contracts/TokenPair.sol/TokenPair.json";
import { Sadcat, Swaper, TokenPair } from "../typechain";
import { FarmFactory } from "../typechain/FarmFactory";
import { TestCoin } from "../typechain/TestCoin";
import { mine } from "./shared/utils/blockchain";
import { expandTo18Decimals } from "./shared/utils/number";
import { getERC20ApprovalDigest } from "./shared/utils/standard";

const { deployContract } = waffle;

describe("FarmFactory", () => {

    let coin1: TestCoin;
    let coin2: TestCoin;
    let coin3: TestCoin;
    let coin4: TestCoin;
    let swaper: Swaper;
    let pair1: TokenPair;
    let pair2: TokenPair;

    let factory: FarmFactory;
    let reward: Sadcat;

    const provider = waffle.provider;
    const [admin] = provider.getWallets();

    beforeEach(async () => {

        coin1 = await deployContract(
            admin,
            TestCoinArtifact,
            []
        ) as TestCoin;
        coin2 = await deployContract(
            admin,
            TestCoinArtifact,
            []
        ) as TestCoin;
        coin3 = await deployContract(
            admin,
            TestCoinArtifact,
            []
        ) as TestCoin;
        coin4 = await deployContract(
            admin,
            TestCoinArtifact,
            []
        ) as TestCoin;
        swaper = await deployContract(
            admin,
            SwaperArtifact,
            []
        ) as Swaper;

        const amount1 = expandTo18Decimals(120)
        const amount2 = expandTo18Decimals(100)
        const amount3 = expandTo18Decimals(120)
        const amount4 = expandTo18Decimals(100)

        await coin1.approve(swaper.address, amount1);
        await coin2.approve(swaper.address, amount2);
        await coin3.approve(swaper.address, amount3);
        await coin4.approve(swaper.address, amount4);

        await expect(swaper.addLiquidity(admin.address, coin1.address, amount1, coin2.address, amount2))
            .to.emit(swaper, "CreatePair")

        await expect(swaper.addLiquidity(admin.address, coin3.address, amount3, coin4.address, amount4))
            .to.emit(swaper, "CreatePair")

        const pairAddress1 = await swaper.getPair(coin1.address, coin2.address);
        pair1 = (new Contract(pairAddress1, TokenPairArtifact.abi, provider) as TokenPair).connect(admin);

        const pairAddress2 = await swaper.getPair(coin3.address, coin4.address);
        pair2 = (new Contract(pairAddress2, TokenPairArtifact.abi, provider) as TokenPair).connect(admin);

        factory = await deployContract(
            admin,
            FarmFactoryArtifact,
            [100, (await provider.getBlockNumber()) + 100]
        ) as FarmFactory;

        reward = (new Contract(await factory.sadcat(), SadcatArtifact.abi, provider) as Sadcat).connect(admin);
    })

    context("new FarmFactory", async () => {
        it("add/deposit", async () => {

            await expect(factory.add(pair1.address, 100))
                .to.emit(factory, "Add")
                .withArgs(pair1.address, 100)

            await pair1.approve(factory.address, 100);

            await expect(factory.deposit(0, 100))
                .to.emit(factory, "Deposit")
                .withArgs(admin.address, 0, 100)

            await mine(83)
            await factory.deposit(0, 0);
            expect(await reward.balanceOf(admin.address)).to.equal(0)

            await mine(5)
            await factory.deposit(0, 0);
            expect(await reward.balanceOf(admin.address)).to.equal(0)

            await mine(4)
            await factory.deposit(0, 0);
            expect(await reward.balanceOf(admin.address)).to.equal(0)

            await mine(1)
            await factory.deposit(0, 0);
            expect(await reward.balanceOf(admin.address)).to.equal(110) // +10%

            await mine(3)
            await factory.deposit(0, 0);
            expect(await reward.balanceOf(admin.address)).to.equal(550) // +10%
        });

        it("deposit with permit", async () => {

            await factory.add(pair1.address, 100);

            const nonce = await pair1.nonces(admin.address)
            const deadline = constants.MaxUint256
            const digest = await getERC20ApprovalDigest(
                pair1,
                { owner: admin.address, spender: factory.address, value: BigNumber.from(100) },
                nonce,
                deadline
            )

            const { v, r, s } = ecsign(Buffer.from(digest.slice(2), "hex"), Buffer.from(admin.privateKey.slice(2), "hex"))

            await expect(factory.depositWithPermit(0, 100, deadline, v, r, s))
                .to.emit(factory, "Deposit")
                .withArgs(admin.address, 0, 100)

            await mine(84)
            await factory.deposit(0, 0);
            expect(await reward.balanceOf(admin.address)).to.equal(0)

            await mine(5)
            await factory.deposit(0, 0);
            expect(await reward.balanceOf(admin.address)).to.equal(0)

            await mine(4)
            await factory.deposit(0, 0);
            expect(await reward.balanceOf(admin.address)).to.equal(0)

            await mine(1)
            await factory.deposit(0, 0);
            expect(await reward.balanceOf(admin.address)).to.equal(110) // +10%

            await mine(3)
            await factory.deposit(0, 0);
            expect(await reward.balanceOf(admin.address)).to.equal(550) // +10%
        });

        it("deposit with permit max", async () => {

            await factory.add(pair1.address, 100);

            const nonce = await pair1.nonces(admin.address)
            const deadline = constants.MaxUint256
            const digest = await getERC20ApprovalDigest(
                pair1,
                { owner: admin.address, spender: factory.address, value: constants.MaxUint256 },
                nonce,
                deadline
            )

            const { v, r, s } = ecsign(Buffer.from(digest.slice(2), "hex"), Buffer.from(admin.privateKey.slice(2), "hex"))

            await expect(factory.depositWithPermitMax(0, 100, deadline, v, r, s))
                .to.emit(factory, "Deposit")
                .withArgs(admin.address, 0, 100)

            await mine(84)
            await factory.deposit(0, 0);
            expect(await reward.balanceOf(admin.address)).to.equal(0)

            await mine(5)
            await factory.deposit(0, 0);
            expect(await reward.balanceOf(admin.address)).to.equal(0)

            await mine(4)
            await factory.deposit(0, 0);
            expect(await reward.balanceOf(admin.address)).to.equal(0)

            await mine(1)
            await factory.deposit(0, 0);
            expect(await reward.balanceOf(admin.address)).to.equal(110) // +10%

            await mine(3)
            await factory.deposit(0, 0);
            expect(await reward.balanceOf(admin.address)).to.equal(550) // +10%
        });

        it("withdraw", async () => {

            await factory.add(pair1.address, 100);
            await pair1.approve(factory.address, 100);
            await factory.deposit(0, 100);

            await mine(83)
            await factory.deposit(0, 0);
            expect(await reward.balanceOf(admin.address)).to.equal(0)

            await mine(5)
            await factory.deposit(0, 0);
            expect(await reward.balanceOf(admin.address)).to.equal(0)

            await mine(4)
            await factory.deposit(0, 0);
            expect(await reward.balanceOf(admin.address)).to.equal(0)

            await mine(1)
            await factory.deposit(0, 0);
            expect(await reward.balanceOf(admin.address)).to.equal(110) // +10%

            await expect(factory.withdraw(0, 100))
                .to.emit(factory, "Withdraw")
                .withArgs(admin.address, 0, 100)

            await mine(2)
            await factory.deposit(0, 0);
            expect(await reward.balanceOf(admin.address)).to.equal(220) // +10%
        });

        it("add twice", async () => {

            await factory.add(pair1.address, 100);
            await factory.add(pair2.address, 100);
            await pair1.approve(factory.address, 100);
            await factory.deposit(0, 100);

            await mine(82)
            await factory.deposit(0, 0);
            expect(await reward.balanceOf(admin.address)).to.equal(0)

            await mine(5)
            await factory.deposit(0, 0);
            expect(await reward.balanceOf(admin.address)).to.equal(0)

            await mine(4)
            await factory.deposit(0, 0);
            expect(await reward.balanceOf(admin.address)).to.equal(0)

            await mine(1)
            await factory.deposit(0, 0);
            expect(await reward.balanceOf(admin.address)).to.equal(55) // +10%

            await mine(3)
            await factory.deposit(0, 0);
            expect(await reward.balanceOf(admin.address)).to.equal(275) // +10%
        });

        it("set", async () => {

            await factory.add(pair1.address, 100);
            await factory.add(pair2.address, 100);
            await pair1.approve(factory.address, 100);
            await factory.deposit(0, 100);

            await mine(82)
            await factory.deposit(0, 0);
            expect(await reward.balanceOf(admin.address)).to.equal(0)

            await mine(5)
            await factory.deposit(0, 0);
            expect(await reward.balanceOf(admin.address)).to.equal(0)

            await mine(4)
            await factory.deposit(0, 0);
            expect(await reward.balanceOf(admin.address)).to.equal(0)

            await mine(1)
            await factory.deposit(0, 0);
            expect(await reward.balanceOf(admin.address)).to.equal(55) // +10%

            await expect(factory.set(1, 200))
                .to.emit(factory, "Set")
                .withArgs(1, 200)

            await mine(2)
            await factory.deposit(0, 0);
            expect(await reward.balanceOf(admin.address)).to.equal(220) // +10%
        });
    })
})