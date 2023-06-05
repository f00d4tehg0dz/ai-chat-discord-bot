const request = require('request');
const imageDataUri = require("image-data-uri")
const WebSocket = require('ws');
const axios = require('axios');
const {
  SlashCommandBuilder,
  AttachmentBuilder
} = require('discord.js');
const dotenv = require('dotenv');
dotenv.config();
const createHash = require('hash-generator');

let imageURI;


//Generate hash solution idea from https://github.com/onury5506/Discord-ChatGPT-Bot

function generateHash() {
  let hash = createHash(11)
  return {
    event_data: null,
    fn_index: 172,
    session_hash: hash

  }
}

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

async function startSocket(interaction, prompt, attachmentURL) {
  let timerCounter = setTimeout(async () => {
    await interaction.editReply({
      content: 'Your request has timed out. Please try again',
    });
  }, 129000)
  const ws = new WebSocket('ws://f00d4tehg0dz.me:13000/queue/join');
  const hash = generateHash();



  ws.on('open', () => { });

  ws.on('message', async (message) => {
    const msg = JSON.parse(`${message}`);
    console.log(msg)
     // Sometimes the WS send doesn't get a receive, so we time it out and retry
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

    if (msg.msg === 'send_hash') {
      ws.send(JSON.stringify(hash));
    } else if (msg.msg === 'send_data') {
      const data = {
        data: ["",0,prompt,"",[],imageURI,null,null,null,null,null,null,20,"Euler a",4,0,"original",false,false,1,1,7,1.5,0.75,-1,-1,0,0,0,false,null,768,768,1,"Just resize","Whole picture",32,"Inpaint masked","","","",[],"None","<ul>\n<li><code>CFG Scale</code> should be 2 or lower.</li>\n</ul>\n",true,true,"","",true,50,true,1,0,false,4,0.5,"Linear","None","<p style=\"margin-bottom:0.75em\">Recommended settings: Sampling Steps: 80-100, Sampler: Euler a, Denoising strength: 0.8</p>",128,8,["left","right","up","down"],1,0.05,128,4,"fill",["left","right","up","down"],false,false,"positive","comma",0,false,false,"","<p style=\"margin-bottom:0.75em\">Will upscale the image by the selected scale factor; use width and height sliders to set tile size</p>",64,"None",2,"Seed","",[],"Nothing","",[],"Nothing","",[],true,false,false,false,0,[],"","",""],
        ...hash,
      };
      ws.send(JSON.stringify(data));
    } else if (msg.msg === 'estimation') {
      await interaction.editReply({
        content: 'Current Position in Queue ' + msg.rank,
      });
    } else if (msg.msg === 'process_completed') {
      clearTimeout(timerCounter)
      try {
        const results = msg.output.data[0]; // Assuming this is an array
        const attachments = [];
        for (let i = 0; i < results.length; i++) {
          // Assuming that the name is a relative URL path for the file
          const fileUrl = `http://f00d4tehg0dz.me:13000/file=${results[i].name}`;

          const response = await axios.get(fileUrl, { responseType: 'arraybuffer' });
          const buffer = Buffer.from(response.data, 'binary');

          const attachment = new AttachmentBuilder(buffer, {
            name: 'patreonImg2Img.png',
          });
          attachments.push(attachment);
        }


        db.query(`INSERT INTO stableDiffusionImg2ImgPremium (user_id, prompt) VALUES (?, ?)`, [interaction.user.id, prompt], function (error, results, fields) {
          if (error) throw error;
          interaction.editReply({
            content: 'You asked ' + prompt,
            files: attachments,
          });
        });
      } catch (error) {
        console.error(error);
        await interaction.editReply({
          content: 'An error occurred while generating the image',
        });
      }
    } else if (msg.msg === 'queue_full') {
      try {
        await interaction.editReply({
          content: 'The queue is full. Please try entering your prompt of ' + prompt + ' again',
        });
        // Infinite loop detected
        // startSocket(interaction, prompt)
      }
      catch (error) {
        console.error(error);
        await interaction.editReply({
          content: 'An error occurred while generating the image',
        });
      }
    }
  });

  ws.on('error', async (error) => {
    console.error(error);
    await interaction.editReply({
      content: 'An error occurred while generating the image',
    });
  });
  // Close the database

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
