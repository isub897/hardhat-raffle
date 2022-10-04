const { getNamedAccounts, deployments, network, ethers } = require("hardhat")
const {
    networkConfig,
    developmentChains,
    UPDATE_INTERVAL,
} = require("../helper-hardhat-config.js")
const { verify } = require("../utils/verify")

module.exports = async () => {
    const { deploy } = deployments
    const { deployer } = await getNamedAccounts()
    const chainId = network.config.chainId

    let vrfCoordinator, vrfMockContract, subscriptionId
    if (developmentChains.includes(chainId)) {
        // get args from a mock contract or test
        vrfMockContract = await ethers.getContract("VRFCoordinatorV2Mock")
        vrfCoordinator = vrfMockContract.address
        let txResponse = await vrfMockContract.createSubscription()
        const txReceipt = await txResponse.wait(1)
        subscriptionId = txReceipt.events[0].args.subId
        await vrfMockContract.fundSubscription(
            subscriptionId,
            ethers.utils.parseEther("1")
        )
    } else {
        vrfCoordinator = networkConfig[chainId]["vrfCoordinator"]
        subscriptionId = networkConfig[chainId]["subscriptionId"]
    }

    const args = [
        networkConfig[chainId]["entryFee"],
        vrfCoordinator,
        networkConfig[chainId]["gasLane"],
        subscriptionId,
        networkConfig[chainId]["callbackGasLimit"],
        UPDATE_INTERVAL,
    ] //  check the constructor
    // console.log("Deploying Raffle")
    // console.log("----------------------------------")
    const raffle = await deploy("Raffle", {
        from: deployer,
        args: args,
        log: true,
        waitComfirmations: network.config.blockConfirmations || 1,
    })
    // console.log("----------------------------------")
    // console.log("Raffle Deployed.")

    if (developmentChains.includes(chainId)) {
        vrfMockContract.addConsumer(subscriptionId, raffle.address)
    }

    if (!developmentChains.includes(chainId)) {
        await verify(raffle.address, args)
    }
}

module.exports.tags = ["all", "raffle"]
