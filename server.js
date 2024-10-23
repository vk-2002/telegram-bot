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

// Bot start command to store user information in MongoDB
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

// Handle messages and appreciation logic
bot.on('text', async (ctx) => {
  const from = ctx.update.message.from;
  const message = ctx.update.message.text.trim();
  const chatType = ctx.update.message.chat.type;

  console.log(`Received message from user ${from.id}: ${message} in chat type: ${chatType}`);

  // Process only group or supergroup messages
  if (chatType !== 'group' && chatType !== 'supergroup') {
    return;
  }

  try {
    // Extract @username mentions
    const mentionedUsernames = message.match(/@[^\s@]+/g); // Capture @username mentions
    console.log('Mentioned usernames:', mentionedUsernames);

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

    // Process the first @username mention
    const firstMention = mentionedUsernames[0].substring(1);
    console.log(`First mentioned username: @${firstMention}`);

    // Look for the mentioned user by username
    let mentionedUser = await userModel.findOne({ username: firstMention });
    console.log('Mentioned user in DB:', mentionedUser);

    if (!mentionedUser) {
      // If the mentioned user is not found by username
      console.log(`User @${firstMention} not found in the database.`);

      // Fallback Logic: Mentioned user might have changed their username, try finding by sender's ID
      mentionedUser = await userModel.findOne({ tgId: from.id });

      if (mentionedUser) {
        // If found by tgId, update the username and notify the sender
        await userModel.updateOne(
          { tgId: mentionedUser.tgId },
          { $set: { username: firstMention } }
        );
        console.log(`Updated username for user with tgId: ${mentionedUser.tgId}`);

        await ctx.reply(
          `It seems @${firstMention} changed their username, and we've updated their details in the database. Thank you, @${sender.username || from.first_name}, for appreciating them! 🎉`
        );
      } else {
        await ctx.reply(`User @${firstMention} not found in the database. It may be that they haven't started the bot yet or their username has changed.`);
      }
      return;
    }

    // Update appreciation counts for both sender and mentioned user
    await userModel.findOneAndUpdate({ tgId: sender.tgId }, { $inc: { givenAppreciationCount: 1 } });
    await userModel.findOneAndUpdate({ tgId: mentionedUser.tgId }, { $inc: { receivedAppreciationCount: 1 } });

    // Reply to thank the sender
    await ctx.reply(`Thank you, @${sender.username || from.first_name}, for appreciating @${firstMention}! 🎉`);
  } catch (error) {
    console.error('Error handling message:', error);
    await ctx.reply('Facing difficulties. Please try again.');
  }
});

// Setting the webhook and launching the bot
bot.telegram.setWebhook(process.env.WEBHOOK_URL).then(() => {
  console.log('Webhook set successfully');
  bot.launch();
}).catch((error) => {
  console.error('Error setting webhook:', error);
});

// Graceful stop on termination
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
