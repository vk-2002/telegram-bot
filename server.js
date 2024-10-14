import { Telegraf } from "telegraf";
import userModel from './src/models/User.js';
import connectDb from './src/config/db.js';
import express from 'express';

const app = express();
const bot = new Telegraf(process.env.BOT_TOKEN);
app.use(express.json());
app.use(bot.webhookCallback('/'));

app.get('/', (req, res) => {
  res.status(200).send('Bot is up and running');
});

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

// Bot handler for messages with mentions only
bot.on('text', async (ctx) => {
  const from = ctx.update.message.from; // User who sent the message
  const message = ctx.update.message.text.trim();
  console.log(`Received message from user ${from.id}: ${message}`);

  try {
    // Extract @username mentions and capitalized words that could be names
    const mentionedUsernames = message.match(/@[a-zA-Z0-9_]+/g); // @username
    const mentionedNames = message.match(/\b[A-Z][a-z]+\b/g); // Capitalized names

    // If there's no mention of another user, skip handling
    if (!mentionedUsernames && !mentionedNames) {
      console.log('No mentions found, skipping database lookup.');
      return; // Exit function
    }

    // If mentions are found, continue with database lookups and appreciation handling
    if (mentionedUsernames) {
      // Handle appreciation for users with @username
      for (const mention of mentionedUsernames) {
        const mentionedUsername = mention.substring(1); // Remove @ symbol

        // Look for the mentioned user by username in the database
        let mentionedUser = await userModel.findOne({ username: mentionedUsername });

        if (!mentionedUser) {
          await ctx.reply(`User @${mentionedUsername} not found in the database.`);
          continue;
        }

        // Update the appreciation counts for both the sender and the mentioned user
        await userModel.findOneAndUpdate({ tgId: from.id }, { $inc: { givenAppreciationCount: 1 } });
        await userModel.findOneAndUpdate({ tgId: mentionedUser.tgId }, { $inc: { receivedAppreciationCount: 1 } });

        // Immediate thank you reply
        await ctx.reply(`Thank you, ${from.first_name}, for appreciating @${mentionedUsername}! 🎉`);
      }
    }

    if (mentionedNames) {
      // Handle appreciation for users mentioned by their real name (like "Sanket")
      for (const plainName of mentionedNames) {
        let mentionedUser = await userModel.findOne({ firstName: plainName });

        if (!mentionedUser) {
          await ctx.reply(`User ${plainName} not found in the database.`);
          continue;
        }

        // Update the appreciation counts for both the sender and the mentioned user
        await userModel.findOneAndUpdate({ tgId: from.id }, { $inc: { givenAppreciationCount: 1 } });
        await userModel.findOneAndUpdate({ tgId: mentionedUser.tgId }, { $inc: { receivedAppreciationCount: 1 } });

        // Immediate thank you reply
        await ctx.reply(`Thank you, ${from.first_name}, for appreciating ${plainName}! 🎉`);
      }
    }
  } catch (error) {
    console.error('Error handling message:', error);
    await ctx.reply('Facing difficulties. Please try again.');
  }
});

// Setting webhook
bot.telegram.setWebhook(process.env.WEBHOOK_URL).then(() => {
  console.log('Webhook set successfully');
  bot.launch();
}).catch((error) => {
  console.error('Error setting webhook:', error);
});

// Graceful stop on termination
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
