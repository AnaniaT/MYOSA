from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route("/")
def home():
    return "Yayyy server running"

@app.route("/", methods=["POST"])
def receive_data():

    # Read JSON from request
    data = request.get_json()

    # Print received JSON
    print("Received JSON:")
    print(data)

    # Static response back to Arduino
    return jsonify({
        "status": "success",
        "message": "JSON received",
        "led": "ON"
    })

if __name__ == "__main__":
    # Accessible on local network
    app.run(host="0.0.0.0", port=5005)