import { Contract } from "@ethersproject/contracts";
import { expect } from "chai";
import { ecsign } from "ethereumjs-util";
import { BigNumber, constants } from "ethers";
import { waffle } from "hardhat";
import SwaperArtifact from "../artifacts/contracts/Swaper.sol/Swaper.json";
import TestCoinArtifact from "../artifacts/contracts/test/TestCoin.sol/TestCoin.json";
import TokenPairArtifact from "../artifacts/contracts/TokenPair.sol/TokenPair.json";
import { TokenPair } from "../typechain";
import { Swaper } from "../typechain/Swaper";
import { TestCoin } from "../typechain/TestCoin";
import { expandTo18Decimals } from "./shared/utils/number";
import { getERC20ApprovalDigest } from "./shared/utils/standard";

const { deployContract } = waffle;

describe("Swaper", () => {

    let coin1: TestCoin;
    let coin2: TestCoin;
    let coin3: TestCoin;
    let swaper: Swaper;

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
        swaper = await deployContract(
            admin,
            SwaperArtifact,
            []
        ) as Swaper;
    })

    context("new Swaper", async () => {
        it("add liquidity", async () => {
            const amount1 = expandTo18Decimals(120)
            const amount2 = expandTo18Decimals(100)

            await coin1.approve(swaper.address, amount1);
            await coin2.approve(swaper.address, amount2);

            await expect(swaper.addLiquidity(admin.address, coin1.address, amount1, coin2.address, amount2))
                .to.emit(swaper, "CreatePair")

            const pairAddress = await swaper.getPair(coin1.address, coin2.address);
            const pair = new Contract(pairAddress, TokenPairArtifact.abi, provider) as TokenPair;

            expect(await pair.balanceOf(admin.address)).to.eq(BigNumber.from("109544511501033221691"));

            expect(await coin1.balanceOf(pairAddress)).to.eq(amount1);
            expect(await coin2.balanceOf(pairAddress)).to.eq(amount2);

            const amount3 = expandTo18Decimals(10)
            const amount4 = expandTo18Decimals(20)

            await coin1.approve(swaper.address, amount3);
            await coin2.approve(swaper.address, amount4);

            await expect(swaper.addLiquidity(admin.address, coin1.address, amount3, coin2.address, amount4))
                .to.emit(pair, "AddLiquidity")
                .withArgs(
                    admin.address,
                    BigNumber.from("118673220792785990248").sub(BigNumber.from("109544511501033221691")),
                    amount3,
                    amount2.mul(amount3).div(amount1)
                )

            expect(await pair.balanceOf(admin.address)).to.eq(BigNumber.from("118673220792785990248"));

            expect(await coin1.balanceOf(pairAddress)).to.eq(amount1.add(amount3));
            expect(await coin2.balanceOf(pairAddress)).to.eq(amount2.add(amount2.mul(amount3).div(amount1)));
        })

        it("add liquidity with permit", async () => {
            const amount1 = expandTo18Decimals(120)
            const amount2 = expandTo18Decimals(100)

            const deadline = constants.MaxUint256

            const nonce1 = await coin1.nonces(admin.address)
            const nonce2 = await coin2.nonces(admin.address)

            const digest1 = await getERC20ApprovalDigest(
                coin1,
                { owner: admin.address, spender: swaper.address, value: amount1 },
                nonce1,
                deadline
            )
            const digest2 = await getERC20ApprovalDigest(
                coin2,
                { owner: admin.address, spender: swaper.address, value: amount2 },
                nonce2,
                deadline
            )

            const { v: v1, r: r1, s: s1 } = ecsign(Buffer.from(digest1.slice(2), "hex"), Buffer.from(admin.privateKey.slice(2), "hex"))
            const { v: v2, r: r2, s: s2 } = ecsign(Buffer.from(digest2.slice(2), "hex"), Buffer.from(admin.privateKey.slice(2), "hex"))

            await expect(swaper.addLiquidityWithPermit(
                admin.address,
                coin1.address, amount1, coin2.address, amount2,
                deadline,
                v1, r1, s1,
                v2, r2, s2,
            ))
                .to.emit(swaper, "CreatePair")

            const pairAddress = await swaper.getPair(coin1.address, coin2.address);
            const pair = new Contract(pairAddress, TokenPairArtifact.abi, provider) as TokenPair;

            expect(await pair.balanceOf(admin.address)).to.eq(BigNumber.from("109544511501033221691"));

            expect(await coin1.balanceOf(pairAddress)).to.eq(amount1);
            expect(await coin2.balanceOf(pairAddress)).to.eq(amount2);

            const amount3 = expandTo18Decimals(10)
            const amount4 = expandTo18Decimals(20)

            const nonce3 = await coin1.nonces(admin.address)
            const nonce4 = await coin2.nonces(admin.address)

            const digest3 = await getERC20ApprovalDigest(
                coin1,
                { owner: admin.address, spender: swaper.address, value: amount3 },
                nonce3,
                deadline
            )
            const digest4 = await getERC20ApprovalDigest(
                coin2,
                { owner: admin.address, spender: swaper.address, value: amount4 },
                nonce4,
                deadline
            )

            const { v: v3, r: r3, s: s3 } = ecsign(Buffer.from(digest3.slice(2), "hex"), Buffer.from(admin.privateKey.slice(2), "hex"))
            const { v: v4, r: r4, s: s4 } = ecsign(Buffer.from(digest4.slice(2), "hex"), Buffer.from(admin.privateKey.slice(2), "hex"))

            await expect(swaper.addLiquidityWithPermit(
                admin.address,
                coin1.address, amount3, coin2.address, amount4,
                deadline,
                v3, r3, s3,
                v4, r4, s4,
            ))
                .to.emit(pair, "AddLiquidity")
                .withArgs(
                    admin.address,
                    BigNumber.from("118673220792785990248").sub(BigNumber.from("109544511501033221691")),
                    amount3,
                    amount2.mul(amount3).div(amount1)
                )

            expect(await pair.balanceOf(admin.address)).to.eq(BigNumber.from("118673220792785990248"));

            expect(await coin1.balanceOf(pairAddress)).to.eq(amount1.add(amount3));
            expect(await coin2.balanceOf(pairAddress)).to.eq(amount2.add(amount2.mul(amount3).div(amount1)));
        })

        it("subtract liquidity", async () => {
            const amount1 = expandTo18Decimals(120)
            const amount2 = expandTo18Decimals(100)

            await coin1.approve(swaper.address, amount1);
            await coin2.approve(swaper.address, amount2);

            await swaper.addLiquidity(admin.address, coin1.address, amount1, coin2.address, amount2)

            const pairAddress = await swaper.getPair(coin1.address, coin2.address);
            const pair = new Contract(pairAddress, TokenPairArtifact.abi, provider) as TokenPair;

            const liquidity = expandTo18Decimals(10)
            await expect(swaper.subtractLiquidity(admin.address, coin1.address, coin2.address, liquidity))
                .to.emit(pair, "SubtractLiquidity")

            expect(await pair.balanceOf(admin.address)).to.eq(BigNumber.from("99544511501033221691"));
        })

        it("swap", async () => {
            const amount1 = expandTo18Decimals(120)
            const amount2 = expandTo18Decimals(100)

            await coin1.approve(swaper.address, amount1);
            await coin2.approve(swaper.address, amount2);

            await swaper.addLiquidity(admin.address, coin1.address, amount1, coin2.address, amount2)

            const pairAddress = await swaper.getPair(coin1.address, coin2.address);
            const pair = new Contract(pairAddress, TokenPairArtifact.abi, provider) as TokenPair;

            const swapAmount = expandTo18Decimals(20)
            await coin1.approve(swaper.address, swapAmount);
            await expect(swaper.swap([coin1.address, coin2.address], swapAmount, 0))
                .to.emit(pair, "Swap1")
        })

        it("swap with permit", async () => {
            const amount1 = expandTo18Decimals(120)
            const amount2 = expandTo18Decimals(100)

            await coin1.approve(swaper.address, amount1);
            await coin2.approve(swaper.address, amount2);

            await swaper.addLiquidity(admin.address, coin1.address, amount1, coin2.address, amount2)

            const pairAddress = await swaper.getPair(coin1.address, coin2.address);
            const pair = new Contract(pairAddress, TokenPairArtifact.abi, provider) as TokenPair;

            const swapAmount = expandTo18Decimals(20)

            const nonce = await coin1.nonces(admin.address)
            const deadline = constants.MaxUint256
            const digest = await getERC20ApprovalDigest(
                coin1,
                { owner: admin.address, spender: swaper.address, value: swapAmount },
                nonce,
                deadline
            )

            const { v, r, s } = ecsign(Buffer.from(digest.slice(2), "hex"), Buffer.from(admin.privateKey.slice(2), "hex"))

            await expect(swaper.swapWithPermit(
                [coin1.address, coin2.address], swapAmount, 0,
                deadline, v, r, s
            ))
                .to.emit(pair, "Swap1")
        })

        it("swap 2 level", async () => {
            const amount1 = expandTo18Decimals(120)
            const amount2 = expandTo18Decimals(50)
            const amount3 = expandTo18Decimals(50)
            const amount4 = expandTo18Decimals(80)

            await coin1.approve(swaper.address, amount1);
            await coin2.approve(swaper.address, amount2.add(amount3));
            await coin3.approve(swaper.address, amount4);

            await swaper.addLiquidity(admin.address, coin1.address, amount1, coin2.address, amount2)
            await swaper.addLiquidity(admin.address, coin2.address, amount3, coin3.address, amount4)

            const pair1Address = await swaper.getPair(coin1.address, coin2.address);
            const pair1 = new Contract(pair1Address, TokenPairArtifact.abi, provider) as TokenPair;

            const pair2Address = await swaper.getPair(coin2.address, coin3.address);
            const pair2 = new Contract(pair2Address, TokenPairArtifact.abi, provider) as TokenPair;

            console.log((await coin3.balanceOf(admin.address)).toString());

            const swapAmount = expandTo18Decimals(20)
            await coin1.approve(swaper.address, swapAmount);
            await expect(swaper.swap([coin1.address, coin2.address, coin3.address], swapAmount, 0))
                .to.emit(pair1, "Swap1")
                .to.emit(pair2, "Swap1")

            console.log((await coin3.balanceOf(admin.address)).toString());
        })
    })
})