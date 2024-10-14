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
    await ctx.reply(`Hey!! ${from.first_name}, Welcome aboard. PostGen-Bot at your service!! I will be writing highly engaging social media posts for you. Just keep feeding me with the events throughout the day. Let's make an impact on social media.`);
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
bot.on(message('text'), async (ctx) => {
  const from = ctx.update.message.from; // The user who sent the message
  const message = ctx.update.message.text;
  console.log(`Received message from user ${from.id}: ${message}`);

  try {
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

    // Check if the message contains a mention of another user using @username
    const mentionedUsernames = message.match(/@[a-zA-Z0-9_]+/g);

    if (mentionedUsernames && mentionedUsernames.length > 0) {
      for (const mention of mentionedUsernames) {
        const mentionedUsername = mention.substring(1); // Remove the "@" symbol

        // Try to find the mentioned user in the database by username
        let mentionedUser = await userModel.findOne({ username: mentionedUsername });

        if (!mentionedUser) {
          // If the mentioned user is not found by username, try to match by their Telegram ID
          mentionedUser = await userModel.findOne({ tgId: ctx.update.message.reply_to_message?.from?.id });
          
          if (!mentionedUser) {
            // If no matching user by username or tgId, send a message that the user was not found
            await ctx.reply(`User @${mentionedUsername} not found in the database, and no alternative way to identify them.`);
            continue;
          }
        }

        // Update the appreciation counts for the sender and the mentioned user
        await userModel.findOneAndUpdate({ tgId: sender.tgId }, { $inc: { givenAppreciationCount: 1 } });
        await userModel.findOneAndUpdate({ tgId: mentionedUser.tgId }, { $inc: { receivedAppreciationCount: 1 } });

        // Immediate reply for appreciation acknowledgment
        await ctx.reply(`Thank you, ${from.first_name}, for appreciating @${mentionedUsername || mentionedUser.firstName || 'this user'}! 🎉`);
        
        console.log(`Updated appreciation counts: ${sender.username} gave appreciation, ${mentionedUsername} received appreciation.`);
      }
    } else {
      // If no mentions, do nothing or handle normal messages (if required)
      console.log(`No mentions in the message from user ${from.id}. Message: "${message}"`);
    }
  } catch (error) {
    console.error('Error handling message:', error);
    await ctx.reply('Facing difficulties. Please try again.');
  }
});


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
