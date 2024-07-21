<a name="readme-top"></a>

<div align="center">
<img width="200px" src="3.jpg" alt="PostGen-Bot Logo">
</div>

<h1 align="center"> PostGen-Bot <br/> <span style="font-size:10px;">Your AI-Powered Social Media Content Generator</span></h1>

<p align="center">
  <img src="https://img.shields.io/badge/Platform-Telegram-blue" alt="Platform: Telegram">
  <img src="https://shields.io/badge/AI-OpenAI-orange" alt="AI: OpenAI">  
  <img src="https://img.shields.io/badge/Framework-Node.js-purple" alt="Framework: Node.js">
  <img src="https://shields.io/badge/Database-MongoDB-green" alt="Database: MongoDB">
  <img src="https://img.shields.io/badge/Language-JavaScript-red" alt="Language: JavaScript">
  <img src="https://img.shields.io/badge/LICENSE-MIT-yellow" alt="License: MIT">
</p>


## Tech Stack and Tools:
<span>
<img src="https://img.shields.io/badge/node.js%20-%2343853D.svg?&style=for-the-badge&logo=node.js&logoColor=white"/>
<img src="https://img.shields.io/badge/javascript%20-%23323330.svg?&style=for-the-badge&logo=javascript&logoColor=%23F7DF1E"/>
<img src="https://img.shields.io/badge/mongodb%20-%23FF0000.svg?&style=for-the-badge&logo=mongodb&logoColor=white"/>
<img src="https://img.shields.io/badge/telegram%20-%232CA5E0.svg?&style=for-the-badge&logo=telegram&logoColor=white"/>
<img src="https://img.shields.io/badge/openai%20-%23412991.svg?&style=for-the-badge&logo=openai&logoColor=white"/>
<img src="https://img.shields.io/badge/express%20-%23404d59.svg?&style=for-the-badge&logo=express&logoColor=%2361DAFB"/>
<img src="https://img.shields.io/badge/UptimeRobot%20-%235D3F6F.svg?&style=for-the-badge&logo=UptimeRobot&logoColor=white"/>
<img src="https://img.shields.io/badge/Render%20-%230089D1.svg?&style=for-the-badge&logo=render&logoColor=white"/>
<img src="https://img.shields.io/badge/Git%20-%23F1502F.svg?&style=for-the-badge&logo=git&logoColor=white"/>
<img src="https://img.shields.io/badge/GitHub%20-%23121011.svg?&style=for-the-badge&logo=github&logoColor=white"/>
<img src="https://img.shields.io/badge/VS%20Code-008080.svg?&style=for-the-badge&logo=visual-studio-code&logoColor=white"/>
</span>

- **Backend:** Node.js,Express.
- **Database:** MongoDB.
- **Bot Platform:** Telegram.
- **AI Integration:** OpenAI.
- **Uptime Monitoring:** UptimeRobot.
- **Backend Deployment:** Render
- **Code Editor:** VS Code.
- **Version Control:** Git and GitHub.

<h3 align="center">✨ Welcome to PostGen-Bot ✨</h3> <hr>

## Table of Contents
<details>
  <summary>Click to expand</summary>
  
  - [Overview](#overview)
  - [Problem and Solution](#problem-and-solution)
  - [Key Features](#key-features)
  - [How It Works](#how-it-works)
  - [Dependencies Used](#dependencies-used)
  - [Installation](#installation)
  - [Usage](#usage)
  - [Contributing](#contributing)
  - [License](#license)
  
</details> 

## Overview🤖
PostGen-Bot is your AI-powered social media assistant, designed to help you create engaging, platform-specific content with ease. Simply share your daily events and let PostGen-Bot craft perfect posts for LinkedIn, Instagram and Twitter(x). Improve your social media presence without exerting any effort!!

## Problem and Solution

### The Problem 🆘

- It can be difficult, hectic and time-consuming to regularly manage and produce interesting social media material, especially for working professionals. 
- Traditional methods need a lot of work to remain updated and active across several platforms.

### Our Solution 💡

- PostGen-Bot assists users in maintaining an active and engaging social media presence without the constant need to create material by automating the content generation procedure via telegram.
- It allows to user's input for unique posts and also saves time.

## Key Features:
- AI-powered content generation.
- Platform-specific post creation(LinkedIn,Instagram & Twitter)
- User-friendly Telegram interface.
- Personalized content based on user input.
- Emoji integration for enhanced engagement.
- Character count feature to ensure posts fit platform limits.

## Dependencies used🖥️
- [x] nodemon (for auto-restarting the server during development).
- [x] Express (web application framework).
- [x] Mongoose (MongoDB object modeling tool).
- [x] OpenAI (For accessing the OpenAI API).
- [x] Telegraf (Telegram bot framework).

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## How It Works
1. Start a chat with PostGen-Bot on Telegram.
2. Share your daily events and thoughts.
3. Use the /generate command to create tailored social media posts.
4. Receive unique, platform-specific content for LinkedIn, Instagram and Twitter(x).
5. Copy and paste the generated posts to your social media platforms.

## Installation

### Prerequisites

- Node.js and npm installed.
- MongoDB instance running.

### Setup

1. **Clone the repository**:
    ```bash
    git clone https://github.com/yourusername/postgen-bot.git
    cd postgen-bot
    ```

2. **Install dependencies**:
    ```bash
    npm install
    ```

3. **Set up environment variables**:
   Create a `.env` file in the root directory and add the following variables:
    ```plaintext
    BOT_TOKEN=your_bot_token
    MONGO_CONNECT_STRING=your_mongo_connection_string
    OPENAI_KEY=your_openai_key
    WEBHOOK_URL=your_webhook_url
    ```
   Replace `your_*` with your actual API keys and tokens.

4. **Start the bot**:
    ```bash
    npm start
    ```

5. **Deploy on Render**:
    - Create a new web service on [Render](https://render.com/) and connect your GitHub repository.
    - Add environment variables as listed above in the Render dashboard.
    - Deploy the service.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Usage Notes
Here's how to use PostGen-Bot:
1. **Start the bot**: 
   Type /start to begin your journey.
2. **Share your day**:
   Simply send messages about events, thoughts or experiences as they happen.
3. **Generate posts**:
   When ready, type /generate to create social media content.
4. **Review and use**:
   You'll receive tailored posts for LinkedIn, Instagram and Twitter(x). Copy and paste to your preferred platforms.
5. **Repeat**:
   Keep sharing events throughout the day for fresh content.

💡 Pro Tip: The more details you share, the better your posts will be! <br />

   Need help? Just type /help anytime.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Contributing🤝

We welcome contributions to improve PostGen-Bot! Here's how you can contribute:

1. Fork the repository.
2. Create a new branch for your feature or bug fix:
    ```bash
    git checkout -b feature/AmazingFeature
    ```
3. Commit your changes and push to the branch:
    ```bash
    git commit -m 'Add some AmazingFeature'
    git push origin feature/AmazingFeature
    ```
4. Open a Pull Request with a detailed description of your changes.
5. Voila!! You have made a PR to this awesome projects. Wait for your submission to be accepted and your PR to be merged.

<p align="right">(<a href="#readme-top">back to top</a>)</p>


## License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
<hr>

<div align="center">
Made with ❤️ for social media enthusiasts
</div>
