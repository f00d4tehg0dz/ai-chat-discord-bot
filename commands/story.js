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
  queueLimit: 0
});
// Create the conversation table if it doesn't exist
db.query(`
  CREATE TABLE IF NOT EXISTS conversation (
    id INTEGER PRIMARY KEY AUTO_INCREMENT,
    user_id TEXT,
    prompt TEXT,
    response TEXT
  )
`);

let conversationActive = false;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('story')
    .setDescription('Generates a Story.')
    .addStringOption(option =>
      option.setName('prompt')
      .setDescription('ask StoryBot')),
  async execute(interaction) {
    conversationActive = true;
    await interaction.reply("I'm thinking...");

    const prompt = interaction.options.getString('prompt');
    console.log("What was asked?", prompt);

    try {
      if (conversationActive) {
          const completion = await openai.createCompletion({
            model: "text-davinci-003",
            prompt: prompt,
          });
          console.log(completion.data.choices[0].text);
          completion.data.choices[0].text.then(response => {
            // Insert the prompt and response into the database
      db.query(`
      INSERT INTO conversation (user_id, prompt, response)
      VALUES (?, ?, ?)
    `, [interaction.user.id, prompt, result.response]);

          interaction.editReply(response);
        });

      }
    }  catch (error) {
      if (error.response) {
        interaction.editReply("Something went wrong");
        console.log(error.response.status);
        console.log(error.response.data);
      } else {
        interaction.editReply("Something went wrong");
        console.log(error.message);
      }
    };
  }
};
