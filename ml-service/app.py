# app.py
from flask import Flask, request, jsonify
from flask_cors import CORS
from prediction import predict_disease

app = Flask(__name__)
CORS(app)  # Enable CORS for frontend communication


@app.route("/health", methods=["GET"])
def health():
    """Health check endpoint"""
    return jsonify({"status": "healthy", "service": "ml-prediction"}), 200


@app.route("/predict", methods=["POST"])
def predict():
    """
    Expects JSON payload:
    {
        "features": [feature1, feature2, ...]
    }
    Returns top 3 diseases with confidence percentages.
    """
    data = request.get_json()
    if not data or "features" not in data:
        return jsonify({"error": "Missing features"}), 400

    features = data["features"]
    if not isinstance(features, list):
        return jsonify({"error": "Features must be a list"}), 400

    try:
        result = predict_disease(features)
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5002, debug=True)