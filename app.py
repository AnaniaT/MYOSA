from flask import Flask, jsonify, request, render_template
import importlib.util
import math
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

if importlib.util.find_spec("smbus2") is not None:
    import smbus2 as smbus
elif importlib.util.find_spec("smbus") is not None:
    import smbus
else:
    smbus = None

SERIAL_PORT = "COM4" 
BAUD_RATE = 9600

MPU6050_ADDR = 0x69
PWR_MGMT_1 = 0x6B
ACCEL_XOUT_H = 0x3B
GYRO_XOUT_H = 0x43

latest_data = {
    "temperature": None,
    "pressure_hpa": None,
    "pressure_pa": None,
    "humidity": None,
    "acceleration": None,
    "last_updated": None
}


class DoorMonitorState:
    def __init__(self):
        self.lock = threading.Lock()
        self.house_locked = False
        self.latest_reading = {
            "ax": 0.0,
            "ay": 0.0,
            "az": 0.0,
            "gx": 0.0,
            "gy": 0.0,
            "gz": 0.0,
            "score": 0.0,
            "timestamp": time.time(),
        }
        self.last_alert = None
        self.alert_history = []
        self.sensor_ok = False
        self.sensor_error = "sensor not initialized"
        self.motion_threshold = 0.65


door_state = DoorMonitorState()


def format_ts(ts):
    return time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(ts))


class MPU6050Monitor:
    def __init__(self, shared_state, bus_id=1):
        self.shared_state = shared_state
        self.running = False
        self.thread = None
        self.sample_interval_s = 0.1

        if smbus is None:
            raise RuntimeError("smbus/smbus2 is not installed")

        self.bus = smbus.SMBus(bus_id)
        self.bus.write_byte_data(MPU6050_ADDR, PWR_MGMT_1, 0)

        self.prev_ax = 0.0
        self.prev_ay = 0.0
        self.prev_az = 0.0

    def read_word_2c(self, register):
        high = self.bus.read_byte_data(MPU6050_ADDR, register)
        low = self.bus.read_byte_data(MPU6050_ADDR, register + 1)
        value = (high << 8) + low
        if value >= 0x8000:
            value = -((65535 - value) + 1)
        return value

    def read_scaled(self):
        accel_x = self.read_word_2c(ACCEL_XOUT_H)
        accel_y = self.read_word_2c(ACCEL_XOUT_H + 2)
        accel_z = self.read_word_2c(ACCEL_XOUT_H + 4)

        gyro_x = self.read_word_2c(GYRO_XOUT_H)
        gyro_y = self.read_word_2c(GYRO_XOUT_H + 2)
        gyro_z = self.read_word_2c(GYRO_XOUT_H + 4)

        return {
            "ax": accel_x / 16384.0,
            "ay": accel_y / 16384.0,
            "az": accel_z / 16384.0,
            "gx": gyro_x / 131.0,
            "gy": gyro_y / 131.0,
            "gz": gyro_z / 131.0,
        }

    def compute_motion_score(self, reading):
        ax = reading["ax"]
        ay = reading["ay"]
        az = reading["az"]
        gx = reading["gx"]
        gy = reading["gy"]
        gz = reading["gz"]

        d_accel = math.sqrt((ax - self.prev_ax) ** 2 + (ay - self.prev_ay) ** 2 + (az - self.prev_az) ** 2)
        gyro_mag = math.sqrt(gx * gx + gy * gy + gz * gz)
        score = d_accel + (gyro_mag / 180.0)

        self.prev_ax = ax
        self.prev_ay = ay
        self.prev_az = az
        return score

    def run(self):
        self.running = True
        while self.running:
            try:
                reading = self.read_scaled()
                score = self.compute_motion_score(reading)
                now = time.time()

                with self.shared_state.lock:
                    reading["score"] = score
                    reading["timestamp"] = now
                    self.shared_state.latest_reading = reading
                    self.shared_state.sensor_ok = True
                    self.shared_state.sensor_error = ""

                    if self.shared_state.house_locked and score >= self.shared_state.motion_threshold:
                        alert = {
                            "timestamp": now,
                            "message": "Potential intrusion: significant door movement detected.",
                            "score": round(score, 3),
                        }
                        self.shared_state.last_alert = alert
                        self.shared_state.alert_history.append(alert)
                        self.shared_state.alert_history = self.shared_state.alert_history[-50:]

            except Exception as exc:
                with self.shared_state.lock:
                    self.shared_state.sensor_ok = False
                    self.shared_state.sensor_error = str(exc)

            time.sleep(self.sample_interval_s)

    def start(self):
        self.thread = threading.Thread(target=self.run, daemon=True)
        self.thread.start()

    def stop(self):
        self.running = False
        if self.thread is not None:
            self.thread.join(timeout=1.0)

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


