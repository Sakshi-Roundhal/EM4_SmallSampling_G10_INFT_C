from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pandas as pd
import numpy as np
from sklearn.linear_model import LinearRegression
from math_utils import calculate_t_test
import random

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize a trained model with synthetic data
def train_model():
    np.random.seed(42)
    n_samples = 100
    mid1 = np.random.randint(10, 30, n_samples)
    mid2 = np.random.randint(10, 30, n_samples)
    internal = np.random.randint(5, 20, n_samples)
    attendance = np.random.randint(50, 100, n_samples)
    study_hours = np.random.randint(1, 10, n_samples)
    sleep_hours = np.random.randint(4, 9, n_samples)
    
    # Simple linear relationship with some noise
    endsem = (mid1 * 0.5 + mid2 * 0.5 + internal * 1.5 + attendance * 0.2 + study_hours * 2 - sleep_hours * 0.5 + np.random.normal(0, 5, n_samples)).astype(int)
    endsem = np.clip(endsem, 0, 100) # Keep within 0-100 range
    
    X = pd.DataFrame({
        "Mid1": mid1, "Mid2": mid2, "Internal": internal,
        "Attendance": attendance, "StudyHours": study_hours, "SleepHours": sleep_hours
    })
    y = endsem
    
    model = LinearRegression()
    model.fit(X, y)
    return model

model = train_model()

@app.get("/generate-sample")
def generate_sample(n: int = 10):
    """Generate a sample of N students."""
    students = []
    for i in range(n):
        student = {
            "id": i + 1,
            "Mid1": random.randint(10, 30),
            "Mid2": random.randint(10, 30),
            "Internal": random.randint(5, 20),
            "Attendance": random.randint(50, 100),
            "StudyHours": random.randint(1, 10),
            "SleepHours": random.randint(4, 9)
        }
        # Get actual and AI predictions
        X_student = pd.DataFrame([student]).drop(columns=["id"])
        
        # We also need an actual EndSem, we mock it via our formula, but add variance so AI prediction is not 100% exact.
        actual_endsem = int(
            student["Mid1"] * 0.5 + student["Mid2"] * 0.5 + student["Internal"] * 1.5 + 
            student["Attendance"] * 0.2 + student["StudyHours"] * 2 - student["SleepHours"] * 0.5 + 
            random.uniform(-10, 10)
        )
        actual_endsem = max(0, min(100, actual_endsem))
        
        # Compute AI prediction upfront so frontend can do live client-side math
        ai_pred = int(model.predict(X_student)[0])
        
        student["Actual"] = actual_endsem
        student["AIPred"] = ai_pred
        students.append(student)
        
    return {"students": students}

class PredictionRequest(BaseModel):
    students: list
    human_predictions: list

@app.post("/predict-and-test")
def predict_and_test(req: PredictionRequest):
    students = req.students
    human_preds = req.human_predictions
    
    ai_errors = []
    human_errors = []
    results = []
    
    for i, student in enumerate(students):
        actual = student["Actual"]
        human_pred = human_preds[i]
        
        # Calculate AI prediction
        X_df = pd.DataFrame([{
            "Mid1": student["Mid1"],
            "Mid2": student["Mid2"],
            "Internal": student["Internal"],
            "Attendance": student["Attendance"],
            "StudyHours": student["StudyHours"],
            "SleepHours": student["SleepHours"]
        }])
        ai_pred = int(model.predict(X_df)[0])
        
        ai_error = abs(actual - ai_pred)
        human_error = abs(actual - human_pred)
        
        ai_errors.append(ai_error)
        human_errors.append(human_error)
        
        results.append({
            "id": student["id"],
            "Actual": actual,
            "AIPred": ai_pred,
            "HumanPred": human_pred,
            "AIError": ai_error,
            "HumanError": human_error
        })
        
    # Perform manual t-test
    t_test_results = calculate_t_test(ai_errors, human_errors)
    
    return {
        "results": results,
        "math_steps": t_test_results
    }
