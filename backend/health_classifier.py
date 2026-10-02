"""
Health Classifier for PRISM Predictive Maintenance System

This module handles:
- Threshold-based health state classification
- Anomaly detection using Isolation Forest
- Trend calculation using linear regression
- Health state determination based on sensor readings
"""
from dataclasses import dataclass
from typing import Dict, List
import pandas as pd
import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.linear_model import LinearRegression


# Sensor thresholds for classification
THRESHOLDS = {
    "temperature": {
        "advisory": 310,  # Kelvin
        "action_required": 320
    },
    "vibration": {
        "advisory": 50,  # μm
        "action_required": 70
    },
    "torque": {
        "advisory": 50,  # Nm
        "action_required": 60
    },
    "rotational_speed": {
        "advisory_low": 1200,  # rpm
        "advisory_high": 2800
    }
}


@dataclass
class HealthClassification:
    """
    Result of health classification for a machine.
    
    Attributes:
        health_state: One of "Normal", "Advisory", "Action Required", "Post-Maintenance"
        anomalous_sensors: List of sensor names showing anomalous values
        sensor_trends: Dictionary mapping sensor names to trend direction
        threshold_violations: Dictionary mapping sensor names to violation amounts
    """
    health_state: str
    anomalous_sensors: List[str]
    sensor_trends: Dict[str, str]
    threshold_violations: Dict[str, float]


