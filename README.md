# AI Chat Discord Bot

## WIP

Utilizes [DiscordJs](https://discord.js.org/#/) and [unofficial chatgpt-api](https://github.com/transitive-bullshit/chatgpt-api) for ChatGPT prompts. Huggingface Stable Diffusion 2, and Stable Diffusion 1 image generation. As well as Dall-E mini(TBD) image generation integration.

Much of the codebase was refactored, linted/cleaned with ChatGPT. As well as solutions were discovered through ChatGPT prompts.

## Features

- Direct Messaging support
- Image Generation using the latest AI image generative algorithms
- Proof of Concept of ChatGPT functionality while waiting for Official ChatGPT API to rollout

Follow these [instructions](https://youtu.be/aAyvsX-EpG4https://youtu.be/aAyvsX-EpG4) to use a local/remote webUI that can easily talk to to the commands used here.
- I wanted to move away from a 3rd party provider and host on a GPU Cloud service
- Take Stable Diffusion V.x load it into [Automatic1111 WebUI](https://github.com/AUTOMATIC1111/stable-diffusion-webui) and use that as a kicking off point
- I used [runpod.io](https://www.runpod.io/console/pods)

## Running Commands

Rename ".env.example" file to ".env.development" or ".env.production".

To run the bot, run the following command

```bash
  yarn
  yarn start // to run production
  yarn dev // to run development
```


## Screenshots

![App Screenshot](https://via.placeholder.com/468x300?text=App+Screenshot+Here)


## Steps on https://runpod.io/
- Use template runpod/stable-diffusion:web-automatic-2.1.5
- May need to edit with nano, relaunch.py and add --api