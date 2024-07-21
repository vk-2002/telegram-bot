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
bot.command('ping', (ctx) => {
  ctx.reply('Pong!! Bot is responsive.');
});

// Function to count characters
function addCharacterCount(post) {
  const count = post.length;
  return `${post}\n\nCharacter count: ${count}`;
}

//we have to keep bot.command above bot.on. so,if generate is command,then it will be captured easily rather than as a text.
bot.command('generate', async (ctx) => {
  const from = ctx.update.message.from;

  const { message_id: waitingMessageId } = await ctx.reply(`Hey! ${from.first_name}, kindly wait for a moment. I am curating posts for you...`);
  console.log('messageId', waitingMessageId);

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  // get events from user
  const events = await eventModel.find({
    tgId: from.id,
    createdAt: {
      $gte: startOfDay,
      $lte: endOfDay,
    },
  });

  if (events.length === 0) {
    await ctx.deleteMessage(waitingMessageId);
    await ctx.reply('No events found for today.');
    return;
  }

  console.log('events', events);

    //make an openai api call
  try {
    const chatCompletion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL,
      messages: [
        {
          role: 'system',
          content: 'Act as a senior copywriter and social media strategist. Write highly engaging, short, crisp and unique SEO friendly posts for LinkedIn, Instagram and Twitter(x) using provided thoughts/events throughout the day. Tailor each SEO friendly post to the platforms unique audience and style.',
        },
        {
          role: 'user',
          content: `Write like a human, for humans. Craft three engaging, short, crisp and unique SEO friendly social media posts tailored for LinkedIn, Instagram and Twitter(x) audiences. Use simple, conversational, authentic writing language with a dash of humor. Use given time labels just to understand the order of the event, don't mention the time in the posts. Each SEO friendly post should creatively highlight the following events. Ensure the tone is conversational and impactful and requests emojis at the end of each SEO friendly post, if necessary. Focus on engaging the respective platform's audience, encouraging interaction and driving interest in the events:\n${events.map((event) => event.text).join(', ')}`,
        }
      ],
    });

     //store token count to track user usage
    await userModel.findOneAndUpdate({
      tgId: from.id,
    }, {
      $inc: {
        promptTokens: chatCompletion.usage.prompt_tokens,
        completionTokens: chatCompletion.usage.completion_tokens,
      }
    });

    await ctx.deleteMessage(waitingMessageId);

    // Split the response into individual posts
    const posts = chatCompletion.choices[0].message.content.split('\n\n');

    // Send each post separately with character count.
    for (let post of posts) {
      if (post.trim()) {
        const postWithCount = addCharacterCount(post.trim());
        await ctx.reply(postWithCount);
      }
    }
  } catch (error) {
    console.error('Error during OpenAI completion:', error);
    await ctx.reply('Facing difficulties during generation');
  }
});

bot.on(message('text'), async (ctx) => {
   //whenever a message will arrived, we will get user information first.Then further, we will extract text.
  const from = ctx.update.message.from;
  const message = ctx.update.message.text;
  console.log(`Received message from user ${from.id}: ${message}`);

  try {
    // Ensure user exists
    let user = await userModel.findOne({ tgId: from.id });
    if (!user) {
      //New users are created if they somehow bypass the start command.
      user = await userModel.create({
        tgId: from.id,
        firstName: from.first_name,
        lastName: from.last_name,
        isBot: from.is_bot,
        username: from.username,
      });
      console.log('Created new user in message handler:', user);
    }

    const newEvent = await eventModel.create({
      text: message,
      tgId: from.id,
    });
    console.log('New event created:', newEvent);

    await ctx.reply('Noted :) Keep texting me your thoughts. To generate the post, just enter the command: /generate');
  } catch (error) {
    console.error('Error handling message:', error);
    await ctx.reply('Facing difficulties. Please try again.');
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
