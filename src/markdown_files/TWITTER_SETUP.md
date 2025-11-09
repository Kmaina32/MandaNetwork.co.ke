
# How to Set Up Your X (Twitter) API Access

This guide provides the steps to get the necessary API keys and access tokens from the X Developer Platform to enable automated posting from your application (e.g., via an n8n workflow).

## Part 1: Apply for a Developer Account

Before you can create an app, you need access to the X Developer Platform.

1.  **Go to the X Developer Platform:**
    *   Navigate to [developer.twitter.com](https://developer.twitter.com).

2.  **Sign Up for an Account:**
    *   Sign in with your existing X account.
    *   You will be asked to apply for a developer account. This process involves describing your intended use case.

3.  **Describe Your Use Case:**
    *   Be clear and concise. Explain that you intend to use the API for your application, **Manda Network**, to do things like:
        *   Automatically post announcements about new courses.
        *   Share updates about community events like hackathons.
        *   Engage with your user community.
    *   Agree to the developer terms and submit your application. Approval can take some time.

## Part 2: Create a Project and an App

Once your developer account is approved, you can create a Project and an App to get your API keys.

1.  **Create a New Project:**
    *   From your developer dashboard, create a new Project. Give it a name related to your application, like "Manda Network".
    *   Select your use case (e.g., "Building tools for Twitter users").

2.  **Create a New App:**
    *   Within your new Project, you'll be prompted to create an App. Give it a unique name.
    *   Once created, you will be presented with your **API Key** and **API Key Secret**.

3.  **Copy Your API Key and Secret:**
    *   **API Key:** This is your app's public identifier.
    *   **API Key Secret:** This is a secret key used to authenticate your app. **Treat this like a password.**
    *   Copy both of these values immediately and store them securely.

## Part 3: Generate Access Tokens

To post on behalf of your X account, your app needs user-level Access Tokens.

1.  **Navigate to "Keys and Tokens":**
    *   In your App's settings, find the "Keys and Tokens" tab.

2.  **Set Up Authentication:**
    *   Go to your App's "Settings" tab.
    *   Under **"User authentication settings"**, click "Set up".
    *   Enable **OAuth 1.0a**.
    *   Set App permissions to **"Read and write"**.
    *   For the **Callback URI** and **Website URL**, you can use a placeholder like `https://www.example.com` for now. Save your changes.

3.  **Generate Access Token and Secret:**
    *   Go back to the "Keys and Tokens" tab.
    *   Under the "Authentication Tokens" section, you should see a button to **"Generate"** an Access Token and Secret.
    *   Click it. You will be shown your **Access Token** and **Access Token Secret**.
    *   Copy both of these values immediately. **They will not be shown again.**

## Part 4: Final Configuration

You should now have four essential credentials:
-   API Key
-   API Key Secret
-   Access Token
-   Access Token Secret

Open the `.env` file in the root of your project and add these keys:

```env
# ... other variables

# X (Twitter) Integration
TWITTER_API_KEY="YOUR_API_KEY_HERE"
TWITTER_API_KEY_SECRET="YOUR_API_KEY_SECRET_HERE"
TWITTER_ACCESS_TOKEN="YOUR_ACCESS_TOKEN_HERE"
TWITTER_ACCESS_TOKEN_SECRET="YOUR_ACCESS_TOKEN_SECRET_HERE"
```

With these variables set, your application and any connected automation tools (like n8n) will be able to authenticate with the X API and post on your behalf.
