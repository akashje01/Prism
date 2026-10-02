# PRISM Datasets

This directory contains the local datasets required for the PRISM Predictive Maintenance System.

## Required Dataset Files

### AI4I 2020 Predictive Maintenance Dataset
- **File**: `ai4i2020.csv`
- **Source**: UCI Machine Learning Repository
- **Description**: Synthetic dataset reflecting real predictive maintenance data from industry
- **Columns**:
  - UDI: Unique identifier
  - Product ID: Product identifier
  - Type: Product quality variant (L, M, H)
  - Air temperature [K]: Process air temperature
  - Process temperature [K]: Process temperature
  - Rotational speed [rpm]: Rotational speed
  - Torque [Nm]: Torque
  - Tool wear [min]: Tool wear time
  - Machine failure: Binary failure indicator
  - TWF, HDF, PWF, OSF, RNF: Failure mode flags

### CWRU Bearing Dataset
- **Files**:
  - `Time_Normal_1_098.mat` - Normal bearing condition
  - `B014_1_190.mat` - Ball defect (0.014 inches)
  - `IR014_1_175.mat` - Inner race defect (0.014 inches)
  - `OR014_6_1_202.mat` - Outer race defect (0.014 inches, 6 o'clock position)
  - `feature_time_48k_2048_load_1.csv` - Extracted features (optional)
- **Source**: Case Western Reserve University Bearing Data Center
- **Description**: Vibration data from bearings with various fault conditions
- **Sampling Rate**: 12kHz or 48kHz depending on file

## Current Status

The following files are already present in this directory:
- ✓ ai4i2020.csv
- ✓ B014_1_190.mat
- ✓ feature_time_48k_2048_load_1.csv
- ✓ IR014_1_175.mat
- ✓ OR014_6_1_202.mat
- ✓ Time_Normal_1_098.mat

All required dataset files are available and ready for use.

## Usage

The PRISM backend will automatically load these files from this directory during initialization. No manual data preprocessing is required.

## Notes

- All datasets are used locally without external API calls
- The system operates entirely offline using these local files
- Do not modify or delete these files as they are required for system operation
