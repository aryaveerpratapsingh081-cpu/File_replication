from typing import Optional, List, Dict, Any, Tuple
from app.core.config import settings
from app.models.schemas import PlacementCandidate, PlacementResult

def calculate_node_normalized_load(
    cpu_pct: float,
    io_pct: float,
    used_mb: float,
    capacity_mb: float,
    w_cpu: float = settings.WEIGHT_CPU,
    w_io: float = settings.WEIGHT_IO,
    w_storage: float = settings.WEIGHT_STORAGE
) -> float:
    safe_cap = max(capacity_mb, 1.0)
    storage_pct = min(100.0, max(0.0, (used_mb / safe_cap) * 100.0))

    norm_cpu = min(1.0, max(0.0, cpu_pct / 100.0))
    norm_io = min(1.0, max(0.0, io_pct / 100.0))
    norm_storage = min(1.0, max(0.0, storage_pct / 100.0))

    total_weight = w_cpu + w_io + w_storage
    if total_weight <= 0:
        total_weight = 1.0

    load = (w_cpu * norm_cpu + w_io * norm_io + w_storage * norm_storage) / total_weight
    return round(load, 4)

def calculate_diversity_score(
    candidate_node: dict,
    existing_nodes: List[dict]
) -> float:
    """
    Computes failure domain diversity score against existing replica nodes.
    - +0.5 if candidate is in a different rack from all existing replica nodes
    - +0.3 if candidate is on a different network switch
    - +0.2 if candidate is on a different power domain
    """
    if not existing_nodes:
        return 1.0

    existing_racks = {n.get("rack_id") for n in existing_nodes if n.get("rack_id")}
    existing_switches = {n.get("switch_id") for n in existing_nodes if n.get("switch_id")}
    existing_power = {n.get("power_domain_id") for n in existing_nodes if n.get("power_domain_id")}

    cand_rack = candidate_node.get("rack_id")
    cand_switch = candidate_node.get("switch_id")
    cand_power = candidate_node.get("power_domain_id")

    score = 0.0
    if cand_rack not in existing_racks:
        score += 0.50
    else:
        # Partial diversity if rack is shared with some but not all
        score += 0.15

    if cand_switch not in existing_switches:
        score += 0.30
    else:
        score += 0.10

    if cand_power not in existing_power:
        score += 0.20
    else:
        score += 0.05

    return round(min(1.0, score), 4)

def evaluate_placement(
    candidate_nodes: List[dict],
    existing_replica_node_ids: List[str],
    file_size_mb: float = 1.0,
    exclude_at_risk: bool = settings.EXCLUDE_AT_RISK_NODES,
    w_load: float = settings.WEIGHT_LOAD,
    w_div: float = settings.WEIGHT_DIVERSITY
) -> PlacementResult:
    """
    Selects the optimal storage node for a new replica using load and failure-domain diversity scoring.
    """
    existing_nodes_map = {n["node_id"]: n for n in candidate_nodes}
    existing_nodes = [existing_nodes_map[nid] for nid in existing_replica_node_ids if nid in existing_nodes_map]

    evaluated_candidates: List[PlacementCandidate] = []
    eligible_candidates: List[Tuple[float, PlacementCandidate]] = []

    for node in candidate_nodes:
        nid = node["node_id"]
        status = node.get("status", "NORMAL")
        is_failed = (status == "FAIL-STOP" or node.get("is_simulated_failed", False))
        is_at_risk = (status == "AT-RISK")
        already_has_replica = (nid in existing_replica_node_ids)
        
        capacity_mb = node.get("storage_capacity_mb", 50000.0)
        used_mb = node.get("storage_used_mb", 0.0)
        free_mb = capacity_mb - used_mb
        has_sufficient_space = (free_mb >= file_size_mb)

        # Check eligibility
        is_eligible = True
        rejection_reason = None

        if is_failed:
            is_eligible = False
            rejection_reason = "Node is in FAIL-STOP state."
        elif is_at_risk and exclude_at_risk:
            is_eligible = False
            rejection_reason = "Node is AT-RISK and proactive exclusion is enabled."
        elif already_has_replica:
            is_eligible = False
            rejection_reason = "Node already holds a replica of this file."
        elif not has_sufficient_space:
            is_eligible = False
            rejection_reason = f"Insufficient disk space ({free_mb:.1f} MB free, {file_size_mb:.1f} MB required)."

        # Load & Diversity Metrics
        cpu = node.get("cpu_utilization", 15.0)
        io = node.get("disk_io_utilization", 12.0)
        norm_load = calculate_node_normalized_load(cpu, io, used_mb, capacity_mb)
        load_score = round(1.0 - norm_load, 4)
        div_score = calculate_diversity_score(node, existing_nodes)

        final_score = round((w_load * load_score) + (w_div * div_score), 4)
        breakdown = (
            f"Score: {final_score:.4f} = ({w_load} * (1 - load {norm_load:.2f})) + "
            f"({w_div} * diversity {div_score:.2f})"
        )

        cand = PlacementCandidate(
            node_id=nid,
            node_name=node.get("name", nid),
            rack_id=node.get("rack_id", "Rack-A"),
            is_eligible=is_eligible,
            rejection_reason=rejection_reason,
            cpu_utilization=cpu,
            io_utilization=io,
            storage_utilization=round((used_mb / max(capacity_mb, 1.0)) * 100.0, 1),
            normalized_load=norm_load,
            load_score=load_score,
            diversity_score=div_score,
            final_placement_score=final_score if is_eligible else 0.0,
            score_breakdown=breakdown
        )
        evaluated_candidates.append(cand)

        if is_eligible:
            eligible_candidates.append((final_score, cand))

    if not eligible_candidates:
        return PlacementResult(
            selected_node_id=None,
            selected_node_name=None,
            explanation="No eligible storage node available. All candidate nodes are either failed, at-risk, already contain a replica, or lack sufficient capacity.",
            candidates=evaluated_candidates
        )

    # Sort descending by final score
    eligible_candidates.sort(key=lambda x: x[0], reverse=True)
    best_score, best_cand = eligible_candidates[0]

    existing_racks = list({n.get("rack_id") for n in existing_nodes if n.get("rack_id")})
    explanation = (
        f"Selected {best_cand.node_name} ({best_cand.node_id}) with top fitness score of {best_score:.3f}. "
        f"Node provides load score {best_cand.load_score:.2f} (CPU: {best_cand.cpu_utilization:.0f}%, IO: {best_cand.io_utilization:.0f}%) "
        f"and failure-domain diversity score {best_cand.diversity_score:.2f} (Rack: {best_cand.rack_id}, existing replicas in: {existing_racks or 'none'})."
    )

    return PlacementResult(
        selected_node_id=best_cand.node_id,
        selected_node_name=best_cand.node_name,
        explanation=explanation,
        candidates=evaluated_candidates
    )