@app.route("/accelerometer")
def accelerometer_page():
    return render_template("accelerometer.html")

@app.route("/data")
def data():
    with door_state.lock:
        latest_reading = dict(door_state.latest_reading)
        door_payload = {
            "house_locked": door_state.house_locked,
            "sensor_ok": door_state.sensor_ok,
            "sensor_error": door_state.sensor_error,
            "motion_threshold": door_state.motion_threshold,
            "latest_reading": latest_reading,
            "last_alert": door_state.last_alert,
            "alert_count": len(door_state.alert_history),
            "alert_history": [
                {
                    "timestamp": format_ts(entry["timestamp"]),
                    "message": entry["message"],
                    "score": entry["score"],
                }
                for entry in door_state.alert_history[-10:]
            ],
        }

    payload = dict(latest_data)
    if door_payload["sensor_ok"]:
        ax = latest_reading["ax"]
        ay = latest_reading["ay"]
        az = latest_reading["az"]
        gx = latest_reading["gx"]
        gy = latest_reading["gy"]
        gz = latest_reading["gz"]
        payload["acceleration"] = round(math.sqrt(ax * ax + ay * ay + az * az), 3)
        payload["gyroscope"] = round(math.sqrt(gx * gx + gy * gy + gz * gz), 3)
    else:
        payload["gyroscope"] = None

    payload["door_monitor"] = door_payload
    return jsonify(payload)

@app.route("/heatmap")
def heatmap():
    return jsonify({"rooms": heatmap_rooms})

@app.route("/heatmap", methods=["POST"])
def update_heatmap():
    payload = request.get_json(silent=True) or {}
    if not payload:
        return jsonify({"error": "No fields provided to update"}), 400

    for room_key in heatmap_rooms.keys():
        if room_key not in payload.keys():
            continue
        
        for room_data_type in heatmap_rooms[room_key].keys():
            if room_data_type not in payload[room_key]:
                continue
            
            heatmap_rooms[room_key][room_data_type] = payload[room_key][room_data_type]
    
    return "Success"

@app.route("/temperature/greenhouse-monitoring")
def greenhouse_monitoring_page():
    return render_template("greenhouse_monitoring.html")

@app.route("/temperature/indoor-plant-monitoring")
def indoor_plant_monitoring_page():
    return render_template("indoor_plant_monitoring.html")

@app.route("/temperature/energy-optimization")
def energy_optimization_page():
    return render_template("energy_optimization.html")


@app.route("/api/status")
def api_status():
    with door_state.lock:
        payload = {
            "house_locked": door_state.house_locked,
            "sensor_ok": door_state.sensor_ok,
            "sensor_error": door_state.sensor_error,
            "motion_threshold": door_state.motion_threshold,
            "latest_reading": door_state.latest_reading,
            "last_alert": door_state.last_alert,
            "alert_count": len(door_state.alert_history),
            "alert_history": [
                {
                    "timestamp": format_ts(entry["timestamp"]),
                    "message": entry["message"],
                    "score": entry["score"],
                }
                for entry in door_state.alert_history[-10:]
            ],
        }
    return jsonify(payload)


