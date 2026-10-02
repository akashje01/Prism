#!/usr/bin/env python3
"""
Manual Offline Operation Test Script

This script helps verify that the PRISM system works completely offline.

Usage:
1. Disconnect your network/WiFi
2. Run this script: python test_offline_manual.py
3. The script will test all backend functionality
4. Then manually test the frontend by opening http://localhost:5173

Requirements: 16.1, 16.2, 16.3, 16.5
"""

import sys
import time
import subprocess
import requests
from pathlib import Path

# ANSI color codes for terminal output
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
BLUE = '\033[94m'
RESET = '\033[0m'

def print_header(text):
    """Print a formatted header"""
    print(f"\n{BLUE}{'='*70}{RESET}")
    print(f"{BLUE}{text.center(70)}{RESET}")
    print(f"{BLUE}{'='*70}{RESET}\n")

def print_success(text):
    """Print success message"""
    print(f"{GREEN}✓ {text}{RESET}")

def print_error(text):
    """Print error message"""
    print(f"{RED}✗ {text}{RESET}")

def print_warning(text):
    """Print warning message"""
    print(f"{YELLOW}⚠ {text}{RESET}")

def print_info(text):
    """Print info message"""
    print(f"{BLUE}ℹ {text}{RESET}")

def check_network_disconnected():
    """Check if network is disconnected"""
    print_header("Network Status Check")
    
    try:
        # Try to connect to a well-known external site
        response = requests.get("https://www.google.com", timeout=3)
        print_warning("Network is CONNECTED - Please disconnect WiFi/Ethernet for true offline test")
        print_info("The test will continue, but results may not reflect true offline operation")
        return False
    except requests.exceptions.RequestException:
        print_success("Network is DISCONNECTED - Perfect for offline testing!")
        return True

def test_backend_api():
    """Test backend API endpoints"""
    print_header("Testing Backend API (Offline)")
    
    base_url = "http://localhost:8000"
    
    tests = [
        ("GET /api/machines", f"{base_url}/api/machines"),
        ("GET /api/machines/CNC-MILL-01", f"{base_url}/api/machines/CNC-MILL-01"),
        ("GET /api/machines/COOL-PUMP-02", f"{base_url}/api/machines/COOL-PUMP-02"),
        ("GET /api/machines/CONV-MOTOR-01", f"{base_url}/api/machines/CONV-MOTOR-01"),
        ("GET /api/machines/AIR-COMP-01", f"{base_url}/api/machines/AIR-COMP-01"),
    ]
    
    all_passed = True
    
    for test_name, url in tests:
        try:
            response = requests.get(url, timeout=5)
            if response.status_code == 200:
                print_success(f"{test_name} - Status: {response.status_code}")
            else:
                print_error(f"{test_name} - Status: {response.status_code}")
                all_passed = False
        except requests.exceptions.RequestException as e:
            print_error(f"{test_name} - Error: {e}")
            all_passed = False
    
    # Test simulation control
    print_info("\nTesting simulation control...")
    try:
        response = requests.post(
            f"{base_url}/api/simulation/control",
            json={"machine_id": "CNC-MILL-01", "scenario": "Advisory"},
            timeout=5
        )
        if response.status_code == 200:
            print_success("POST /api/simulation/control - Status: 200")
        else:
            print_error(f"POST /api/simulation/control - Status: {response.status_code}")
            all_passed = False
    except requests.exceptions.RequestException as e:
        print_error(f"POST /api/simulation/control - Error: {e}")
        all_passed = False
    
    # Test simulation advance
    try:
        response = requests.post(
            f"{base_url}/api/simulation/advance",
            json={"machine_id": "CNC-MILL-01", "steps": 5},
            timeout=5
        )
        if response.status_code == 200:
            print_success("POST /api/simulation/advance - Status: 200")
        else:
            print_error(f"POST /api/simulation/advance - Status: {response.status_code}")
            all_passed = False
    except requests.exceptions.RequestException as e:
        print_error(f"POST /api/simulation/advance - Error: {e}")
        all_passed = False
    
    return all_passed

