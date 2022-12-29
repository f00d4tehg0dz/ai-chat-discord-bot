const dotenv = require('dotenv');
dotenv.config();
const {
  SlashCommandBuilder,
  EmbedBuilder
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('invite')
    .setDescription(`Share us around, I promise we won't mind `),
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setColor(process.env.embedColor)
      .setDescription(`**Arti** \n\n**👋 Hey!\n Do you want to Invite me? [Click Here](https://discord.com/api/oauth2/authorize?client_id=916513262022049822&permissions=2416560192&scope=bot) to Invite me!\nThanks for supporting me.** ❤️`)
      .setThumbnail('https://i.imgur.com/fTo02Y5.png')
      .addFields({
        name: "Support Link: ",
        value: `**[Click Here!](https://discord.gg/r9dpssx3Dg)**`,
        inline: true,
      })
      .addFields({
        name: "Vote Link:",
        value: `**[Click Here!](https://top.gg/bot/916513262022049822/vote)**`,
        inline: true,
      })
      .setTimestamp()
      .setFooter({ text: `Arti Bot`})
    interaction.reply({
      embeds: [embed]
    });
  }
};