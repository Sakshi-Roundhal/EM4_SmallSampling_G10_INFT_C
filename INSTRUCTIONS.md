### How to Run

### NODE  --  tere pc mein node install nhin hoga toh windows cmd pe ye line bas ek baar run karna phir node install ho jayega
WINDOWS TERMINAL
```bash
winget install OpenJS.NodeJS.LTS
```

## Backend

Open terminal and run:
```bash
cd backend
pip install -r requirements.txt      -->  sirf pehli baar run karna, 2nd time se zaroorat nhin
uvicorn app:app --reload --port 8000
```
The backend at **http://localhost:8000**

---

## Frontend

Open NEW terminal and run:
```bash
cd frontend
npm i                 -->  sirf pehli baar run karna, 2nd time se zaroorat nhin
npm run sakshi
```
The React at **http://localhost:5173**
