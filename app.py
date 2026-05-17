from flask import Flask, jsonify, render_template_string, render_template
import os
import serial
import json
import threading
import time
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv()

app = Flask(__name__)
genai.configure(api_key=os.getenv("API_KEY"))
model = genai.GenerativeModel("gemini-2.5-flash")

SERIAL_PORT = "COM4" 
BAUD_RATE = 9600

latest_data = {
    "temperature": 21,
    "pressure_hpa": 1003.35,
    "pressure_pa": 1000335,
    "humidity": None,
    "acceleration": None,
    "last_updated": None
}

heatmap_rooms = {
    "living": {"value": 22, "light": 380, "origin": "0% 0%", "angle": 0},
    "kitchen": {"value": 26, "light": 420, "origin": "70% 85%", "angle": 0},
    "bedroom 2": {"value": 24, "light": 210, "origin": "20% 60%", "angle": 0},
    "bath": {"value": 20, "light": 180, "origin": "45% 30%", "angle": 0},
    "bedroom 1": {"value": 24, "light": 260, "origin": "55% 65%", "angle": 0},
    "hall": {"value": 23, "light": 140, "origin": "50% -100%", "angle": 0}
}

def read_arduino():
    global latest_data

    while True:
        try:
            ser = serial.Serial(SERIAL_PORT, BAUD_RATE, timeout=1)
            print("Connected to Arduino on", SERIAL_PORT)

            while True:
                line = ser.readline().decode("utf-8", errors="ignore").strip()

                if line:
                    print("RAW:", line)

                    try:
                        data = json.loads(line)

                        latest_data["temperature"] = data.get("temperature")
                        latest_data["pressure_hpa"] = data.get("pressure_hpa")
                        latest_data["pressure_pa"] = data.get("pressure_pa")
                        latest_data["humidity"] = data.get("humidity")
                        latest_data["acceleration"] = data.get("acceleration")
                        latest_data["last_updated"] = time.strftime("%d %b %Y, %H:%M:%S")

                    except Exception as e:
                        print("JSON error:", e)

        except Exception as e:
            print("Serial connection error:", e)
            time.sleep(2)

HTML = """
c
"""


@app.route("/")
def index():
    return render_template("index.html")

@app.route("/temperature")
def temperature_page():
    return render_template("temperature.html")

@app.route("/data")
def data():
    return jsonify(latest_data)

@app.route("/heatmap")
def heatmap():
    return jsonify({"rooms": heatmap_rooms})

@app.route("/temperature/fever-test")
def fever_test_page():
    return render_template("fever_test.html")

@app.route("/temperature/plant-monitoring")
def plant_monitoring_page():
    return render_template("plant_monitoring.html")

@app.route("/analyze-fever", methods=["POST"])
def analyze_fever():
    from flask import request

    data = request.get_json()
    avg_temp = data.get("average_temperature")

    if avg_temp is None:
        return jsonify({"error": "No average temperature received"}), 400

    try:
        response = model.generate_content(
            f"""
            Average measured temperature: {avg_temp} °C.

            Decide whether this may indicate fever.
            Do not give a medical diagnosis.
            Keep it short and clear.
            """
        )

        return jsonify({"analysis": response.text})

    except Exception as e:
        return jsonify({
            "error": "Gemini analysis failed.",
            "details": str(e)
        }), 500
    
if __name__ == "__main__":
    threading.Thread(target=read_arduino, daemon=True).start()
    app.run(debug=False)

