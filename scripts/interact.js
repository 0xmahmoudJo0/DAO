// Import contract artifact
const Treasury = artifacts.require("Treasury");

module.exports = async function(callback) {
  try {
    // Load deployed contract instance
    const treasuryInstance = await Treasury.deployed();

    // Get the contract address
    const treasuryAddress = treasuryInstance.address;
    console.log(`Treasury Contract Address: ${treasuryAddress}`);

    // Fetch balance using web3
    const web3 = require('web3');
    const balanceWei = await web3.eth.getBalance(treasuryAddress);
    console.log(`Treasury Balance (Wei): ${balanceWei}`);

    // Convert balance from Wei to Ether
    const balanceEth = web3.utils.fromWei(balanceWei, 'ether');
    console.log(`Treasury Balance (Ether): ${balanceEth}`);
    
  } catch (error) {
    console.error(error);
  }
  callback();
};
