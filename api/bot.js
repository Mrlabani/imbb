const axios = require("axios");

const BOT_TOKEN = "7436631796:AAF5u7W4Ftas_MMrVCsTnT61ks4s6dYWULY";
const IMGBB_API_KEY = "10b711c5b7e59b2c6bf9843372d43d9b";
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

module.exports = async (req, res) => {
    if (req.method !== "POST") return res.status(400).send("Only POST requests allowed");

    const update = req.body;
    if (!update.message || !update.message.chat) return res.status(400).send("Invalid request");

    const chatId = update.message.chat.id;

    if (update.message.photo) {
        const fileId = update.message.photo.pop().file_id;
        try {
            const filePath = await getFilePath(fileId);
            const imageUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`;
            const imgbbUrl = await uploadToImgBB(imageUrl);

            if (imgbbUrl) {
                await sendMessage(chatId, `✅ *Image uploaded successfully!*\n\n🔗 [View Image](${imgbbUrl})`);
            } else {
                await sendMessage(chatId, "❌ Upload failed. Please try again.");
            }
        } catch (error) {
            await sendMessage(chatId, "⚠️ Oops! Something went wrong. Try again.");
        }
    } else {
        await sendMessage(chatId, "👋 Send me a *photo* 📸, and I'll upload it to IMGBB for you.");
    }

    res.status(200).send("OK");
};

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
