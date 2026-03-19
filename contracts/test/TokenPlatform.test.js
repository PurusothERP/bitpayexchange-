import { expect } from "chai";
import pkg from "hardhat";
const { ethers } = pkg;

describe("Token Launch Platform", function () {
    let TokenFactory;
    let factory;
    let owner;
    let addr1;
    let addr2;

    beforeEach(async function () {
        [owner, addr1, addr2] = await ethers.getSigners();
        TokenFactory = await ethers.getContractFactory("TokenFactory");
        factory = await TokenFactory.deploy();
        await factory.waitForDeployment();
    });

    describe("TokenFactory", function () {
        it("Should create a new token", async function () {
            const name = "Test Token";
            const symbol = "TST";
            const supply = 1000000;

            const tx = await factory.createToken(name, symbol, supply, owner.address);
            await tx.wait();

            const tokens = await factory.getAllTokens();
            expect(tokens.length).to.equal(1);
        });

        it("Should track tokens by owner", async function () {
            await factory.createToken("Token 1", "TK1", 1000, addr1.address);
            const tokens = await factory.getTokensByOwner(addr1.address);
            expect(tokens.length).to.equal(1);
        });
    });

    describe("TokenTemplate", function () {
        let tokenAddress;
        let token;

        beforeEach(async function () {
            const tx = await factory.createToken("Test Token", "TST", 1000000, owner.address);
            await tx.wait();
            tokenAddress = (await factory.getAllTokens())[0];
            token = await ethers.getContractAt("TokenTemplate", tokenAddress);
        });

        it("Should have correct initial supply", async function () {
            const supply = await token.totalSupply();
            expect(supply).to.equal(ethers.parseUnits("1000000", 18));
        });

        it("Should not allow trading initially", async function () {
            // Owner can transfer
            await token.connect(owner).transfer(addr1.address, 100);

            // addr1 cannot transfer to addr2
            try {
                await token.connect(addr1).transfer(addr2.address, 50);
                expect.fail("Should have reverted");
            } catch (error) {
                expect(error.message).to.contain("Trading not enabled");
            }
        });

        it("Should allow trading after being enabled", async function () {
            await token.enableTrading();
            await token.connect(owner).transfer(addr1.address, 1000);
            await token.connect(addr1).transfer(addr2.address, 100);
            const balance = await token.balanceOf(addr2.address);
            expect(balance).to.equal(100);
        });

        it("Should enforce max transaction amount", async function () {
            await token.enableTrading();
            const maxTx = await token.maxTxAmount();
            const exceedingAmount = maxTx + 1n;

            await token.connect(owner).transfer(addr1.address, exceedingAmount + 1000n);

            try {
                await token.connect(addr1).transfer(addr2.address, exceedingAmount);
                expect.fail("Should have reverted");
            } catch (error) {
                expect(error.message).to.contain("Exceeds max transaction amount");
            }
        });
    });
});
