from typing import Tuple, Dict, Any, List
import math
from app.core.config import settings

def calculate_linear_regression_slope(samples: List[float], interval_seconds: float = 3.0) -> float:
    """
    Computes the Ordinary Least Squares (OLS) slope of response time over time.
    x represents elapsed time in seconds: [0, interval, 2*interval, ...]
    y represents response time in milliseconds.
    
    Formula:
    m = (N * sum(x*y) - sum(x)*sum(y)) / (N * sum(x^2) - (sum(x))^2)
    """
    n = len(samples)
    if n < 2:
        return 0.0

    x = [i * interval_seconds for i in range(n)]
    y = [float(val) for val in samples]

    sum_x = sum(x)
    sum_y = sum(y)
    sum_xy = sum(xi * yi for xi, yi in zip(x, y))
    sum_x2 = sum(xi ** 2 for xi in x)

    denominator = (n * sum_x2) - (sum_x ** 2)
    if abs(denominator) < 1e-9:
        return 0.0

    slope = ((n * sum_xy) - (sum_x * sum_y)) / denominator
    return round(slope, 4)

def evaluate_node_health(
    recent_response_times: List[float],
    missed_heartbeats: int,
    beta: float = settings.BETA_WEIGHT,
    slope_ref: float = settings.SLOPE_REF_MS_PER_SEC,
    missed_max: int = settings.MISSED_HB_MAX,
    warning_threshold: float = settings.RISK_WARNING_THRESHOLD,
    critical_threshold: float = settings.RISK_CRITICAL_THRESHOLD,
    max_missed_failstop: int = settings.MAX_MISSED_HB_FAILSTOP,
    interval_seconds: float = settings.HEARTBEAT_INTERVAL_SECONDS
) -> Tuple[float, str, str, Dict[str, Any]]:
    """
    Calculates the combined risk score and determines node health status.
    
    Returns:
        (risk_score, status, explanation, debug_metrics)
    """
    # 1. Slope Calculation
    slope = calculate_linear_regression_slope(recent_response_times, interval_seconds)
    
    # Positive slope indicates deteriorating response time (latency increasing)
    # Clamp normalized slope between 0.0 and 1.0
    safe_slope_ref = max(slope_ref, 0.001)
    if slope <= 0.0:
        normalized_slope = 0.0
    else:
        normalized_slope = min(1.0, slope / safe_slope_ref)

    # 2. Normalized Missed Heartbeats
    safe_missed_max = max(missed_max, 1)
    normalized_heartbeats = min(1.0, max(0.0, missed_heartbeats / safe_missed_max))

    # 3. Combined Risk Score
    # Risk Score = beta * normalized_slope + (1 - beta) * normalized_heartbeats
    safe_beta = min(1.0, max(0.0, beta))
    raw_risk = (safe_beta * normalized_slope) + ((1.0 - safe_beta) * normalized_heartbeats)
    risk_score = round(min(1.0, max(0.0, raw_risk)), 4)

    # 4. Status Determination
    if missed_heartbeats >= max_missed_failstop or risk_score >= critical_threshold:
        status = "FAIL-STOP"
        if missed_heartbeats >= max_missed_failstop:
            reason = f"Node missed {missed_heartbeats} consecutive heartbeats (limit: {max_missed_failstop}). Marked FAIL-STOP."
        else:
            reason = f"Risk score {risk_score:.2f} exceeded critical threshold {critical_threshold:.2f} due to severe latency degradation (slope: +{slope:.2f} ms/s)."
    elif risk_score >= warning_threshold:
        status = "AT-RISK"
        reason = f"Node latency trend deteriorating (+{slope:.2f} ms/s) with risk score {risk_score:.2f} >= warning threshold {warning_threshold:.2f}."
    else:
        status = "NORMAL"
        reason = f"Healthy response time ({recent_response_times[-1] if recent_response_times else 0.0:.1f}ms) with stable slope ({slope:+.2f} ms/s) and zero missed heartbeats."

    details = {
        "slope_ms_per_sec": slope,
        "normalized_slope": round(normalized_slope, 4),
        "missed_heartbeats": missed_heartbeats,
        "normalized_heartbeats": round(normalized_heartbeats, 4),
        "beta_weight": safe_beta,
        "risk_score": risk_score,
        "status": status,
        "warning_threshold": warning_threshold,
        "critical_threshold": critical_threshold
    }

    return risk_score, status, reason, details

