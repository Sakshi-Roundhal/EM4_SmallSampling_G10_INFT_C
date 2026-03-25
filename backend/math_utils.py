import math

def calculate_mean(data):
    """Calculate the mean of a list of numbers."""
    if not data: return 0.0
    return sum(data) / len(data)

def calculate_variance(data, sample=True):
    """Calculate variance. Uses n-1 by default for sample variance."""
    n = len(data)
    if n <= 1: return 0.0
    mean_val = calculate_mean(data)
    sq_diffs = [(x - mean_val) ** 2 for x in data]
    denominator = n - 1 if sample else n
    return sum(sq_diffs) / denominator

def calculate_std_dev(data, sample=True):
    """Calculate standard deviation."""
    return math.sqrt(calculate_variance(data, sample))

def approximate_p_value(t_stat, df):
    """
    Very rough approximation of p-value for two-tailed t-test.
    For more exactness without scipy, we use a simple lookup or empirical function.
    Given this is an academic manual project, we implement a basic polynomial approximation
    for the Student's t-distribution CDF.
    """
    # A simplified approximation using standard normal approximation 
    # since exact t-cdf without scipy is complex. 
    # For small n, this is an approximation. 
    # We will use the formula: z = t * (1 - 1/(4*df))
    # It's a crude approximation, but suffices to show without external libraries.
    import math
    if df <= 0: return 1.0
    z = t_stat * (1.0 - 1.0 / (4.0 * df))
    
    # Standard normal CDF approximation (Abramowitz and Stegun)
    z_abs = abs(z)
    b1 = 0.319381530
    b2 = -0.356563782
    b3 = 1.781477937
    b4 = -1.821255978
    b5 = 1.330274429
    p = 0.2316419
    c = 0.39894228
    
    t = 1.0 / (1.0 + p * z_abs)
    cdf = 1.0 - c * math.exp(-z_abs * z_abs / 2.0) * t * \
          (b1 + t * (b2 + t * (b3 + t * (b4 + t * b5))))
          
    p_value = 2.0 * (1.0 - cdf) # Two-tailed
    return p_value

def calculate_t_test(ai_errors, human_errors):
    """
    Perform a paired t-test between AI predictions and Human predictions.
    Differences = AI_error - Human_error.
    """
    n = len(ai_errors)
    differences = [ai - hum for ai, hum in zip(ai_errors, human_errors)]
    
    mean_diff = calculate_mean(differences)
    std_dev_diff = calculate_std_dev(differences)
    
    if std_dev_diff == 0:
        t_stat = 0.0
    else:
        # t = (d_bar) / (s_d / sqrt(n))
        t_stat = mean_diff / (std_dev_diff / math.sqrt(n))
        
    df = n - 1
    p_value = approximate_p_value(t_stat, df)
    
    # Cohen's d: effect size = mean_diff / std_dev
    cohens_d = mean_diff / std_dev_diff if std_dev_diff != 0 else 0
    
    # 95% Confidence interval (approx critical t value = 2.262 for df=9)
    # Using approx 2.0 for simpler logic if df isn't 9, but we can just use 2.262 for n=10.
    t_crit = 2.262 if n == 10 else 2.0
    # Guard: if std_dev_diff == 0, no spread → CI collapses to the mean
    margin_error = t_crit * (std_dev_diff / math.sqrt(n)) if std_dev_diff != 0 else 0.0
    ci_lower = mean_diff - margin_error
    ci_upper = mean_diff + margin_error
    
    return {
        "differences": differences,
        "mean_diff": mean_diff,
        "std_dev_diff": std_dev_diff,
        "t_stat": t_stat,
        "p_value": p_value,
        "df": df,
        "cohens_d": cohens_d,
        "ci_lower": ci_lower,
        "ci_upper": ci_upper
    }
