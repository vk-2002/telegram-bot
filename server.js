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
bot.start(async (ctx) => {
  const from = ctx.update.message.from;
  console.log('User started the bot:', from);

  try {
    const user = await userModel.findOneAndUpdate(
      { tgId: from.id },
      {
        $set: {
          firstName: from.first_name,
          lastName: from.last_name,
          isBot: from.is_bot,
          username: from.username || '', // Handle undefined username
        }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    if (user.createdAt === user.updatedAt) {
      console.log('New user created:', user);
    } else {
      console.log('Existing user updated:', user);
    }

    await ctx.reply(`Hey!! ${from.first_name}, Bot is Active for Appreciation`);
  } catch (error) {
    console.error('Error in start command:', error);
    await ctx.reply('Facing difficulties from server!');
  }
});

// Command for adding a contact-saved name
bot.command('addcontactname', async (ctx) => {
  const messageParts = ctx.update.message.text.split(' ');

  if (messageParts.length < 3) {
    return ctx.reply('Usage: /addcontactname @username contactSavedName');
  }

  const mentionedUsername = messageParts[1].substring(1); // Remove @ symbol
  const contactSavedName = messageParts.slice(2).join(' '); // Rest of the message is the contact-saved name

  try {
    const user = await userModel.findOneAndUpdate(
      { username: mentionedUsername },
      { $set: { contactSavedName } },
      { new: true }
    );

    if (user) {
      ctx.reply(`Contact name saved: ${contactSavedName} for @${mentionedUsername}`);
    } else {
      ctx.reply(`User @${mentionedUsername} not found in the database.`);
    }
  } catch (error) {
    console.error('Error saving contact name:', error);
    ctx.reply('Failed to save the contact name.');
  }
});

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

      // Update appreciation counts for both sender and mentioned user
      await userModel.findOneAndUpdate({ tgId: sender.tgId }, { $inc: { givenAppreciationCount: 1 } });
      await userModel.findOneAndUpdate({ tgId: mentionedUser.tgId }, { $inc: { receivedAppreciationCount: 1 } });

      // Thank-you reply in the group
      await ctx.reply(`Thank you, ${from.first_name}, for appreciating @${mentionedUsername}! 🎉`);
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
