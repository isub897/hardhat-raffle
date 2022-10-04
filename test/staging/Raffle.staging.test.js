const { expect } = require("chai")
const { network, ethers, getNamedAccounts } = require("hardhat")
const {
    developmentChains,
    networkConfig,
} = require("../../helper-hardhat-config")

developmentChains.includes(network.config.chainId)
    ? describe.skip
    : describe("Raffle", () => {
          let raffle, deployer, sendValue
          beforeEach(async () => {
              deployer = (await getNamedAccounts()).deployer
              raffle = await ethers.getContract("Raffle", deployer)
              sendValue = await raffle.getEntryFee()
          })

          describe("fulfillRandomWords", () => {
              it("Selects a winner, Reopens the raffle state, empty players array, updates timestamp, send the winnings", async () => {
                  console.log("Setting up the test...")
                  const lastTimeStamp = await raffle.getLastTimeStamp()

                  console.log("Setting up listener...")
                  await new Promise(async (resolve, reject) => {
                      raffle.once("WinnerPicked", async () => {
                          console.log("Winner Picked Event Fired!")
                          try {
                              console.log("Getting Variables for testing...")
                              const recentWinner =
                                  await raffle.getRecentWinner()
                              const raffleState = await raffle.getRaffleState()
                              const newLastTimeStamp =
                                  await raffle.getLastTimeStamp()
                              const numberOfPlayers =
                                  await raffle.getNumberOfPlayers()
                              const winnerBalanceAfter =
                                  await ethers.provider.getBalance(deployer)
                              const lotteryBalanceAfter =
                                  await ethers.provider.getBalance(
                                      raffle.address
                                  )
                              console.log("FINAL STAGE: testing variables...")
                              expect(recentWinner).to.equal(deployer)
                              expect(raffleState).to.equal(0)
                              expect(newLastTimeStamp).to.be.above(
                                  lastTimeStamp
                              )
                              expect(numberOfPlayers).to.equal(0)
                              expect(
                                  winnerBalanceAfter.sub(winnerBalanceBefore)
                              ).to.equal(
                                  lotteryBalanceBefore.sub(lotteryBalanceAfter)
                              )
                              resolve()
                          } catch (err) {
                              console.log(err)
                              reject(err)
                          }
                      })
                      console.log("Entering Raffle...")
                      const tx = await raffle.enterRaffle({ value: sendValue })
                      await tx.wait(1)
                      console.log("Ok, time to wait...")
                      const winnerBalanceBefore =
                          await ethers.provider.getBalance(deployer)
                      const lotteryBalanceBefore =
                          await ethers.provider.getBalance(raffle.address)
                  })
              })
          })
      })
