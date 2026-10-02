"""
Explanation Engine for PRISM Predictive Maintenance System

This module handles:
- Template-based explanation generation
- Affected component identification
- Recommendation generation based on health state
- Deterministic, non-probabilistic explanations
"""
from dataclasses import dataclass
from typing import Dict
from health_classifier import HealthClassification


@dataclass
class Explanation:
    """
    Complete explanation for a machine's current state.
    
    Attributes:
        explanation_text: Human-readable explanation of the machine's condition
        affected_component: Component identified as affected (or "None" if normal)
        recommended_action: Actionable recommendation based on health state
        bearing_evidence_required: Whether bearing vibration evidence should be shown
    """
    explanation_text: str
    affected_component: str
    recommended_action: str
    bearing_evidence_required: bool


class ExplanationEngine:
    """
    Generates human-readable explanations using deterministic template-based logic.
    
    Uses rule-based templates mapped to sensor patterns to provide calm, actionable,
    non-probabilistic explanations without LLM APIs or external services.
    """
    
    def generate_explanation(self, health_classification: HealthClassification,
                            sensor_readings: Dict[str, float]) -> Explanation:
        """
        Generate full explanation for current machine state.
        
        Uses deterministic template selection based on:
        - Health state
        - Anomalous sensors
        - Sensor trends
        - Threshold violations
        
        Args:
            health_classification: Classification result from HealthClassifier
            sensor_readings: Current sensor values
            
        Returns:
            Explanation object with text, affected component, and recommendation
        """
        health_state = health_classification.health_state
        anomalous_sensors = health_classification.anomalous_sensors
        sensor_trends = health_classification.sensor_trends
        threshold_violations = health_classification.threshold_violations
        
        # Generate explanation text based on patterns
        explanation_text = self._generate_explanation_text(
            health_state, anomalous_sensors, sensor_trends, threshold_violations
        )
        
        # Identify affected component
        affected_component = self.identify_affected_component(health_classification)
        
        # Generate recommendation
        recommended_action = self.generate_recommendation(health_state, affected_component)
        
        # Determine if bearing evidence is required
        bearing_evidence_required = self._should_show_bearing_evidence(
            health_state, affected_component
        )
        
        return Explanation(
            explanation_text=explanation_text,
            affected_component=affected_component,
            recommended_action=recommended_action,
            bearing_evidence_required=bearing_evidence_required
        )
    
    def _generate_explanation_text(self, health_state: str, 
                                   anomalous_sensors: list,
                                   sensor_trends: Dict[str, str],
                                   threshold_violations: Dict[str, float]) -> str:
        """
        Generate explanation text using template-based logic.
        
        This method uses a decision tree approach to select the most appropriate
        explanation template based on sensor patterns. The logic prioritizes:
        1. Specific sensor combinations (e.g., vibration + temperature)
        2. Individual sensor anomalies with trends
        3. Generic fallback explanations
        
        Args:
            health_state: Current health state
            anomalous_sensors: List of anomalous sensor names
            sensor_trends: Dictionary of sensor trends
            threshold_violations: Dictionary of threshold violations
            
        Returns:
            Human-readable explanation text
        """
        # CASE 1: Normal state - brief confirmation
        # No detailed analysis needed when everything is operating correctly
        if health_state == "Normal":
            return "All sensors are within normal operating ranges. The machine is operating as expected."
        
        # CASE 2: Post-Maintenance state
        # Indicates successful intervention and recovery
        if health_state == "Post-Maintenance":
            return "The machine has recently undergone maintenance. Sensor readings are returning to normal levels, indicating successful intervention."
        
        # CASE 3: Advisory or Action Required states - analyze sensor patterns
        # We use a hierarchical pattern matching approach to provide specific explanations
        
        # PATTERN 1: Rising vibration (most critical bearing indicator)
        # Rising vibration with anomalous readings strongly indicates bearing degradation
        if "vibration" in anomalous_sensors and sensor_trends.get("vibration") == "rising":
            if health_state == "Action Required":
                return "Vibration levels have exceeded critical thresholds, indicating severe bearing wear or shaft imbalance. Immediate attention is required to prevent equipment damage."
            else:
                return "Vibration levels are increasing, indicating potential bearing wear or shaft imbalance. Early intervention can prevent more serious issues."
        
        # PATTERN 2: High vibration (not necessarily rising)
        # Elevated vibration alone is a strong indicator of mechanical issues
        if "vibration" in anomalous_sensors:
            if health_state == "Action Required":
                return "Vibration levels are critically high, suggesting bearing degradation or mechanical imbalance. The machine should be inspected immediately."
            else:
                return "Vibration levels are elevated, which may indicate bearing wear or alignment issues. Monitoring is recommended."
        
        # PATTERN 3: High torque + high temperature combination
        # This combination indicates mechanical stress with insufficient cooling or lubrication
        # It's a compound failure mode that requires urgent attention
        if "torque" in anomalous_sensors and "temperature" in anomalous_sensors:
            if health_state == "Action Required":
                return "Elevated temperature combined with high torque indicates severe mechanical stress or insufficient lubrication. Immediate shutdown and inspection are necessary."
            else:
                return "Elevated temperature combined with high torque suggests mechanical stress or insufficient lubrication. Inspection and potential lubrication service are recommended."
        
        # PATTERN 4: High temperature alone
        # Temperature issues can indicate cooling system problems or excessive friction
        if "temperature" in anomalous_sensors:
            # Check if temperature is rising (more urgent than stable high temperature)
            if sensor_trends.get("temperature") == "rising":
                if health_state == "Action Required":
                    return "Temperature is rising rapidly and has exceeded safe operating limits. This indicates cooling system failure or excessive friction. Immediate shutdown is required."
                else:
                    return "Temperature is rising and approaching critical levels. This may indicate cooling system degradation or increased friction. Inspection is advised."
            else:
                # Stable high temperature
                if health_state == "Action Required":
                    return "Temperature has exceeded safe operating limits, indicating potential cooling system issues or excessive friction. Immediate inspection is required."
                else:
                    return "Temperature is elevated, which may indicate cooling system inefficiency or increased friction. Monitoring is recommended."
        
        # PATTERN 5: High torque alone
        # Torque issues indicate mechanical resistance or drive system problems
        if "torque" in anomalous_sensors:
            # Check if torque is rising (indicates progressive mechanical binding)
            if sensor_trends.get("torque") == "rising":
                if health_state == "Action Required":
                    return "Torque levels are rising and have exceeded critical thresholds, indicating mechanical binding or drive system issues. Immediate inspection is required."
                else:
                    return "Torque levels are increasing, which may indicate mechanical resistance or drive system degradation. Inspection is recommended."
            else:
                # Stable high torque
                if health_state == "Action Required":
                    return "Torque levels are critically high, suggesting mechanical binding or drive system problems. Immediate attention is needed."
                else:
                    return "Torque levels are elevated, which may indicate increased mechanical resistance. Monitoring is advised."
        
        # PATTERN 6: Rotational speed issues
        # Speed deviations indicate motor control or electrical problems
        if "rotational_speed" in anomalous_sensors:
            if health_state == "Action Required":
                return "Rotational speed is outside acceptable operating range, indicating motor control issues or mechanical problems. Immediate inspection is required."
            else:
                return "Rotational speed is deviating from normal operating range, which may indicate motor control or mechanical issues. Monitoring is recommended."
        
        # FALLBACK: Generic explanation for Advisory/Action Required with no specific pattern
        # This handles edge cases where sensors are anomalous but don't match known patterns
        if health_state == "Action Required":
            return "Multiple sensor readings indicate critical operating conditions. Immediate inspection and maintenance are required."
        else:
            return "Sensor readings indicate early signs of degradation. Continued monitoring and scheduled inspection are recommended."
    
    def identify_affected_component(self, health_classification: HealthClassification) -> str:
        """
        Determine which component is affected using sensor pattern rules.
        
        This method maps sensor anomaly patterns to specific mechanical components
        using domain knowledge about how different failure modes manifest in sensor data.
        
        Mapping rules:
        - Elevated vibration → Bearings (vibration is primary bearing health indicator)
        - Elevated temperature only → Cooling/Lubrication systems
        - High torque + temperature → Drive system (compound mechanical stress)
        - High torque only → Drive system (mechanical resistance)
        - Rotational speed issues → Motor control system
        - Normal state → No affected components
        
        Args:
            health_classification: Classification result from HealthClassifier
            
        Returns:
            Name of affected component or "None" if normal
        """
        health_state = health_classification.health_state
        anomalous_sensors = health_classification.anomalous_sensors
        
        # CASE 1: Normal state - no affected components
        if health_state == "Normal":
            return "None"
        
        # CASE 2: Post-Maintenance state - components were affected but now recovering
        if health_state == "Post-Maintenance":
            return "Previously affected components (now recovering)"
        
        # CASE 3: Identify affected component based on sensor patterns
        # We use a priority-based approach: more specific patterns take precedence
        
        # PRIORITY 1: Check for vibration issues → Bearings
        # Vibration is the most direct indicator of bearing health
        # Elevated vibration almost always indicates bearing wear, misalignment, or imbalance
        if "vibration" in anomalous_sensors:
            return "Bearings"
        
        # PRIORITY 2: Check for temperature + torque → Drive system
        # This combination indicates mechanical stress with heat generation
        # Suggests problems with the drive train, gears, or power transmission
        if "temperature" in anomalous_sensors and "torque" in anomalous_sensors:
            return "Drive system"
        
        # PRIORITY 3: Check for temperature only → Cooling/Lubrication
        # Isolated temperature elevation without torque issues suggests
        # cooling system inefficiency or lubrication degradation
        if "temperature" in anomalous_sensors:
            return "Cooling system"
        
        # PRIORITY 4: Check for torque only → Drive system
        # Elevated torque without temperature indicates mechanical resistance
        # Could be misalignment, binding, or drive system degradation
        if "torque" in anomalous_sensors:
            return "Drive system"
        
        # PRIORITY 5: Check for rotational speed → Motor control
        # Speed deviations indicate electrical or control system issues
        # Not typically a mechanical problem
        if "rotational_speed" in anomalous_sensors:
            return "Motor control system"
        
        # FALLBACK: Generic response for unrecognized patterns
        return "Multiple components"
    
    def generate_recommendation(self, health_state: str, 
                               affected_component: str) -> str:
        """
        Generate recommended action using state-based templates.
        
        Recommendations are tailored to match urgency to health state and provide
        specific, actionable guidance based on the affected component.
        
        Recommendation strategy:
        - Normal → Continued normal operation with regular maintenance
        - Advisory → Proactive inspection within 24-48 hours
        - Action Required → Immediate intervention, possible shutdown
        - Post-Maintenance → Continued monitoring to verify repair effectiveness
        
        Args:
            health_state: Current health state
            affected_component: Identified affected component
            
        Returns:
            Actionable recommendation text
        """
        # CASE 1: Normal state recommendations
        # Maintain regular operations and inspection schedule
        if health_state == "Normal":
            return "Continue normal operation. Maintain regular inspection schedule."
        
        # CASE 2: Post-Maintenance recommendations
        # Monitor to ensure maintenance was effective and machine is stabilizing
        if health_state == "Post-Maintenance":
            return "Continue monitoring sensor readings to ensure stable operation. Verify maintenance effectiveness during next scheduled inspection."
        
        # CASE 3: Advisory state recommendations
        # Proactive intervention to prevent escalation to critical state
        # Timeframes are component-specific based on failure progression rates
        if health_state == "Advisory":
            if "Bearings" in affected_component:
                # Bearings can degrade rapidly; 48-hour window for inspection
                return "Schedule bearing inspection within 48 hours. Monitor vibration levels closely. Prepare for potential bearing replacement."
            elif "Cooling" in affected_component:
                # Cooling issues can escalate quickly; 24-hour window
                return "Inspect cooling system within 24 hours. Check coolant levels, flow rates, and heat exchanger condition. Monitor temperature trends."
            elif "Drive system" in affected_component:
                # Drive system issues progress more slowly; 48-hour window
                return "Schedule drive system inspection within 48 hours. Check lubrication levels and mechanical alignment. Monitor torque and temperature."
            elif "Motor control" in affected_component:
                # Electrical issues need prompt attention; 24-hour window
                return "Inspect motor control system within 24 hours. Verify speed controller settings and electrical connections."
            else:
                # Generic advisory recommendation
                return "Schedule comprehensive inspection within 48 hours. Monitor all sensor readings closely until inspection is completed."
        
        # CASE 4: Action Required state recommendations
        # Immediate intervention required to prevent catastrophic failure or safety hazards
        # Recommendations include load reduction and shutdown preparation
        if health_state == "Action Required":
            if "Bearings" in affected_component:
                # Bearing failure can be catastrophic; immediate action required
                return "Immediate action required: Schedule emergency bearing replacement. Consider controlled shutdown to prevent catastrophic failure. Do not operate under heavy load."
            elif "Cooling" in affected_component:
                # Overheating can cause rapid damage; reduce load immediately
                return "Immediate action required: Reduce operating load immediately. Inspect cooling system urgently. Prepare for emergency shutdown if temperature continues to rise."
            elif "Drive system" in affected_component:
                # Drive system failure can damage multiple components
                return "Immediate action required: Reduce operating load. Schedule emergency maintenance for drive system inspection and lubrication. Prepare for potential shutdown."
            elif "Motor control" in affected_component:
                # Electrical issues pose safety risks
                return "Immediate action required: Inspect motor control system immediately. Verify electrical safety. Prepare for controlled shutdown if issues persist."
            else:
                # Generic critical recommendation
                return "Immediate action required: Initiate emergency maintenance procedures. Consider controlled shutdown to prevent equipment damage. Contact maintenance team urgently."
        
        # FALLBACK: Generic recommendation for unrecognized states
        return "Consult maintenance team for appropriate action based on current conditions."
    
    def _should_show_bearing_evidence(self, health_state: str, 
                                     affected_component: str) -> bool:
        """
        Determine if bearing vibration evidence should be displayed.
        
        Evidence is shown when:
        - Health state is Advisory or Action Required
        - Affected component is bearing-related
        
        Args:
            health_state: Current health state
            affected_component: Identified affected component
            
        Returns:
            True if bearing evidence should be shown, False otherwise
        """
        # Only show evidence for Advisory or Action Required states
        if health_state not in ["Advisory", "Action Required"]:
            return False
        
        # Only show evidence if bearings are affected
        if "Bearing" in affected_component:
            return True
        
        return False
