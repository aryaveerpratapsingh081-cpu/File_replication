from typing import Tuple, Dict, Any
from datetime import datetime, timezone
from app.core.config import settings

def calculate_target_replication(
    importance: str,
    access_rate: float,
    seconds_since_last_access: float,
    min_replicas: int = settings.MIN_REPLICAS,
    max_replicas: int = settings.MAX_REPLICAS,
    dormant_threshold_seconds: float = settings.DORMANT_THRESHOLD_SECONDS,
    high_access_threshold: float = settings.HIGH_ACCESS_THRESHOLD_RPS
) -> Tuple[int, str, str, Dict[str, Any]]:
    """
    Evaluates rule-based adaptive replication factor based on file importance and access frequency.
    
    Returns:
        (target_replicas, rule_code, plain_english_reason, metrics_dict)
    """
    is_critical = (importance.strip().lower() == "critical")
    is_high_access = (access_rate >= high_access_threshold)
    is_dormant = (seconds_since_last_access > dormant_threshold_seconds and access_rate < 0.1)

    if is_critical:
        # Rule 5: Critical file with high access
        if is_high_access:
            factor = settings.DEFAULT_CRITICAL_REPLICAS + 1
            rule_code = "RULE_CRITICAL_HIGH_ACCESS"
            reason = (
                f"Critical file with high access frequency ({access_rate:.2f} req/min >= {high_access_threshold:.1f}): "
                f"Boosted to {factor} replicas (4 base + 1 high access) to minimize access bottlenecks and ensure maximum redundancy."
            )
        # Rule 4: Critical file normal access
        else:
            factor = settings.DEFAULT_CRITICAL_REPLICAS
            rule_code = "RULE_CRITICAL_NORMAL"
            reason = (
                f"Critical file with standard access: Assigned {factor} replicas "
                f"to guarantee continuous availability across multiple rack failure domains."
            )
    else:
        # Standard file
        if is_high_access:
            # Rule 3: Standard file with high access
            factor = settings.DEFAULT_STANDARD_REPLICAS + 1
            rule_code = "RULE_STANDARD_HIGH_ACCESS"
            reason = (
                f"Standard file under high access demand ({access_rate:.2f} req/min >= {high_access_threshold:.1f}): "
                f"Provisioned +1 extra replica ({factor} total) to distribute read load."
            )
        elif is_dormant:
            # Rule 2: Standard file dormant
            factor = settings.MIN_REPLICAS
            rule_code = "RULE_STANDARD_DORMANT"
            reason = (
                f"Standard file dormant for {seconds_since_last_access:.0f}s (threshold: {dormant_threshold_seconds:.0f}s) "
                f"with minimal traffic: Scaled down to minimum {factor} replicas to conserve storage capacity."
            )
        else:
            # Rule 1: Standard file normal access
            factor = settings.DEFAULT_STANDARD_REPLICAS
            rule_code = "RULE_STANDARD_NORMAL"
            reason = (
                f"Standard file under normal operating conditions: Assigned baseline {factor} replicas."
            )

    # Clamp to configured min/max limits
    clamped_factor = min(max_replicas, max(min_replicas, factor))

    metrics = {
        "importance": "Critical" if is_critical else "Standard",
        "access_rate": round(access_rate, 2),
        "seconds_since_last_access": round(seconds_since_last_access, 1),
        "is_high_access": is_high_access,
        "is_dormant": is_dormant,
        "raw_factor": factor,
        "target_factor": clamped_factor,
        "min_replicas": min_replicas,
        "max_replicas": max_replicas
    }

    return clamped_factor, rule_code, reason, metrics

