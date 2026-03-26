# AI vs Human Prediction — Paired t-Test

![Course](https://img.shields.io/badge/Course-Engineering%20Mathematics%204%20(BSC07)-4F6EF7?style=flat-square)

![Topic](https://img.shields.io/badge/Topic-Small%20Sampling%20t--Test-10B981?style=flat-square)
![Python](https://img.shields.io/badge/Python-3.8%2B-F43F5E?style=flat-square&logo=python&logoColor=white)
![Backend](https://img.shields.io/badge/Backend-FastAPI%20%2B%20Uvicorn-009688?style=flat-square)
![Frontend](https://img.shields.io/badge/Frontend-React%2019%20%2B%20Vite-61DAFB?style=flat-square&logo=react)

> **Course:** Engineering Mathematics 4 (EM-4 / BSC07)  
> **Topic Allocated:** Small Sampling — t-Test  


---

## Overview

This project answers a concrete statistical question: **is an AI model's prediction of student end-semester scores significantly more accurate than a human's intuitive guess?** The system has two moving parts working in tandem.

**The AI side:** On startup, a `LinearRegression` model (from `sklearn.linear_model`) is trained in `app.py` on 100 synthetically generated student records. The six input features are `Mid1`, `Mid2`, `Internal`, `Attendance`, `StudyHours`, and `SleepHours`. Once trained, the model predicts the end-semester score (`EndSem`, range 0–100) for each of 10 freshly sampled students, and those predictions are sent to the frontend immediately.

**The human side:** The same 10 students are displayed to the user (without revealing their actual scores), who types their own predicted `EndSem` value (0–100) for each student in the dashboard's input panel.

**The statistical connection:** For each student, the absolute prediction error is computed for both the AI (`|Actual − AIPred|`) and the human (`|Actual − HumanPred|`). These 10 paired error values are fed into a **manually implemented paired t-test** in `math_utils.py` — written from scratch using only Python's built-in `math` module, with no `scipy`, `statsmodels`, or any statistical library involved. The test determines whether the mean difference in errors is statistically significant, or merely due to chance. Every calculation updates live in the browser as the user types, with no form submission required.

---

![Alt text](./img.png)

## Why Paired t-Test?

The choice of paired t-test is determined directly by the structure of the code in `app.py`. The endpoint `/generate-sample` returns **the same 10 students** to both the AI (which predicts immediately) and the human (who enters predictions for those same students). This creates paired observations — for every student `i`, there is exactly one `AIError_i` and one `HumanError_i`, both anchored to the same ground-truth `Actual_i` score.

| Condition | Evidence in the code |
|-----------|----------------------|
| Same subjects evaluated by both methods | `/generate-sample` returns a single list of `n=10` students; AI predictions are pre-computed in the same loop; human enters predictions for the same IDs |
| Small sample: n < 30 | `generate_sample(n: int = 10)` — the default and only used value is 10 |
| Population standard deviation is unknown | `calculate_std_dev(differences)` in `math_utils.py` estimates σ from the sample using Bessel's correction (divides by `n-1`) |
| Errors are continuous numerical values | `ai_error = abs(actual - ai_pred)` yields a non-negative real number |
| Observations are dependent, not independent | `differences = [ai - hum for ai, hum in zip(ai_errors, human_errors)]` — each difference pairs the two errors for the same student, not separately sampled groups |

An **independent two-sample t-test** would be wrong here because AI and human errors for student S01 are both tied to S01's actual score — treating them as independent would ignore this natural correlation and reduce the test's ability to detect a real difference.

---

## Dataset

There is no static CSV file. The dataset is **generated in memory** every time the application runs. The function `train_model()` in `app.py` uses `numpy.random` with `seed=42` to create 100 training records, and the `/generate-sample` endpoint generates 10 fresh student records on each request using Python's `random` module (no fixed seed — so every "New Sample" gives different students).

### Feature columns (used as model inputs)

| Column | Python variable | Range (from code) | Description |
|--------|----------------|-------------------|-------------|
| `Mid1` | `mid1` | `randint(10, 30)` | Mid-semester 1 marks |
| `Mid2` | `mid2` | `randint(10, 30)` | Mid-semester 2 marks |
| `Internal` | `internal` | `randint(5, 20)` | Internal/continuous assessment marks |
| `Attendance` | `attendance` | `randint(50, 100)` | Attendance percentage |
| `StudyHours` | `study_hours` | `randint(1, 10)` | Study hours per day |
| `SleepHours` | `sleep_hours` | `randint(4, 9)` | Sleep hours per day |

### Target variable

| Column | Range | How it is computed |
|--------|-------|--------------------|
| `EndSem` | `clip(0, 100)` | `(Mid1×0.5) + (Mid2×0.5) + (Internal×1.5) + (Attendance×0.2) + (StudyHours×2) − (SleepHours×0.5) + N(0,5)` |

The Gaussian noise term `np.random.normal(0, 5, n_samples)` in training data, and `random.uniform(-10, 10)` in the per-sample actual scores, ensures that the AI model's predictions are realistic but imperfect — which is essential for the t-test to be non-trivial.

---

## Methodology

The following traces the actual execution path through the code:

```
[app.py — startup]
  train_model()
    ├─ Generate 100 synthetic records with np.random (seed=42)
    ├─ Build DataFrame with 6 features
    ├─ Fit LinearRegression on all 100 rows
    └─ Return trained model object (held in module-level variable `model`)

[GET /generate-sample?n=10]
  for i in range(10):
    ├─ Generate one student with random.randint() for each feature
    ├─ Compute actual_endsem using formula + random.uniform(-10, 10) noise
    ├─ actual_endsem = max(0, min(100, actual_endsem))   ← clip to valid range
    ├─ ai_pred = int(model.predict(X_student)[0])        ← AI prediction
    └─ Return {id, Mid1, Mid2, Internal, Attendance, StudyHours, SleepHours,
               Actual, AIPred} for all 10 students

[Frontend — App.jsx, on every keystroke]
  computeAnalysis(students, preds)
    ├─ For each student: humanPred = clamp(parseFloat(preds[id]), 0, 100)
    ├─ aiError   = |Actual - AIPred|
    ├─ humanError = |Actual - humanPred|
    ├─ diffs = [aiError - humanError, ...]               ← paired differences
    └─ Run t-test math client-side (mirrors math_utils.py exactly)

[math_utils.py — calculate_t_test(ai_errors, human_errors)]
  ├─ Step 1: differences = [ai - hum for ai, hum in zip(...)]
  ├─ Step 2: mean_diff = calculate_mean(differences)
  ├─ Step 3: std_dev_diff = calculate_std_dev(differences)  ← uses n-1
  ├─ Step 4: t_stat = mean_diff / (std_dev_diff / sqrt(n))
  ├─ df = n - 1 = 9
  ├─ p_value = approximate_p_value(t_stat, df)             ← manual CDF
  ├─ cohens_d = mean_diff / std_dev_diff
  └─ CI: margin = 2.262 × (std_dev_diff / sqrt(n))        ← t_crit for df=9

[Frontend decision]
  sigDiff = (math.p_value < alpha)     ← alpha ∈ {0.01, 0.05, 0.10}, user-selectable
  critT   = {0.01: 3.250, 0.05: 2.262, 0.10: 1.833}[alpha]
```

---

## Manual t-Test Implementation

The entire t-test lives in `backend/math_utils.py` and is mirrored in `frontend/src/App.jsx` (`computeAnalysis` function). Neither file imports `scipy`, `statsmodels`, or any statistics library. Only Python's built-in `math` module is used on the backend.

### Step 1 — Compute pairwise differences

```python
# math_utils.py, line 60
differences = [ai - hum for ai, hum in zip(ai_errors, human_errors)]
```

For each of the 10 students, `d_i = AI_error_i − Human_error_i`.  
A negative `d_i` means the AI was closer to the actual score for that student.

### Step 2 — Mean of differences (d̄)

```python
# math_utils.py, lines 4-6
def calculate_mean(data):
    return sum(data) / len(data)

mean_diff = calculate_mean(differences)
```

```
      Σ dᵢ
d̄ = ──────   (sum over i = 1 … 10)
       n
```

### Step 3 — Sample standard deviation of differences (Sd)

```python
# math_utils.py, lines 8-19
def calculate_variance(data, sample=True):
    mean_val = calculate_mean(data)
    sq_diffs = [(x - mean_val) ** 2 for x in data]
    denominator = n - 1 if sample else n      # sample=True → Bessel's correction
    return sum(sq_diffs) / denominator

def calculate_std_dev(data, sample=True):
    return math.sqrt(calculate_variance(data, sample))
```

```
       √( Σ(dᵢ − d̄)² )
Sd =  ─────────────────
           n − 1
```

Division by `n − 1` (not `n`) is Bessel's correction — it gives an unbiased estimate of the population variance when working from a small sample. The code explicitly passes `sample=True` as the default.

### Step 4 — t-statistic

```python
# math_utils.py, lines 65-69
if std_dev_diff == 0:
    t_stat = 0.0
else:
    t_stat = mean_diff / (std_dev_diff / math.sqrt(n))
```

```
         d̄
t = ──────────
    Sd / √n
```

`Sd / √n` is the Standard Error of the Mean Difference. The guard condition on `std_dev_diff == 0` handles the degenerate case where all differences are identical.

### p-Value — Manual CDF approximation (no scipy)

```python
# math_utils.py, lines 21-52
def approximate_p_value(t_stat, df):
    z = t_stat * (1.0 - 1.0 / (4.0 * df))   # finite-sample correction
    z_abs = abs(z)
    # Abramowitz & Stegun (1964) polynomial approximation of Φ(z):
    b1=0.319381530; b2=-0.356563782; b3=1.781477937
    b4=-1.821255978; b5=1.330274429
    p=0.2316419; c=0.39894228
    t = 1.0 / (1.0 + p * z_abs)
    cdf = 1.0 - c * exp(-z²/2) * t*(b1 + t*(b2 + t*(b3 + t*(b4 + t*b5))))
    return 2.0 * (1.0 - cdf)                 # two-tailed p-value
```

The approach: convert the t-statistic to an approximate z-score using the correction `z = t × (1 − 1/(4·df))`, then evaluate the standard normal CDF using the Abramowitz & Stegun polynomial. The factor of `2.0` makes it two-tailed. This is an approximation — adequate for demonstrating the concept without external libraries.

### Degrees of freedom & critical values

Both files agree: `df = n − 1 = 9`. The frontend hardcodes the three critical values:

```javascript
// App.jsx, line 13
const CRIT_T = { 0.01: 3.250, 0.05: 2.262, 0.10: 1.833 }
```

---

## Hypotheses

Based on how `calculate_t_test` structures `differences = AI_error − Human_error`:

```
H₀ : μ_d = 0
     The mean of (AI_error − Human_error) across all students is zero;
     AI and human predict with equivalent accuracy on average.

H₁ : μ_d ≠ 0       [two-tailed]
     The mean difference is not zero;
     one predictor is reliably more or less accurate than the other.
```

The test is two-tailed because the code does not assume the direction of the difference — `d_i` can be negative (AI better) or positive (human better). The frontend reflects this:

```javascript
// App.jsx, line 154
const sigDiff = math && math.p_value < alpha;
```

The decision is made purely by comparing `p_value` to the user's chosen `alpha`.

---

## Additional Statistical Measures

Both are computed in `math_utils.py` and returned as part of the same response object.

### Cohen's d — Effect Size

```python
# math_utils.py, line 75
cohens_d = mean_diff / std_dev_diff if std_dev_diff != 0 else 0
```

```
          d̄
Cohen's d = ──
           Sd
```

Cohen's d answers a different question from the t-test. The t-test says: *"Is the difference real, or just noise?"* Cohen's d says: *"How large is the difference in practical terms?"* A result can be statistically significant (p < 0.05) but have a negligible Cohen's d, meaning the difference, while real, is too small to matter in practice. The frontend renders interpretation labels: Negligible (|d| < 0.2), Small (< 0.5), Medium (< 0.8), Large (≥ 0.8).

### 95% Confidence Interval

```python
# math_utils.py, lines 79-83
t_crit = 2.262 if n == 10 else 2.0       # df=9, two-tailed, 95%
margin_error = t_crit * (std_dev_diff / math.sqrt(n))
ci_lower = mean_diff - margin_error
ci_upper = mean_diff + margin_error
```

```
CI₉₅ = d̄ ± 2.262 × (Sd / √10)
```

The value `2.262` is hardcoded because `n` is always 10 in this project (`df = 9`, two-tailed, 95% confidence). The interval gives a plausible range for the true mean difference `μ_d`. If the interval does not contain 0, this is consistent with rejecting H₀ at α = 0.05 — the two conclusions must agree.

---

## Project Structure

```
EM4_SmallSampling/
│
├── backend/
│   ├── app.py              # FastAPI app — trains model, serves /generate-sample
│   │                       # and /predict-and-test endpoints
│   ├── math_utils.py       # All t-test math: mean, variance, std dev,
│   │                       # t-statistic, p-value (Abramowitz & Stegun),
│   │                       # Cohen's d, 95% CI — no scipy used
│   ├── requirements.txt    # fastapi, uvicorn, pandas, numpy, scikit-learn
│   └── .gitignore
│
├── frontend/
│   ├── index.html          # Page title: "AI vs Human Prediction — Paired t-Test"
│   │                       # Loads Inter font from Google Fonts
│   ├── package.json        # npm run sakshi → starts Vite dev server
│   ├── vite.config.js
│   └── src/
│       ├── main.jsx        # React root mount
│       ├── index.css       # Design system — Inter + JetBrains Mono, light theme
│       ├── App.jsx         # Main component:
│       │                   #   • computeAnalysis() — client-side t-test mirror
│       │                   #   • approxPValue() — JS port of Abramowitz & Stegun
│       │                   #   • Alpha selector (0.01 / 0.05 / 0.10)
│       │                   #   • Student data table, input fields, metric cards
│       └── components/
│           ├── Charts.jsx      # ErrorBarChart (Bar), PredictionsLineChart (Line)
│           │                   # using chart.js + react-chartjs-2
│           ├── MathPanel.jsx   # Expandable derivation panel showing all 4 steps
│           │                   # with live computed values
│           └── TDistChart.jsx  # Live t-distribution curve (df=9) with shaded
│                               # rejection/acceptance regions and t-stat marker
│
├── INSTRUCTIONS.md         # How to run (in Hindi/English mixed)
└── README.md               # This file
```

---

## Real World Applications

The exact same approach used here — manually implemented paired t-test comparing two evaluators (one automated, one human) on the same small set of subjects — applies directly to:

1. **Radiology AI vs. Radiologist: diagnosing chest X-rays** — An AI model and a board-certified radiologist both examine the same 10 patient scans and classify them (cancer / no cancer / severity score). The paired t-test on their diagnostic error rates, applied to the same patient cohort, determines whether the AI system is ready for clinical pre-screening — with n often limited by rare case availability, making small-sample methods mandatory.

2. **Automated essay grading in university examinations** — A natural language processing model and a human examiner both score the same 10 student essays on a 0–100 scale. The paired design controls for variation in essay quality across submissions. A statistically significant result (p < 0.05) with a small Cohen's d might indicate the AI grades consistently but not identically — acceptable for preliminary screening, not final marking.

3. **Predictive maintenance: sensor algorithm vs. technician** — A vibration-analysis algorithm and an experienced floor technician each estimate the remaining useful life (in hours) of the same 10 industrial machines. The paired t-test on prediction error determines whether the algorithm can replace manual inspection, directly reducing downtime costs. Sample sizes are small because machines of identical type and age are scarce.

4. **Sports analytics: model vs. coach for player performance prediction** — A regression model trained on training load and biometric data, and a head coach using intuition, both predict a player's performance score for the same upcoming 10 matches. If the t-test rejects H₀ with a large Cohen's d (|d| ≥ 0.8), the model's advantage is both statistically real and practically meaningful — a result that would justify investing in data infrastructure for the club.

---

## References

1. Walpole, R. E., Myers, R. H., Myers, S. L., & Ye, K. (2012). *Probability and Statistics for Engineers and Scientists* (9th ed.). Pearson. — Ch. 10: Small-Sample Tests of Hypotheses, Paired t-Test.

2. Montgomery, D. C., & Runger, G. C. (2014). *Applied Statistics and Probability for Engineers* (6th ed.). Wiley. — §10-4: Paired t-Test derivation and assumptions.

3. Gosset, W. S. [writing as "Student"]. (1908). The probable error of a mean. *Biometrika, 6*(1), 1–25. — Original derivation of the t-distribution for small samples.

4. Abramowitz, M., & Stegun, I. A. (Eds.). (1964). *Handbook of Mathematical Functions*. National Bureau of Standards. — Formula 26.2.17, the polynomial approximation of Φ(z) implemented in `approximate_p_value()`.

5. Cohen, J. (1988). *Statistical Power Analysis for the Behavioral Sciences* (2nd ed.). Lawrence Erlbaum. — Ch. 2: Effect size conventions for the t-test (the thresholds 0.2 / 0.5 / 0.8 used in the frontend).

---


