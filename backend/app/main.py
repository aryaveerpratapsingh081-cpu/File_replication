import asyncio
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.database import db_manager
from app.core.websocket import manager as ws_manager
from app.services.cluster_service import cluster_service
from app.api import (
    cluster_routes,
    node_routes,
    file_routes,
    recovery_routes,
    simulation_routes,
    experiment_routes,
    log_routes,
    project_routes
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("selfheal.main")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Connect DB and initialize cluster
    logger.info("Initializing SelfHeal Storage backend...")
    db_manager.connect()
    cluster_service.initialize_cluster()

    # Launch background health monitoring heartbeat loop
    monitor_task = asyncio.create_task(cluster_service.run_heartbeat_loop())
    cluster_service._monitor_task = monitor_task

    yield

    # Shutdown
    if monitor_task:
        monitor_task.cancel()
        try:
            await monitor_task
        except asyncio.CancelledError:
            pass
    logger.info("SelfHeal Storage backend shut down.")

app = FastAPI(
    title="SelfHeal Storage System API",
    description="Fault-Tolerant Distributed File Storage System with Adaptive Replication and Predictive Self-Healing Recovery",
    version="2.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API Routers
app.include_router(cluster_routes.router, prefix="/api")
app.include_router(node_routes.router, prefix="/api")
app.include_router(file_routes.router, prefix="/api")
app.include_router(recovery_routes.router, prefix="/api")
app.include_router(simulation_routes.router, prefix="/api")
app.include_router(experiment_routes.router, prefix="/api")
app.include_router(log_routes.router, prefix="/api")
app.include_router(project_routes.router, prefix="/api")

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        while True:
            # Keep connection open and receive client pings if any
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception as e:
        logger.warning(f"WebSocket connection error: {e}")
        ws_manager.disconnect(websocket)

@app.get("/")
def root():
    return {
        "system": "SelfHeal Storage",
        "description": "Fault-Tolerant Distributed File Storage System with Adaptive Replication and Predictive Self-Healing Recovery",
        "api_docs": "/docs",
        "health": "/api/health"
    }

