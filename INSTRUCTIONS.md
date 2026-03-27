# AI vs Human Prediction Dashboard - Setup Instructions

This guide provides step-by-step instructions to set up and run the project locally. The project consists of a FastAPI backend and a React (Vite) frontend.

## Prerequisites

- **Node.js**: Required to run the React frontend.
  If Node.js is not installed on your Windows machine, open your Command Prompt or PowerShell and run this command once:
  ```bash
  winget install OpenJS.NodeJS.LTS
  ```
- **Python (3.8+)**: Required for the backend. Make sure Python is installed and added to your system PATH.

---

## 1. Backend Setup (FastAPI & Python)

The backend handles data generation, the predictive model, and statistical t-test calculation.

Open a terminal and run the following commands:

```bash
cd backend
# Install required Python libraries (Run only the first time)
pip install -r requirements.txt

# Start the Fast API server
uvicorn app:app --reload --port 8000
```

*The backend API will now be running at **http://localhost:8000***

---

## 2. Frontend Setup (React & Vite)

The frontend contains the interactive React dashboard.

Open a **NEW terminal window** (keep the backend server running) and run the following commands:

```bash
cd frontend
# Install Node.js dependencies (Run only the first time)
npm install

# Start the React development server
npm run sakshi
```

*The React dashboard will now be running at **http://localhost:5173***

---

## Accessing the Dashboard

Once both the backend and frontend servers are running, open your web browser and navigate to `http://localhost:5173` to access and use the application.
