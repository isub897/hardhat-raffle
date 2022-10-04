const { ethers } = require("hardhat")

const networkConfig = {
    5: {
        name: "goerli",
        entryFee: ethers.utils.parseEther("0.01"),
        vrfCoordinator: "0x2Ca8E0C643bDe4C2E08ab1fA0da3401AdAD7734D",
        gasLane:
            "0x79d3d8832d904592c0bf9818b621522c988bb8b0c05cdc3b15aea1b6e8db0c15",
        subscriptionId: "3423",
        callbackGasLimit: "500000",
    },
    31337: {
        name: "hardhat",
        entryFee: ethers.utils.parseEther("0.01"),
        gasLane:
            "0x79d3d8832d904592c0bf9818b621522c988bb8b0c05cdc3b15aea1b6e8db0c15",
        callbackGasLimit: "200000",
    },
}

const developmentChains = [31337]

// Raffle Constructor args
const UPDATE_INTERVAL = "30"

// VRFCoordinatorV2Mock Constructor args
const BASE_FEE = ethers.utils.parseEther("0.25") // 0.25 LINK
const GAS_PRICE_LINK = 1e9

module.exports = {
    networkConfig,
    developmentChains,
    BASE_FEE,
    GAS_PRICE_LINK,
    UPDATE_INTERVAL,
}
