const express = require("express");
const axios = require("axios");
const bodyParser = require("body-parser");

const app = express();
app.use(bodyParser.json());

// Replace with your credentials
const BOT_TOKEN = "7436631796:AAEVaXqNVBWlju6sVqOntVanJC-LUQP8dxM";
const IMGBB_API_KEY = "10b711c5b7e59b2c6bf9843372d43d9b";
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

// Handle Telegram updates
app.post("/", async (req, res) => {
    const update = req.body;
    
    if (!update.message || !update.message.chat) return res.sendStatus(400);
    
    const chatId = update.message.chat.id;
    
    if (update.message.photo) {
        const fileId = update.message.photo.pop().file_id;
        try {
            const filePath = await getFilePath(fileId);
            const imageUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`;
            const imgbbUrl = await uploadToImgBB(imageUrl);

            if (imgbbUrl) {
                sendMessage(chatId, `✅ *Image uploaded successfully!*\n\n🔗 [View Image](${imgbbUrl})`);
            } else {
                sendMessage(chatId, "❌ Upload failed. Please try again.");
            }
        } catch (error) {
            sendMessage(chatId, "⚠️ Oops! Something went wrong. Try again.");
        }
    } else {
        sendMessage(chatId, "👋 Send me a *photo* 📸, and I'll upload it to IMGBB for you.");
    }

    res.sendStatus(200);
});

// Function to send messages
async function sendMessage(chatId, text) {
    await axios.post(`${TELEGRAM_API}/sendMessage`, {
        chat_id: chatId,
        text,
        parse_mode: "Markdown",
        disable_web_page_preview: true
    });
}

// Function to get file path from Telegram API
async function getFilePath(fileId) {
    const response = await axios.get(`${TELEGRAM_API}/getFile?file_id=${fileId}`);
    return response.data.result.file_path;
}

// Function to upload image to IMGBB
async function uploadToImgBB(imageUrl) {
    const response = await axios.post("https://api.imgbb.com/1/upload", null, {
        params: { key: IMGBB_API_KEY, image: imageUrl }
    });
    return response.data.data.url;
}

// Start server
app.listen(3000, () => console.log("Bot is running on port 3000"));
