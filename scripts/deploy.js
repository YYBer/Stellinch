const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Deploying Base-Stellar Atomic Swap Contracts");
  console.log("===============================================");

  const signers = await ethers.getSigners();
  if (signers.length === 0) {
    throw new Error("No signers available. Please check PRIVATE_KEY in .env file");
  }
  
  const deployer = signers[0];
  console.log("👤 Deploying with account:", deployer.address);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(balance), "ETH");

  // Check network
  const network = await ethers.provider.getNetwork();
  console.log("🌐 Network:", network.name, "Chain ID:", network.chainId.toString());

  try {
    // Deploy EscrowFactory first
    console.log("\n📋 Deploying EscrowFactory...");
    const EscrowFactory = await ethers.getContractFactory("EscrowFactory");
    
    // Constructor parameters for EscrowFactory
    const accessToken = ethers.ZeroAddress; // No access token required
    const owner = deployer.address; // Owner of the factory
    const rescueDelayDst = 86400; // 24 hours in seconds
    const creationFee = 0; // No creation fee
    const treasury = deployer.address; // Treasury for fees
    
    const escrowFactory = await EscrowFactory.deploy(
      accessToken,
      owner,
      rescueDelayDst,
      creationFee,
      treasury
    );
    await escrowFactory.waitForDeployment();
    
    const factoryAddress = await escrowFactory.getAddress();
    console.log("✅ EscrowFactory deployed to:", factoryAddress);

    // Get the implementation address from the factory
    const dstImplementation = await escrowFactory.ESCROW_DST_IMPLEMENTATION();
    console.log("✅ EscrowDst implementation:", dstImplementation);

    // Verify deployment
    console.log("\n🔍 Verifying deployments...");
    
    const accessTokenAddr = await escrowFactory.ACCESS_TOKEN();
    const ownerAddr = await escrowFactory.owner();
    const creationFeeAmount = await escrowFactory.creationFee();
    
    console.log("🔸 Access token:", accessTokenAddr);
    console.log("🔸 Owner:", ownerAddr);
    console.log("🔸 Creation fee:", creationFeeAmount.toString(), "wei");
    
    console.log("\n🎉 DEPLOYMENT SUCCESSFUL!");
    console.log("==========================");
    console.log("📝 Contract Addresses:");
    console.log("   EscrowFactory:", factoryAddress);
    console.log("   EscrowDst Implementation:", dstImplementation);
    console.log("   Network:", network.name);
    console.log("   Chain ID:", network.chainId.toString());
    
    // Save deployment info
    const deploymentInfo = {
      network: network.name,
      chainId: network.chainId.toString(),
      deployer: deployer.address,
      timestamp: new Date().toISOString(),
      contracts: {
        EscrowFactory: factoryAddress,
        EscrowDstImplementation: dstImplementation
      },
      constructorArgs: {
        accessToken,
        owner,
        rescueDelayDst,
        creationFee,
        treasury
      }
    };

    const fs = require('fs');
    const path = require('path');
    
    const deploymentsDir = path.join(__dirname, '..', 'deployments');
    if (!fs.existsSync(deploymentsDir)) {
      fs.mkdirSync(deploymentsDir, { recursive: true });
    }
    
    const deploymentFile = path.join(deploymentsDir, `${network.name}-${network.chainId}.json`);
    fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
    
    console.log("💾 Deployment info saved to:", deploymentFile);
    
    return deploymentInfo;

  } catch (error) {
    console.error("❌ Deployment failed:", error.message);
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });