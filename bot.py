import os
import time
import requests
import telebot
import threading
from flask import Flask, render_template, request, redirect
from pymongo import MongoClient
from bson import ObjectId

# Load Configuration from Environment Variables
BOT_TOKEN = os.getenv("BOT_TOKEN")
IMGBB_API_KEY = os.getenv("IMGBB_API_KEY")
MONGO_URI = os.getenv("MONGO_URI")
WEBHOOK_URL = os.getenv("WEBHOOK_URL")
ADMIN_CHAT_ID = os.getenv("ADMIN_CHAT_ID")
PORT = int(os.getenv("PORT", 5000))

# Flask Setup
app = Flask(__name__)
client = MongoClient(MONGO_URI)
db = client['imagebot']
collection = db['uploads']

# Telegram Bot Setup
bot = telebot.TeleBot(BOT_TOKEN)

# Start Command
@bot.message_handler(commands=["start", "help"])
def send_welcome(message):
    markup = telebot.types.InlineKeyboardMarkup()
    markup.row(
        telebot.types.InlineKeyboardButton("\U0001F484 Upload Image", callback_data="upload"),
        telebot.types.InlineKeyboardButton("\U0001F30D View Gallery", url=WEBHOOK_URL)
    )
    bot.send_message(message.chat.id, "\U0001F44B Welcome! Send an image to upload.", reply_markup=markup)

# Handle Image Upload
@bot.message_handler(content_types=["photo"])
def handle_image(message):
    bot.send_message(message.chat.id, "\U0001F4E5 Downloading image...")
    
    file_id = message.photo[-1].file_id
    file_info = bot.get_file(file_id)
    file_url = f"https://api.telegram.org/file/bot{BOT_TOKEN}/{file_info.file_path}"
    
    response = requests.get(file_url)
    if response.status_code == 200:
        with open("temp.jpg", "wb") as file:
            file.write(response.content)
        
        with open("temp.jpg", "rb") as file:
            imgbb_response = requests.post(
                f"https://api.imgbb.com/1/upload?key={IMGBB_API_KEY}",
                files={"image": file}
            )
        os.remove("temp.jpg")

        if imgbb_response.status_code == 200:
            imgbb_url = imgbb_response.json()["data"]["url"]
            collection.insert_one({"url": imgbb_url, "timestamp": int(time.time())})
            
            markup = telebot.types.InlineKeyboardMarkup()
            markup.add(telebot.types.InlineKeyboardButton("\U0001F30D View Gallery", url=WEBHOOK_URL))
            bot.send_message(message.chat.id, f"\u2705 Uploaded: {imgbb_url}", reply_markup=markup)
        else:
            bot.send_message(message.chat.id, "\u274c Upload failed!")
    else:
        bot.send_message(message.chat.id, "\u274c Download failed!")

# Flask Web Dashboard
@app.route("/")
def gallery():
    images = list(collection.find().sort("timestamp", -1))
    return render_template("index.html", images=images)

# Admin Panel (Delete Images)
@app.route("/delete/<string:image_id>")
def delete_image(image_id):
    try:
        collection.delete_one({"_id": ObjectId(image_id)})
    except Exception as e:
        return str(e), 400
    return redirect("/")

# Webhook for Telegram Bot
@app.route(f"/{BOT_TOKEN}", methods=["POST"])
def webhook():
    bot.process_new_updates([telebot.types.Update.de_json(request.stream.read().decode("utf-8"))])
    return "OK", 200

if __name__ == "__main__":
    bot.remove_webhook()
    bot.set_webhook(url=f"{WEBHOOK_URL}/{BOT_TOKEN}")
    app.run(host="0.0.0.0", port=PORT)