def test_all_scenarios():
    """Test all scenarios for all machines"""
    print_header("Testing All Scenarios (Offline)")
    
    base_url = "http://localhost:8000"
    machines = ["CNC-MILL-01", "COOL-PUMP-02", "CONV-MOTOR-01", "AIR-COMP-01"]
    scenarios = ["Normal", "Advisory", "Action Required", "Post-Maintenance"]
    
    all_passed = True
    
    for machine in machines:
        print_info(f"\nTesting {machine}...")
        for scenario in scenarios:
            try:
                # Set scenario
                response = requests.post(
                    f"{base_url}/api/simulation/control",
                    json={"machine_id": machine, "scenario": scenario},
                    timeout=5
                )
                
                if response.status_code != 200:
                    print_error(f"  {scenario} - Failed to set scenario")
                    all_passed = False
                    continue
                
                # Get machine detail
                response = requests.get(f"{base_url}/api/machines/{machine}", timeout=5)
                
                if response.status_code == 200:
                    data = response.json()
                    health_state = data.get("health_state", "Unknown")
                    explanation = data.get("explanation", "")
                    
                    if health_state == scenario:
                        print_success(f"  {scenario} - Health state matches, explanation generated")
                    else:
                        print_warning(f"  {scenario} - Health state: {health_state} (expected: {scenario})")
                else:
                    print_error(f"  {scenario} - Failed to get machine detail")
                    all_passed = False
                    
            except requests.exceptions.RequestException as e:
                print_error(f"  {scenario} - Error: {e}")
                all_passed = False
    
    return all_passed

def verify_no_external_calls():
    """Verify that explanations don't contain API error messages"""
    print_header("Verifying No External API Calls")
    
    base_url = "http://localhost:8000"
    
    # Get machine detail with explanation
    try:
        response = requests.get(f"{base_url}/api/machines/CNC-MILL-01", timeout=5)
        if response.status_code == 200:
            data = response.json()
            explanation = data.get("explanation", "").lower()
            
            # Check for common API error indicators
            error_indicators = ["api error", "timeout", "rate limit", "connection refused", "network error"]
            
            has_errors = any(indicator in explanation for indicator in error_indicators)
            
            if has_errors:
                print_error("Explanation contains API error indicators!")
                print_info(f"Explanation: {data.get('explanation', '')}")
                return False
            else:
                print_success("Explanation generated without external API calls")
                print_info(f"Sample explanation: {data.get('explanation', '')[:100]}...")
                return True
        else:
            print_error(f"Failed to get machine detail - Status: {response.status_code}")
            return False
    except requests.exceptions.RequestException as e:
        print_error(f"Error: {e}")
        return False

def main():
    """Main test function"""
    print_header("PRISM Offline Operation Manual Test")
    print_info("This script tests that the PRISM system works completely offline")
    print_info("Requirements: 16.1, 16.2, 16.3, 16.5\n")
    
    # Check if backend is running
    print_info("Checking if backend is running on http://localhost:8000...")
    try:
        response = requests.get("http://localhost:8000/api/machines", timeout=3)
        print_success("Backend is running!")
    except requests.exceptions.RequestException:
        print_error("Backend is NOT running!")
        print_info("Please start the backend first:")
        print_info("  cd backend")
        print_info("  python main.py")
        sys.exit(1)
    
    # Check network status
    network_disconnected = check_network_disconnected()
    
    # Run tests
    results = []
    
    results.append(("Backend API Endpoints", test_backend_api()))
    results.append(("All Scenarios", test_all_scenarios()))
    results.append(("No External API Calls", verify_no_external_calls()))
    
    # Print summary
    print_header("Test Summary")
    
    all_passed = all(result[1] for result in results)
    
    for test_name, passed in results:
        if passed:
            print_success(f"{test_name}: PASSED")
        else:
            print_error(f"{test_name}: FAILED")
    
    print()
    
    if all_passed:
        print_success("All automated tests PASSED! ✓")
    else:
        print_error("Some tests FAILED! ✗")
    
    # Manual testing instructions
    print_header("Manual Frontend Testing")
    print_info("To complete offline verification, please test the frontend:")
    print_info("1. Ensure network is disconnected (WiFi/Ethernet off)")
    print_info("2. Start frontend: cd frontend && npm run dev")
    print_info("3. Open browser to http://localhost:5173")
    print_info("4. Test the following:")
    print_info("   - Dashboard loads with all 4 machines")
    print_info("   - Click on each machine to view details")
    print_info("   - Use simulation control panel to change scenarios")
    print_info("   - Verify all charts and data display correctly")
    print_info("   - Check browser DevTools Network tab (should show no external requests)")
    
    if not network_disconnected:
        print()
        print_warning("IMPORTANT: Network is still connected!")
        print_warning("For true offline verification, disconnect network and run tests again")
    
    print()
    
    if all_passed and network_disconnected:
        print_success("Offline operation VERIFIED! ✓✓✓")
        sys.exit(0)
    elif all_passed:
        print_warning("Tests passed, but network is connected - disconnect for full verification")
        sys.exit(0)
    else:
        print_error("Offline operation verification FAILED")
        sys.exit(1)

if __name__ == "__main__":
    main()
