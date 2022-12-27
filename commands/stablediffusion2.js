const request = require('request');
const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const sqlite3 = require('sqlite3');
const dotenv = require('dotenv');
dotenv.config();

const db = new sqlite3.Database('conversation.db');

db.run(`
  CREATE TABLE IF NOT EXISTS stableDiffusion (
    id INTEGER PRIMARY KEY,
    user_id TEXT,
    prompt TEXT,
    response TEXT
  )
`);

async function startSocket(interaction, prompt) {
  let timerCounter = setTimeout(async () => {
    await interaction.editReply({
      content: 'Your request has timed out. Please try again',
    });
  }, 129000)

const options = {
  method: 'POST',
  url: process.env.stableDiffusionEnv,
  headers: {
    'Content-Type': 'application/json'
  },
  body: {
      "init_images": [
        "1"
      ],
      "resize_mode": 0,
      "denoising_strength": 0.75,
      "mask": "string",
      "mask_blur": 4,
      "inpainting_fill": 0,
      "inpaint_full_res": true,
      "inpaint_full_res_padding": 0,
      "inpainting_mask_invert": 0,
      "initial_noise_multiplier": 0,
      "prompt": prompt,
      "styles": [
        "None"
      ],
      "seed": -1,
      "subseed": -1,
      "subseed_strength": 0,
      "seed_resize_from_h": -1,
      "seed_resize_from_w": -1,
      "sampler_name": "Euler a",
      "batch_size": 1,
      "n_iter": 1,
      "steps": 50,
      "cfg_scale": 7,
      "width": 512,
      "height": 512,
      "restore_faces": false,
      "tiling": false,
      "negative_prompt": "",
      "eta": 0,
      "s_churn": 0,
      "s_tmax": 0,
      "s_tmin": 0,
      "s_noise": 1,
      "override_settings": {},
      "sampler_index": "Euler",
      "include_init_images": false
  },
  json: true
};

request(options, async function (error, response, body) {
  if (error) throw new Error(error);

  clearTimeout(timerCounter)

  try {
    const results = body.images[0];

      const buffer = Buffer.from(results, 'base64');
      const attachment = new AttachmentBuilder(buffer, {
        name: 'diffusion.png',
      })

    db.run(`
      INSERT INTO stableDiffusion (user_id, prompt, response)
      VALUES (?, ?, ?)
    `, [interaction.user.id, prompt, results]);

    await interaction.editReply({
      content: 'You asked '+ prompt,
      files: [attachment],
    });
  } catch (error) {
        console.error(error);
        await interaction.editReply({
          content: 'An error occurred while generating the image',
        });
      }
      });
  }

module.exports = {
  data: new SlashCommandBuilder()
    .setName('diffusion')
    .setDescription('Generates an image from a text prompt using Stable Diffusion 2.1')
    .addStringOption(option => option
      .setName('prompt')
      .setDescription('generate image prompt')
    ),
  async execute(interaction) {
    const prompt = interaction.options.getString('prompt');
    console.log('What to generate?', prompt);
    try {
      await interaction.reply("I'm generating...");
      startSocket(interaction, prompt)
        } catch (error) {
          console.error(error);
        }
      },
    };
