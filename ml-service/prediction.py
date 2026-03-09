# prediction.py
import numpy as np
import pickle
from sklearn.preprocessing import StandardScaler

# Load your pre-trained model (replace 'model.pkl' with your actual model path)
try:
    with open("model.pkl", "rb") as f:
        model = pickle.load(f)
except FileNotFoundError:
    model = None
    print("⚠️ Model file not found. Using rule-based prediction fallback.")

# Example feature scaler (if your model needs scaling)
scaler = StandardScaler()

# Disease database mapping symptoms and vitals to conditions
DISEASE_PROFILES = {
    "Influenza": {
        "symptoms": ["fever", "cough", "fatigue", "headache", "muscle_pain"],
        "vital_conditions": {"temperature": (100.4, 104), "heart_rate": (80, 110)},
        "base_weight": 0.8
    },
    "Common Cold": {
        "symptoms": ["cough", "sore_throat", "fatigue", "headache"],
        "vital_conditions": {"temperature": (98.6, 100.4)},
        "base_weight": 0.7
    },
    "COVID-19": {
        "symptoms": ["fever", "cough", "fatigue", "shortness_of_breath", "muscle_pain"],
        "vital_conditions": {"temperature": (100.4, 105), "oxygen_saturation": (88, 95)},
        "base_weight": 0.85
    },
    "Pneumonia": {
        "symptoms": ["fever", "cough", "shortness_of_breath", "chest_pain", "fatigue"],
        "vital_conditions": {"temperature": (101, 105), "respiratory_rate": (22, 40)},
        "base_weight": 0.9
    },
    "Bronchitis": {
        "symptoms": ["cough", "fatigue", "shortness_of_breath", "chest_pain"],
        "vital_conditions": {"temperature": (99, 102)},
        "base_weight": 0.75
    },
    "Asthma Exacerbation": {
        "symptoms": ["shortness_of_breath", "cough", "chest_pain"],
        "vital_conditions": {"respiratory_rate": (20, 35), "oxygen_saturation": (90, 97)},
        "base_weight": 0.8
    },
    "Migraine": {
        "symptoms": ["headache", "nausea", "dizziness", "fatigue"],
        "vital_conditions": {},
        "base_weight": 0.7
    },
    "Gastritis": {
        "symptoms": ["nausea", "chest_pain", "fatigue"],
        "vital_conditions": {},
        "base_weight": 0.65
    },
    "Hypertension": {
        "symptoms": ["headache", "dizziness", "chest_pain", "shortness_of_breath"],
        "vital_conditions": {"systolic_bp": (140, 200), "diastolic_bp": (90, 120)},
        "base_weight": 0.85
    },
    "Anemia": {
        "symptoms": ["fatigue", "dizziness", "shortness_of_breath", "headache"],
        "vital_conditions": {"heart_rate": (90, 120)},
        "base_weight": 0.7
    },
    "Diabetes Complication": {
        "symptoms": ["fatigue", "dizziness", "nausea", "headache"],
        "vital_conditions": {"blood_glucose": (200, 400)},
        "base_weight": 0.85
    },
    "Pharyngitis": {
        "symptoms": ["sore_throat", "fever", "headache", "fatigue"],
        "vital_conditions": {"temperature": (99, 102)},
        "base_weight": 0.7
    },
    "Tonsillitis": {
        "symptoms": ["sore_throat", "fever", "headache", "fatigue", "muscle_pain"],
        "vital_conditions": {"temperature": (100, 103)},
        "base_weight": 0.75
    },
    "Anxiety Disorder": {
        "symptoms": ["dizziness", "chest_pain", "shortness_of_breath", "nausea"],
        "vital_conditions": {"heart_rate": (90, 130)},
        "base_weight": 0.6
    },
    "Fibromyalgia": {
        "symptoms": ["muscle_pain", "fatigue", "headache"],
        "vital_conditions": {},
        "base_weight": 0.65
    }
}

# Feature indices (must match frontend)
SYMPTOM_NAMES = [
    "fever", "cough", "fatigue", "headache", "shortness_of_breath",
    "chest_pain", "nausea", "dizziness", "muscle_pain", "sore_throat"
]

