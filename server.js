import { Telegraf } from "telegraf";
import { message } from "telegraf/filters";
import userModel from './src/models/User.js';

// Initialize bot with token
const bot = new Telegraf(process.env.BOT_TOKEN);

// Handle message mentioning users
bot.on(message('text'), async (ctx) => {
  const from = ctx.update.message.from; // User who sent the message
  const messageText = ctx.update.message.text.trim(); // The message text

  try {
    // Ensure the sender exists in the database
    let sender = await userModel.findOne({ tgId: from.id });
    if (!sender) {
      sender = await userModel.create({
        tgId: from.id,
        firstName: from.first_name,
        lastName: from.last_name,
        username: from.username || '', // Handle users without a username
      });
    }

    // Extract @username mentions and capitalized names (real names)
    const mentionedUsernames = messageText.match(/@[a-zA-Z0-9_]+/g); // For @mentions
    const mentionedNames = messageText.match(/\b[A-Z][a-z]+\b/g); // For capitalized names (like real names)

    // Ignore common words (e.g., "Thanks", "Dear")
    const ignoredWords = ['Thanks', 'Thank', 'Dear', 'Hello', 'Hi'];
    const filteredNames = mentionedNames ? mentionedNames.filter(name => !ignoredWords.includes(name)) : [];

    // Handle mentions by @username
    if (mentionedUsernames && mentionedUsernames.length > 0) {
      for (const mention of mentionedUsernames) {
        const mentionedUsername = mention.substring(1); // Remove the "@" symbol
        let mentionedUser = await userModel.findOne({ username: mentionedUsername });

        if (mentionedUser) {
          await ctx.reply(`Thank you, ${from.first_name}, for appreciating @${mentionedUsername}! 🎉`);
        } else {
          await ctx.reply(`User @${mentionedUsername} not found.`);
        }
      }
    }

    // Handle mentions by real name (plain name)
    if (filteredNames && filteredNames.length > 0) {
      for (const plainName of filteredNames) {
        let mentionedUser = await userModel.findOne({ firstName: plainName });

        if (mentionedUser) {
          await ctx.reply(`Thank you, ${from.first_name}, for appreciating ${plainName}! 🎉`);
        } else {
          await ctx.reply(`User ${plainName} not found.`);
        }
      }
    }

  } catch (error) {
    console.error('Error handling message:', error);
    await ctx.reply('Facing difficulties. Please try again.');
  }
});
bot.telegram.setWebhook(process.env.WEBHOOK_URL).then(() => {
  console.log('Webhook set successfully');
  bot.launch();  // starts listening for updates

}).catch((error) => {
  console.error('Error setting webhook:', error);
});

// Graceful stops to handle termination signals properly
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
// Start the bot
bot.launch();
