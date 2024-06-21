const Token = artifacts.require("Token");
const Timelock = artifacts.require("Timelock");
const Governance = artifacts.require("Governance");
const Treasury = artifacts.require("Treasury");
const chalk = require('chalk');

module.exports = async function (callback) {
    const accounts = await web3.eth.getAccounts();
    const [executor, proposer, voter1, voter2, voter3, voter4, voter5] = accounts;

    // Log accounts for debugging
    console.log(chalk.blue.bold('Accounts:'));
    accounts.forEach(account => {
        console.log(chalk.blue(account));
    });
    console.log(chalk.green.bold(`Executor: ${executor}`));
    console.log(chalk.green.bold(`Proposer: ${proposer}`));
    console.log(chalk.green.bold(`Voters: ${voter1}\n${voter2}\n${voter3}\n${voter4}\n${voter5}`));

    let isReleased, funds, blockNumber, proposalState, vote;

    const amount = web3.utils.toWei('5', 'ether');

    const token = await Token.deployed();
    await token.delegate(voter1, { from: voter1 });
    await token.delegate(voter2, { from: voter2 });
    await token.delegate(voter3, { from: voter3 });
    await token.delegate(voter4, { from: voter4 });
    await token.delegate(voter5, { from: voter5 });

    const treasury = await Treasury.deployed();

    isReleased = await treasury.isReleased();
    console.log(chalk.green.bold(`Funds released? ${isReleased}`));

    funds = await web3.eth.getBalance(treasury.address);
    console.log(chalk.green.bold(`Funds inside of treasury: ${web3.utils.fromWei(funds.toString(), 'ether')} ETH\n`));

    const governance = await Governance.deployed();
    const encodedFunction = await treasury.contract.methods.releaseFunds().encodeABI();
    const description = "Release Funds from Treasury";

    const tx = await governance.propose([treasury.address], [0], [encodedFunction], description, { from: proposer });

    const id = tx.logs[0].args.proposalId;
    console.log(chalk.magenta.bold(`Created Proposal: ${id.toString()}\n`));

    proposalState = await governance.state.call(id);
    console.log(chalk.cyan.bold(`Current state of proposal: ${proposalState.toString()} (Pending) \n`));

    const snapshot = await governance.proposalSnapshot.call(id);
    console.log(chalk.cyan(`Proposal created on block ${snapshot.toString()}`));

    const deadline = await governance.proposalDeadline.call(id);
    console.log(chalk.cyan(`Proposal deadline on block ${deadline.toString()}\n`));

    blockNumber = await web3.eth.getBlockNumber();
    console.log(chalk.yellow(`Current blocknumber: ${blockNumber}\n`));

    const quorum = await governance.quorum(blockNumber - 1);
    console.log(chalk.yellow(`Number of votes required to pass: ${web3.utils.fromWei(quorum.toString(), 'ether')}\n`));

    // Vote
    console.log(chalk.blue.bold(`Casting votes...\n`));

    // 0 = Against, 1 = For, 2 = Abstain
    await governance.castVote(id, 1, { from: voter1 });
    await governance.castVote(id, 1, { from: voter2 });
    await governance.castVote(id, 1, { from: voter3 });
    await governance.castVote(id, 0, { from: voter4 });
    await governance.castVote(id, 2, { from: voter5 });

    // States: Pending, Active, Canceled, Defeated, Succeeded, Queued, Expired, Executed
    proposalState = await governance.state.call(id);
    console.log(chalk.cyan.bold(`Current state of proposal: ${proposalState.toString()} (Active) \n`));

    // NOTE: Transfer serves no purposes, it's just used to fast forward one block after the voting period ends
    await token.transfer(proposer, amount, { from: executor });

    const { againstVotes, forVotes, abstainVotes } = await governance.proposalVotes.call(id);
    console.log(chalk.yellow(`Votes For: ${web3.utils.fromWei(forVotes.toString(), 'ether')}`));
    console.log(chalk.yellow(`Votes Against: ${web3.utils.fromWei(againstVotes.toString(), 'ether')}`));
    console.log(chalk.yellow(`Votes Neutral: ${web3.utils.fromWei(abstainVotes.toString(), 'ether')}\n`));

    blockNumber = await web3.eth.getBlockNumber();
    console.log(chalk.yellow(`Current blocknumber: ${blockNumber}\n`));

    proposalState = await governance.state.call(id);
    console.log(chalk.cyan.bold(`Current state of proposal: ${proposalState.toString()} (Succeeded) \n`));

    // Queue 
    const hash = web3.utils.sha3("Release Funds from Treasury");
    await governance.queue([treasury.address], [0], [encodedFunction], hash, { from: executor });

    proposalState = await governance.state.call(id);
    console.log(chalk.cyan.bold(`Current state of proposal: ${proposalState.toString()} (Queued) \n`));

    // Execute
    await governance.execute([treasury.address], [0], [encodedFunction], hash, { from: executor });

    proposalState = await governance.state.call(id);
    console.log(chalk.cyan.bold(`Current state of proposal: ${proposalState.toString()} (Executed) \n`));

    isReleased = await treasury.isReleased();
    console.log(chalk.green.bold(`Funds released? ${isReleased}`));

    funds = await web3.eth.getBalance(treasury.address);
    console.log(chalk.green.bold(`Funds inside of treasury: ${web3.utils.fromWei(funds.toString(), 'ether')} ETH\n`));

    callback();
};
