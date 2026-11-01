from fastapi import APIRouter, Query
from typing import Optional, List
from app.core.database import get_db

router = APIRouter(prefix="/logs", tags=["Logs"])

@router.get("")
def get_logs(
    severity: Optional[str] = Query(None),
    event_type: Optional[str] = Query(None),
    node_id: Optional[str] = Query(None),
    file_id: Optional[str] = Query(None),
    limit: int = Query(100),
    skip: int = Query(0)
):
    db = get_db()
    query = {}
    if severity:
        query["severity"] = severity.upper()
    if event_type:
        query["event_type"] = event_type.upper()
    if node_id:
        query["node_id"] = node_id
    if file_id:
        query["file_id"] = file_id

    total = db["system_events"].count_documents(query)
    cursor = db["system_events"].find(query).sort("timestamp", -1).skip(skip).limit(limit)
    events = list(cursor)
    for e in events:
        if "_id" in e:
            del e["_id"]

    return {
        "total": total,
        "limit": limit,
        "skip": skip,
        "events": events
    }

