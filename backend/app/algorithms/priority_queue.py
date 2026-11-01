import heapq
from datetime import datetime, timezone
from typing import List, Optional, Tuple, Dict, Any
from app.models.schemas import RecoveryJobModel

def calculate_urgency_score(
    missing_replicas: int,
    file_importance: str,
    created_at_iso: str,
    current_time: Optional[datetime] = None
) -> Tuple[float, str]:
    """
    Computes priority urgency score for a recovery job:
    Urgency = 1000 * missing_replicas + 10 * criticality_weight + min(waiting_time_sec * 0.5, 50.0)
    """
    now = current_time or datetime.now(timezone.utc)
    try:
        # Support ISO formats with or without timezone
        clean_iso = created_at_iso.replace("Z", "+00:00")
        created_dt = datetime.fromisoformat(clean_iso)
        if created_dt.tzinfo is None:
            created_dt = created_dt.replace(tzinfo=timezone.utc)
        wait_seconds = max(0.0, (now - created_dt).total_seconds())
    except Exception:
        wait_seconds = 0.0

    is_critical = (file_importance.strip().lower() == "critical")
    crit_weight = 2.0 if is_critical else 1.0

    base_replica_pts = 1000.0 * max(0, missing_replicas)
    crit_pts = 10.0 * crit_weight
    bounded_wait_pts = min(50.0, wait_seconds * 0.5)

    urgency = round(base_replica_pts + crit_pts + bounded_wait_pts, 2)

    reason = (
        f"Urgency {urgency:.1f}: {missing_replicas} missing replica(s) [{base_replica_pts:.0f} pts] + "
        f"{'Critical' if is_critical else 'Standard'} importance [{crit_pts:.0f} pts] + "
        f"queued {wait_seconds:.1f}s [{bounded_wait_pts:.1f} wait bonus]."
    )

    return urgency, reason

class RecoveryPriorityQueue:
    def __init__(self):
        self._jobs: List[RecoveryJobModel] = []

    def add_job(self, job: RecoveryJobModel):
        # Update urgency
        score, reason = calculate_urgency_score(
            job.missing_replicas,
            job.file_importance,
            job.created_at
        )
        job.urgency_score = score
        job.priority_rank_reason = reason
        self._jobs.append(job)
        self._sort()

    def _sort(self):
        # Sort descending by urgency score, then ascending by created_at
        self._jobs.sort(key=lambda j: (-j.urgency_score, j.created_at))

    def peek(self) -> Optional[RecoveryJobModel]:
        return self._jobs[0] if self._jobs else None

    def pop(self) -> Optional[RecoveryJobModel]:
        if self._jobs:
            return self._jobs.pop(0)
        return None

    def recalculate_all(self, current_time: Optional[datetime] = None):
        for job in self._jobs:
            score, reason = calculate_urgency_score(
                job.missing_replicas,
                job.file_importance,
                job.created_at,
                current_time
            )
            job.urgency_score = score
            job.priority_rank_reason = reason
        self._sort()

    def get_all(self) -> List[RecoveryJobModel]:
        self.recalculate_all()
        return list(self._jobs)

    def remove_by_file_id(self, file_id: str):
        self._jobs = [j for j in self._jobs if j.file_id != file_id]

    def clear(self):
        self._jobs = []

