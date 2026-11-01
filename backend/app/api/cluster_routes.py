from fastapi import APIRouter, HTTPException
from app.services.cluster_service import cluster_service
from app.core.database import db_manager
from app.models.schemas import ClusterOverview

router = APIRouter(prefix="", tags=["Cluster"])

@router.get("/health")
def get_system_health():
    return {
        "status": "healthy",
        "service": "SelfHeal Storage Backend",
        "database": {
            "connected": db_manager.is_connected,
            "engine": "Embedded Document Store (Fallback)" if db_manager.is_fallback else "MongoDB (Live Instance)",
            "error": db_manager.connection_error
        },
        "monitoring_active": cluster_service.is_monitoring_active
    }

@router.get("/cluster/overview", response_model=ClusterOverview)
def get_cluster_overview():
    return cluster_service.get_cluster_overview()

@router.post("/cluster/monitoring/toggle")
def toggle_monitoring():
    cluster_service.is_monitoring_active = not cluster_service.is_monitoring_active
    return {"monitoring_active": cluster_service.is_monitoring_active}

@router.post("/cluster/reset")
def reset_cluster():
    cluster_service.initialize_cluster()
    for n in cluster_service.get_all_nodes():
        cluster_service.restore_node(n["node_id"])
    return {"status": "success", "message": "Cluster nodes reset to normal baseline."}

