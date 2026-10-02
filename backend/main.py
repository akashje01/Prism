"""
PRISM Predictive Maintenance System - Backend API

This module provides REST API endpoints for:
- Machine monitoring and state retrieval
- Simulation control (scenario selection and cursor advancement)
- Detailed machine information with explanations and recommendations
"""
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import logging

# Import PRISM components
from dataset_loader import DatasetLoader
from slice_manager import SliceManager
from simulation_engine import SimulationEngine
from explanation_engine import ExplanationEngine
from cwru_evidence_provider import CWRUEvidenceProvider
from database import SimulationStateRepository

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="PRISM API",
    description="Predictive Reliability & Intelligent Systems for Maintenance",
    version="1.0.0"
)

# Configure CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],  # Support both React and Vite
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global instances (initialized on startup)
simulation_engine: Optional[SimulationEngine] = None
explanation_engine: Optional[ExplanationEngine] = None
cwru_evidence_provider: Optional[CWRUEvidenceProvider] = None
state_repository: Optional[SimulationStateRepository] = None


# Pydantic models for request/response validation
class ErrorResponse(BaseModel):
    """Standard error response format"""
    error: str
    detail: Optional[str] = None


class SimulationControlRequest(BaseModel):
    """Request body for simulation control endpoint"""
    machine_id: str
    scenario: str


class SimulationAdvanceRequest(BaseModel):
    """Request body for simulation advance endpoint"""
    machine_id: str
    steps: int = 1


# Exception handler middleware
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """
    Global exception handler to catch all unhandled exceptions
    and return appropriate JSON error responses.
    """
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    
    # Determine appropriate status code
    if isinstance(exc, HTTPException):
        status_code = exc.status_code
        error_message = exc.detail
    elif isinstance(exc, ValueError):
        status_code = 400
        error_message = str(exc)
    elif isinstance(exc, FileNotFoundError):
        status_code = 500
        error_message = "Required dataset files not found"
    else:
        status_code = 500
        error_message = "Internal server error"
    
    return JSONResponse(
        status_code=status_code,
        content={
            "error": error_message,
            "detail": str(exc) if status_code == 500 else None
        }
    )


@app.on_event("startup")
async def startup_event():
    """
    Initialize PRISM system components on application startup.
    Loads datasets and initializes simulation engine.
    """
    global simulation_engine, explanation_engine, cwru_evidence_provider, state_repository
    
    try:
        logger.info("Initializing PRISM system...")
        
        # Initialize dataset loader
        data_loader = DatasetLoader(datasets_dir="../datasets")
        
        # Load AI4I dataset
        logger.info("Loading AI4I dataset...")
        ai4i_data = data_loader.load_ai4i_dataset()
        logger.info(f"Loaded AI4I dataset: {len(ai4i_data)} rows")
        
        # Initialize slice manager
        logger.info("Creating machine slices and identifying state windows...")
        slice_manager = SliceManager(ai4i_data)
        logger.info("Slice manager initialized")
        
        # Initialize simulation engine
        logger.info("Initializing simulation engine...")
        simulation_engine = SimulationEngine(slice_manager)
        logger.info("Simulation engine initialized")

        # Restore the last simulation position for each machine when available.
        state_repository = SimulationStateRepository()
        for machine_id, (scenario, cursor_position) in state_repository.load_all().items():
            try:
                simulation_engine.set_scenario(machine_id, scenario)
                window = simulation_engine.slice_manager.state_windows[machine_id][scenario]
                simulation_engine.cursors[machine_id] = min(cursor_position, window.end_index)
            except (KeyError, ValueError):
                logger.warning("Ignoring invalid saved state for %s", machine_id)
        logger.info("Simulation state persistence initialized")
        
        # Initialize explanation engine
        explanation_engine = ExplanationEngine()
        logger.info("Explanation engine initialized")
        
        # Initialize CWRU evidence provider
        cwru_evidence_provider = CWRUEvidenceProvider(data_loader)
        logger.info("CWRU evidence provider initialized")
        
        logger.info("PRISM system initialization complete")
        
    except Exception as e:
        logger.error(f"Failed to initialize PRISM system: {e}", exc_info=True)
        raise


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "PRISM API",
        "version": "1.0.0",
        "status": "running"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "database": state_repository.status() if state_repository else {"status": "not initialized"}
    }


@app.get("/api/machines")
async def get_all_machines():
    """
    Get current state for all machines.
    
    Returns:
        - machines: List of all 4 machines with current state
        - global_alerts: List of machines in Action Required state
        - global_advisories: List of machines in Advisory state
    
    Requirements: 1.2, 1.3, 9.1, 9.2, 14.2
    """
    if simulation_engine is None:
        raise HTTPException(status_code=500, detail="Simulation engine not initialized")
    
    try:
        # Get state for all machines
        machine_states = simulation_engine.get_all_machines_state()
        
        # Build response with machine summaries
        machines = []
        global_alerts = []
        global_advisories = []
        
        for state in machine_states:
            machine_summary = {
                "machine_id": state.machine_id,
                "machine_name": state.machine_name,
                "health_state": state.health_state,
                "one_line_summary": state.one_line_summary
            }
            machines.append(machine_summary)
            
            # Add to global alerts/advisories
            if state.health_state == "Action Required":
                global_alerts.append(machine_summary)
            elif state.health_state == "Advisory":
                global_advisories.append(machine_summary)
        
        return {
            "machines": machines,
            "global_alerts": global_alerts,
            "global_advisories": global_advisories
        }
        
    except Exception as e:
        logger.error(f"Error in get_all_machines: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/machines/{machine_id}")
