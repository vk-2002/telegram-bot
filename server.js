import http from 'http';
import express from 'express';
import { Telegraf } from 'telegraf';
import OpenAI from 'openai';
import userModel from './src/models/User.js';
import eventModel from './src/models/Event.js';
import connectDb from './src/config/db.js';

const app = express();

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('OK');
});

server.listen(process.env.PORT || 3000, () => {
  console.log(`Server running on port ${process.env.PORT || 3000}`);
});

// Create bot and OpenAI instance
const bot = new Telegraf(process.env.BOT_TOKEN);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_KEY,
});

// MongoDB connection
connectDb()
  .then(() => {
    console.log('MongoDb database connected successfully');

    // Bot commands and handlers
    bot.start(async (ctx) => {
      const from = ctx.update.message.from;
      console.log('from', from);
      try {
        await userModel.findOneAndUpdate(
          { tgId: from.id },
          {
            $setOnInsert: {
              firstName: from.first_name,
              lastName: from.last_name,
              isBot: from.is_bot,
              username: from.username,
            },
          },
          { upsert: true, new: true }
        );

        await ctx.reply(
          `Hey!! ${from.first_name}, Welcome aboard. PostGen-Bot at your service!! I will be writing highly engaging social media posts for you. Just keep feeding me with the events throughout the day. Let's make an impact on social media.`
        );
      } catch (error) {
        console.log(error);
        await ctx.reply('Facing difficulties from server!');
      }
    });

    bot.help((ctx) => {
      ctx.reply('For help, contact the support team or admin :)');
    });

    // Function to count characters
    function addCharacterCount(post) {
      const count = post.length;
      return `${post}\n\nCharacter count: ${count}`;
    }

    bot.command('generate', async (ctx) => {
      const from = ctx.update.message.from;

      const { message_id: waitingMessageId } = await ctx.reply(
        ` Hey! ${from.first_name}, kindly wait for a moment. I am curating posts for you...`
      );

      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

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

      try {
        const chatCompletion = await openai.chat.completions.create({
          model: process.env.OPENAI_MODEL,
          messages: [
            {
              role: 'system',
              content:
                "Act as a senior copywriter and social media strategist. Write highly engaging, short, crisp, and unique posts for LinkedIn, Instagram, and Twitter(x) using provided thoughts/events throughout the day. Tailor each post to the platform's unique audience and style.",
            },
            {
              role: 'user',
              content: `Write like a human, for humans. Craft three engaging, short, crisp, and unique social media posts tailored for LinkedIn, Instagram, and Twitter(x) audiences. Use simple, conversational, authentic writing language with a dash of humor. Use given time labels just to understand the order of the event, don't mention the time in the posts. Each post should creatively highlight the following events. Ensure the tone is conversational and impactful and requests emojis at the end of each post, if necessary. Focus on engaging the respective platform's audience, encouraging interaction and driving interest in the events:\n${events.map((event) => event.text).join(', ')}`,
            },
          ],
        });

        await userModel.findOneAndUpdate(
          { tgId: from.id },
          {
            $inc: {
              promptTokens: chatCompletion.usage.prompt_tokens,
              completionTokens: chatCompletion.usage.completion_tokens,
            },
          }
        );

        await ctx.deleteMessage(waitingMessageId);

        const posts = chatCompletion.choices[0].message.content.split('\n\n');

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

    bot.on('text', async (ctx) => {
      const from = ctx.update.message.from;
      const message = ctx.update.message.text;

      try {
        await eventModel.create({
          text: message,
          tgId: from.id,
        });

        await ctx.reply(
          'Noted :) Keep texting me your thoughts. To generate the post, just enter the command: /generate'
        );
      } catch (error) {
        console.log(error);
        await ctx.reply('Facing difficulties. Please try again.');
      }
    });

    bot.launch(); // starts listening for updates using long polling

    process.once('SIGINT', () => bot.stop('SIGINT'));
    process.once('SIGTERM', () => bot.stop('SIGTERM'));
  })
  .catch((error) => {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  });

// Keeping the HTTP server alive to prevent idling
app.listen(process.env.PORT || 3000, () => {
  console.log(`Server is running on port ${process.env.PORT || 3000}`);
});
