import { expect } from "chai";
import { ethers } from "hardhat";
import { MandaToken } from "../typechain-types";

describe("MandaToken", function () {
  let mandaToken: MandaToken;
  let owner: any;
  let addr1: any;

  beforeEach(async function () {
    const MandaTokenFactory = await ethers.getContractFactory("MandaToken");
    [owner, addr1] = await ethers.getSigners();
    mandaToken = await MandaTokenFactory.deploy();
    await mandaToken.waitForDeployment();
  });

  it("Should have the correct name and symbol", async function () {
    expect(await mandaToken.name()).to.equal("MandaToken");
    expect(await mandaToken.symbol()).to.equal("MDT");
  });

  it("Should mint the total supply to the owner", async function () {
    const ownerBalance = await mandaToken.balanceOf(owner.address);
    const totalSupply = await mandaToken.totalSupply();
    expect(ownerBalance).to.equal(totalSupply);
  });

  it("Should transfer tokens between accounts", async function () {
    // Transfer 1000 tokens from owner to addr1
    await mandaToken.transfer(addr1.address, 1000);
    const addr1Balance = await mandaToken.balanceOf(addr1.address);
    expect(addr1Balance).to.equal(1000);

    // Transfer 500 tokens from addr1 back to owner
    await mandaToken.connect(addr1).transfer(owner.address, 500);
    const ownerBalance = await mandaToken.balanceOf(owner.address);
    const initialSupply = await mandaToken.totalSupply();
    expect(ownerBalance).to.equal(initialSupply - BigInt(500));
  });
});
