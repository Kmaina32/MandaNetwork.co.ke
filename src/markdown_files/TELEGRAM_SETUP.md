# How to Set Up Your Telegram Bot and Channel

This guide will walk you through the process of creating a Telegram bot, getting your API token, creating a channel, and finding the necessary IDs to integrate with the Manda Network platform.

## Part 1: Create a Telegram Bot & Get API Token

The primary way to interact with the Telegram API is through a bot. You'll create one using Telegram's own "BotFather".

1.  **Start a chat with BotFather:**
    *   Open your Telegram app and search for the user `BotFather` (it will have a blue checkmark).
    *   Start a chat with it and type `/start`.

2.  **Create a new bot:**
    *   Send the command `/newbot` to BotFather.
    *   It will ask you for a **name** for your bot. This is a friendly name that will be displayed in chats (e.g., `Manda Network Bot`).
    *   Next, it will ask for a **username**. This must be unique and end in `bot` (e.g., `MandaNetworkBot` or `manda_network_bot`).

3.  **Copy your API Token:**
    *   Once you've chosen a unique username, BotFather will congratulate you and provide you with an **API token**.
    *   This token is a long string of characters and numbers, like `1234567890:ABC-DEF1234ghIkl-zyx57W2v1u123456789`.
    *   **This token is very important and should be kept secret.** Copy it immediately.

4.  **Save your API Token:**
    *   Open the `.env` file in the root of your project.
    *   Add a new line and save your token there:
        ```env
        TELEGRAM_BOT_TOKEN="YOUR_API_TOKEN_HERE"
        ```

## Part 2: Create a Channel and Get the Channel ID

This channel is where your bot will post notifications for your users.

1.  **Create a New Channel:**
    *   In Telegram, go to "New Message" and select "New Channel".
    *   Give your channel a name (e.g., "Manda Network Announcements") and an optional description.
    *   **Crucially, set the channel type to "Public"**. This makes it easy to get the channel ID.
    *   Create a simple, memorable public link (e.g., `t.me/MandaAnnouncements`). The part after `t.me/` is your channel's username.

2.  **Add Your Bot as an Administrator:**
    *   Open your newly created channel's info page.
    *   Go to "Administrators" > "Add Admin".
    *   Search for your bot's username (e.g., `MandaNetworkBot`).
    *   Select your bot and grant it permissions. At a minimum, it needs the "Post Messages" permission.

3.  **Get the Channel ID:**
    *   For **public channels**, the ID is simply the username, prefixed with an `@` symbol.
    *   For example, if your public link is `t.me/MandaAnnouncements`, your Channel ID is `@MandaAnnouncements`.

4.  **Save your Channel ID:**
    *   Open your `.env` file again.
    *   Add another new line and save your channel ID:
        ```env
        TELEGRAM_CHANNEL_ID="@YourChannelUsername"
        ```

## Part 3: Final Configuration

Your `.env` file should now contain these new lines (along with your other variables):

```env
# ... other variables

# Telegram Integration
TELEGRAM_BOT_TOKEN="1234567890:ABC-DEF1234ghIkl-zyx57W2v1u123456789"
TELEGRAM_CHANNEL_ID="@MandaAnnouncements"
```

Once you have completed these steps and saved your `.env` file, the application will be ready to use these credentials for the Telegram integration features we build.
