const request = require('request');
const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const dotenv = require('dotenv');
dotenv.config();

const mysql = require('mysql2');

const db = mysql.createPool({
  host: process.env.sqlHost,
  user: process.env.sqlUser,
  password: process.env.sqlPW,
  database: process.env.sqlDatabase,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Create the stableDiffusionPremium table if it doesn't already exist
db.query(`
  CREATE TABLE IF NOT EXISTS stableDiffusionPremium (
    id INTEGER PRIMARY KEY AUTO_INCREMENT,
    user_id TEXT,
    prompt TEXT,
    response TEXT
  )
`);

// Function to start the socket connection and make the request to the Stable Diffusion API
async function startSocket(interaction, prompt) {
  // Set a timeout for the request
  let timerCounter = setTimeout(async () => {
    await interaction.editReply({
      content: 'Your request has timed out. Please try again',
    });
  }, 129000)

  // Set the options for the request to the Stable Diffusion API
  const options = {
    method: 'POST',
    url: process.env.stableDiffusionEnv,
    headers: {
      'Content-Type': 'application/json'
    },
    body: {
      // "init_images": [
      //   "1"
      // ],
      // "resize_mode": 0,
      // "denoising_strength": 0.75,
      // "mask": false,
      // "mask_blur": 4,
      // "inpainting_fill": 0,
      // "inpaint_full_res": true,
      // "inpaint_full_res_padding": 0,
      // "inpainting_mask_invert": 0,
      // "initial_noise_multiplier": 0,
      "name": prompt,
      "prompt": prompt,
      // "styles": [
      //   "None"
      // ],
      // "seed": -1,
      // "subseed": -1,
      // "subseed_strength": 0,
      "seed_resize_from_h": -1,
      "seed_resize_from_w": -1,
      "sampler_name": "Euler",
      "batch_size": 1,
      "n_iter": 4,
      "steps": 20,
      "cfg_scale": 7,
      "width": 768,
      "height": 768,
      // "restore_faces": false,
      // "tiling": false,
      // "negative_prompt": false,
      // "eta": 0,
      // "s_churn": 0,
      // "s_tmax": 0,
      // "s_tmin": 0,
      // "s_noise": 1,
      // "override_settings": {},
      // "sampler_index": "Euler",
      // "include_init_images": false,
    },
    json: true
  };

  request(options, async function (error, response, body) {
    // try{
    //   console.log(response)
    //   if (response === '200') {
    //     interaction.editReply({
    //       content: `Average Duration ${avgDuration}`,
    //     });
    //   }
    //   else {

    //   }
    // }
    //  catch (error) {
    //   console.log(error)
    //   // Edit the reply with an error message if there is a problem
    //    interaction.editReply({
    //     content: 'There was an error with your request. Please try again',
    //   });
    // }
    try {
      if (error) throw new Error(error);
      console.log(response)
      // Clear the timeout
      clearTimeout(timerCounter)
      // Get the results from the API response
      const duration = response.duration;
      const avgDuration = response.average_duration;
      const results = body.images;
      // console.log(results)
      const attachments = [];
      // const resultsToString = [results].toString();
      for (let i = 0; i < results.length; i++) {
        const data = results[i];
        const buffer = Buffer.from(data, 'base64');
        const attachment = new AttachmentBuilder(buffer, {
          name: 'patreon.png',
        });
        attachments.push(attachment);
      }
    db.query(`
      INSERT INTO stableDiffusionPremium (user_id, prompt)
      VALUES (?, ?)
    `, [interaction.user.id, prompt]);

    await interaction.editReply({
      //content: `I take on average ${avgDuration} seconds. To generate ${prompt} I took ${duration}`,
      content: `You asked me for ${prompt}`,
      files: attachments,
    });
   } catch (error) {
      console.log(error)
      // Edit the reply with an error message if there is a problem
       interaction.editReply({
        content: 'There was an error with your request. Please try again',
      });
    }
  });
}


module.exports = {
  // Set the data for the slash command
  data: new SlashCommandBuilder()
    .setName('patreon')
    .setDescription('Generates an image from a text prompt using Stable Diffusion 2.1')
    .addStringOption(option => option
      .setName('prompt')
      .setDescription('generate image prompt')
    ),
  // Function to execute the slash command
  async execute(interaction) {
    // Get the user's premium role from the database
    db.query('SELECT premiumRole FROM users WHERE user_id = ?', [interaction.user.id], async (error, rows) => {
      if (error) {
        console.error(error);
        return interaction.reply('There was an error fetching your premium role from the database.');
      }

      let premiumRole;
      if (rows && rows.length > 0) {
        premiumRole = rows[0].premiumRole;
      } else {
        premiumRole = 'Supporter';
      }

      // Check if the user has the "member" or "super supporter" premium role
      if (premiumRole === 'Member' || premiumRole === 'Super Supporter') {
        // Get the prompt from the command options
        const prompt = interaction.options.getString('prompt');
          console.log('What to generate?', prompt);
          try {
            // Send a message to indicate that the image is being generated
            interaction.deferReply("I'm generating...");
            // Start the socket connection and make the request to the Stable Diffusion API
             startSocket(interaction, prompt)
          } catch (error) {
            console.error(error);

          }
        } else {
          // The member does not have the "Premium Command Access" role, so they cannot use the premium command
          await interaction.reply('Sorry, this command is only available to our Patreon supporters. Consider becoming a patron to access premium content and support the development of our bot. You can learn more about Patreon and our tiers at '+process.env.Patreon);

          }
    });
  },
};
