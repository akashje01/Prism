"""
CWRU Evidence Provider for PRISM Predictive Maintenance System

This module handles:
- Mapping health states to CWRU bearing dataset files
- Loading bearing vibration evidence from .mat files
- Determining when bearing evidence should be displayed
- Providing vibration waveform data for visualization
"""
from dataclasses import dataclass
from typing import Optional
import numpy as np
from dataset_loader import DatasetLoader


# Health state to CWRU file mapping
HEALTH_STATE_FILE_MAPPING = {
    "Normal": "Time_Normal_1_098.mat",
    "Advisory": "B014_1_190.mat",
    "Action Required": "IR014_1_175.mat",  # Can also use OR014_6_1_202.mat
    "Post-Maintenance": "Time_Normal_1_098.mat"
}


@dataclass
class BearingEvidence:
    """
    Bearing vibration evidence from CWRU dataset.
    
    Attributes:
        health_state: Health state this evidence corresponds to
        vibration_data: Time-domain vibration signal (acceleration data)
        sample_rate: Sampling rate in Hz (12kHz or 48kHz)
        description: Human-readable description of bearing condition
    """
    health_state: str
    vibration_data: np.ndarray
    sample_rate: int
    description: str


class CWRUEvidenceProvider:
    """
    Provides bearing vibration evidence from CWRU dataset based on health state.
    
    Maps health states to appropriate CWRU bearing dataset files and extracts
    vibration waveforms for visualization and validation of bearing-related diagnoses.
    """
    
    def __init__(self, data_loader: DatasetLoader):
        """
        Initialize CWRUEvidenceProvider with dataset loader.
        
        Args:
            data_loader: DatasetLoader instance for loading .mat files
        """
        self.data_loader = data_loader
        
        # Cache for loaded evidence to avoid repeated file I/O
        self._evidence_cache = {}
    
    def get_bearing_evidence(self, health_state: str) -> Optional[BearingEvidence]:
        """
        Get bearing vibration data for the specified health state.
        
        Maps health states to CWRU files:
        - Normal → Time_Normal_1_098.mat
        - Advisory → B014_1_190.mat (Ball defect)
        - Action Required → IR014_1_175.mat (Inner race defect)
        - Post-Maintenance → Time_Normal_1_098.mat
        
        Args:
            health_state: Current health state ("Normal", "Advisory", 
                         "Action Required", "Post-Maintenance")
            
        Returns:
            BearingEvidence object with vibration data, or None if health state
            is not recognized
        """
        # Check if health state is valid
        if health_state not in HEALTH_STATE_FILE_MAPPING:
            return None
        
        # Check cache first
        if health_state in self._evidence_cache:
            return self._evidence_cache[health_state]
        
        # Get filename for this health state
        filename = HEALTH_STATE_FILE_MAPPING[health_state]
        
        try:
            # Load vibration data from .mat file
            vibration_data = self.data_loader.load_cwru_mat_file(filename)
            
            # Determine sample rate based on filename
            # CWRU dataset uses 12kHz for most files, 48kHz for some
            sample_rate = 48000 if "48k" in filename.lower() else 12000
            
            # Generate description based on health state
            description = self._generate_description(health_state, filename)
            
            # Create BearingEvidence object
            evidence = BearingEvidence(
                health_state=health_state,
                vibration_data=vibration_data,
                sample_rate=sample_rate,
                description=description
            )
            
            # Cache the evidence
            self._evidence_cache[health_state] = evidence
            
            return evidence
            
        except Exception as e:
            # If file loading fails, return None
            # Error is already logged by DatasetLoader
            return None
    
    def should_show_evidence(self, affected_component: str) -> bool:
        """
        Determine if bearing evidence is relevant based on affected component.
        
        Evidence should be shown when the affected component is bearing-related.
        
        Args:
            affected_component: Name of the affected component
            
        Returns:
            True if bearing evidence should be displayed, False otherwise
        """
        # Check if component name contains bearing-related keywords
        if affected_component is None:
            return False
        
        component_lower = affected_component.lower()
        
        # Check for bearing-related keywords
        bearing_keywords = ["bearing", "bearings", "shaft", "rotation", "rotor"]
        
        for keyword in bearing_keywords:
            if keyword in component_lower:
                return True
        
        return False
    
    def _generate_description(self, health_state: str, filename: str) -> str:
        """
        Generate human-readable description of bearing condition.
        
        Args:
            health_state: Current health state
            filename: CWRU dataset filename
            
        Returns:
            Description text for the bearing condition
        """
        if health_state == "Normal":
            return "Normal bearing operation with healthy vibration signature. No defects detected."
        
        elif health_state == "Advisory":
            # B014 indicates ball defect
            if "B014" in filename:
                return "Early-stage ball defect detected in bearing. Vibration signature shows characteristic ball defect frequencies."
            else:
                return "Early-stage bearing degradation detected. Vibration levels are elevated but within manageable range."
        
        elif health_state == "Action Required":
            # IR014 indicates inner race defect
            if "IR014" in filename:
                return "Severe inner race defect detected. Vibration signature shows critical inner race fault frequencies requiring immediate attention."
            # OR014 indicates outer race defect
            elif "OR014" in filename:
                return "Severe outer race defect detected. Vibration signature shows critical outer race fault frequencies requiring immediate attention."
            else:
                return "Critical bearing condition detected. Immediate maintenance required to prevent catastrophic failure."
        
        elif health_state == "Post-Maintenance":
            return "Bearing has been replaced or serviced. Vibration signature has returned to normal healthy levels."
        
        else:
            return "Bearing vibration data from CWRU dataset."

