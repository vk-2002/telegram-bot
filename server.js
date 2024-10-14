import { Telegraf } from "telegraf";
import { message } from "telegraf/filters";
import OpenAI from 'openai';
import userModel from './src/models/User.js';
import eventModel from './src/models/Event.js';
import connectDb from './src/config/db.js';
import express from 'express';

const app = express();
//created bot instance. so, we will get different methods and commands to work upon. 
const bot = new Telegraf(process.env.BOT_TOKEN);
app.use(express.json());
app.use(bot.webhookCallback('/'));

//Uptime Robot or similar services can ping this endpoint. 
app.get('/', (req, res) => {
  res.status(200).send('PostGen-Bot is up and running');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_KEY,
});

// MongoDB connection and error handling
connectDb()
  .then(() => {
    console.log('MongoDb database connected successfully');
  })
  .catch((error) => {
    console.error('MongoDB connection error:', error.message);
    console.error('Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
    process.exit(1);
  });

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Telegraf bot commands and handlers
//ctx(context) is passed to get telegram user data who started this bot.
bot.start(async (ctx) => {
   //store the information of user in DB i.e MongoDb and import it from user.js file
  const from = ctx.update.message.from;
  console.log('User started the bot:', from);
/*if we use create method instead of findOneAndupdate then user can start the bot many times */
  try {
    const user = await userModel.findOneAndUpdate(
      { tgId: from.id },
      {    // Update user details
        $set: {
          firstName: from.first_name,
          lastName: from.last_name,
          isBot: from.is_bot,
         // Handle undefined username, if it is not provided as not all Telegram users have a username set in their profile.
          username: from.username || '', 
        }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }   // Create if not exists
    );

    if (user.createdAt === user.updatedAt) {
      console.log('New user created:', user);
    } else {
      console.log('Existing user updated:', user);
    }

    //after storing data, it will reply 
    await ctx.reply(`Hey!! ${from.first_name}, Hello Guys Welcome To Appreciation Group`);
  } catch (error) {
    console.error('Error in start command:', error);
    await ctx.reply('Facing difficulties from server!');
  }
});

bot.help((ctx) => {
  ctx.reply('For help, contact the support team or admin :)');
});
//to check Bot is responsive or not. 
bot.command('start', (ctx) => {
  ctx.reply('Welcome to bot.');
});


//edited
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

// Start the bot
bot.launch();



//

bot.command('appreciation', async (ctx) => {
  const from = ctx.update.message.from;

  try {
    const user = await userModel.findOne({ tgId: from.id });
    if (!user) {
      await ctx.reply('User not found.');
      return;
    }

    const appreciationStats = `
    👍 You have appreciated others ${user.givenAppreciationCount} times.
    🎉 You have been appreciated ${user.receivedAppreciationCount} times.
    `;

    await ctx.reply(appreciationStats);
  } catch (error) {
    console.error('Error in /appreciation command:', error);
    await ctx.reply('Unable to fetch appreciation stats.');
  }
});



// Setting webhook for bot launch
bot.telegram.setWebhook(process.env.WEBHOOK_URL).then(() => {
  console.log('Webhook set successfully');
  bot.launch();  // starts listening for updates

}).catch((error) => {
  console.error('Error setting webhook:', error);
});

// Graceful stops to handle termination signals properly
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
