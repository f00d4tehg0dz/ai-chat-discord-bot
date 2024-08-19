const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const mysql = require('mysql2');
const dotenv = require('dotenv');

dotenv.config();

const db = mysql.createPool({
  host: process.env.sqlHost,
  user: process.env.sqlUser,
  password: process.env.sqlPW,
  database: process.env.sqlDatabase,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

db.query(`
  CREATE TABLE IF NOT EXISTS flux (
    id INTEGER PRIMARY KEY AUTO_INCREMENT,
    user_id TEXT,
    prompt TEXT,
    response TEXT
  )
`);

async function queryHuggingFace(prompt) {
  const fetch = (await import('node-fetch')).default; // Dynamic import of node-fetch
  
  const response = await fetch(
    "https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-dev",
    {
      headers: {
        Authorization: `Bearer ${process.env.HUGGING_FACE_API_KEY}`,
        "Content-Type": "application/json",
      },
      method: "POST",
      body: JSON.stringify({ inputs: prompt }),
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to generate image: ${response.statusText}`);
  }

  const result = await response.blob();
  return result;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('generate')
    .setDescription('Generates an image from a text prompt using Flux')
    .addStringOption(option => option
      .setName('prompt')
      .setDescription('generate image prompt')
      .setRequired(true)
    ),
  
  async execute(interaction) {
    const prompt = interaction.options.getString('prompt');
    console.log('What to generate?', prompt);
    try {
      await interaction.reply("I'm generating... this can take up to 2 minutes...");

      const imageBlob = await queryHuggingFace(prompt);
      const buffer = Buffer.from(await imageBlob.arrayBuffer());

      const attachment = new AttachmentBuilder(buffer, {
        name: 'generated-image.png',
      });

      db.query(`INSERT INTO flux (user_id, prompt, response) VALUES (?, ?, ?)`, 
        [interaction.user.id, prompt, 'Image generated'], 
        function (error, results, fields) {
          if (error) throw error;
          interaction.editReply({
            content: 'Here is your image generated from the prompt: ' + prompt,
            files: [attachment],
          });
        });
      
    } catch (error) {
      console.error(error);
      await interaction.editReply({
        content: 'An error occurred while generating the image: ' + error.message,
      });
    }
  },
};