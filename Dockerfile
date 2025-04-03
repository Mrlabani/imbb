# Use official Python image
FROM python:3.10-slim

# Set working directory
WORKDIR /app

# Copy necessary files
COPY . .

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Expose the Flask app port
EXPOSE 5000

# Start the bot and Flask server
CMD ["python", "imgbb_bot.py"]
