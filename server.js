import { Telegraf } from "telegraf";
import userModel from './src/models/User.js';
import connectDb from './src/config/db.js';
import express from 'express';

const app = express();
const bot = new Telegraf(process.env.BOT_TOKEN);
app.use(express.json());
app.use(bot.webhookCallback('/'));

// MongoDB connection
connectDb()
  .then(() => console.log('MongoDb database connected successfully'))
  .catch((error) => {
    console.error('MongoDB connection error:', error.message);
    process.exit(1);
  });
//Web book 
bot.telegram.setWebhook(process.env.WEBHOOK_URL).then(() => {
  console.log('Webhook set successfully');
  bot.launch();  // starts listening for updates

}).catch((error) => {
  console.error('Error setting webhook:', error);
});

// Remove bot.launch() since webhook is handling the updates

//
// Bot start command to initialize the user in the database
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
          username: from.username || '', // Handle users without a username
        }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const message = user.createdAt === user.updatedAt
      ? 'New user created:'
      : 'Existing user updated:';
    
    console.log(message, user);

    // Reply after storing data
    await ctx.reply(`Hey!! ${from.first_name}, Bot is active for appreciation.`);
  } catch (error) {
    console.error('Error in start command:', error);
    await ctx.reply('Facing difficulties from server!');
  }
});

// Handle messages in group or supergroup
bot.on('text', async (ctx) => {
  const from = ctx.update.message.from;
  const message = ctx.update.message.text.trim();
  const chatType = ctx.update.message.chat.type;

  console.log(`Received message from user ${from.id}: ${message} in chat type: ${chatType}`);

  // Only process if it's a group or supergroup message
  if (chatType !== 'group' && chatType !== 'supergroup') {
    return;
  }

  try {
    // Extract @username mentions and plain names (capitalized words for possible names)
    const mentionedUsernames = message.match(/@[a-zA-Z0-9_]+/g); // @username mentions
    const mentionedNames = message.match(/\b[A-Z][a-z]+\b/g); // Capitalized words as names

    // If no mentions, skip database lookups and let the message pass normally
    if (!mentionedUsernames && (!mentionedNames || mentionedNames.length === 0)) {
      console.log('No mentions found, message will be processed normally.');
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

    // Process @username mentions
    if (mentionedUsernames) {
      for (const mention of mentionedUsernames) {
        const mentionedUsername = mention.substring(1); // Remove the @ symbol

        // Look for the mentioned user by username in the database
        let mentionedUser = await userModel.findOne({ username: mentionedUsername });

        if (!mentionedUser) {
          await ctx.reply(`User @${mentionedUsername} not found in the database.`);
          continue;
        }

        // Update appreciation counts for both sender and mentioned user
        await userModel.findOneAndUpdate({ tgId: sender.tgId }, { $inc: { givenAppreciationCount: 1 } });
        await userModel.findOneAndUpdate({ tgId: mentionedUser.tgId }, { $inc: { receivedAppreciationCount: 1 } });

        // Thank-you reply in the group
        await ctx.reply(`Thank you, ${from.first_name}, for appreciating @${mentionedUsername}! 🎉`);
      }
    }

    // Process plain names (non-@ mentions)
    if (mentionedNames && mentionedNames.length > 0) {
      for (const plainName of mentionedNames) {
        let mentionedUser = await userModel.findOne({ firstName: plainName });

        if (!mentionedUser) {
          await ctx.reply(`User ${plainName} not found in the database.`);
          continue;
        }

        // Update appreciation counts for both sender and mentioned user
        await userModel.findOneAndUpdate({ tgId: sender.tgId }, { $inc: { givenAppreciationCount: 1 } });
        await userModel.findOneAndUpdate({ tgId: mentionedUser.tgId }, { $inc: { receivedAppreciationCount: 1 } });

        // Thank-you reply in the group
        await ctx.reply(`Thank you, ${from.first_name}, for appreciating ${plainName}! 🎉`);
      }
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
