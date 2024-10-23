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
    // Extract any words (not just @username) and check against database
    const messageWords = message.split(/\s+/); // Split message into words
    console.log('Message words:', messageWords);

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

    // Check each word against user database (username, firstName, lastName)
    for (let word of messageWords) {
      word = word.replace('@', ''); // Strip out @ symbols to check the word directly
      let mentionedUser = await userModel.findOne({ 
        $or: [
          { username: word }, 
          { firstName: word }, 
          { lastName: word }
        ]
      });

      if (mentionedUser) {
        console.log(`Mentioned user found in DB: @${mentionedUser.username || mentionedUser.firstName}`);

        // Update appreciation counts
        await userModel.findOneAndUpdate({ tgId: sender.tgId }, { $inc: { givenAppreciationCount: 1 } });
        await userModel.findOneAndUpdate({ tgId: mentionedUser.tgId }, { $inc: { receivedAppreciationCount: 1 } });

        // Reply to thank the sender
        await ctx.reply(`Thank you, @${sender.username || from.first_name}, for appreciating @${mentionedUser.username || mentionedUser.firstName}! 🎉`);
        return;  // Stop after first successful mention
      }
    }

    console.log('No mentioned users found in DB');
    await ctx.reply('No valid users found in your message. Please ensure the username is correct or that they have started the bot.');
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
