import asyncio
from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Optional
from app.services.simulation_service import simulation_service

router = APIRouter(prefix="/simulations", tags=["Simulations"])

class ScenarioRequest(BaseModel):
    scenario: str  # "SCENARIO_A", "SCENARIO_B", "SCENARIO_C", "SCENARIO_D", "SCENARIO_E", "SCENARIO_F"
    target_node: Optional[str] = None

@router.get("")
def get_simulation_status():
    return simulation_service.get_simulation_status()

@router.post("/start")
async def start_scenario(payload: ScenarioRequest, background_tasks: BackgroundTasks):
    scenario = payload.scenario.upper()

    if scenario == "SCENARIO_A":
        background_tasks.add_task(simulation_service.run_scenario_a_normal)
    elif scenario == "SCENARIO_B":
        target = payload.target_node or "node_2"
        background_tasks.add_task(simulation_service.run_scenario_b_slow_node, target)
    elif scenario == "SCENARIO_C":
        target = payload.target_node or "node_1"
        background_tasks.add_task(simulation_service.run_scenario_c_single_node_failure, target)
    elif scenario == "SCENARIO_D":
        background_tasks.add_task(simulation_service.run_scenario_d_two_node_failure, "node_1", "node_2")
    elif scenario == "SCENARIO_E":
        background_tasks.add_task(simulation_service.run_scenario_e_file_corruption)
    elif scenario == "SCENARIO_F":
        background_tasks.add_task(simulation_service.run_scenario_f_storage_pressure)
    else:
        raise HTTPException(status_code=400, detail=f"Unknown scenario {scenario}")

    return {
        "status": "started",
        "scenario": scenario,
        "message": f"Simulation {scenario} execution initiated in background."
    }

@router.post("/reset")
def reset_simulation():
    simulation_service.reset_simulation()
    return {"status": "success", "message": "Simulation cleared and nodes restored."}

@router.post("/seed-demo")
async def seed_demo():
    await simulation_service.seed_initial_demo_files()
    return {"status": "success", "message": "Demo files seeded."}

