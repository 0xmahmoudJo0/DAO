# What's DAO?
A decentralized autonomous organization (DAO) is an emerging form of organizational structure with no central governing body and whose members share a common goal of acting in the best interest of the entity. Popularized by blockchain enthusiasts, DAOs make decisions using a bottom-up management approach.

----------
# What does the code do?

The code is a simulation of how the DAO works with :
  - **Proposal Creation** : Members can create proposals for the DAO to consider.
  - **Voting Mechanism** : Members can vote on active proposals.
  - **Proposal Execution** : Proposals that meet the required criteria are executed automatically.
  - **Governance** : Basic rules for proposal approval and execution are implemented.
----------

# Smart Contract Overview
> I used Openzeppelin library for the contract creations, and the main contract `Governance.sol`
  ```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/governance/Governor.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorCountingSimple.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorVotes.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorVotesQuorumFraction.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorTimelockControl.sol";

// NOTE: Contract created with the help of --> https://wizard.openzeppelin.com/#governor

contract Governance is
    Governor,
    GovernorCountingSimple,
    GovernorVotes,
    GovernorVotesQuorumFraction,
    GovernorTimelockControl
{
    uint256 public votingDelay_;
    uint256 public votingPeriod_;
....
  ```

### Timelock.sol :
The Timelock.sol contract enforces a delay on the execution of proposals. It uses OpenZeppelin's TimelockController to ensure that there is a minimum delay before executing any proposed transaction, allowing DAO members time to review and potentially veto proposals.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/governance/TimelockController.sol";

contract TimeLock is TimelockController {
    constructor(
        uint256 _minDelay,
        address[] memory _proposers,
        address[] memory _executors
    ) TimelockController(_minDelay, _proposers, _executors) {}
}

```

### Treasury.sol :
The Treasury.sol contract manages the DAO's funds. It holds the funds and allows for disbursement to a specified payee once the funds are released. Only the owner of the contract can release the funds, ensuring controlled and secure fund management.


```solidity
contract Treasury is Ownable {
    uint256 public totalFunds;
    address public payee;
    bool public isReleased;

    constructor(address _payee) payable {
        totalFunds = msg.value;
        payee = _payee;
        isReleased = false;
    }

    function releaseFunds() public onlyOwner {
        isReleased = true;
        payable(payee).transfer(totalFunds);
    }
}

```


### Migration.sol :

The Migration.sol contract helps in managing the deployment and upgrades of smart contracts. It keeps track of the last completed migration, ensuring that the deployment process can be managed and verified.


```solidity
contract Migrations {
  address public owner = msg.sender;
  uint public last_completed_migration;

  modifier restricted() {
    require(
      msg.sender == owner,
      "This function is restricted to the contract's owner"
    );
    _;
  }

  function setCompleted(uint completed) public restricted {
    last_completed_migration = completed;
  }

```




### token.sol :

"The Token.sol contract implements an ERC20 token with voting capabilities using ERC20Votes from OpenZeppelin Contracts. It supports token transfers and allows holders to participate in governance decisions within decentralized applications (DApps).


```solidity
contract Token is ERC20Votes {
    constructor(
        string memory _name,
        string memory _symbol,
        uint256 _initialSupply
    ) ERC20(_name, _symbol) ERC20Permit(_name) {
        _mint(msg.sender, _initialSupply);
    }


    function _afterTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal override(ERC20Votes) {
        super._afterTokenTransfer(from, to, amount);
    }

    function _mint(address to, uint256 amount) internal override(ERC20Votes) {
        super._mint(to, amount);
    }

    function _burn(address account, uint256 amount)
        internal
        override(ERC20Votes)
    {
        super._burn(account, amount);
    }
}

```

-----

# Requirements for initial setup:
- Install [NodeJS](https://nodejs.org/en/), should work with any node version below 16.5.0
- Install [Truffle](https://www.trufflesuite.com/docs/truffle/overview), In your terminal, you can check to see if you have truffle by running `truffle version`. To install truffle run `npm i -g truffle`. Ideal to have truffle version 5.4 to avoid dependency issues.
- Install [Ganache](https://www.trufflesuite.com/ganache).

-----

# How it works?
Firstly, I used **Ganache** which gives me a 10 ETH wallet with the private keys, and simulated the whole operations of the blockchain network,and a logs monitoring!!

> the 10 accounts
![image](https://github.com/0xmahmoudJo0/DAO/assets/56273659/d14fa702-7c8d-4011-9c04-27a53adc93bb)


> the logs of transactions
![image](https://github.com/0xmahmoudJo0/DAO/assets/56273659/d76bcac0-6782-4fde-8a05-05283fd8fa11)


----

So the code works with a JS script to create proposal and connect with ganache to simulate the blockchain network

### 2_create_proposal.js:

- use smart contracts:

```solidity
const Token = artifacts.require("Token");
const Timelock = artifacts.require("Timelock");
const Governance = artifacts.require("Governance");
const Treasury = artifacts.require("Treasury");
const chalk = require('chalk');
```

- declare the executor, proposal, and the voters, and give each of them a `5` token :

  ```solidity
   const [executor, proposer, voter1, voter2, voter3, voter4, voter5] = accounts;
  ....
  const token = await Token.deployed();
        await token.delegate(voter1, { from: voter1, gas: 500000 });
        await token.delegate(voter2, { from: voter2, gas: 500000 });
        await token.delegate(voter3, { from: voter3, gas: 500000 });
        await token.delegate(voter4, { from: voter4, gas: 500000 });
        await token.delegate(voter5, { from: voter5, gas: 500000 });
  ```

- proposal creation:

  ```solidity
   const tx = await governance.propose([treasury.address], [0], [encodedFunction], description, { from: proposer, gas: 500000 });
  ```

- the voting process
> I deployed 50 tokens for each voter and simulated the voting process with 3 `For` the proposal --> it means agree to the release of the funds!
```solidity
        console.log(chalk.blue.bold(`Casting votes...\n`));
        const votes = [1, 1, 1, 0, 2]; // For, For, For, Against, Abstain
        await governance.castVote(proposalId, votes[0], { from: voter1, gas: 500000 });
        await governance.castVote(proposalId, votes[1], { from: voter2, gas: 500000 });
        await governance.castVote(proposalId, votes[2], { from: voter3, gas: 500000 });
        await governance.castVote(proposalId, votes[3], { from: voter4, gas: 500000 });
        await governance.castVote(proposalId, votes[4], { from: voter5, gas: 500000 });
```

**I create a `console.log` for each operation logs in the screen**


![Screenshot 2024-06-21 2006411](https://github.com/0xmahmoudJo0/DAO/assets/56273659/a13a7a88-7ccb-4c2b-a099-a2f29de4f26c)

1- The ALL accounts' addresses
2- The voters, executers and proposal addresses
3- The proposal ID
4- The voting status --> *pre-configured to **yes*** as explained
5- The blocks of the transactions added after the voting for it and release the funds
> If we look to ganache to see the logs and the num of blocks 

![Screenshot 2024-06-21 201339s](https://github.com/0xmahmoudJo0/DAO/assets/56273659/e1609249-24f2-4271-b8d6-e34c8a7bcbe2)

I hope you understand what and how the script works !!

# Installations:
1- git the repo:
```bash
git clone https://github.com/0xmahmoudJo0/DAO.git
```
2- install the dependencies :
```bash
npm install
```
3- start Ganache
4- migrate and reset the blockchain network
```bash
truffle migrate --reset --network development
```
5- run the proposal script:
```bash
truffle exec .\scripts\2_create_proposal.js
```


