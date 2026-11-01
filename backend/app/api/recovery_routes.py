from fastapi import APIRouter, HTTPException
from typing import List
from app.services.recovery_service import recovery_service
from app.core.database import get_db

router = APIRouter(prefix="/recovery", tags=["Recovery"])

@router.get("/jobs")
def get_recovery_jobs():
    return recovery_service.get_all_jobs()

@router.post("/jobs")
def trigger_recovery_scan():
    count = recovery_service.scan_and_schedule_recoveries()
    return {
        "scheduled_jobs_count": count,
        "jobs": recovery_service.get_queued_jobs()
    }

@router.post("/jobs/{job_id}/retry")
def retry_recovery_job(job_id: str):
    try:
        updated = recovery_service.retry_job(job_id)
        return updated
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.post("/run")
def run_recovery_now():
    results = recovery_service.run_all_queued()
    return {
        "processed_count": len(results),
        "results": results
    }

@router.get("/history")
def get_recovery_history():
    db = get_db()
    jobs = list(db["recovery_jobs"].find({"status": {"$in": ["COMPLETED", "FAILED"]}}))
    for j in jobs:
        if "_id" in j:
            del j["_id"]
    jobs.sort(key=lambda x: x.get("completed_at", x.get("created_at", "")), reverse=True)
    return jobs

