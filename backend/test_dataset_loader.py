"""
Unit tests for DatasetLoader class

Tests cover:
- Successful loading of AI4I dataset
- Successful loading of CWRU .mat files
- Error handling for missing files
- Error handling for corrupted files
"""
import pytest
import pandas as pd
import numpy as np
from pathlib import Path
import tempfile
import os
from dataset_loader import DatasetLoader


class TestDatasetLoader:
    """Test suite for DatasetLoader class"""
    
    def test_load_ai4i_dataset_success(self):
        """Test successful loading of ai4i2020.csv"""
        loader = DatasetLoader(datasets_dir="../datasets")
        
        # Load the dataset
        df = loader.load_ai4i_dataset()
        
        # Verify it's a DataFrame
        assert isinstance(df, pd.DataFrame)
        
        # Verify it's not empty
        assert len(df) > 0
        
        # Verify required columns exist
        required_columns = [
            "UDI", "Product ID", "Type",
            "Air temperature [K]", "Process temperature [K]",
            "Rotational speed [rpm]", "Torque [Nm]", "Tool wear [min]"
        ]
        for col in required_columns:
            assert col in df.columns, f"Missing required column: {col}"
    
    def test_load_cwru_mat_file_success(self):
        """Test successful loading of CWRU .mat files"""
        loader = DatasetLoader(datasets_dir="../datasets")
        
        # Test loading each CWRU .mat file
        mat_files = [
            "Time_Normal_1_098.mat",
            "B014_1_190.mat",
            "IR014_1_175.mat",
            "OR014_6_1_202.mat"
        ]
        
        for filename in mat_files:
            # Check if file is empty (placeholder)
            filepath = loader.datasets_dir / filename
            if filepath.stat().st_size == 0:
                # Skip empty placeholder files
                continue
                
            vibration_data = loader.load_cwru_mat_file(filename)
            
            # Verify it's a NumPy array
            assert isinstance(vibration_data, np.ndarray)
            
            # Verify it's not empty
            assert len(vibration_data) > 0
            
            # Verify it's 1D array
            assert vibration_data.ndim == 1
    
    def test_load_cwru_features_success(self):
        """Test successful loading of CWRU feature CSV file"""
        loader = DatasetLoader(datasets_dir="../datasets")
        
        # Load the features file
        df = loader.load_cwru_features()
        
        # Verify it's a DataFrame
        assert isinstance(df, pd.DataFrame)
        
        # Verify it's not empty
        assert len(df) > 0
    
    def test_missing_datasets_directory(self):
        """Test error handling when datasets directory doesn't exist"""
        with pytest.raises(FileNotFoundError) as exc_info:
            DatasetLoader(datasets_dir="nonexistent_directory")
        
        assert "Datasets directory not found" in str(exc_info.value)
    
    def test_missing_ai4i_file(self):
        """Test error handling when AI4I CSV file is missing"""
        loader = DatasetLoader(datasets_dir="../datasets")
        
        with pytest.raises(FileNotFoundError) as exc_info:
            loader.load_ai4i_dataset(filename="nonexistent_file.csv")
        
        assert "AI4I dataset file not found" in str(exc_info.value)
    
    def test_missing_cwru_mat_file(self):
        """Test error handling when CWRU .mat file is missing"""
        loader = DatasetLoader(datasets_dir="../datasets")
        
        with pytest.raises(FileNotFoundError) as exc_info:
            loader.load_cwru_mat_file(filename="nonexistent_file.mat")
        
        assert "CWRU .mat file not found" in str(exc_info.value)
    
    def test_missing_cwru_features_file(self):
        """Test error handling when CWRU features file is missing"""
        loader = DatasetLoader(datasets_dir="../datasets")
        
        with pytest.raises(FileNotFoundError) as exc_info:
            loader.load_cwru_features(filename="nonexistent_file.csv")
        
        assert "CWRU features file not found" in str(exc_info.value)
    
    def test_corrupted_ai4i_file(self):
        """Test error handling for corrupted AI4I CSV file"""
        # Create a temporary directory with a corrupted CSV file
        with tempfile.TemporaryDirectory() as tmpdir:
            # Create a corrupted CSV file (invalid format)
            corrupted_file = Path(tmpdir) / "corrupted.csv"
            with open(corrupted_file, 'w') as f:
                f.write("This is not a valid CSV file\n")
                f.write("Random text without proper CSV structure\n")
            
            loader = DatasetLoader(datasets_dir=tmpdir)
            
            with pytest.raises(ValueError) as exc_info:
                loader.load_ai4i_dataset(filename="corrupted.csv")
            
            assert "missing required columns" in str(exc_info.value).lower() or \
                   "error loading" in str(exc_info.value).lower()
    
    def test_empty_ai4i_file(self):
        """Test error handling for empty AI4I CSV file"""
        # Create a temporary directory with an empty CSV file
        with tempfile.TemporaryDirectory() as tmpdir:
            # Create an empty CSV file with headers only
            empty_file = Path(tmpdir) / "empty.csv"
            with open(empty_file, 'w') as f:
                f.write("UDI,Product ID,Type,Air temperature [K],Process temperature [K]," +
                       "Rotational speed [rpm],Torque [Nm],Tool wear [min]\n")
            
            loader = DatasetLoader(datasets_dir=tmpdir)
            
            with pytest.raises(ValueError) as exc_info:
                loader.load_ai4i_dataset(filename="empty.csv")
            
            assert "empty" in str(exc_info.value).lower()
    
    def test_corrupted_mat_file(self):
        """Test error handling for corrupted .mat file"""
        # Create a temporary directory with a corrupted .mat file
        with tempfile.TemporaryDirectory() as tmpdir:
            # Create a corrupted .mat file (not a valid MATLAB file)
            corrupted_file = Path(tmpdir) / "corrupted.mat"
            with open(corrupted_file, 'wb') as f:
                f.write(b"This is not a valid MATLAB file")
            
            loader = DatasetLoader(datasets_dir=tmpdir)
            
            with pytest.raises(ValueError) as exc_info:
                loader.load_cwru_mat_file(filename="corrupted.mat")
            
            assert "error loading" in str(exc_info.value).lower()
