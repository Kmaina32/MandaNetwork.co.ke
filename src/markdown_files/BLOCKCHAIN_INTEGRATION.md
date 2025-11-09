
# Manda Network - Blockchain Integration Conceptual Framework

This document provides a high-level architectural overview for integrating a token-based economy and smart contract automation into the Manda Network platform. This is a conceptual guide and not a technical implementation specification.

## 1. Vision

To create a more engaging and transparent learning ecosystem by introducing:
-   **MandaToken (MDT):** A platform-specific cryptocurrency to reward engagement and serve as a medium of exchange.
-   **Smart Contracts:** To automate course enrollment and payment processes securely and transparently on a blockchain.

**Beneficiaries:**
-   **Students:** Earn rewards for their achievements (course completion, high scores) and use those rewards to purchase further education.
-   **Platform Admins:** Benefit from an automated, secure payment system and increased user engagement through token incentives.

## 2. Core Components

The system would be comprised of three main parts: the on-chain smart contracts, the existing frontend application, and the existing backend services.

### On-Chain Components (Blockchain)

These components would live on a public blockchain. An EVM-compatible chain like **Polygon** is recommended due to its low transaction fees and scalability.

1.  **MandaToken (MDT) - ERC-20 Smart Contract:**
    *   **Type:** A standard ERC-20 token.
    *   **Total Supply:** A fixed supply would be minted at creation (e.g., 100,000,000 MDT). A portion would be held by the platform treasury for rewards.
    *   **Utility:**
        *   **Payments:** Used by students to pay for courses.
        *   **Rewards:** Distributed to students for completing courses, achieving high exam scores, or participating in community events.
        *   **Governance (Future):** Could potentially be used for voting on new course topics or platform features.

2.  **CourseEnrollment Smart Contract:**
    *   **Function:** Manages the automated process of enrolling in a course.
    *   **Key Logic:**
        *   Holds a mapping of `courseId` to `priceInMDT`.
        *   Has a `purchaseCourse(courseId)` function that a student calls.
        *   This function triggers a `transferFrom` on the MDT contract, moving tokens from the student's wallet to the platform's treasury wallet.
        *   Upon successful transfer, it emits an `Enrolled(studentAddress, courseId)` event. This event is the crucial link to our off-chain backend.

### Off-Chain Components (Current Application)

1.  **Frontend (Next.js):**
    *   **Wallet Integration:** Use a library like `Ethers.js` or `Web3.js` to connect to the user's browser wallet (e.g., MetaMask).
    *   **UI Changes:**
        *   Display course prices in both KES and MDT.
        *   Show the user's MDT balance in their profile.
        *   Add a "Pay with MDT" button in the payment flow, which would trigger the `purchaseCourse` smart contract call.

2.  **Backend (Firebase/Genkit):**
    *   **Blockchain Listener Service:** A critical new piece of the backend. This service would constantly listen for `Enrolled` events from our `CourseEnrollment` smart contract.
    *   **Enrollment Logic:** When the listener detects an `Enrolled` event for a specific student and course, it triggers a function to update the Firebase Realtime Database, granting that student access to the course (i.e., adding the course to their `purchasedCourses` list).
    *   **Token Distribution:** Admin-triggered functions (or automated cloud functions) would be needed to send MDT rewards from the treasury to students' wallets upon course completion.

---

## 3. How to Build Your Crypto (A Conceptual Guide)

Creating a cryptocurrency like MandaToken (MDT) involves writing and deploying a "smart contract" to a blockchain. Below is a simplified, high-level guide to the process.

### Step 1: Set Up Your Development Environment

