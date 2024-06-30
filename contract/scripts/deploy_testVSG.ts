import { ethers, run, network } from "hardhat";

async function main() {
  // Get network data from Hardhat config (see hardhat.config.ts).
  const networkName = network.name;
  // Check if the network is supported.
  // if (networkName === "testnet" || networkName === "mainnet")
  {
    console.log(`Deploying to ${networkName} network...`);

    // Compile contracts.
    await run("compile");
    console.log("Compiled contracts...");

    const [deployer] = await ethers.getSigners();
    console.log(
      "Deploying contracts with the account:",
      deployer.address
      );

    const XTAPresale = await ethers.getContractFactory("TestVSGToken");
    console.log('Start Deploying....');
    const presaleContract = await XTAPresale.deploy();
    console.log('Start Deploying1....');

    console.log('balance', await presaleContract.getAddress(), await ethers.provider.getBalance(deployer.address));
    await presaleContract.waitForDeployment();
    
    console.log("deployed to:", presaleContract);
    console.log("deployed Address:", presaleContract.target);

    // console.log("waiting for 6 blocks verification ...")
    // await nft.deploymentTransaction()?.wait(6)

    await run("verify:verify", {
      address: presaleContract.target,
      constructorArguments: [],
    });
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
