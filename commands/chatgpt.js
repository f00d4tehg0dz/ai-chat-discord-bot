const sqlite3 = require('sqlite3');
const dotenv = require('dotenv');
const { SlashCommandBuilder } = require('discord.js');

dotenv.config();

// Connect to the SQLite database
const db = new sqlite3.Database('conversation.db');

// Create the conversation table if it doesn't exist
db.run(`
  CREATE TABLE IF NOT EXISTS conversation (
    id INTEGER PRIMARY KEY,
    user_id TEXT,
    prompt TEXT,
    response TEXT
  )
`);

let conversationContext;

const ChatGPT = import('../node_modules/chatgpt/build/index.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('chatgpt')
    .setDescription('Generates a response using the unofficial OpenAI CHATGPT API.')
    .addStringOption(option =>
      option.setName('prompt')
      .setDescription('ask CHATGPT')),
  async execute(interaction) {
    await interaction.reply("I'm thinking...");

    const api = new(await ChatGPT).ChatGPTAPIBrowser({
      email: process.env.OPENAI_EMAIL,
      password: process.env.OPENAI_PASSWORD,
      debug: false,
      minimize: true
    });
    await api.initSession();

    const prompt = interaction.options.getString('prompt');
    console.log("What was asked?", prompt);

    try {
      // Use chatGPT to generate a response
      const result = await api.sendMessage(prompt, {
        context: conversationContext
      });

      const conversationId = result.conversationId;
      const parentMessageId = result.messageId;

      // Insert the prompt and response into the database
      db.run(`
        INSERT INTO conversation (user_id, prompt, response)
        VALUES (?, ?, ?)
      `, [interaction.user.id, prompt, result.response]);

      // Save the new conversation context
      conversationContext = result.context;
      interaction.editReply(result.response);
    } catch (e) {
      interaction.editReply("Something went wrong");
      console.error(`/ask error: ${e}`);
    }
  }
};
