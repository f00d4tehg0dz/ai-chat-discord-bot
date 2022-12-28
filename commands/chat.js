const mysql = require('mysql2');
const dotenv = require('dotenv');
const { SlashCommandBuilder } = require('discord.js');
const { Configuration, OpenAIApi } = require("openai");

dotenv.config();

const configuration = new Configuration({
  apiKey: process.env.api_key,
});

const openai = new OpenAIApi(configuration);

const db = mysql.createPool({
  host: process.env.sqlHost,
  user: process.env.sqlUser,
  password: process.env.sqlPW,
  database: process.env.sqlDatabase,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

db.query(`
  CREATE TABLE IF NOT EXISTS conversation (
    id INTEGER PRIMARY KEY AUTO_INCREMENT,
    user_id TEXT,
    prompt TEXT,
    response TEXT
  )
`);
let tokenCounter = 0;
module.exports = {
  data: new SlashCommandBuilder()
    .setName('chat')
    .setDescription('Ask me anything, or have a conversation!')
    .addStringOption(option =>
      option.setName('prompt')
      .setDescription('input here')),
      async execute(interaction) {
        interaction.deferReply("Thinking...");
        let prompt = interaction.options.getString('prompt');
        tokenCounter += 1; // Increment the token counter for the prompt

        // Check if the token counter has reached the maximum number of tokens
        if (tokenCounter >= 100) {
          interaction.reply("You've reached the maximum number of tokens. The conversation has ended.");
          return; // Stop the function
        }

        try {
          const completion = await openai.createCompletion({
            model: "text-davinci-003",
            prompt: prompt,
            temperature: 0,
            max_tokens: 100,
            top_p: 1,
            frequency_penalty: 0.2,
            presence_penalty: 0,
          });
          console.log(prompt);

          db.query(`
            INSERT INTO conversation (user_id, prompt, response)
            VALUES (?, ?, ?)
          `, [interaction.user.id, prompt, completion.data.choices[0].text.substring(1)]);

          interaction.editReply(completion.data.choices[0].text.substring(1));
          prompt += `${completion.data.choices[0].text}\n`;

          // Increment the token counter for the completion
          tokenCounter += completion.data.choices[0].text.split(' ').length;

          // Check if the token counter has reached the maximum number of tokens
          if (tokenCounter >= 100) {
            conversationActive = false;
            interaction.editReply("You've reached the maximum number of tokens. The conversation has ended.");
            return; // Stop the function
          }

          // Prompt the user for their next input
           prompt = await interaction.followUp(`${completion.data.choices[0].text.substring(1)}What's your next question or statement?`);

          // Check if the user wants to end the conversation
          if (prompt === "end conversation") {
            conversationActive = false;
            interaction.editReply("Conversation ended.");
          }
        } catch (error) {
          if (error.response) {
            interaction.editReply("Something went wrong");
            console.log(error.response.status);
            console.log(error.response.data);
          } else {
            interaction.editReply("Something went wrong");
            console.log(error.message);
          }
        }
      }
    }
