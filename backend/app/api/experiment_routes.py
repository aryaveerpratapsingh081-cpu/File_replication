from fastapi import APIRouter, HTTPException, Response, Query
from pydantic import BaseModel
from app.services.experiment_service import experiment_service

router = APIRouter(prefix="/experiments", tags=["Experiments"])

class RunExperimentRequest(BaseModel):
    sample_size: int = 5

@router.get("")
def list_experiments():
    return experiment_service.get_all_experiments()

@router.post("/run")
async def run_experiment(payload: RunExperimentRequest):
    try:
        res = await experiment_service.run_comparative_experiment(sample_size=payload.sample_size)
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{experiment_id}")
def get_experiment(experiment_id: str):
    exp = experiment_service.get_experiment(experiment_id)
    if not exp:
        raise HTTPException(status_code=404, detail=f"Experiment {experiment_id} not found")
    return exp

@router.get("/{experiment_id}/export")
def export_experiment_csv(experiment_id: str):
    try:
        csv_data = experiment_service.export_experiment_csv(experiment_id)
        return Response(
            content=csv_data,
            media_type="text/csv",
            headers={"Content-Disposition": f'attachment; filename="benchmark_{experiment_id}.csv"'}
        )
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Experiment not found")

