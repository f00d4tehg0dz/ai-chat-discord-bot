const request = require('request');
const imageDataUri = require("image-data-uri")
const {
  SlashCommandBuilder,
  AttachmentBuilder
} = require('discord.js');
const dotenv = require('dotenv');
dotenv.config();

let imageURI;

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

// Create the stableDiffusionImg2ImgPremium table if it doesn't already exist
db.query(`
  CREATE TABLE IF NOT EXISTS stableDiffusionImg2ImgPremium (
    id INTEGER PRIMARY KEY AUTO_INCREMENT,
    user_id TEXT,
    prompt TEXT,
    response TEXT
  )
`);




// Function to start the socket connection and make the request to the Stable Diffusion API
async function startSocket(interaction, prompt, attachmentURL) {
  // Set a timeout for the request
  let timerCounter = setTimeout(async () => {
    await interaction.editReply({
      content: 'Your request has timed out. Please try again',
    });
  }, 129000)
  const getImageURIArr = () => {
    return imageDataUri.encodeFromURL(attachmentURL)
      .then(res => {
        imageURI = res;
        return res;
      })
      .catch(error => {
        console.error(error);
      });
  };
  await getImageURIArr()

  const options = {
    method: 'POST',
    url: process.env.stableDiffusionImg2ImgEnv,
    headers: {
      'Content-Type': 'application/json'
    },
    body: {
      "init_images": [
        imageURI
      ],
      "name": prompt,
      "prompt": prompt,
      "seed_resize_from_h": -1,
      "seed_resize_from_w": -1,
      "sampler_name": "Euler",
      "batch_size": 1,
      "n_iter": 4,
      "steps": 20,
      "cfg_scale": 7,
      "width": 768,
      "height": 768,
      "include_init_images": true
    },
    json: true
  };

  request(options, async function (error, response, body) {
    try {
      if (error) throw new Error(error);
      // console.log(response)
      // Clear the timeout
      clearTimeout(timerCounter)
      // Get the results from the API response
      const results = body.images;
      // console.log(results)
      const attachments = [];
      // const resultsToString = [results].toString();
      for (let i = 0; i < results.length; i++) {
        const data = results[i];
        const buffer = Buffer.from(data, 'base64');
        const attachment = new AttachmentBuilder(buffer, {
          name: 'patreonImg2Img.png',
        });
        attachments.push(attachment);
      }
      db.query(`
      INSERT INTO stableDiffusionImg2ImgPremium (user_id, prompt)
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
    .setName('img2img')
    .setDescription('Generates an image from a previous image and text prompt using Stable Diffusion 2.1')
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
          const message = await interaction.reply({
            content: `Please upload a photo now ${interaction.user.id}`,
            fetchReply: true,
          });
          // message.react('👍');
          // Wait for the reaction to be added

          const filter = (message, user) => {
            return message.author.id  === interaction.user.id && message.attachments.size>0 ;
          };
          interaction.channel.awaitMessages({
              filter,
              max: 1,
              time: 60000,
              errors: ['time']
            })
            .then(collected => {
              const message = collected.first();
              if (message.attachments.size > 0) {
                console.log('Attachment received');
                // Get the URL of the attachment
                const attachmentURL = message.attachments.first().url;
                // Do something with the attachment URL
                interaction.editReply("I'm generating...");
                // Start the socket connection and make the request to the Stable Diffusion API
                startSocket(interaction, prompt, attachmentURL)

              }

            })
            .catch(collected => {
              message.reply('Timeout, please try again');
            });


        } catch (error) {
          console.error(error);

        }
      } else {
        // The member does not have the "Premium Command Access" role, so they cannot use the premium command
        await interaction.reply('Sorry, this command is only available to our Patreon supporters. Consider becoming a patron to access premium content and support the development of our bot. You can learn more about Patreon and our tiers at ' + process.env.Patreon);

      }
    });
  },
};