@app.route("/api/lock", methods=["POST"])
def api_lock():
    with door_state.lock:
        door_state.house_locked = True
        payload = {"house_locked": True}
    return jsonify(payload)


@app.route("/api/unlock", methods=["POST"])
def api_unlock():
    with door_state.lock:
        door_state.house_locked = False
        payload = {"house_locked": False}
    return jsonify(payload)


@app.route("/api/toggle", methods=["POST"])
def api_toggle():
    with door_state.lock:
        door_state.house_locked = not door_state.house_locked
        payload = {"house_locked": door_state.house_locked}
    return jsonify(payload)


@app.route("/api/threshold", methods=["POST"])
def api_threshold():
    payload = request.get_json(silent=True) or {}
    if "threshold" not in payload:
        return jsonify({"error": "Invalid JSON body"}), 400

    try:
        new_threshold = float(payload["threshold"])
    except (TypeError, ValueError):
        return jsonify({"error": "threshold must be a number"}), 400

    if new_threshold < 0.05 or new_threshold > 3.0:
        return jsonify({"error": "threshold out of range (0.05 - 3.0)"}), 400

    with door_state.lock:
        door_state.motion_threshold = round(new_threshold, 3)
        response = {"motion_threshold": door_state.motion_threshold}

    return jsonify(response)

@app.route("/analyze-greenhouse", methods=["POST"])
def analyze_greenhouse():
    data = request.get_json()
    temperature = data.get("temperature")

    if temperature is None:
        return jsonify({"error": "No temperature received"}), 400

    try:
        response = model.generate_content(
            f"""
            You are an AI greenhouse assistant.

            Current greenhouse temperature: {temperature} °C.

            Explain whether the greenhouse is:
            - too cold
            - optimal
            - warm
            - too hot

            Suggest one practical greenhouse action.

            Keep the response under 4 sentences.
            """
        )

        return jsonify({"analysis": response.text})

    except Exception as e:
        return jsonify({
            "error": "Greenhouse AI analysis failed.",
            "details": str(e)
        }), 500
    
@app.route("/analyze-indoor-plants", methods=["POST"])
def analyze_indoor_plants():
    data = request.get_json()
    temperature = data.get("temperature")

    if temperature is None:
        return jsonify({"error": "No temperature received"}), 400

    try:
        response = model.generate_content(
            f"""
            You are an AI indoor plant assistant.

            Current indoor temperature: {temperature} °C.

            Explain whether this temperature is suitable
            for common indoor houseplants.

            Suggest one plant-care recommendation.

            Keep the response under 4 sentences.
            """
        )

        return jsonify({"analysis": response.text})

    except Exception as e:
        return jsonify({
            "error": "Indoor plant AI analysis failed.",
            "details": str(e)
        }), 500
    
@app.route("/analyze-energy", methods=["POST"])
def analyze_energy():
    data = request.get_json()
    temperature = data.get("temperature")

    if temperature is None:
        return jsonify({"error": "No temperature received"}), 400

    try:
        response = model.generate_content(
            f"""
            You are an AI home energy optimization assistant.

            Current room temperature: {temperature} °C.

            Recommend:
            - cooling
            - ventilation
            - heating
            - no action

            Focus on energy efficiency and comfort.

            Keep the response under 4 sentences.
            """
        )

        return jsonify({"analysis": response.text})

    except Exception as e:
        return jsonify({
            "error": "Energy optimization AI failed.",
            "details": str(e)
        }), 500
    
if __name__ == "__main__":
    threading.Thread(target=read_arduino, daemon=True).start()
    try:
        MPU6050Monitor(door_state).start()
    except Exception as exc:
        with door_state.lock:
            door_state.sensor_ok = False
            door_state.sensor_error = str(exc)
    app.run(host="0.0.0.0", port=5005)

