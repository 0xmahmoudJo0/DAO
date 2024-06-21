const Token = artifacts.require("Token");
const Timelock = artifacts.require("TimelockController"); // Ensure correct import
const Governance = artifacts.require("Governance");
const Treasury = artifacts.require("Treasury");
const chalk = require('chalk');

module.exports = async function (callback) {
    try {
        // Fetch accounts and assign roles
        const accounts = await web3.eth.getAccounts();
        if (accounts.length < 7) {
            throw new Error("Insufficient accounts provided. Ensure at least 7 accounts are available.");
        }

        const [executor, proposer, voter1, voter2, voter3, voter4, voter5] = accounts;

        // Log accounts for debugging
        console.log(chalk.blue.bold('Accounts:'));
        accounts.forEach(account => {
            console.log(chalk.blue(account));
        });
        console.log(chalk.green.bold(`Executor: ${executor}`));
        console.log(chalk.green.bold(`Proposer: ${proposer}`));
        console.log(chalk.green.bold(`Voters: ${voter1}\n${voter2}\n${voter3}\n${voter4}\n${voter5}`));

        // Deploy Token and delegate votes to voters
        const token = await Token.deployed();
        await token.delegate(voter1, { from: voter1, gas: 500000 });
        await token.delegate(voter2, { from: voter2, gas: 500000 });
        await token.delegate(voter3, { from: voter3, gas: 500000 });
        await token.delegate(voter4, { from: voter4, gas: 500000 });
        await token.delegate(voter5, { from: voter5, gas: 500000 });

        // Deploy Treasury and check initial state
        const treasury = await Treasury.deployed();
        console.log(chalk.yellow.bold(`Initial funds released? ${await treasury.isReleased()}`));
        console.log(chalk.yellow.bold(`Initial treasury balance: ${web3.utils.fromWei(await web3.eth.getBalance(treasury.address), 'ether')} ETH\n`));

        // Deploy Governance contract
        const governance = await Governance.deployed();
        const encodedFunction = treasury.contract.methods.releaseFunds().encodeABI();
        const description = "Release Funds from Treasury";

        // Create Proposal
        const tx = await governance.propose([treasury.address], [0], [encodedFunction], description, { from: proposer, gas: 500000 });
        const proposalId = tx.logs[0].args.proposalId;
        console.log(chalk.magenta.bold(`Created Proposal ID: ${proposalId.toString()}\n`));

        // Log Proposal state and details
        const logProposalDetails = async (id, stateLabel) => {
            const state = await governance.state.call(id);
            console.log(chalk.cyan.bold(`Current state of proposal: ${state.toString()} (${stateLabel})\n`));
            console.log(chalk.cyan(`Proposal created on block: ${await governance.proposalSnapshot.call(id)}`));
            console.log(chalk.cyan(`Proposal deadline on block: ${await governance.proposalDeadline.call(id)}\n`));
        };

        await logProposalDetails(proposalId, "Pending");

        // Voting period: Fast-forward one block to simulate time passage (using transfer as workaround)
        console.log(chalk.blue.bold(`Casting votes...\n`));
        const votes = [1, 1, 1, 0, 2]; // For, For, For, Against, Abstain
        await governance.castVote(proposalId, votes[0], { from: voter1, gas: 500000 });
        await governance.castVote(proposalId, votes[1], { from: voter2, gas: 500000 });
        await governance.castVote(proposalId, votes[2], { from: voter3, gas: 500000 });
        await governance.castVote(proposalId, votes[3], { from: voter4, gas: 500000 });
        await governance.castVote(proposalId, votes[4], { from: voter5, gas: 500000 });

        // Log votes and fast forward block
        const { againstVotes, forVotes, abstainVotes } = await governance.proposalVotes.call(proposalId);
        console.log(chalk.yellow(`Votes For: ${web3.utils.fromWei(forVotes.toString(), 'ether')}`));
        console.log(chalk.yellow(`Votes Against: ${web3.utils.fromWei(againstVotes.toString(), 'ether')}`));
        console.log(chalk.yellow(`Votes Neutral: ${web3.utils.fromWei(abstainVotes.toString(), 'ether')}\n`));

        // Wait for proposal to succeed
        await logProposalDetails(proposalId, "Succeeded");

        // Queue Proposal in Timelock
        const timelock = await Timelock.deployed(); // Ensure TimelockController contract is deployed correctly
        const proposalHash = web3.utils.sha3(description);
        const delay = await timelock.getMinDelay();
        const eta = Math.floor(Date.now() / 1000) + delay.toNumber() + 1; // ETA after minimum delay
        await timelock.queueTransaction(governance.address, 0, encodedFunction, eta, { from: executor }); // Ensure correct function and parameters

        console.log(chalk.green.bold(`Proposal queued in Timelock with ETA: ${eta}`));

        // Wait for proposal to be executable
        await logProposalDetails(proposalId, "Queued");

        // Advance time to after ETA to execute proposal
        await advanceTimeAndBlock(delay.toNumber() + 1);

        // Execute Proposal in Timelock
        await timelock.executeTransaction(governance.address, 0, encodedFunction, eta, { from: executor }); // Ensure correct function and parameters

        console.log(chalk.green.bold(`Proposal executed in Timelock\n`));

        // Final treasury state
        console.log(chalk.green.bold(`Final funds released? ${await treasury.isReleased()}`));
        console.log(chalk.green.bold(`Final treasury balance: ${web3.utils.fromWei(await web3.eth.getBalance(treasury.address), 'ether')} ETH\n`));

    } catch (error) {
        console.error(chalk.red.bold(`Error: ${error.message}`));
    }

    callback();
};

async function advanceTimeAndBlock(time) {
    await web3.currentProvider.send({
        jsonrpc: "2.0",
        method: "evm_increaseTime",
        params: [time],
        id: new Date().getTime()
    });

    await web3.currentProvider.send({
        jsonrpc: "2.0",
        method: "evm_mine",
        params: [],
        id: new Date().getTime()
    });
}
