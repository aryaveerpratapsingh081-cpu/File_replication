import pytest
from app.algorithms.health import calculate_linear_regression_slope, evaluate_node_health
from app.algorithms.replication import calculate_target_replication
from app.algorithms.placement import calculate_node_normalized_load, calculate_diversity_score, evaluate_placement
from app.algorithms.priority_queue import calculate_urgency_score, RecoveryPriorityQueue
from app.models.schemas import RecoveryJobModel
from app.core.config import settings

def test_linear_regression_slope():
    # Constant response times -> slope = 0
    assert calculate_linear_regression_slope([20.0, 20.0, 20.0, 20.0], 3.0) == 0.0

    # Linearly increasing response times: y = 10 + 2*t
    # t = [0, 3, 6, 9], y = [10, 16, 22, 28] -> slope = 2.0 ms/sec
    slope = calculate_linear_regression_slope([10.0, 16.0, 22.0, 28.0], 3.0)
    assert pytest.approx(slope, 0.01) == 2.0

    # Linearly decreasing response times: slope should be negative
    slope_dec = calculate_linear_regression_slope([50.0, 40.0, 30.0], 3.0)
    assert slope_dec < 0.0

    # Edge cases: fewer than 2 samples
    assert calculate_linear_regression_slope([10.0], 3.0) == 0.0
    assert calculate_linear_regression_slope([], 3.0) == 0.0

def test_health_evaluation_risk_score():
    # Stable healthy node
    risk, status, reason, details = evaluate_node_health(
        recent_response_times=[15.0, 15.2, 14.8, 15.1],
        missed_heartbeats=0
    )
    assert risk < settings.RISK_WARNING_THRESHOLD
    assert status == "NORMAL"

    # Rapidly degrading node (slope ~ +8.75 ms/sec with slope_ref=8.0) -> AT-RISK
    degrading = [15.0, 30.0, 60.0, 95.0, 140.0]
    risk_atrisk, status_atrisk, _, _ = evaluate_node_health(
        recent_response_times=degrading,
        missed_heartbeats=0,
        slope_ref=8.0,
        beta=0.7
    )
    assert risk_atrisk >= settings.RISK_WARNING_THRESHOLD
    assert status_atrisk in ["AT-RISK", "FAIL-STOP"]

    # Missed heartbeats reaching limit -> FAIL-STOP
    risk_fail, status_fail, reason_fail, _ = evaluate_node_health(
        recent_response_times=[20.0, 20.0],
        missed_heartbeats=4,
        max_missed_failstop=4
    )
    assert status_fail == "FAIL-STOP"
    assert "missed 4 consecutive heartbeats" in reason_fail

def test_adaptive_replication_rules():
    # Rule 1: Standard normal
    factor, rule, _, _ = calculate_target_replication("Standard", access_rate=0.5, seconds_since_last_access=10.0)
    assert factor == 3
    assert rule == "RULE_STANDARD_NORMAL"

    # Rule 2: Standard dormant
    factor_dorm, rule_dorm, _, _ = calculate_target_replication(
        "Standard", access_rate=0.0, seconds_since_last_access=200.0, dormant_threshold_seconds=120.0
    )
    assert factor_dorm == 2
    assert rule_dorm == "RULE_STANDARD_DORMANT"

    # Rule 3: Standard high access
    factor_high, rule_high, _, _ = calculate_target_replication(
        "Standard", access_rate=3.5, seconds_since_last_access=10.0, high_access_threshold=2.0
    )
    assert factor_high == 4
    assert rule_high == "RULE_STANDARD_HIGH_ACCESS"

    # Rule 4: Critical normal
    factor_crit, rule_crit, _, _ = calculate_target_replication(
        "Critical", access_rate=0.5, seconds_since_last_access=10.0
    )
    assert factor_crit == 4
    assert rule_crit == "RULE_CRITICAL_NORMAL"

    # Rule 5: Critical high access
    factor_crit_high, rule_crit_high, _, _ = calculate_target_replication(
        "Critical", access_rate=4.0, seconds_since_last_access=5.0, high_access_threshold=2.0
    )
    assert factor_crit_high == 5
    assert rule_crit_high == "RULE_CRITICAL_HIGH_ACCESS"

def test_placement_scoring_and_diversity():
    candidates = [
        {
            "node_id": "node_1",
            "name": "Node 1",
            "rack_id": "Rack-A",
            "switch_id": "Switch-1",
            "power_domain_id": "PDU-1",
            "status": "NORMAL",
            "cpu_utilization": 80.0,
            "disk_io_utilization": 80.0,
            "storage_capacity_mb": 50000.0,
            "storage_used_mb": 10000.0
        },
        {
            "node_id": "node_4",
            "name": "Node 4",
            "rack_id": "Rack-B",
            "switch_id": "Switch-2",
            "power_domain_id": "PDU-3",
            "status": "NORMAL",
            "cpu_utilization": 15.0,
            "disk_io_utilization": 10.0,
            "storage_capacity_mb": 50000.0,
            "storage_used_mb": 1000.0
        },
        {
            "node_id": "node_5",
            "name": "Node 5",
            "rack_id": "Rack-B",
            "switch_id": "Switch-2",
            "power_domain_id": "PDU-3",
            "status": "FAIL-STOP",
            "cpu_utilization": 0.0,
            "disk_io_utilization": 0.0,
            "storage_capacity_mb": 50000.0,
            "storage_used_mb": 1000.0
        }
    ]

    # Existing replica is on node_1 (in Rack-A)
    # Node 4 (Rack-B, low load) should score significantly higher than Node 1 (same rack, high load)
    # Node 5 must be excluded because it is FAIL-STOP
    result = evaluate_placement(
        candidate_nodes=candidates,
        existing_replica_node_ids=["node_1"],
        file_size_mb=10.0
    )

    assert result.selected_node_id == "node_4"
    assert "node_5" not in [c.node_id for c in result.candidates if c.is_eligible]
    # Verify rejection reason for node_5
    node_5_cand = next(c for c in result.candidates if c.node_id == "node_5")
    assert not node_5_cand.is_eligible
    assert "FAIL-STOP" in node_5_cand.rejection_reason

def test_priority_recovery_urgency_ordering():
    # Job 1: 2 missing replicas, Standard
    score1, _ = calculate_urgency_score(missing_replicas=2, file_importance="Standard", created_at_iso="2026-10-29T20:00:00+00:00")

    # Job 2: 1 missing replica, Critical
    score2, _ = calculate_urgency_score(missing_replicas=1, file_importance="Critical", created_at_iso="2026-10-29T20:00:00+00:00")

    # Job 3: 1 missing replica, Standard
    score3, _ = calculate_urgency_score(missing_replicas=1, file_importance="Standard", created_at_iso="2026-10-29T20:00:00+00:00")

    # Priority rule 1: Missing replicas takes highest priority
    assert score1 > score2
    # Priority rule 2: Equal missing replicas -> Critical beats Standard
    assert score2 > score3
