from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Response, Query
from pydantic import BaseModel
from typing import Optional, List
from app.services.file_service import file_service
from app.algorithms.placement import evaluate_placement
from app.core.database import get_db
from app.core.config import settings

router = APIRouter(tags=["Files & Integrity"])

class RecalculateRequest(BaseModel):
    file_id: str
    importance: Optional[str] = None

class PlacementPreviewRequest(BaseModel):
    file_size_mb: float = 1.0
    existing_node_ids: List[str] = []

@router.get("/files")
def list_files():
    return file_service.get_all_files()

@router.post("/files/upload")
async def upload_file(
    file: UploadFile = File(...),
    importance: str = Form("Standard"),
    write_mode: str = Form("PARALLEL_PUSH")
):
    try:
        content = await file.read()
        meta, pipeline = await file_service.upload_file(
            filename=file.filename or "uploaded.bin",
            content=content,
            importance=importance,
            write_mode=write_mode
        )
        return {
            "file": meta.model_dump(),
            "pipeline": pipeline.model_dump()
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/files/{file_id}")
def get_file(file_id: str):
    f = file_service.get_file(file_id)
    if not f:
        raise HTTPException(status_code=404, detail=f"File {file_id} not found")
    return f

@router.get("/files/{file_id}/download")
def download_file(file_id: str):
    try:
        data, filename, mime_type = file_service.download_file(file_id)
        return Response(
            content=data,
            media_type=mime_type,
            headers={"Content-Disposition": f'attachment; filename="{filename}"'}
        )
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="File not found")
    except RuntimeError as re:
        raise HTTPException(status_code=500, detail=str(re))

@router.delete("/files/{file_id}")
def delete_file(file_id: str):
    success = file_service.delete_file(file_id)
    if not success:
        raise HTTPException(status_code=404, detail=f"File {file_id} not found")
    return {"status": "success", "message": f"File {file_id} deleted."}

@router.get("/files/{file_id}/replicas")
def get_file_replicas(file_id: str):
    f = file_service.get_file(file_id)
    if not f:
        raise HTTPException(status_code=404, detail=f"File {file_id} not found")
    return file_service.get_file_replicas(file_id)

@router.get("/replication/policies")
def get_replication_policies():
    return {
        "rules": [
            {
                "id": "RULE_1",
                "condition": "Standard file, normal access rate (< 2 req/min)",
                "target_replicas": settings.DEFAULT_STANDARD_REPLICAS,
                "description": "Baseline fault-tolerance with 3 copies across failure domains."
            },
            {
                "id": "RULE_2",
                "condition": "Standard file, dormant (> 120s without access)",
                "target_replicas": settings.MIN_REPLICAS,
                "description": "Conserves cluster disk capacity by pruning cold redundant copies to 2 replicas."
            },
            {
                "id": "RULE_3",
                "condition": "Standard file, high access rate (>= 2 req/min)",
                "target_replicas": settings.DEFAULT_STANDARD_REPLICAS + 1,
                "description": "Adds 1 extra replica (+1) to distribute read throughput."
            },
            {
                "id": "RULE_4",
                "condition": "Critical file, standard access",
                "target_replicas": settings.DEFAULT_CRITICAL_REPLICAS,
                "description": "Enforces 4 copies across both racks to guarantee survival even during rack failure."
            },
            {
                "id": "RULE_5",
                "condition": "Critical file, high access rate (>= 2 req/min)",
                "target_replicas": settings.MAX_REPLICAS,
                "description": "Maximal redundancy (5 copies) for mission-critical hot datasets."
            }
        ],
        "configuration": {
            "min_replicas": settings.MIN_REPLICAS,
            "max_replicas": settings.MAX_REPLICAS,
            "dormant_threshold_seconds": settings.DORMANT_THRESHOLD_SECONDS,
            "high_access_threshold": settings.HIGH_ACCESS_THRESHOLD_RPS
        }
    }

@router.post("/replication/recalculate")
def recalculate_replication(payload: RecalculateRequest):
    try:
        updated = file_service.recalculate_file_replication(payload.file_id, payload.importance)
        return updated
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.get("/placement/preview")
def preview_placement(
    file_size_mb: float = Query(1.0),
    existing_node_ids: Optional[str] = Query(None)
):
    db = get_db()
    existing_list = [s.strip() for s in existing_node_ids.split(",")] if existing_node_ids else []
    nodes = list(db["nodes"].find())
    res = evaluate_placement(
        candidate_nodes=nodes,
        existing_replica_node_ids=existing_list,
        file_size_mb=file_size_mb
    )
    return res.model_dump()

@router.post("/integrity/simulate-corruption/{file_id}")
def simulate_corruption(file_id: str, node_id: Optional[str] = None):
    try:
        res = file_service.simulate_corruption(file_id, node_id)
        return res.model_dump()
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/integrity/verify/{file_id}")
def verify_and_repair_integrity(file_id: str):
    try:
        res = file_service.verify_and_repair_integrity(file_id)
        return res.model_dump()
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

