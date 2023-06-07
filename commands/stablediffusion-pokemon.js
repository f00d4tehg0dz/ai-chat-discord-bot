//lambdal
//https://replicate.com/lambdal/text-to-pokemon

const axios = require('axios');
const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const dotenv = require('dotenv');
dotenv.config();

const mysql = require('mysql2');

// Connect to the database
const db = mysql.createPool({
  host: process.env.sqlHost,
  user: process.env.sqlUser,
  password: process.env.sqlPW,
  database: process.env.sqlDatabase,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Create the stableDiffusionPokemon table if it doesn't already exist
db.query(`
  CREATE TABLE IF NOT EXISTS stableDiffusionPokemon (
    id INTEGER PRIMARY KEY AUTO_INCREMENT,
    user_id TEXT,
    prompt TEXT,
    response TEXT
  )
`);

async function makePrediction(interaction, prompt) {
  // Set the options for the first POST request
  const data = {
    version: "ff6cc781634191dd3c49097a615d2fc01b0a8aae31c448e55039a04dcbf36bba",
    input: {
      "prompt": prompt.toString(),
      "guidance_scale": 7.5,
      "num_outputs": 1,
      "num_inference_steps": 50
    },
  };
  let timerCounter = setTimeout(async () => {
    await interaction.editReply({
      content: 'Your request has timed out. Please try again',
    });
  }, 15000);
  const dataStr = JSON.stringify(data, (_, v) => typeof v === 'bigint' ? v.toString() : v)
  const options = {
    method: 'post',
    url: process.env.stableDiffusionWaifu,
    headers: {
      'Authorization': 'Token 2778534c7a350dc76b3d77363b2f9615ac9990c4',
      'Content-Type': 'application/json'
    },
    version: "3554d9e699e09693d3fa334a79c58be9a405dd021d3e11281256d53185868912",
    data: dataStr
  };
  // Send the POST request
axios(options)
.then(async (response) => {
  const uuid = response.data.urls.get
  // console.log(response.data.urls.get)
  // Set the options for the second GET request
  const options2 = {
    method: 'GET',
    url: `${uuid}`,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Token 2778534c7a350dc76b3d77363b2f9615ac9990c4'
    },
  };

  const checkPredictionStatus = () => {
    axios(options2)
      .then(async (response2) => {

        let lastLine = '';
        console.log(response2.data.logs)
        if (response2.data.logs) {
          lastLine = response2.data.logs.slice(-1)[0];
        }
        // Check the prediction status
        if (response2.data.status === 'starting') {

          // Prediction is not yet complete, continue checking
          setTimeout(checkPredictionStatus, 1000); // delay for 1 second
        } else if (lastLine  === 'Potential'){
          interaction.editReply({
            content: 'NSFW content found with ' + prompt + '. Please be SFW',
          });

        } else if (response2.data.status === 'failed'){
          interaction.editReply({
            content: 'Unfortunately ' + prompt + ' has failed, please try a SFW option',
          });
          }
          else if (response2.data.status === 'processing'){
            setTimeout(checkPredictionStatus, 1000); // delay for 1 second

        } else {
          // Prediction is complete
          // Do something with the prediction output
          console.log(response2.data.output[0]);

          // Get the results from the API response
          const result = response2.data.output[0].toString();
          // const buffer = Buffer.from(result, 'base64');
          console.log(result)
          // Insert the prompt and user ID into the database
          db.query(`
            INSERT INTO stableDiffusionPokemon (user_id, prompt)
            VALUES (?, ?)
          `, [interaction.user.id, prompt]);

          // Edit the original message with the prediction result
          interaction.editReply({
            content: 'You asked ' + prompt,
            files: [new AttachmentBuilder(result, { name: 'pokemon.png' })],
          });
        }
      })


          .catch((error) => {
            console.log(error);
          });
      };
      clearTimeout(timerCounter)

      checkPredictionStatus();
    })
    .catch((error) => {
      console.log(error);
    });
}

module.exports = {
  // Set the data for the slash command
  data: new SlashCommandBuilder()
    .setName('pokemon')
    .setDescription('Generate a pokemon using Stable Diffusion 1.4')
    .addStringOption(option => option
      .setName('prompt')
      .setDescription('generate image prompt')
    ),
  // Function to execute the slash command
  async execute(interaction) {
      // Get the prompt from the command options
      const prompt = interaction.options.getString('prompt');
        console.log('What to generate?', prompt);
        try {
          // Send a message to indicate that the image is being generated
          interaction.deferReply("I'm generating...");
          // Start the socket connection and make the request to the Stable Diffusion API
          makePrediction(interaction, prompt)
        } catch (error) {
           interaction.deferReply('Sorry, please try again');
          console.error(error);

        }
  },
};
