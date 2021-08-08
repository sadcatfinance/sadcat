import { Contract } from "@ethersproject/contracts";
import { expect } from "chai";
import { ecsign } from "ethereumjs-util";
import { constants } from "ethers";
import { waffle } from "hardhat";
import POPSwaperArtifact from "../artifacts/contracts/POPSwaper.sol/POPSwaper.json";
import SwaperArtifact from "../artifacts/contracts/Swaper.sol/Swaper.json";
import TestCoinArtifact from "../artifacts/contracts/test/TestCoin.sol/TestCoin.json";
import TokenPairArtifact from "../artifacts/contracts/TokenPair.sol/TokenPair.json";
import WPOPArtifact from "../artifacts/contracts/WPOP.sol/WPOP.json";
import { Swaper, TokenPair, WPOP } from "../typechain";
import { POPSwaper } from "../typechain/POPSwaper";
import { TestCoin } from "../typechain/TestCoin";
import { expandTo18Decimals } from "./shared/utils/number";
import { getERC20ApprovalDigest } from "./shared/utils/standard";

const { deployContract } = waffle;

describe("POPSwaper", () => {

    let coin1: TestCoin;
    let coin2: TestCoin;
    let swaper: Swaper;
    let ethSwaper: POPSwaper;
    let weth: WPOP;

    const provider = waffle.provider;
    const [admin] = provider.getWallets();

    beforeEach(async () => {
        coin1 = await deployContract(
            admin,
            TestCoinArtifact,
            []
        ) as TestCoin;
        swaper = await deployContract(
            admin,
            SwaperArtifact,
            []
        ) as Swaper;
        ethSwaper = await deployContract(
            admin,
            POPSwaperArtifact,
            [swaper.address]
        ) as POPSwaper;
        weth = new Contract(await ethSwaper.weth(), WPOPArtifact.abi, provider) as WPOP;
    })

    context("new POPSwaper", async () => {
        it("add liquidity", async () => {

            const tokenAmount1 = expandTo18Decimals(120)
            const ethAmount1 = expandTo18Decimals(1)

            await coin1.approve(ethSwaper.address, tokenAmount1);

            await expect(ethSwaper.addLiquidity(admin.address, coin1.address, tokenAmount1, { value: ethAmount1 }))
                .to.emit(swaper, "CreatePair")

            const pairAddress = await swaper.getPair(coin1.address, weth.address);
            const pair = new Contract(pairAddress, TokenPairArtifact.abi, provider) as TokenPair;

            expect(await coin1.balanceOf(pairAddress)).to.eq(tokenAmount1);
            expect(await weth.balanceOf(pairAddress)).to.eq(ethAmount1);

            const tokenAmount2 = expandTo18Decimals(10)
            const ethAmount2 = expandTo18Decimals(2)

            await coin1.approve(ethSwaper.address, tokenAmount2);

            await expect(ethSwaper.addLiquidity(admin.address, coin1.address, tokenAmount2, { value: ethAmount2 }))
                .to.emit(pair, "AddLiquidity")

            expect(await coin1.balanceOf(pairAddress)).to.eq(tokenAmount1.add(tokenAmount2));
            expect(await weth.balanceOf(pairAddress)).to.eq(ethAmount1.add(ethAmount1.mul(tokenAmount2).div(tokenAmount1)));
        })

        it("add liquidity with permit", async () => {

            const tokenAmount1 = expandTo18Decimals(120)
            const ethAmount1 = expandTo18Decimals(1)

            const deadline = constants.MaxUint256

            const nonce1 = await coin1.nonces(admin.address)

            const digest1 = await getERC20ApprovalDigest(
                coin1,
                { owner: admin.address, spender: ethSwaper.address, value: tokenAmount1 },
                nonce1,
                deadline
            )

            const { v: v1, r: r1, s: s1 } = ecsign(Buffer.from(digest1.slice(2), "hex"), Buffer.from(admin.privateKey.slice(2), "hex"))

            await expect(ethSwaper.addLiquidityWithPermit(
                admin.address,
                coin1.address, tokenAmount1,
                deadline,
                v1, r1, s1,
                { value: ethAmount1 },
            ))
                .to.emit(swaper, "CreatePair")

            const pairAddress = await swaper.getPair(coin1.address, weth.address);
            const pair = new Contract(pairAddress, TokenPairArtifact.abi, provider) as TokenPair;

            expect(await coin1.balanceOf(pairAddress)).to.eq(tokenAmount1);
            expect(await weth.balanceOf(pairAddress)).to.eq(ethAmount1);

            const tokenAmount2 = expandTo18Decimals(10)
            const ethAmount2 = expandTo18Decimals(2)

            const nonce2 = await coin1.nonces(admin.address)

            const digest2 = await getERC20ApprovalDigest(
                coin1,
                { owner: admin.address, spender: ethSwaper.address, value: tokenAmount2 },
                nonce2,
                deadline
            )

            const { v: v2, r: r2, s: s2 } = ecsign(Buffer.from(digest2.slice(2), "hex"), Buffer.from(admin.privateKey.slice(2), "hex"))

            await expect(ethSwaper.addLiquidityWithPermit(
                admin.address,
                coin1.address, tokenAmount2,
                deadline,
                v2, r2, s2,
                { value: ethAmount2 },
            ))
                .to.emit(pair, "AddLiquidity")

            expect(await coin1.balanceOf(pairAddress)).to.eq(tokenAmount1.add(tokenAmount2));
            expect(await weth.balanceOf(pairAddress)).to.eq(ethAmount1.add(ethAmount1.mul(tokenAmount2).div(tokenAmount1)));
        })

        it("subtract liquidity", async () => {

            const tokenAmount1 = expandTo18Decimals(120)
            const ethAmount1 = expandTo18Decimals(1)

            await coin1.approve(ethSwaper.address, tokenAmount1);

            await expect(ethSwaper.addLiquidity(admin.address, coin1.address, tokenAmount1, { value: ethAmount1 }))
                .to.emit(swaper, "CreatePair")

            const pairAddress = await swaper.getPair(coin1.address, weth.address);
            const pair = new Contract(pairAddress, TokenPairArtifact.abi, provider) as TokenPair;

            const liquidity = expandTo18Decimals(10)
            await expect(ethSwaper.subtractLiquidity(admin.address, coin1.address, liquidity))
                .to.emit(pair, "SubtractLiquidity")
        })

        it("swap from eth", async () => {

            const tokenAmount1 = expandTo18Decimals(120)
            const ethAmount1 = expandTo18Decimals(2)

            await coin1.approve(ethSwaper.address, tokenAmount1);

            await expect(ethSwaper.addLiquidity(admin.address, coin1.address, tokenAmount1, { value: ethAmount1 }))
                .to.emit(swaper, "CreatePair")

            const pairAddress = await swaper.getPair(coin1.address, weth.address);
            const pair = new Contract(pairAddress, TokenPairArtifact.abi, provider) as TokenPair;

            const swapAmount = expandTo18Decimals(1)
            await expect(ethSwaper.swapFromPOP([coin1.address], 0, { value: swapAmount }))
                .to.emit(pair, "Swap1")
        })

        it("swap to eth", async () => {

            const tokenAmount1 = expandTo18Decimals(120)
            const ethAmount1 = expandTo18Decimals(2)

            await coin1.approve(ethSwaper.address, tokenAmount1);

            await expect(ethSwaper.addLiquidity(admin.address, coin1.address, tokenAmount1, { value: ethAmount1 }))
                .to.emit(swaper, "CreatePair")

            const pairAddress = await swaper.getPair(coin1.address, weth.address);
            const pair = new Contract(pairAddress, TokenPairArtifact.abi, provider) as TokenPair;

            const swapAmount = expandTo18Decimals(20)
            await coin1.approve(ethSwaper.address, swapAmount);
            await expect(ethSwaper.swapToPOP([coin1.address], 0, swapAmount))
                .to.emit(pair, "Swap1")
        })

        it("swap to eth with permit", async () => {

            const tokenAmount1 = expandTo18Decimals(120)
            const ethAmount1 = expandTo18Decimals(2)

            await coin1.approve(ethSwaper.address, tokenAmount1);

            await expect(ethSwaper.addLiquidity(admin.address, coin1.address, tokenAmount1, { value: ethAmount1 }))
                .to.emit(swaper, "CreatePair")

            const pairAddress = await swaper.getPair(coin1.address, weth.address);
            const pair = new Contract(pairAddress, TokenPairArtifact.abi, provider) as TokenPair;

            const swapAmount = expandTo18Decimals(20)

            const nonce = await coin1.nonces(admin.address)
            const deadline = constants.MaxUint256
            const digest = await getERC20ApprovalDigest(
                coin1,
                { owner: admin.address, spender: ethSwaper.address, value: swapAmount },
                nonce,
                deadline
            )

            const { v, r, s } = ecsign(Buffer.from(digest.slice(2), "hex"), Buffer.from(admin.privateKey.slice(2), "hex"))

            await expect(ethSwaper.swapToPOPWithPermit(
                [coin1.address], swapAmount, 0,
                deadline, v, r, s
            ))
                .to.emit(pair, "Swap1")
        })
    })
})