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

// Bot start command
bot.start(async (ctx) => {
  const from = ctx.update.message.from;
  console.log('User started the bot:', from);

  try {
    const user = await userModel.findOneAndUpdate(
      { tgId: from.id },
      {    // Update user details
        $set: {
          firstName: from.first_name,
          lastName: from.last_name,
          isBot: from.is_bot,
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

    await ctx.reply(`Hey!! ${from.first_name}, Bot is Active for Appreciation.`);
  } catch (error) {
    console.error('Error in start command:', error);
    await ctx.reply('Facing difficulties from server!');
  }
});

// Handling text messages in group chats
bot.on('text', async (ctx) => {
  const from = ctx.update.message.from;
  const message = ctx.update.message.text.trim();
  const chatType = ctx.update.message.chat.type;

  console.log(`Received message from user ${from.id}: ${message} in chat type: ${chatType}`);

  if (chatType !== 'group' && chatType !== 'supergroup') {
    return;
  }

  try {
    const mentionedUsernames = message.match(/@[a-zA-Z0-9_]+/g); // @username mentions
    const mentionedNames = message.match(/\b[A-Z][a-z]+\b/g); // Capitalized words as names

    // Ensure the sender exists in the database or create them
    let sender = await userModel.findOneAndUpdate(
      { tgId: from.id },
      {
        $setOnInsert: {
          tgId: from.id,
          firstName: from.first_name,
          lastName: from.last_name,
          isBot: from.is_bot,
          username: from.username || '',
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Handle @username mentions
    if (mentionedUsernames) {
      for (const mention of mentionedUsernames) {
        const mentionedUsername = mention.substring(1); // Remove @ symbol

        // Find or create the mentioned user
        let mentionedUser = await userModel.findOneAndUpdate(
          { username: mentionedUsername },
          {
            $setOnInsert: { username: mentionedUsername },
          },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        // Increment appreciation counts
        await userModel.findOneAndUpdate({ tgId: sender.tgId }, { $inc: { givenAppreciationCount: 1 } });
        await userModel.findOneAndUpdate({ tgId: mentionedUser.tgId }, { $inc: { receivedAppreciationCount: 1 } });

        // Reply in the group thanking the user for appreciating the mentioned user
        await ctx.reply(`Thank you, ${from.first_name}, for appreciating @${mentionedUsername}! 🎉`);

        // Confirmation message in the group chat
        await ctx.reply(`${from.first_name}, your appreciation for @${mentionedUsername} has been calculated!`);
      }
    }

    // Handle plain names (non-@ mentions)
    if (mentionedNames && mentionedNames.length > 0) {
      for (const plainName of mentionedNames) {
        let mentionedUser = await userModel.findOneAndUpdate(
          { firstName: plainName },
          {
            $setOnInsert: { firstName: plainName },
          },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        // Increment appreciation counts
        await userModel.findOneAndUpdate({ tgId: sender.tgId }, { $inc: { givenAppreciationCount: 1 } });
        await userModel.findOneAndUpdate({ tgId: mentionedUser.tgId }, { $inc: { receivedAppreciationCount: 1 } });

        // Reply in the group thanking the user for appreciating the mentioned person by name
        await ctx.reply(`Thank you, ${from.first_name}, for appreciating ${plainName}! 🎉`);

        // Confirmation message in the group chat
        await ctx.reply(`${from.first_name}, your appreciation for ${plainName} has been calculated!`);
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
