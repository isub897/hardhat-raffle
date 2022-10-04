const { getNamedAccounts, deployments, network } = require("hardhat")
const {
    BASE_FEE,
    GAS_PRICE_LINK,
    developmentChains,
} = require("../helper-hardhat-config.js")

module.exports = async () => {
    const { deploy } = deployments
    const { deployer } = await getNamedAccounts()

    if (developmentChains.includes(network.config.chainId)) {
        // console.log("Deploying Mocks")
        // console.log("----------------------------------")
        await deploy("VRFCoordinatorV2Mock", {
            from: deployer,
            args: [BASE_FEE, GAS_PRICE_LINK],
            log: true,
        })
        // console.log("----------------------------------")
        // console.log("Mocks Deployed.")
    }
}
module.exports.tags = ["all", "mocks"]
