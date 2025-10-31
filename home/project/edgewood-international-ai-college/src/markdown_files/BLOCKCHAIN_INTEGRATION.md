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

## 3. User & Data Flows

### Flow 1: Earning Tokens as a Reward

1.  A student completes a course and passes the final exam.
2.  The existing application logic marks the course as complete in the Firebase database.
3.  An automated **Cloud Function** (or a manual admin action) is triggered by this completion.
4.  This function, using the platform's private key, initiates a transaction to transfer a set amount of MDT (e.g., 50 MDT) from the Manda Network treasury wallet to the student's registered wallet address.

### Flow 2: Paying for a Course with MDT

1.  A student clicks "Pay with MDT" for a course on the frontend.
2.  The frontend prompts the student to connect their browser wallet (e.g., MetaMask).
3.  The application calls the `approve` function on the MDT contract, allowing the `CourseEnrollment` contract to spend the required amount of tokens.
4.  The student confirms this approval transaction in their wallet.
5.  The application then calls the `purchaseCourse(courseId)` function on the `CourseEnrollment` contract.
6.  The student confirms the final purchase transaction in their wallet.
7.  The `CourseEnrollment` contract executes: it transfers the MDT from the student to the treasury and emits the `Enrolled` event.
8.  The **Backend Listener Service** detects the `Enrolled` event.
9.  The listener service calls a function to update the Firebase Realtime Database, granting the student access to the course content. The student now sees the course on their dashboard.

## 4. Next Steps & Considerations

-   **Choice of Blockchain:** A low-cost, high-speed chain like Polygon, Arbitrum, or Optimism would be essential to make micro-transactions feasible.
-   **Security:** All smart contracts must undergo a professional security audit before deployment.
-   **User Experience (UX):** A major focus would be abstracting away the complexities of blockchain for non-technical users. This might involve wallet creation guides, clear transaction prompts, and handling potential transaction failures gracefully.
-   **Specialized Team:** This implementation would require developers with expertise in Solidity, smart contract development, and web3 frontend integration.
