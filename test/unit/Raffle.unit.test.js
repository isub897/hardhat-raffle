const { expect } = require("chai")
const { ethers, network, deployments, getNamedAccounts } = require("hardhat")
const {
    networkConfig,
    developmentChains,
    UPDATE_INTERVAL,
} = require("../../helper-hardhat-config.js")
const { subscriptionId } = require("../../deploy/01-deploy-raffle")

!developmentChains.includes(network.config.chainId)
    ? describe.skip
    : describe("Raffle", function () {
          const chainId = network.config.chainId
          const sendValue = ethers.utils.parseEther("0.01")
          let raffle, deployer, mockVRF
          beforeEach(async function () {
              await deployments.fixture(["all"])
              deployer = (await getNamedAccounts()).deployer
              raffle = await ethers.getContract("Raffle", deployer)
              mockVRF = await ethers.getContract(
                  "VRFCoordinatorV2Mock",
                  deployer
              )
          })

          describe("constructor", function () {
              it("Should initialize with correct entry fee", async function () {
                  expect(await raffle.getEntryFee()).to.equal(
                      networkConfig[chainId]["entryFee"]
                  )
              })
              it("Should initialize with correct VRF Coordinator", async function () {
                  expect(await raffle.getVRFCoordinator()).to.equal(
                      mockVRF.address
                  )
              })
              it("Should initialize with correct gas lane", async function () {
                  expect(await raffle.getGasLane()).to.equal(
                      networkConfig[chainId]["gasLane"]
                  )
              })
              it("Should Initialize with correct Subscription ID", async function () {
                  expect(await raffle.getSubId()).to.equal("1") // mock subcscription ID always = 1
              })
              it("Should Initialized with correct callback gas limit", async function () {
                  const response = await raffle.getCallbackGasLimit()
                  expect(response.toString()).to.equal(
                      networkConfig[chainId]["callbackGasLimit"]
                  )
              })
              it("Should initialize with the correct time stamp", async function () {
                  expect(
                      (await raffle.getLastTimeStamp()).toString().slice(0, 7)
                  ).to.equal(Date.now().toString().slice(0, 7))
                  // converted both types to string and cut down the number of digits to equal
              })
              it("Should initialize with the correct update interval", async function () {
                  expect(await raffle.getInterval()).to.equal(UPDATE_INTERVAL)
              })
              it("Should initialize with the correct raffle state", async function () {
                  expect(await raffle.getRaffleState()).to.equal(0) // 0 is OPEN raffle state in uin256
              })
          })

          describe("enterRaffle", function () {
              it("Should revert if entry fee amount is not met", async function () {
                  await expect(
                      raffle.enterRaffle()
                  ).to.be.revertedWithCustomError(raffle, "Raffle__NotEnough")
              })
              it("Should add player to array upon entry", async function () {
                  const txResopnse = await raffle.enterRaffle({
                      value: sendValue,
                  })
                  expect(await raffle.getPlayer(0)).to.equal(deployer)
              })
              it("Should emit an event upon raffle entry", async function () {
                  await expect(raffle.enterRaffle({ value: sendValue }))
                      .to.emit(raffle, "RaffleEnter")
                      .withArgs(deployer)
              })
              it("Should revert if raffle state is calculating", async function () {
                  await raffle.enterRaffle({ value: sendValue })
                  await network.provider.send("evm_increaseTime", [
                      Number(UPDATE_INTERVAL) + 1,
                  ])
                  await network.provider.send("evm_mine", [])
                  await raffle.performUpkeep([])
                  await expect(
                      raffle.enterRaffle({ value: sendValue })
                  ).to.be.revertedWithCustomError(raffle, "Raffle__NotOpen")
              })
          })

          describe("checkUpkeep", function () {
              it("upkeepNeeded should return false if there are no players", async function () {
                  await network.provider.send("evm_increaseTime", [
                      Number(UPDATE_INTERVAL) + 1,
                  ])
                  await network.provider.send("evm_mine", [])
                  expect((await raffle.checkUpkeep([]))[0]).to.equal(false)
              })
              it("upkeepNeeded should return false if the update if interval condition not met", async function () {
                  await raffle.enterRaffle({ value: sendValue })
                  expect((await raffle.checkUpkeep([]))[0]).to.equal(false)
              })
              it("upkeepNeeded should return false if the update raffle state is calculating", async function () {
                  await raffle.enterRaffle({ value: sendValue })
                  await network.provider.send("evm_increaseTime", [
                      Number(UPDATE_INTERVAL) + 1,
                  ])
                  await network.provider.send("evm_mine", [])
                  const txResponse = await raffle.performUpkeep([])
                  const txReceipt = txResponse.wait(1)
                  expect((await raffle.checkUpkeep([]))[0]).to.equal(false)
              })
              it("upkeepNeeded should return true if all bool conditions are met", async function () {
                  await raffle.enterRaffle({ value: sendValue })
                  await network.provider.send("evm_increaseTime", [
                      Number(UPDATE_INTERVAL) + 1,
                  ])
                  await network.provider.send("evm_mine", [])
                  expect((await raffle.checkUpkeep([]))[0]).to.equal(true)
              })
          })

          describe("performUpkeep", function () {
              beforeEach(async function () {
                  await raffle.enterRaffle({ value: sendValue })
                  await network.provider.send("evm_increaseTime", [
                      Number(UPDATE_INTERVAL) + 1,
                  ])
                  await network.provider.send("evm_mine", [])
              })
              it("Should revert if upkeepNeeded returns false", async function () {
                  const txResponse = await raffle.performUpkeep([])
                  const txReceipt = await txResponse.wait(1)
                  await expect(
                      raffle.performUpkeep([])
                  ).to.be.revertedWithCustomError(
                      raffle,
                      "Raffle__UpkeepNotNeeded"
                  )
              })
              it("Should set the raffle state to CALCULATING", async function () {
                  const txResponse = await raffle.performUpkeep([])
                  const txReceipt = await txResponse.wait(1)
                  expect(await raffle.getRaffleState()).to.equal(1)
              })
              it("Should emit an event RandomWinnerRequest", async function () {
                  await expect(raffle.performUpkeep([])).to.emit(
                      raffle,
                      "RandomWinnerRequest"
                  )
              })
              it("Should produce a request ID", async function () {
                  const txResponse = await raffle.performUpkeep([])
                  const txReceipt = await txResponse.wait(1)
                  const isRequestId = txReceipt.events[1].args.requestId > 0
                  expect(isRequestId).to.equal(true)
              })
          })

          describe("fulfillRandomWords", function () {
              beforeEach(async function () {
                  await raffle.enterRaffle({ value: sendValue })
                  await network.provider.send("evm_increaseTime", [
                      Number(UPDATE_INTERVAL) + 1,
                  ])
                  await network.provider.send("evm_mine", [])
              })
              it("Should error if performUpkeep not called first (requestId)", async function () {
                  // need to write the function for this one
              })
              it("Selects a winner, Reopens the raffle state, updates timestamp, send the winnings", async function () {
                  const accounts = await ethers.getSigners()
                  const numberOfPlayers = 10
                  const firstPlayer = 1

                  for (
                      let i = firstPlayer;
                      i < firstPlayer + numberOfPlayers;
                      i++
                  ) {
                      const playerConnectedContract = await raffle.connect(
                          accounts[i]
                      )
                      await playerConnectedContract.enterRaffle({
                          value: sendValue,
                      })
                  }

                  const recentWinner = await raffle.getRecentWinner()
                  const lastTimeStamp = await raffle.getLastTimeStamp()
                  const winnerBalanceBefore = await ethers.provider.getBalance(
                      accounts[10].address
                  )
                  const lotteryBalanceBefore = await ethers.provider.getBalance(
                      raffle.address
                  )

                  await new Promise(async (resolve, reject) => {
                      raffle.once("WinnerPicked", async () => {
                          try {
                              const newRecentWinner =
                                  await raffle.getRecentWinner()
                              const winnerBalanceAfter =
                                  await ethers.provider.getBalance(
                                      accounts[10].address
                                  )
                              const lotteryBalanceAfter =
                                  await ethers.provider.getBalance(
                                      raffle.address
                                  )
                              expect(
                                  await raffle.getRecentWinner()
                              ).to.not.equal(recentWinner)
                              expect(await raffle.getRecentWinner()).to.equal(
                                  newRecentWinner
                              )
                              expect(await raffle.getRaffleState()).to.equal(0)
                              expect(
                                  await raffle.getLastTimeStamp()
                              ).to.be.above(lastTimeStamp)
                              expect(
                                  await raffle.getNumberOfPlayers()
                              ).to.equal(0)
                              expect(await raffle.getRecentWinner()).to.equal(
                                  accounts[10].address
                              )
                              expect(
                                  winnerBalanceAfter.sub(winnerBalanceBefore)
                              ).to.equal(
                                  lotteryBalanceBefore.sub(lotteryBalanceAfter)
                              )
                              resolve()
                          } catch (err) {
                              reject(err)
                          }
                      })
                      const txResponse = await raffle.performUpkeep([])
                      const txReceipt = await txResponse.wait(1)
                      const requestId = txReceipt.events[1].args.requestId
                      await mockVRF.fulfillRandomWords(
                          requestId,
                          raffle.address
                      )
                  })
              })
          })
      })
