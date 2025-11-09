
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
    *   **Total Supply:** A fixed supply would be minted at creation (e.g., 100,000,000 MDT). A portion would be held by the **platform treasury wallet** for rewards and operations.
    *   **Utility:**
        *   **Payments:** Used by students to pay for courses.
        *   **Rewards:** Distributed to students for completing courses, achieving high exam scores, or participating in community events.
        *   **Governance (Future):** Could potentially be used for voting on new course topics or platform features.

2.  **CourseEnrollment Smart Contract:**
    *   **Function:** Manages the automated process of enrolling in a course.
    *   **Key Logic:**
        *   Holds a mapping of `courseId` to `priceInMDT`.
        *   Has a `purchaseCourse(courseId)` function that a student calls.
        *   This function triggers a `transferFrom` on the MDT contract, moving tokens from the student's wallet to the **platform's treasury wallet**.
        *   Upon successful transfer, it emits an `Enrolled(studentAddress, courseId)` event. This event is the crucial link to our off-chain backend.

### Off-Chain Components (Current Application)

1.  **Frontend (Next.js):**
    *   **Wallet Integration:** Use a library like `Ethers.js` to connect to the user's browser wallet (e.g., MetaMask).
    *   **UI Changes:**
        *   Display course prices in both KES and MDT.
        *   Show the user's MDT balance in their profile.
        *   Add a "Pay with MDT" button in the payment flow, which would trigger the `purchaseCourse` smart contract call.

2.  **Backend (Firebase/Genkit):**
    *   **Blockchain Listener Service:** A critical new piece of the backend. This service would constantly listen for `Enrolled` events from our `CourseEnrollment` smart contract.
    *   **Enrollment Logic:** When the listener detects an `Enrolled` event for a specific student and course, it triggers a function to update the Firebase Realtime Database, granting that student access to the course (i.e., adding the course to their `purchasedCourses` list).
    *   **Token Distribution:** Admin-triggered functions (or automated cloud functions) would be needed to send MDT rewards from the treasury to students' wallets upon course completion.

3.  **Admin Faucet Management:**
    *   An administrative interface will be created within the admin dashboard.
    *   From this page, the platform owner can connect their wallet (which holds the total supply of MDT) and call the `fundFaucet` function on the `MandaToken` contract.
    *   This allows the owner to securely transfer a specified amount of MDT into the contract itself, creating a reserve from which the public faucet can distribute tokens.

---

## 3. Step-by-Step Deployment Guide

Follow these steps to compile, deploy, and configure your `MandaToken` smart contract.

### Step 1: Get Test MATIC

All transactions on the blockchain require "gas" fees. On the Polygon Amoy testnet, these fees are paid in test MATIC. You must get some from a public faucet before you can deploy your contract.

1.  Visit a Polygon Amoy faucet, such as [www.alchemy.com/faucets/polygon-amoy](https://www.alchemy.com/faucets/polygon-amoy).
2.  Paste your MetaMask wallet address (the one you will use for deployment) into the input field.
3.  Complete any required verification steps (like a CAPTCHA).
4.  Request the test MATIC. It should arrive in your wallet within a few minutes.

### Step 2: Compile the Smart Contract

First, ensure your smart contract code is correct and ready. Then, open your terminal and run the compilation command. This checks for errors and prepares the necessary files for deployment.

```bash
npm run blockchain:compile
```
This command navigates into the `blockchain` directory and runs `npx hardhat compile`.

### Step 3: Deploy the Contract

Next, you will deploy the contract to a test network. The project is configured for the **Polygon Amoy** testnet. Ensure your MetaMask wallet is set to this network and funded with test MATIC.

Run the following command in your terminal:
```bash
cd blockchain && npx hardhat run scripts/deploy.ts --network amoy
```
This script will use your MetaMask wallet (or whichever wallet is configured with Hardhat) to deploy the contract. After a few moments, the terminal will output a message like this:

```
MandaToken deployed to: 0xAbC123...dEf456
```

**This is your unique contract address.** Copy it.

### Step 4: Update the Application with the Contract Address

Now you must tell your Next.js application where to find the deployed contract.

1.  Open the file: `src/lib/blockchain/contracts.ts`
2.  You will see a placeholder address:
    ```typescript
    export const MANDA_TOKEN_CONTRACT_ADDRESS = "0x0000000000000000000000000000000000000000";
    ```
3.  Replace the placeholder with the **actual address** you copied from the terminal output in Step 3.
    ```typescript
    export const MANDA_TOKEN_CONTRACT_ADDRESS = "0xAbC123...dEf456"; // Your deployed address here
    ```

**Your application is now connected to your live smart contract.** You can proceed to test features like claiming from the faucet.

---

## 4. Frontend Web3 Integration

This part explains how your Next.js application communicates with the blockchain.

### Step 1: Install a Web3 Library

The project already includes **Ethers.js**, a powerful library for interacting with the Ethereum blockchain.

```bash
npm install ethers
```

### Step 2: Connect to the User's Wallet

The application contains code to detect a user's browser wallet (like MetaMask) and ask for their permission to connect. This is handled within the `src/app/profile/page.tsx` file. The function retrieves the **user's unique wallet address**, which is distinct from a contract address.

```javascript
import { ethers } from 'ethers';

async function connectWallet() {
  if (typeof window.ethereum === 'undefined') {
    alert('Please install MetaMask!');
    return;
  }

  try {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const userWalletAddress = await signer.getAddress();
    return { provider, signer, address: userWalletAddress };
  } catch (error) {
    console.error('User rejected connection:', error);
  }
}
```

### Step 3: Interact with Your Smart Contracts

To call functions on your contract (like `faucet()` or `balanceOf()`), the application needs three things:
1.  A connected user wallet (`signer`).
2.  The **Contract Address** (which you configured in the previous section).
3.  The **Contract ABI** (Application Binary Interface), which is a JSON file that acts as a function manual for the contract.

Here is a conceptual example of how the "Claim MDT" button works:

```javascript
import { ethers } from 'ethers';
import { MANDA_TOKEN_CONTRACT_ADDRESS } from '@/lib/blockchain/contracts';
import MandaTokenABI from '@/lib/blockchain/abis/MandaToken.json';

async function handleClaim() {
    const { signer } = await connectWallet();
    if (!signer) return;

    // Create a contract instance
    const mandaTokenContract = new ethers.Contract(MANDA_TOKEN_CONTRACT_ADDRESS, MandaTokenABI.abi, signer);

    try {
      // Call the 'faucet' function on the contract
      const tx = await mandaTokenContract.faucet();
      await tx.wait(); // Wait for the transaction to be confirmed
      alert('Tokens claimed successfully!');
    } catch (error) {
      console.error('Transaction failed:', error);
      alert('Failed to claim tokens.');
    }
}
```

This flow demonstrates the core logic: connect wallet, create a contract object, and call a function on it.