class HealthClassifier:
    """
    Classifies machine health state using threshold-based rules and lightweight ML.
    
    Uses deterministic threshold logic as primary classification method,
    with Isolation Forest as secondary signal for anomaly detection.
    """
    
    def __init__(self, normal_data: pd.DataFrame = None):
        """
        Initialize HealthClassifier.
        
        Args:
            normal_data: Optional DataFrame of normal sensor readings for training
                        Isolation Forest model. If None, model will be trained on
                        first classify() call.
        """
        self.iso_forest = None
        self.is_trained = False
        
        if normal_data is not None:
            self._train_isolation_forest(normal_data)
    
    def _train_isolation_forest(self, normal_data: pd.DataFrame) -> None:
        """
        Train Isolation Forest model on normal data.
        
        Args:
            normal_data: DataFrame with sensor readings from normal operation
        """
        # Extract features for training
        feature_cols = []
        for col in normal_data.columns:
            if any(sensor in col.lower() for sensor in ['temperature', 'torque', 'speed', 'vibration']):
                feature_cols.append(col)
        
        if not feature_cols:
            # Fallback: use all numeric columns
            feature_cols = normal_data.select_dtypes(include=[np.number]).columns.tolist()
        
        if len(feature_cols) == 0:
            # No features available, skip training
            return
        
        features = normal_data[feature_cols].values
        
        # Train Isolation Forest with deterministic random state
        self.iso_forest = IsolationForest(
            contamination=0.1,
            random_state=42,
            n_estimators=100
        )
        self.iso_forest.fit(features)
        self.is_trained = True

    def classify(self, sensor_readings: Dict[str, float], 
                 sensor_history: pd.DataFrame) -> HealthClassification:
        """
        Classify machine health state from current and historical sensor data.
        
        Uses threshold-based rules as primary classification method:
        - Temperature > 320K OR Vibration > 70 OR Torque > 60 → Action Required
        - Temperature > 310K OR Vibration > 50 OR Torque > 50 → Advisory
        - Otherwise → Normal
        
        Args:
            sensor_readings: Current sensor values
            sensor_history: Historical sensor data for trend analysis
            
        Returns:
            HealthClassification with health state and supporting information
        """
        # Detect anomalous sensors using threshold-based and ML-based methods
        anomalous_sensors = self.detect_anomalies(sensor_readings)
        
        # Calculate trends using linear regression on historical data
        sensor_trends = self.calculate_trends(sensor_history)
        
        # STEP 1: Determine threshold violations
        # We track how much each sensor exceeds its threshold to provide context
        # Violations are stored as the amount by which the threshold is exceeded
        threshold_violations = {}
        
        # Check temperature thresholds
        # Temperature is measured in Kelvin; normal operating range is < 310K
        temp = sensor_readings.get("temperature", 0)
        if temp >= THRESHOLDS["temperature"]["action_required"]:
            # Critical: temperature exceeds 320K
            threshold_violations["temperature"] = temp - THRESHOLDS["temperature"]["action_required"]
        elif temp >= THRESHOLDS["temperature"]["advisory"]:
            # Warning: temperature exceeds 310K but below 320K
            threshold_violations["temperature"] = temp - THRESHOLDS["temperature"]["advisory"]
        
        # Check vibration thresholds
        # Vibration is measured in μm; elevated vibration indicates bearing wear or imbalance
        vib = sensor_readings.get("vibration", 0)
        if vib >= THRESHOLDS["vibration"]["action_required"]:
            # Critical: vibration exceeds 70 μm
            threshold_violations["vibration"] = vib - THRESHOLDS["vibration"]["action_required"]
        elif vib >= THRESHOLDS["vibration"]["advisory"]:
            # Warning: vibration exceeds 50 μm but below 70 μm
            threshold_violations["vibration"] = vib - THRESHOLDS["vibration"]["advisory"]
        
        # Check torque thresholds
        # Torque is measured in Nm; high torque indicates mechanical resistance or binding
        torque = sensor_readings.get("torque", 0)
        if torque >= THRESHOLDS["torque"]["action_required"]:
            # Critical: torque exceeds 60 Nm
            threshold_violations["torque"] = torque - THRESHOLDS["torque"]["action_required"]
        elif torque >= THRESHOLDS["torque"]["advisory"]:
            # Warning: torque exceeds 50 Nm but below 60 Nm
            threshold_violations["torque"] = torque - THRESHOLDS["torque"]["advisory"]
        
        # Check rotational speed thresholds
        # Speed should be within 1200-2800 rpm; deviations indicate motor control issues
        speed = sensor_readings.get("rotational_speed", 0)
        if speed < THRESHOLDS["rotational_speed"]["advisory_low"]:
            # Speed too low (< 1200 rpm)
            threshold_violations["rotational_speed"] = THRESHOLDS["rotational_speed"]["advisory_low"] - speed
        elif speed > THRESHOLDS["rotational_speed"]["advisory_high"]:
            # Speed too high (> 2800 rpm)
            threshold_violations["rotational_speed"] = speed - THRESHOLDS["rotational_speed"]["advisory_high"]
        
        # STEP 2: Determine health state based on threshold violations
        # We use a hierarchical classification approach:
        # 1. Check for Action Required (critical conditions)
        # 2. Check for Advisory (warning conditions)
        # 3. Check for Post-Maintenance (recovery pattern)
        # 4. Default to Normal
        health_state = "Normal"
        
        # Check for Action Required conditions (highest priority)
        # ANY sensor exceeding critical threshold triggers Action Required
        if (temp >= THRESHOLDS["temperature"]["action_required"] or
            vib >= THRESHOLDS["vibration"]["action_required"] or
            torque >= THRESHOLDS["torque"]["action_required"]):
            health_state = "Action Required"
        # Check for Advisory conditions (medium priority)
        # ANY sensor exceeding advisory threshold OR speed out of range triggers Advisory
        elif (temp >= THRESHOLDS["temperature"]["advisory"] or
              vib >= THRESHOLDS["vibration"]["advisory"] or
              torque >= THRESHOLDS["torque"]["advisory"] or
              "rotational_speed" in threshold_violations):
            health_state = "Advisory"
        
        # STEP 3: Check for Post-Maintenance pattern
        # Post-Maintenance is a special state indicating recovery after intervention
        # Pattern: Currently normal values + declining trends + history of high values
        # This indicates the machine was recently repaired and is stabilizing
        if health_state == "Normal" and len(sensor_history) >= 10:
            # Check if recent history shows declining trends from high values
            # Count how many sensors are showing falling trends
            recent_declining = sum(1 for trend in sensor_trends.values() if trend == "falling")
            if recent_declining >= 2:  # At least 2 sensors declining
                # Check if earlier values were high (indicating previous degradation)
                # We examine the first third of the history window
                history_len = len(sensor_history)
                early_portion = sensor_history.iloc[:max(1, history_len // 3)]
                
                # Check if early portion had high values for key sensors
                had_high_temp = False
                had_high_torque = False
                had_high_vib = False
                
                for col in early_portion.columns:
                    if "temperature" in col.lower():
                        if early_portion[col].max() >= THRESHOLDS["temperature"]["advisory"]:
                            had_high_temp = True
                    elif "torque" in col.lower():
                        if early_portion[col].max() >= THRESHOLDS["torque"]["advisory"]:
                            had_high_torque = True
                    elif "vibration" in col.lower():
                        if early_portion[col].max() >= THRESHOLDS["vibration"]["advisory"]:
                            had_high_vib = True
                
                # If we had high values that are now declining to normal, classify as Post-Maintenance
                if had_high_temp or had_high_torque or had_high_vib:
                    health_state = "Post-Maintenance"
        
        return HealthClassification(
            health_state=health_state,
            anomalous_sensors=anomalous_sensors,
            sensor_trends=sensor_trends,
            threshold_violations=threshold_violations
        )
    
    def detect_anomalies(self, sensor_readings: Dict[str, float]) -> List[str]:
        """
        Detect which sensors show anomalous values.
        
        Uses threshold-based detection as primary method. If Isolation Forest
        is trained, uses it as secondary signal.
        
        Args:
            sensor_readings: Current sensor values
            
        Returns:
            List of sensor names with anomalous values
        """
        anomalous = []
        
        # Threshold-based anomaly detection
        temp = sensor_readings.get("temperature", 0)
        if temp >= THRESHOLDS["temperature"]["advisory"]:
            anomalous.append("temperature")
        
        vib = sensor_readings.get("vibration", 0)
        if vib >= THRESHOLDS["vibration"]["advisory"]:
            anomalous.append("vibration")
        
        torque = sensor_readings.get("torque", 0)
        if torque >= THRESHOLDS["torque"]["advisory"]:
            anomalous.append("torque")
        
        speed = sensor_readings.get("rotational_speed", 0)
        if (speed < THRESHOLDS["rotational_speed"]["advisory_low"] or
            speed > THRESHOLDS["rotational_speed"]["advisory_high"]):
            anomalous.append("rotational_speed")
        
        # Use Isolation Forest as secondary signal if trained
        if self.is_trained and self.iso_forest is not None:
            try:
                # Prepare features in same order as training
                features = [
                    sensor_readings.get("temperature", 0),
                    sensor_readings.get("torque", 0),
                    sensor_readings.get("rotational_speed", 0),
                    sensor_readings.get("vibration", 0)
                ]
                features_array = np.array(features).reshape(1, -1)
                
                # Predict (-1 for anomaly, 1 for normal)
                prediction = self.iso_forest.predict(features_array)
                
                # If Isolation Forest detects anomaly but threshold didn't,
                # add a generic "sensor_anomaly" indicator
                if prediction[0] == -1 and len(anomalous) == 0:
                    anomalous.append("sensor_anomaly")
            except Exception:
                # If prediction fails, continue with threshold-based results
                pass
        
        return anomalous
    
    def calculate_trends(self, sensor_history: pd.DataFrame) -> Dict[str, str]:
        """
        Calculate trend direction for each sensor using linear regression.
        
        Args:
            sensor_history: Historical sensor data
            
        Returns:
            Dictionary mapping sensor names to trend direction:
            - "rising": positive slope
            - "falling": negative slope
            - "stable": near-zero slope
        """
        trends = {}
        
        if len(sensor_history) < 2:
            # Not enough data for trend calculation
            return trends
        
        # Create time index for regression
        # X represents time steps (0, 1, 2, ..., n-1)
        X = np.arange(len(sensor_history)).reshape(-1, 1)
        
        # Calculate trend for each numeric column using linear regression
        for col in sensor_history.columns:
            if sensor_history[col].dtype in [np.float64, np.int64, np.float32, np.int32]:
                try:
                    y = sensor_history[col].values
                    
                    # Fit linear regression: y = slope * X + intercept
                    # The slope tells us the trend direction
                    model = LinearRegression()
                    model.fit(X, y)
                    
                    slope = model.coef_[0]
                    
                    # Determine trend direction based on slope
                    # We use a relative threshold based on the value range to avoid
                    # classifying noise as trends in stable sensors
                    value_range = y.max() - y.min()
                    # Threshold is 1% of value range (or 0.1 if range is very small)
                    threshold = value_range * 0.01 if value_range > 0 else 0.1
                    
                    if slope > threshold:
                        trend = "rising"  # Sensor values increasing over time
                    elif slope < -threshold:
                        trend = "falling"  # Sensor values decreasing over time
                    else:
                        trend = "stable"  # Sensor values relatively constant
                    
                    # Map column name to simplified sensor name
                    # This normalizes different column naming conventions
                    sensor_name = col.lower()
                    if "temperature" in sensor_name:
                        trends["temperature"] = trend
                    elif "vibration" in sensor_name:
                        trends["vibration"] = trend
                    elif "torque" in sensor_name:
                        trends["torque"] = trend
                    elif "speed" in sensor_name:
                        trends["rotational_speed"] = trend
                    elif "wear" in sensor_name:
                        trends["tool_wear"] = trend
                    
                except Exception:
                    # If trend calculation fails (e.g., all values identical),
                    # mark as stable to avoid classification errors
                    sensor_name = col.lower()
                    if "temperature" in sensor_name:
                        trends["temperature"] = "stable"
                    elif "vibration" in sensor_name:
                        trends["vibration"] = "stable"
                    elif "torque" in sensor_name:
                        trends["torque"] = "stable"
                    elif "speed" in sensor_name:
                        trends["rotational_speed"] = "stable"
                    elif "wear" in sensor_name:
                        trends["tool_wear"] = "stable"
        
        return trends
