
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
//start
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
    await ctx.reply(`Hey!! ${from.first_name},Bot is Active to Appriciation`);
  } catch (error) {
    console.error('Error in start command:', error);
    await ctx.reply('Facing difficulties from server!');
  }
});

//

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
    const mentionedUsernames = message.match(/@[^\s@]+/g); // Match @ followed by any characters except space or another @

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

    // Process the first @username mention (we only need the first mention for this logic)
    const firstMention = mentionedUsernames[0].substring(1); // Get the first mentioned username

    // Look for the mentioned user by username in the database
    let mentionedUser = await userModel.findOne({ username: firstMention });

    if (!mentionedUser) {
      // If the mentioned user is not found by username, attempt a fallback mechanism
      console.log(`User @${firstMention} not found in the database.`);

      // Potential Fallback Logic:
      // Look for a user by tgId (assuming they may have changed their username)
      mentionedUser = await userModel.findOne({ tgId: from.id });

      if (mentionedUser) {
        // If found by tgId, update the username and notify the sender
        await userModel.updateOne(
          { tgId: from.id },
          { $set: { username: firstMention } }
        );
        console.log(`Updated username for user with tgId: ${from.id}`);

        await ctx.reply(
          `It seems @${firstMention} changed their username, and we've updated their details in the database. Thank you, @${sender.username || from.first_name}, for appreciating them! 🎉`
        );
      } else {
        // If no user found by tgId either, notify the sender
        await ctx.reply(`User @${firstMention} not found in the database. It may be that they haven't started the bot yet or their username has changed.`);
      }
      return;
    }

    // Update appreciation counts for both sender and mentioned user
    await userModel.findOneAndUpdate({ tgId: sender.tgId }, { $inc: { givenAppreciationCount: 1 } });
    await userModel.findOneAndUpdate({ tgId: mentionedUser.tgId }, { $inc: { receivedAppreciationCount: 1 } });

    // Reply thanking the sender for appreciating the mentioned user
    await ctx.reply(`Thank you, @${sender.username || from.first_name}, for appreciating @${firstMention}! 🎉`);
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
