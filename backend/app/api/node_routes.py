from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import List, Optional
from app.services.cluster_service import cluster_service
from app.core.database import get_db

router = APIRouter(prefix="/nodes", tags=["Nodes"])

class LatencyRequest(BaseModel):
    latency_added_ms: float

@router.get("")
def list_nodes():
    return cluster_service.get_all_nodes()

@router.get("/{node_id}")
def get_node(node_id: str):
    node = cluster_service.get_node(node_id)
    if not node:
        raise HTTPException(status_code=404, detail=f"Node {node_id} not found")
    return node

@router.post("/{node_id}/simulate-latency")
def simulate_latency(node_id: str, payload: LatencyRequest):
    try:
        updated = cluster_service.simulate_node_latency(node_id, payload.latency_added_ms)
        return updated
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.post("/{node_id}/simulate-failure")
def simulate_failure(node_id: str):
    try:
        updated = cluster_service.simulate_node_failure(node_id)
        return updated
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.post("/{node_id}/restore")
def restore_node(node_id: str):
    try:
        updated = cluster_service.restore_node(node_id)
        return updated
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.get("/{node_id}/replicas")
def get_node_replicas(node_id: str):
    node = cluster_service.get_node(node_id)
    if not node:
        raise HTTPException(status_code=404, detail=f"Node {node_id} not found")
    db = get_db()
    reps = list(db["replicas"].find({"node_id": node_id}))
    files_map = {f["file_id"]: f for f in db["files"].find()}
    for r in reps:
        if "_id" in r:
            del r["_id"]
        f = files_map.get(r["file_id"], {})
        r["filename"] = f.get("filename", "Unknown")
        r["file_importance"] = f.get("importance", "Standard")
        r["file_size_bytes"] = f.get("size_bytes", 0)
    return reps