VITAL_INDICES = {
    "temperature": 10,
    "heart_rate": 11,
    "systolic_bp": 12,
    "diastolic_bp": 13,
    "respiratory_rate": 14,
    "oxygen_saturation": 15,
    "weight": 16,
    "height": 17,
    "blood_glucose": 18
}


def predict_disease(features):
    """
    Predict top 3 diseases with confidence percentages from patient features.
    :param features: list of features [10 symptoms (0/1) + 9 vitals]
    :return: dict { 'predictions': [{'disease': str, 'confidence': float}, ...] }
    """
    features = np.array(features).flatten()
    
    # Extract symptoms and vitals
    symptoms_present = []
    for i, symptom in enumerate(SYMPTOM_NAMES):
        if i < len(features) and features[i] == 1:
            symptoms_present.append(symptom)
    
    vitals = {}
    for vital_name, idx in VITAL_INDICES.items():
        if idx < len(features):
            vitals[vital_name] = features[idx]
    
    # If we have a trained model, use it
    if model is not None:
        try:
            features_reshaped = features.reshape(1, -1)
            
            if hasattr(model, "predict_proba"):
                probas = model.predict_proba(features_reshaped)[0]
                classes = model.classes_
                
                # Get top 3 predictions
                top_indices = np.argsort(probas)[-3:][::-1]
                predictions = []
                for idx in top_indices:
                    predictions.append({
                        "disease": str(classes[idx]),
                        "confidence": round(float(probas[idx]) * 100, 2)
                    })
                return {"predictions": predictions}
            else:
                # Model without probability support
                pred = model.predict(features_reshaped)[0]
                return {
                    "predictions": [
                        {"disease": str(pred), "confidence": 75.0},
                        {"disease": "Possible Alternative 1", "confidence": 15.0},
                        {"disease": "Possible Alternative 2", "confidence": 10.0}
                    ]
                }
        except Exception as e:
            print(f"Model prediction error: {e}, falling back to rule-based")
    
    # Rule-based prediction fallback
    return rule_based_prediction(symptoms_present, vitals)


def rule_based_prediction(symptoms_present, vitals):
    """
    Rule-based disease prediction when ML model is not available.
    """
    disease_scores = {}
    
    for disease, profile in DISEASE_PROFILES.items():
        score = 0
        
        # Calculate symptom match score
        matching_symptoms = set(symptoms_present) & set(profile["symptoms"])
        if len(profile["symptoms"]) > 0:
            symptom_match_ratio = len(matching_symptoms) / len(profile["symptoms"])
            score += symptom_match_ratio * 50 * profile["base_weight"]
        
        # Calculate vital sign match score
        vital_score = 0
        vital_checks = 0
        for vital, (low, high) in profile.get("vital_conditions", {}).items():
            if vital in vitals and vitals[vital] is not None:
                vital_checks += 1
                if low <= vitals[vital] <= high:
                    vital_score += 25
                elif abs(vitals[vital] - low) < 10 or abs(vitals[vital] - high) < 10:
                    vital_score += 10  # Partial match
        
        if vital_checks > 0:
            score += (vital_score / vital_checks) * profile["base_weight"]
        
        # Bonus for multiple matching symptoms
        if len(matching_symptoms) >= 3:
            score *= 1.2
        
        # Add some randomness to simulate model uncertainty
        score += np.random.uniform(-5, 5)
        
        if score > 0:
            disease_scores[disease] = max(0, score)
    
    # Sort by score and get top 3
    sorted_diseases = sorted(disease_scores.items(), key=lambda x: x[1], reverse=True)[:3]
    
    # Normalize to percentages
    total_score = sum(score for _, score in sorted_diseases)
    if total_score == 0:
        total_score = 1
    
    predictions = []
    for disease, score in sorted_diseases:
        confidence = (score / total_score) * 100
        predictions.append({
            "disease": disease,
            "confidence": round(confidence, 2)
        })
    
    # Ensure we have 3 predictions
    while len(predictions) < 3:
        predictions.append({
            "disease": "Insufficient data for prediction",
            "confidence": 0.0
        })
    
    return {"predictions": predictions}