Before writing any code, you need the right tools.
-   **Node.js:** Make sure you have Node.js installed on your computer.
-   **Wallet:** Install a browser wallet like [MetaMask](https://metamask.io/). This will hold your test cryptocurrency and allow you to interact with the blockchain.
-   **Code Editor:** A code editor like [VS Code](https://code.visualstudio.com/) is recommended.
-   **Development Framework:** Use a framework like [Hardhat](https://hardhat.org/) to compile, test, and deploy your smart contracts.

To set up a Hardhat project, you would run these commands in your terminal:
```bash
mkdir manda-token-contract
cd manda-token-contract
npm init -y
npm install --save-dev hardhat
```

### Step 2: Write the Smart Contract in Solidity

The code for a smart contract is typically written in a language called **Solidity**. For an ERC-20 token, you don't need to write everything from scratch. You can use secure, audited templates from [OpenZeppelin](https://www.openzeppelin.com/contracts).

Here’s what a basic `MandaToken.sol` contract would look like. This code defines the token's name, symbol, and total supply.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title MandaToken
 * @dev A simple ERC20 token for the Manda Network platform.
 */
contract MandaToken is ERC20 {
    /**
     * @dev Constructor that mints the initial supply of tokens to the contract deployer.
     * The deployer's address will become the owner and receive all tokens.
     */
    constructor() ERC20("MandaToken", "MDT") {
        // Mint 100 million tokens.
        // ERC20 contracts use a number of decimals (usually 18), so we add 18 zeros.
        _mint(msg.sender, 100000000 * (10 ** 18));
    }
}
```

### Step 3: Compile and Deploy the Contract

1.  **Compile:** Using your development framework (Hardhat), you would run a command to compile your Solidity code into bytecode that the blockchain can understand.
    ```bash
    npx hardhat compile
    ```

2.  **Get Test Funds:** To deploy your contract to a test network (like Polygon Amoy), you'll need test currency (e.g., testnet MATIC). You can get this for free from a "faucet" website.

3.  **Deploy:** You would write a deployment script and run a command to send your compiled contract to the blockchain.
    ```bash
    npx hardhat run scripts/deploy.js --network amoy
    ```

Once deployed, your token contract will have a permanent address on the blockchain, and the total supply will be in the wallet you used for deployment.

---

## 4. Frontend Web3 Integration

This part explains how your Next.js application would communicate with the blockchain and your deployed smart contracts.

### Step 1: Install a Web3 Library

You need a library to interact with the Ethereum blockchain. The most popular one is **Ethers.js**.

```bash
npm install ethers
```

### Step 2: Connect to the User's Wallet

You need to create a function that detects the user's browser wallet (like MetaMask) and asks for permission to connect.

```javascript
import { ethers } from 'ethers';

async function connectWallet() {
  // Check if MetaMask or another wallet is installed
  if (typeof window.ethereum === 'undefined') {
    alert('Please install MetaMask!');
    return;
  }

  try {
    // Request account access
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const address = await signer.getAddress();
    
    console.log('Connected Account:', address);
    return { provider, signer, address };
  } catch (error) {
    console.error('User rejected connection:', error);
  }
}
```

### Step 3: Interact with Your Smart Contracts

Once connected, you can create instances of your smart contracts in your code to call their functions. To do this, you need two things:
1.  **Contract Address:** The address your contract was deployed to in Step 3 of the previous section.
2.  **Contract ABI (Application Binary Interface):** This is a JSON file generated during compilation that describes your contract's functions.

Here is a conceptual example of how you might create a "Pay with MDT" button in a React component.

```javascript
import { ethers } from 'ethers';
import { MandaTokenABI, CourseEnrollmentABI } from './abis'; // You would import your ABIs

const MANDA_TOKEN_ADDRESS = 'YOUR_MDT_CONTRACT_ADDRESS';
const ENROLLMENT_CONTRACT_ADDRESS = 'YOUR_ENROLLMENT_CONTRACT_ADDRESS';

function PurchaseButton({ courseId, priceInMdt }) {
  const handlePurchase = async () => {
    const { provider, signer } = await connectWallet();
    if (!provider || !signer) return;

    // Create contract instances
    const mandaTokenContract = new ethers.Contract(MANDA_TOKEN_ADDRESS, MandaTokenABI, signer);
    const enrollmentContract = new ethers.Contract(ENROLLMENT_CONTRACT_ADDRESS, CourseEnrollmentABI, signer);

    try {
      // 1. Approve the enrollment contract to spend your tokens
      const approveTx = await mandaTokenContract.approve(ENROLLMENT_CONTRACT_ADDRESS, priceInMdt);
      await approveTx.wait(); // Wait for the transaction to be mined

      // 2. Call the purchase function on the enrollment contract
      const purchaseTx = await enrollmentContract.purchaseCourse(courseId);
      await purchaseTx.wait(); // Wait for the purchase to be mined

      alert('Purchase successful!');
      // The backend listener will now detect the event and grant course access.

    } catch (error) {
      console.error('Transaction failed:', error);
      alert('Purchase failed. Check the console for details.');
    }
  };

  return <button onClick={handlePurchase}>Pay with MDT</button>;
}
```

This flow demonstrates the core logic: connect to a wallet, get the user's permission to spend tokens, and then execute the main transaction.

## 5. Next Steps & Considerations

-   **Choice of Blockchain:** A low-cost, high-speed chain like Polygon, Arbitrum, or Optimism would be essential to make micro-transactions feasible.
-   **Security:** All smart contracts must undergo a professional security audit before deployment.
-   **User Experience (UX):** A major focus would be abstracting away the complexities of blockchain for non-technical users. This might involve wallet creation guides, clear transaction prompts, and handling potential transaction failures gracefully.
-   **Specialized Team:** This implementation would require developers with expertise in Solidity, smart contract development, and web3 frontend integration.
