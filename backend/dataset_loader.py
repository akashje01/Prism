"""
Dataset Loader for PRISM Predictive Maintenance System

This module handles loading of local datasets:
- AI4I 2020 Predictive Maintenance Dataset (CSV)
- CWRU Bearing Dataset (.mat files and CSV features)
"""
import os
from pathlib import Path
from typing import Optional
import pandas as pd
import numpy as np
from scipy.io import loadmat


class DatasetLoader:
    """
    Loads and validates local datasets for the PRISM system.
    
    Handles:
    - AI4I CSV dataset loading
    - CWRU .mat file loading
    - CWRU feature CSV loading
    - File existence validation
    - Error handling for missing or corrupted files
    """
    
    def __init__(self, datasets_dir: str = "datasets"):
        """
        Initialize DatasetLoader with path to datasets directory.
        
        Args:
            datasets_dir: Path to directory containing dataset files
        """
        self.datasets_dir = Path(datasets_dir)
        
        if not self.datasets_dir.exists():
            raise FileNotFoundError(
                f"Datasets directory not found: {self.datasets_dir.absolute()}"
            )
    
    def load_ai4i_dataset(self, filename: str = "ai4i2020.csv") -> pd.DataFrame:
        """
        Load AI4I 2020 Predictive Maintenance Dataset from CSV file.
        
        Args:
            filename: Name of the CSV file (default: ai4i2020.csv)
            
        Returns:
            DataFrame containing the AI4I dataset
            
        Raises:
            FileNotFoundError: If the CSV file does not exist
            ValueError: If the file is corrupted or has invalid format
        """
        filepath = self.datasets_dir / filename
        
        # Validate file existence
        if not filepath.exists():
            raise FileNotFoundError(
                f"AI4I dataset file not found: {filepath.absolute()}\n"
                f"Expected location: {self.datasets_dir.absolute()}/{filename}"
            )
        
        try:
            # Load CSV using pandas
            df = pd.read_csv(filepath)
            
            # Clean column names - handle BOM by checking if column ends with expected name
            cleaned_columns = []
            for col in df.columns:
                # Remove common BOM representations
                cleaned = col
                if col.endswith('UDI') and col != 'UDI':
                    cleaned = 'UDI'
                cleaned_columns.append(cleaned)
            df.columns = cleaned_columns
            
            # Validate expected columns exist
            required_columns = [
                "UDI", "Product ID", "Type",
                "Air temperature [K]", "Process temperature [K]",
                "Rotational speed [rpm]", "Torque [Nm]", "Tool wear [min]"
            ]
            
            missing_columns = [col for col in required_columns if col not in df.columns]
            if missing_columns:
                raise ValueError(
                    f"AI4I dataset is missing required columns: {missing_columns}"
                )
            
            # Validate dataset is not empty
            if len(df) == 0:
                raise ValueError("AI4I dataset is empty")
            
            return df
            
        except pd.errors.EmptyDataError:
            raise ValueError(f"AI4I dataset file is empty: {filepath}")
        except pd.errors.ParserError as e:
            raise ValueError(f"AI4I dataset file is corrupted or has invalid format: {e}")
        except Exception as e:
            raise ValueError(f"Error loading AI4I dataset: {e}")
    
    def load_cwru_mat_file(self, filename: str) -> np.ndarray:
        """
        Load CWRU bearing dataset from .mat file.
        
        Args:
            filename: Name of the .mat file (e.g., "Time_Normal_1_098.mat")
            
        Returns:
            NumPy array containing vibration data
            
        Raises:
            FileNotFoundError: If the .mat file does not exist
            ValueError: If the file is corrupted or has invalid format
        """
        filepath = self.datasets_dir / filename
        
        # Validate file existence
        if not filepath.exists():
            raise FileNotFoundError(
                f"CWRU .mat file not found: {filepath.absolute()}\n"
                f"Expected location: {self.datasets_dir.absolute()}/{filename}"
            )
        
        try:
            # Load .mat file using scipy
            mat_data = loadmat(str(filepath))
            
            # Extract vibration data from .mat structure
            # CWRU .mat files typically have keys like 'X097_DE_time', 'X098_DE_time', etc.
            # We need to find the key containing the actual data (not metadata keys)
            data_keys = [k for k in mat_data.keys() if not k.startswith('__')]
            
            if not data_keys:
                raise ValueError(
                    f"No data found in .mat file: {filename}\n"
                    f"Available keys: {list(mat_data.keys())}"
                )
            
            # Use the first non-metadata key (typically the vibration data)
            data_key = data_keys[0]
            vibration_data = mat_data[data_key]
            
            # Convert to 1D array if needed
            if isinstance(vibration_data, np.ndarray):
                vibration_data = vibration_data.flatten()
            else:
                raise ValueError(f"Unexpected data type in .mat file: {type(vibration_data)}")
            
            # Validate data is not empty
            if len(vibration_data) == 0:
                raise ValueError(f"CWRU .mat file contains empty data: {filename}")
            
            return vibration_data
            
        except Exception as e:
            if isinstance(e, (FileNotFoundError, ValueError)):
                raise
            raise ValueError(f"Error loading CWRU .mat file {filename}: {e}")
    
    def load_cwru_features(self, filename: str = "feature_time_48k_2048_load_1.csv") -> pd.DataFrame:
        """
        Load CWRU feature CSV file.
        
        Args:
            filename: Name of the CSV file (default: feature_time_48k_2048_load_1.csv)
            
        Returns:
            DataFrame containing CWRU features
            
        Raises:
            FileNotFoundError: If the CSV file does not exist
            ValueError: If the file is corrupted or has invalid format
        """
        filepath = self.datasets_dir / filename
        
        # Validate file existence
        if not filepath.exists():
            raise FileNotFoundError(
                f"CWRU features file not found: {filepath.absolute()}\n"
                f"Expected location: {self.datasets_dir.absolute()}/{filename}"
            )
        
        try:
            # Load CSV using pandas
            df = pd.read_csv(filepath)
            
            # Validate dataset is not empty
            if len(df) == 0:
                raise ValueError(f"CWRU features file is empty: {filename}")
            
            return df
            
        except pd.errors.EmptyDataError:
            raise ValueError(f"CWRU features file is empty: {filepath}")
        except pd.errors.ParserError as e:
            raise ValueError(f"CWRU features file is corrupted or has invalid format: {e}")
        except Exception as e:
            raise ValueError(f"Error loading CWRU features file: {e}")