async def get_machine_detail(machine_id: str):
    """
    Get detailed information for a specific machine.
    
    Args:
        machine_id: Machine identifier (e.g., "CNC-MILL-01")
    
    Returns:
        Detailed machine information including:
        - machine_id, machine_name, health_state
        - sensor_readings: Current sensor values
        - sensor_history: Rolling window of historical sensor data
        - explanation: Human-readable explanation of machine condition
        - affected_component: Component identified as affected
        - recommended_action: Actionable recommendation
        - bearing_evidence: Optional bearing vibration data (if relevant)
    
    Requirements: 5.1, 5.2, 10.2, 10.3, 14.3
    """
    if simulation_engine is None or explanation_engine is None:
        raise HTTPException(status_code=500, detail="System not initialized")
    
    try:
        # Get current machine state
        machine_state = simulation_engine.get_current_state(machine_id)
        
        # Get sensor history for trends
        sensor_history = simulation_engine.slice_manager.get_sensor_history(
            machine_id,
            machine_state.cursor_position,
            window_size=50
        )
        
        # Classify health state
        health_classification = simulation_engine.health_classifier.classify(
            machine_state.sensor_readings,
            sensor_history
        )
        
        # Generate explanation
        explanation = explanation_engine.generate_explanation(
            health_classification,
            machine_state.sensor_readings
        )
        
        # Prepare sensor history for response (convert to list of dicts)
        history_records = []
        for idx, row in sensor_history.iterrows():
            record = {
                "temperature": float(row["Process temperature [K]"]),
                "air_temperature": float(row["Air temperature [K]"]),
                "rotational_speed": float(row["Rotational speed [rpm]"]),
                "torque": float(row["Torque [Nm]"]),
                "tool_wear": float(row["Tool wear [min]"]),
                "vibration": float(row["vibration"])
            }
            history_records.append(record)
        
        # Build response
        response = {
            "machine_id": machine_state.machine_id,
            "machine_name": machine_state.machine_name,
            "health_state": machine_state.health_state,
            "cursor_position": machine_state.cursor_position,
            "current_window": {
                "state": machine_state.current_window.state,
                "start_index": machine_state.current_window.start_index,
                "end_index": machine_state.current_window.end_index
            } if machine_state.current_window else None,
            "sensor_readings": machine_state.sensor_readings,
            "sensor_history": history_records,
            "explanation": explanation.explanation_text,
            "affected_component": explanation.affected_component,
            "recommended_action": explanation.recommended_action
        }
        
        # Add bearing evidence if required
        if explanation.bearing_evidence_required and cwru_evidence_provider is not None:
            bearing_evidence = cwru_evidence_provider.get_bearing_evidence(
                machine_state.health_state
            )
            
            if bearing_evidence is not None:
                # Downsample vibration data for API response (send first 1000 points)
                vibration_sample = bearing_evidence.vibration_data[:1000].tolist()
                
                response["bearing_evidence"] = {
                    "health_state": bearing_evidence.health_state,
                    "vibration_data": vibration_sample,
                    "sample_rate": bearing_evidence.sample_rate,
                    "description": bearing_evidence.description
                }
        
        return response
        
    except ValueError as e:
        # Invalid machine_id
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error in get_machine_detail: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/simulation/control")
async def control_simulation(request: SimulationControlRequest):
    """
    Control simulation by setting machine scenario.
    
    Args:
        request: Contains machine_id and scenario
    
    Returns:
        Updated machine state after scenario change
    
    Requirements: 13.2, 13.3, 14.4
    """
    if simulation_engine is None:
        raise HTTPException(status_code=500, detail="Simulation engine not initialized")
    
    try:
        # Set scenario (this will raise ValueError if invalid)
        simulation_engine.set_scenario(request.machine_id, request.scenario)
        
        # Get updated machine state
        machine_state = simulation_engine.get_current_state(request.machine_id)
        if state_repository:
            state_repository.save(
                machine_state.machine_id,
                request.scenario,
                machine_state.cursor_position,
            )
        
        return {
            "success": True,
            "machine_id": machine_state.machine_id,
            "scenario": request.scenario,
            "new_state": {
                "machine_id": machine_state.machine_id,
                "machine_name": machine_state.machine_name,
                "health_state": machine_state.health_state,
                "cursor_position": machine_state.cursor_position,
                "one_line_summary": machine_state.one_line_summary
            }
        }
        
    except ValueError as e:
        # Invalid machine_id or scenario
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error in control_simulation: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/simulation/advance")
async def advance_simulation(request: SimulationAdvanceRequest):
    """
    Advance simulation cursor forward.
    
    Args:
        request: Contains machine_id and steps
    
    Returns:
        Updated machine state after cursor advancement
    
    Requirements: 13.5, 14.4
    """
    if simulation_engine is None:
        raise HTTPException(status_code=500, detail="Simulation engine not initialized")
    
    try:
        # Validate steps
        if request.steps < 0:
            raise ValueError("Steps must be non-negative")
        
        # Advance cursor (this will raise ValueError if invalid)
        simulation_engine.advance_cursor(request.machine_id, request.steps)
        
        # Get updated machine state
        machine_state = simulation_engine.get_current_state(request.machine_id)
        if state_repository:
            state_repository.save(
                machine_state.machine_id,
                simulation_engine.current_scenarios[machine_state.machine_id],
                machine_state.cursor_position,
            )
        
        return {
            "success": True,
            "machine_id": machine_state.machine_id,
            "steps": request.steps,
            "new_state": {
                "machine_id": machine_state.machine_id,
                "machine_name": machine_state.machine_name,
                "health_state": machine_state.health_state,
                "cursor_position": machine_state.cursor_position,
                "one_line_summary": machine_state.one_line_summary
            }
        }
        
    except ValueError as e:
        # Invalid machine_id or steps
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error in advance_simulation: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
