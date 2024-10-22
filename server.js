import { Telegraf } from "telegraf";
import userModel from './src/models/User.js';
import connectDb from './src/config/db.js';
import express from 'express';

const app = express();
const bot = new Telegraf(process.env.BOT_TOKEN);
app.use(express.json());
app.use(bot.webhookCallback('/'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// MongoDB connection
connectDb()
  .then(() => console.log('MongoDb database connected successfully'))
  .catch((error) => {
    console.error('MongoDB connection error:', error.message);
    process.exit(1);
  });

// Start command: Store the user information
// Message handler: Process only @username mentions
bot.on('text', async (ctx) => {
  const from = ctx.update.message.from; // The user who sent the message
  const message = ctx.update.message.text.trim();
  const chatType = ctx.update.message.chat.type;

  console.log(`Received message from user ${from.id}: ${message} in chat type: ${chatType}`);

  // Only process if it's a group or supergroup message
  if (chatType !== 'group' && chatType !== 'supergroup') {
    return; // Do nothing if it's a private chat
  }

  try {
    // Extract @username mentions
    const mentionedUsernames = message.match(/@[a-zA-Z0-9_]+/g); // @username mentions

    // If no @username is mentioned, do nothing
    if (!mentionedUsernames || mentionedUsernames.length === 0) {
      console.log('No valid @username mentions found, ignoring message.');
      return;
    }

    // Ensure the sender exists in the database
    let sender = await userModel.findOne({ tgId: from.id });
    if (!sender) {
      sender = await userModel.create({
        tgId: from.id,
        firstName: from.first_name,
        lastName: from.last_name,
        isBot: from.is_bot,
        username: from.username || '', // Handle users without a username
      });
      console.log('Created new sender in message handler:', sender);
    }

    // Process each @username mention
    for (const mention of mentionedUsernames) {
      const mentionedUsername = mention.substring(1); // Remove the @ symbol

      // Look for the mentioned user by username in the database
      let mentionedUser = await userModel.findOne({ username: mentionedUsername });

      if (!mentionedUser) {
        // If the mentioned user is not found, skip without replying
        console.log(`User @${mentionedUsername} not found in the database.`);
        continue;
      }

      // Ensure mentioned user has a Telegram ID
      if (!mentionedUser.tgId) {
        console.log(`User @${mentionedUsername} has no Telegram ID stored.`);
        continue;
      }

      // Update appreciation counts for both sender and mentioned user
      await userModel.findOneAndUpdate({ tgId: sender.tgId }, { $inc: { givenAppreciationCount: 1 } });
      await userModel.findOneAndUpdate({ tgId: mentionedUser.tgId }, { $inc: { receivedAppreciationCount: 1 } });

      // Thank-you reply in the group to the mentioned user
      await ctx.reply(`Thank you, @${mentionedUsername}, for receiving appreciation from ${from.first_name}! 🎉`);
    }
  } catch (error) {
    console.error('Error handling message:', error);
    await ctx.reply('Facing difficulties. Please try again.');
  }
});


// Setting webhook for bot launch
bot.telegram.setWebhook(process.env.WEBHOOK_URL).then(() => {
  console.log('Webhook set successfully');
  bot.launch();
}).catch((error) => {
  console.error('Error setting webhook:', error);
});

// Graceful stop on termination
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
