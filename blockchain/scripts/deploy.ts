import { ethers } from "hardhat";

async function main() {
  const MandaToken = await ethers.getContractFactory("MandaToken");
  const mandaToken = await MandaToken.deploy();

  await mandaToken.waitForDeployment();

  const contractAddress = await mandaToken.getAddress();
  console.log(`MandaToken deployed to: ${contractAddress}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
