import { Telegraf } from "telegraf";
import { message } from "telegraf/filters"
import OpenAI from 'openai';
import userModel from './src/models/User.js'
import eventModel from './src/models/Event.js'
import connectDb from './src/config/db.js';

//created bot and openai instance. so, we will get different methods and commands to work upon. 
const bot = new Telegraf(process.env.BOT_TOKEN);

const openai = new OpenAI({
    apiKey: process.env['OPENAI_KEY'], // This is the default and can be omitted
});

// Ensure webhook is removed before using long polling
bot.telegram.deleteWebhook();

//for MongoDb connection
try {
    connectDb();
    console.log("MongoDb database connected successfully")
} catch (error) {
    console.log(error);
    process.kill(process.pid, 'SIGTERM')
}

//ctx(context) is passed to get telegram user data who started this bot.
bot.start(async (ctx) => {
    //store the information of user in DB i.e MongoDb and import it from user.js file
    const from = ctx.update.message.from;
    console.log('from', from);
    /*if we use create method instead of findOneAndupdate then user can start the bot many times */
    try {
        await userModel.findOneAndUpdate({ tgId: from.id },
            {                           // Update user details
                $setOnInsert: {
                    firstName: from.first_name,
                    lastName: from.last_name,
                    isBot: from.is_bot,
                    username: from.username
                }
            }, { upsert: true, new: true }); // Create if not exists, return new doc/record

        //after storing data, it will reply 
        await ctx.reply(`Hey!! ${from.first_name}, Welcome aboard. PostGen-Bot at your service!! I will be writing highly engaging social media post for you Just keep feeding me with the events throughout the day. 
            Let's make an impact on social media. `);
    } catch (error) {
        console.log(error);
        await ctx.reply("facing difficulties from server!");

    }
});

bot.help((ctx) => {
    ctx.reply('For help, contact the support team or admin :)');
})

// function to count characters.
function addCharacterCount(post) {
    const count = post.length;
    return `${post}\n\nCharacter count: ${count}`;
}

//we have to keep bot.command above bot.on. so,if generate is command,then it will be captured easily rather than as a text.
bot.command('generate', async (ctx) => {
    const from = ctx.update.message.from;

    // waitingMessageId is an alias
    const { message_id: waitingMessageId } = await ctx.reply(` Hey! ${from.first_name}, kindly wait for a moment.I am curating posts for you...`)
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
            $lte: endOfDay
        }
    })

    if (events.length === 0) {

        await ctx.deleteMessage(waitingMessageId);
        await ctx.reply('No events found for a day.')
        return;
    }

    console.log('events', events);
    //make an openai api call

    try {
        const chatCompletion = await openai.chat.completions.create({
            model: process.env.OPENAI_MODEL, // Specified model in .env
            messages: [
                {
                    role: 'system',
                    content: 'Act as a senior copywriter and social media strategist. Write highly engaging,short, crisp, and unique posts for LinkedIn, Instagram and Twitter(x) using provided thoughts/events throughout the day. Tailor each post to the platforms unique audience and style.'
                },
                {
                    role: 'user',
                    content: `Write like a human, for humans. Craft three engaging,short, crisp, and unique social media posts
                     tailored for LinkedIn, Instagram, and Twitter(x) audiences. Use simple, conversational,authentic writing language with a dash of humor. 
                     Use given time labels just to understand the order of the event, don't mention the time in the posts. 
                     Each post should creatively highlight the following events. Ensure the tone is conversational and impactful and requests emojis at the end of each post, if necessary.
                      Focus on engaging the respective platform's audience, encouraging interaction and driving 
                      interest in the events:\n
                    ${events.map((event) => event.text).join(', ')}`
                }
            ]
        });
        console.log('completion:', chatCompletion);

        //store token count to track user usage
        await userModel.findOneAndUpdate({
            tgId: from.id
        }, {
            $inc: {
                promptTokens: chatCompletion.usage.prompt_tokens,
                completionTokens: chatCompletion.usage.completion_tokens
            }
        });

        await ctx.deleteMessage(waitingMessageId);

        // Split the response into individual posts
        const posts = chatCompletion.choices[0].message.content.split('\n\n');

        // Send each post separately with character count
        for (let post of posts) {
            if (post.trim()) {  //Check if the post is not empty as for each non-empty post, it adds the character count.
                const postWithCount = addCharacterCount(post.trim());
                await ctx.reply(postWithCount);
            }
        }


    } catch (error) {
        console.error('Error during OpenAI completion:', error);
        await ctx.reply("Facing difficulties during generation");
    }

});

bot.on(message('text'), async (ctx) => {
    //whenever a message will arrived, we will get user information first.Then further, we will extract text.
    const from = ctx.update.message.from;
    const message = ctx.update.message.text;

    try {
        await eventModel.create({
            text: message,
            tgId: from.id
        })

        await ctx.reply("Noted :) keep texting me your thoughts. To generate the post, just enter the command: /generate");
    } catch (error) {
        console.log(error);
        await ctx.reply("facing difficulties. Please try again.")
    }
});

bot.launch();//starts listening for updates.

//enable gracefull stops to handle termination signals properly.
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));