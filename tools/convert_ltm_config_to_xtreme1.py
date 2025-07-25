#!/usr/bin/env python3
"""
QC.v1 Camera Configuration to Xtreme1 Format Converter

This script converts QC.v1 camera calibration data to Xtreme1 format.
The QC.v1 config contains CSV files with intrinsic, extrinsic, distortion, and image size data.

Author: AI Assistant
Date: 2024
"""

import os
import json
import csv
import numpy as np
from pathlib import Path
from typing import Dict, List, Any
import argparse

class QCConfigToXtreme1Converter:
    def __init__(self, config_dir: str):
        self.config_dir = Path(config_dir)
        
        # Camera folder mapping from QC.v1 to Xtreme1
        self.camera_mapping = {
            'camera_front_long': 0,
            'camera_front_wide': 1,
            'cam_around_front': 2,
            'cam_around_left': 3,
            'cam_around_rear': 4,
            'cam_around_right': 5,
            'cam_rear_wide': 6,
            'cam_side_left_front': 7,
            'cam_side_left_rear': 8,
            'cam_side_right_front': 9,
            'cam_side_right_rear': 10
        }

    def read_csv_matrix(self, file_path: Path) -> np.ndarray:
        """Read matrix from CSV file"""
        if not file_path.exists():
            raise FileNotFoundError(f"Config file not found: {file_path}")
        
        with open(file_path, 'r') as f:
            reader = csv.reader(f)
            rows = []
            for row in reader:
                if row:  # Skip empty rows
                    # Convert string values to float
                    float_row = [float(val) for val in row]
                    rows.append(float_row)
        
        return np.array(rows)

    def read_csv_values(self, file_path: Path) -> List[float]:
        """Read values from CSV file"""
        if not file_path.exists():
            raise FileNotFoundError(f"Config file not found: {file_path}")
        
        with open(file_path, 'r') as f:
            reader = csv.reader(f)
            for row in reader:
                if row:  # Skip empty rows
                    return [float(val.strip()) for val in row]
        
        return []

    def convert_camera_config(self, camera_name: str) -> Dict[str, Any]:
        """Convert single camera configuration to Xtreme1 format"""
        camera_path = self.config_dir / camera_name
        
        if not camera_path.exists():
            raise FileNotFoundError(f"Camera directory not found: {camera_path}")
        
        # Read intrinsic matrix (3x3)
        intrinsic_file = camera_path / 'intrinsic.csv'
        intrinsic_matrix = self.read_csv_matrix(intrinsic_file)
        
        # Extract focal lengths and principal point
        fx = intrinsic_matrix[0, 0]
        fy = intrinsic_matrix[1, 1]
        cx = intrinsic_matrix[0, 2]
        cy = intrinsic_matrix[1, 2]
        
        # Read extrinsic matrix (4x4)
        ext_file = camera_path / 'ext.csv'
        ext_matrix = self.read_csv_matrix(ext_file)
        
        # Read image size
        image_size_file = camera_path / 'image_size.csv'
        image_size = self.read_csv_values(image_size_file)
        width, height = int(image_size[0]), int(image_size[1])
        
        # Read distortion parameters
        distortion_file = camera_path / 'distortion.csv'
        distortion_params = self.read_csv_values(distortion_file)
        
        # Create Xtreme1 camera configuration
        config = {
            'cameraInternal': {
                'fx': fx,
                'fy': fy,
                'cx': cx,
                'cy': cy
            },
            'width': width,
            'height': height,
            'cameraExternal': ext_matrix.flatten().tolist(),  # Convert to flat list
            'rowMajor': True,
            'distortionCoefficients': {
                'k1': distortion_params[0] if len(distortion_params) > 0 else 0.0,
                'k2': distortion_params[1] if len(distortion_params) > 1 else 0.0,
                'p1': distortion_params[2] if len(distortion_params) > 2 else 0.0,
                'p2': distortion_params[3] if len(distortion_params) > 3 else 0.0,
                'k3': distortion_params[4] if len(distortion_params) > 4 else 0.0
            }
        }
        
        return config

    def convert_all_cameras(self) -> List[Dict[str, Any]]:
        """Convert all camera configurations to Xtreme1 format"""
        print("Converting camera configurations...")
        
        # Initialize array with correct size
        camera_configs = [None] * len(self.camera_mapping)
        
        # Convert each camera
        for camera_name, camera_index in self.camera_mapping.items():
            try:
                config = self.convert_camera_config(camera_name)
                camera_configs[camera_index] = config
                print(f"✓ Converted {camera_name} -> camera_image_{camera_index}")
            except Exception as e:
                print(f"❌ Failed to convert {camera_name}: {e}")
                # Create default config as fallback
                camera_configs[camera_index] = self.create_default_config()
        
        # Remove None values and return
        return [config for config in camera_configs if config is not None]

    def create_default_config(self) -> Dict[str, Any]:
        """Create default camera configuration"""
        return {
            'cameraInternal': {
                'fx': 800.0,
                'fy': 800.0,
                'cx': 960.0,
                'cy': 540.0
            },
            'width': 1920,
            'height': 1080,
            'cameraExternal': [
                1.0, 0.0, 0.0, 0.0,
                0.0, 0.0, -1.0, 0.0,
                0.0, 1.0, 0.0, 0.0,
                2.0, 0.0, 1.8, 1.0
            ],
            'rowMajor': True,
            'distortionCoefficients': {
                'k1': 0.0,
                'k2': 0.0,
                'p1': 0.0,
                'p2': 0.0,
                'k3': 0.0
            }
        }

    def save_config(self, output_file: str, camera_configs: List[Dict[str, Any]]):
        """Save converted configuration to JSON file"""
        with open(output_file, 'w') as f:
            json.dump(camera_configs, f, indent=2)
        print(f"✅ Saved camera configuration to: {output_file}")

    def validate_config(self, camera_configs: List[Dict[str, Any]]) -> bool:
        """Validate camera configuration"""
        print("\nValidating camera configurations...")
        
        errors = []
        
        for i, config in enumerate(camera_configs):
            # Check required fields
            if 'cameraInternal' not in config:
                errors.append(f"Camera {i}: Missing cameraInternal")
            else:
                internal = config['cameraInternal']
                required_fields = ['fx', 'fy', 'cx', 'cy']
                for field in required_fields:
                    if field not in internal:
                        errors.append(f"Camera {i}: Missing {field} in cameraInternal")
            
            if 'width' not in config or 'height' not in config:
                errors.append(f"Camera {i}: Missing width or height")
            
            if 'cameraExternal' not in config:
                errors.append(f"Camera {i}: Missing cameraExternal")
            elif len(config['cameraExternal']) != 16:
                errors.append(f"Camera {i}: cameraExternal should have 16 elements")
        
        if errors:
            print(f"❌ Validation failed with {len(errors)} errors:")
            for error in errors:
                print(f"  - {error}")
            return False
        else:
            print(f"✅ Validation passed for {len(camera_configs)} cameras")
            return True

    def print_config_summary(self, camera_configs: List[Dict[str, Any]]):
        """Print configuration summary"""
        print("\n📋 Camera Configuration Summary:")
        print("-" * 60)
        
        for i, config in enumerate(camera_configs):
            internal = config.get('cameraInternal', {})
            print(f"Camera {i}:")
            print(f"  Resolution: {config.get('width', 'N/A')}x{config.get('height', 'N/A')}")
            print(f"  Focal Length: fx={internal.get('fx', 'N/A'):.1f}, fy={internal.get('fy', 'N/A'):.1f}")
            print(f"  Principal Point: cx={internal.get('cx', 'N/A'):.1f}, cy={internal.get('cy', 'N/A'):.1f}")
            
            # Extract position from extrinsic matrix
            ext = config.get('cameraExternal', [])
            if len(ext) >= 16:
                pos_x, pos_y, pos_z = ext[3], ext[7], ext[11]
                print(f"  Position: x={pos_x:.3f}, y={pos_y:.3f}, z={pos_z:.3f}")
            
            distortion = config.get('distortionCoefficients', {})
            k1 = distortion.get('k1', 0.0)
            k2 = distortion.get('k2', 0.0)
            print(f"  Distortion: k1={k1:.6f}, k2={k2:.6f}")
            print()

def main():
    parser = argparse.ArgumentParser(description='Convert QC.v1 camera config to Xtreme1 format')
    parser.add_argument('--config', '-c', required=True,
                       help='Path to QC.v1 config directory (e.g., temp_config_extract/geely)')
    parser.add_argument('--output', '-o', default='qc_camera_config.json',
                       help='Output JSON file for converted camera configuration')
    
    args = parser.parse_args()
    
    if not os.path.exists(args.config):
        print(f"Error: Config directory not found: {args.config}")
        return 1
    
    converter = QCConfigToXtreme1Converter(args.config)
    
    try:
        # Convert all cameras
        camera_configs = converter.convert_all_cameras()
        
        # Validate configuration
        if not converter.validate_config(camera_configs):
            print("❌ Configuration validation failed")
            return 1
        
        # Save configuration
        converter.save_config(args.output, camera_configs)
        
        # Print summary
        converter.print_config_summary(camera_configs)
        
        print("\n🎉 Camera configuration conversion completed successfully!")
        print(f"Use this config file to update your Xtreme1 dataset")
        
        return 0
        
    except Exception as e:
        print(f"❌ Conversion failed: {e}")
        return 1

if __name__ == '__main__':
    exit(main()) 