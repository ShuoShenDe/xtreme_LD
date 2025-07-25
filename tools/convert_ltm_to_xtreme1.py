#!/usr/bin/env python3
"""
QC.v1 Dataset to Xtreme1 Format Converter

This script converts the QC.v1 dataset format to be compatible with Xtreme1 system.
The QC.v1 dataset contains multiple cameras, LiDAR data, and comprehensive annotations.

Author: AI Assistant
Date: 2024
"""

import os
import json
import shutil
import math
import uuid
from pathlib import Path
from typing import Dict, List, Any, Optional
import argparse

class QCToXtreme1Converter:
    def __init__(self, input_dir: str, output_dir: str, config_file: Optional[str] = None):
        self.input_dir = Path(input_dir)
        self.output_dir = Path(output_dir)
        self.config_file = config_file
        
        # Camera folder mapping from QC.v1 to Xtreme1
        self.camera_mapping = {
            'camera_front_long': 'camera_image_0',
            'camera_front_wide': 'camera_image_1',
            'cam_around_front': 'camera_image_2',
            'cam_around_left': 'camera_image_3',
            'cam_around_rear': 'camera_image_4',
            'cam_around_right': 'camera_image_5',
            'cam_rear_wide': 'camera_image_6',
            'cam_side_left_front': 'camera_image_7',
            'cam_side_left_rear': 'camera_image_8',
            'cam_side_right_front': 'camera_image_9',
            'cam_side_right_rear': 'camera_image_10'
        }
        
        # Class mapping from QC.v1 to Xtreme1
        self.class_mapping = {
            'Car': {'id': 1, 'name': 'Car'},
            'Suv': {'id': 2, 'name': 'SUV'},
            'Trailer_head': {'id': 3, 'name': 'Large_truck'},
            'Trailer_tail': {'id': 4, 'name': 'Large_truck'},
            'Anticrash_bucket': {'id': 5, 'name': 'Static_obstacle'},
            'Large_truck': {'id': 6, 'name': 'Large_truck'},
            'Truck': {'id': 7, 'name': 'Truck'},
            'Bus': {'id': 8, 'name': 'Bus'},
            'Motorcycle': {'id': 9, 'name': 'Motorcycle'},
            'Bicycle': {'id': 10, 'name': 'Bicycle'},
            'Pedestrian': {'id': 11, 'name': 'Pedestrian'},
            'Static_obstacle': {'id': 12, 'name': 'Static_obstacle'},
            'Unknown': {'id': 99, 'name': 'Unknown'}
        }
        
        # Load camera configuration if provided
        self.camera_configs = self.load_camera_config()

    def load_camera_config(self) -> Optional[List[Dict[str, Any]]]:
        """Load camera configuration from JSON file"""
        if not self.config_file:
            print("No camera config file provided, using default configurations")
            return None
            
        config_path = Path(self.config_file)
        if not config_path.exists():
            print(f"Warning: Camera config file not found: {config_path}")
            return None
            
        try:
            with open(config_path, 'r') as f:
                configs = json.load(f)
            print(f"✅ Loaded camera configuration from: {config_path}")
            print(f"   Found {len(configs)} camera configurations")
            return configs
        except Exception as e:
            print(f"Error loading camera config: {e}")
            return None

    def quaternion_to_euler(self, x: float, y: float, z: float, w: float) -> Dict[str, float]:
        """Convert quaternion to Euler angles (roll, pitch, yaw)"""
        # Roll (x-axis rotation)
        sinr_cosp = 2 * (w * x + y * z)
        cosr_cosp = 1 - 2 * (x * x + y * y)
        roll = math.atan2(sinr_cosp, cosr_cosp)
        
        # Pitch (y-axis rotation)
        sinp = 2 * (w * y - z * x)
        if abs(sinp) >= 1:
            pitch = math.copysign(math.pi / 2, sinp)
        else:
            pitch = math.asin(sinp)
        
        # Yaw (z-axis rotation)
        siny_cosp = 2 * (w * z + x * y)
        cosy_cosp = 1 - 2 * (y * y + z * z)
        yaw = math.atan2(siny_cosp, cosy_cosp)
        
        return {
            'x': roll,    # pitch in xtreme1
            'y': pitch,   # yaw in xtreme1  
            'z': yaw      # roll in xtreme1
        }

    def convert_3d_object(self, qc_object: Dict[str, Any]) -> Dict[str, Any]:
        """Convert QC.v1 3D object to Xtreme1 format"""
        # Extract pose information
        position = qc_object['pose']['position']
        orientation = qc_object['pose']['orientation']
        dimensions = qc_object['dimensions']
        
        # Convert quaternion to Euler angles
        rotation = self.quaternion_to_euler(
            orientation['x'], orientation['y'], 
            orientation['z'], orientation['w']
        )
        
        # Map object category - use class_label_true if available, otherwise subclass_label_true
        category = qc_object.get('class_label_true', 
                   qc_object.get('subclass_label_true', 'Unknown'))
        class_info = self.class_mapping.get(category, {'id': 99, 'name': 'Unknown'})
        
        # Create Xtreme1 object
        xtreme1_object = {
            'id': str(uuid.uuid4()),
            'type': '3D_BOX',
            'version': 0,
            'trackId': str(qc_object.get('id', '')),
            'trackName': '',
            'classId': class_info['id'],
            'className': class_info['name'],
            'classValues': [],
            'contour': {
                'center3D': {
                    'x': position['x'],
                    'y': position['y'], 
                    'z': position['z']
                },
                'size3D': {
                    'x': dimensions['x'],
                    'y': dimensions['y'],
                    'z': dimensions['z']
                },
                'rotation3D': rotation
            },
            'modelConfidence': qc_object.get('confidence', 0.0),
            'modelClass': category if category != class_info['name'] else ''
        }
        
        return xtreme1_object

    def convert_2d_object(self, qc_object: Dict[str, Any]) -> Dict[str, Any]:
        """Convert QC.v1 2D image object to Xtreme1 format"""
        bbox = qc_object['bbox']
        category = qc_object.get('category', 'Unknown')
        class_info = self.class_mapping.get(category, {'id': 99, 'name': 'Unknown'})
        
        # Handle different bbox formats
        if len(bbox) == 1:
            # Single point - create a small bounding box around it
            point = bbox[0]
            x, y = point['x'], point['y']
            margin = 0.005  # Small margin for normalized coordinates
            x1, y1 = max(0, x - margin), max(0, y - margin)
            x2, y2 = min(1, x + margin), min(1, y + margin)
            print(f"Converting single point to bbox: ID={qc_object.get('id', 'unknown')}, Category={category}")
        elif len(bbox) == 2:
            # Standard bbox with two points
            x1, y1 = bbox[0]['x'], bbox[0]['y']
            x2, y2 = bbox[1]['x'], bbox[1]['y']
        else:
            print(f"Error: bbox has {len(bbox)} elements instead of 1 or 2")
            print(f"Object ID: {qc_object.get('id', 'unknown')}")
            print(f"Category: {category}")
            print(f"Bbox: {bbox}")
            raise ValueError(f"Invalid bbox format: expected 1 or 2 points, got {len(bbox)}")
        
        # Ensure proper bbox ordering (x1 < x2, y1 < y2)
        if x1 > x2:
            x1, x2 = x2, x1
        if y1 > y2:
            y1, y2 = y2, y1
        
        # Create Xtreme1 2D object with 8 points (front 4 + back 4)
        front_points = [
            {'x': x1, 'y': y1},
            {'x': x2, 'y': y1},
            {'x': x2, 'y': y2},
            {'x': x1, 'y': y2}
        ]
        
        # Back points are the same as front points for 2D objects
        back_points = [
            {'x': x1, 'y': y1},
            {'x': x2, 'y': y1},
            {'x': x2, 'y': y2},
            {'x': x1, 'y': y2}
        ]
        
        # Combine front and back points (total 8 points)
        all_points = front_points + back_points
        
        xtreme1_object = {
            'id': str(uuid.uuid4()),
            'type': '2D_BOX',
            'version': 0,
            'trackId': str(qc_object.get('id', '')),
            'trackName': '',
            'classId': class_info['id'],
            'className': class_info['name'],
            'classValues': [],
            'contour': {
                'points': all_points
            },
            'modelConfidence': 0.0,
            'modelClass': category if category != class_info['name'] else ''
        }
        
        return xtreme1_object

    def process_3d_annotations(self, timestamp: str) -> List[Dict[str, Any]]:
        """Process 3D annotations for a given timestamp"""
        annotation_file = self.input_dir / 'ld_object_lists' / f'{timestamp}.json'
        
        if not annotation_file.exists():
            print(f"Warning: 3D annotation file not found: {annotation_file}")
            return []
        
        try:
            with open(annotation_file, 'r') as f:
                data = json.load(f)
            
            xtreme1_objects = []
            for qc_object in data.get('objects', []):
                try:
                    xtreme1_obj = self.convert_3d_object(qc_object)
                    xtreme1_objects.append(xtreme1_obj)
                except Exception as e:
                    print(f"Error converting 3D object: {e}")
                    continue
            
            return xtreme1_objects
            
        except Exception as e:
            print(f"Error processing 3D annotation file {annotation_file}: {e}")
            return []

    def process_2d_annotations(self, timestamp: str) -> List[Dict[str, Any]]:
        """Process 2D annotations for a given timestamp"""
        annotation_file = self.input_dir / 'ld_annotation_img_object_lists' / f'{timestamp}.json'
        
        if not annotation_file.exists():
            print(f"Warning: 2D annotation file not found: {annotation_file}")
            return []
        
        try:
            with open(annotation_file, 'r') as f:
                data = json.load(f)
            
            xtreme1_objects = []
            for qc_object in data.get('bboxes', []):
                try:
                    xtreme1_obj = self.convert_2d_object(qc_object)
                    xtreme1_objects.append(xtreme1_obj)
                except Exception as e:
                    print(f"Error converting 2D object: {e}")
                    continue
            
            return xtreme1_objects
            
        except Exception as e:
            print(f"Error processing 2D annotation file {annotation_file}: {e}")
            return []

    def copy_camera_images(self):
        """Copy and organize camera images by sensor type"""
        print("Organizing camera images by sensor type...")
        
        # Get all timestamps from LiDAR files
        lidar_path = self.input_dir / 'lidar'
        if not lidar_path.exists():
            print("Error: LiDAR folder not found")
            return
        
        timestamps = []
        for pcd_file in lidar_path.glob('*.pcd'):
            timestamp = pcd_file.stem
            timestamps.append(timestamp)
        
        timestamps.sort()
        print(f"Found {len(timestamps)} timestamps")
        
        # Create a single scene directory
        scene_dir = self.output_dir / 'scene_qc_v1_sequence'
        scene_dir.mkdir(parents=True, exist_ok=True)
        
        # Create camera directories by sensor type
        for src_folder, dst_folder in self.camera_mapping.items():
            src_path = self.input_dir / src_folder
            dst_path = scene_dir / dst_folder
            dst_path.mkdir(parents=True, exist_ok=True)
            
            if src_path.exists():
                # Copy all timestamp images for this camera
                for timestamp in timestamps:
                    src_img = src_path / f'{timestamp}.jpg'
                    if src_img.exists():
                        shutil.copy2(src_img, dst_path / f'{timestamp}.jpg')
                        
        # Also copy root directory images (might be from another camera)
        root_images = list(self.input_dir.glob('*.jpg'))
        if root_images:
            print(f"Found {len(root_images)} images in root directory")
            # Create additional camera directory for root images
            root_camera_dir = scene_dir / 'camera_image_11'
            root_camera_dir.mkdir(parents=True, exist_ok=True)
            for img in root_images:
                shutil.copy2(img, root_camera_dir / img.name)
        
        print(f"Organized {len(timestamps)} timestamps into sensor-based structure")

    def copy_lidar_data(self):
        """Copy and organize LiDAR data by sensor type"""
        print("Organizing LiDAR data by sensor type...")
        
        # Get all timestamps from LiDAR files
        lidar_path = self.input_dir / 'lidar'
        if not lidar_path.exists():
            print("Error: LiDAR folder not found")
            return
        
        timestamps = []
        for pcd_file in lidar_path.glob('*.pcd'):
            timestamp = pcd_file.stem
            timestamps.append(timestamp)
        
        timestamps.sort()
        
        # Create a single scene directory
        scene_dir = self.output_dir / 'scene_qc_v1_sequence'
        scene_dir.mkdir(parents=True, exist_ok=True)
        
        # Create LiDAR directory
        lidar_dst_path = scene_dir / 'lidar_point_cloud_0'
        lidar_dst_path.mkdir(parents=True, exist_ok=True)
        
        # Copy all timestamp PCD files
        for timestamp in timestamps:
            src_pcd = lidar_path / f'{timestamp}.pcd'
            if src_pcd.exists():
                shutil.copy2(src_pcd, lidar_dst_path / f'{timestamp}.pcd')
        
        print(f"Organized {len(timestamps)} timestamps into sensor-based structure")

    def create_camera_config(self):
        """Create camera configuration files for each timestamp"""
        print("Creating camera configuration files...")
        
        # Get all timestamps from LiDAR files
        lidar_path = self.input_dir / 'lidar'
        if not lidar_path.exists():
            print("Error: LiDAR folder not found")
            return
        
        timestamps = []
        for pcd_file in lidar_path.glob('*.pcd'):
            timestamp = pcd_file.stem
            timestamps.append(timestamp)
        
        timestamps.sort()
        
        # Create a single scene directory
        scene_dir = self.output_dir / 'scene_qc_v1_sequence'
        scene_dir.mkdir(parents=True, exist_ok=True)
        
        # Create camera_config directory
        camera_config_dir = scene_dir / 'camera_config'
        camera_config_dir.mkdir(parents=True, exist_ok=True)
        
        # Use loaded camera configurations if available, otherwise create defaults
        if self.camera_configs:
            camera_configs = self.camera_configs
            print(f"Using loaded camera configurations with {len(camera_configs)} cameras")
        else:
            # Create default configurations if no config file provided
            print("Creating default camera configurations...")
            camera_configs = self.create_default_camera_configs()
        
        # Create camera configuration files for each timestamp
        for timestamp in timestamps:
            config_file = camera_config_dir / f'{timestamp}.json'
            with open(config_file, 'w') as f:
                json.dump(camera_configs, f, indent=2)
        
        print(f"✅ Camera configuration files created successfully!")
        print(f"   - Created {len(timestamps)} timestamp-specific config files")
        print(f"   - Each file contains {len(camera_configs)} camera configurations")
        
        # Print configuration summary
        if self.camera_configs:
            print("\n📋 Using Real Camera Calibration Data:")
            print("-" * 50)
            for i, config in enumerate(camera_configs):
                internal = config.get('cameraInternal', {})
                print(f"Camera {i}: {config.get('width')}x{config.get('height')}, "
                      f"fx={internal.get('fx', 0):.1f}, fy={internal.get('fy', 0):.1f}")
                      
                # Show distortion if available
                distortion = config.get('distortionCoefficients', {})
                if distortion:
                    k1 = distortion.get('k1', 0.0)
                    k2 = distortion.get('k2', 0.0)
                    if abs(k1) > 0.001 or abs(k2) > 0.001:
                        print(f"         Distortion: k1={k1:.6f}, k2={k2:.6f}")

    def create_default_camera_configs(self) -> List[Dict[str, Any]]:
        """Create default camera configurations for QC.v1 dataset"""
        # Default configurations for 11 cameras
        camera_configs = [
            {  # Camera 0: camera_front_long
                'cameraInternal': {
                    'fx': 1200.0,
                    'fy': 1200.0,
                    'cx': 960.0,
                    'cy': 540.0
                },
                'width': 1920,
                'height': 1080,
                'cameraExternal': [
                    1.0, 0.0, 0.0, 0.0,
                    0.0, 0.0, -1.0, 0.0,
                    0.0, 1.0, 0.0, 0.0,
                    2.2, 0.0, 1.9, 1.0
                ],
                'rowMajor': True
            },
            {  # Camera 1: camera_front_wide
                'cameraInternal': {
                    'fx': 900.0,
                    'fy': 900.0,
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
                'rowMajor': True
            },
            # ... (继续添加其他默认相机配置)
        ]
        
        # Add remaining cameras with default values
        while len(camera_configs) < 11:
            camera_configs.append({
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
                'rowMajor': True
            })
        
        return camera_configs

    def convert_annotations(self):
        """Convert annotations into sensor-based structure"""
        print("Converting annotations into sensor-based structure...")
        
        # Get all timestamps from LiDAR files
        lidar_path = self.input_dir / 'lidar'
        if not lidar_path.exists():
            print("Error: LiDAR folder not found")
            return
        
        timestamps = []
        for pcd_file in lidar_path.glob('*.pcd'):
            timestamp = pcd_file.stem
            timestamps.append(timestamp)
        
        timestamps.sort()
        print(f"Found {len(timestamps)} timestamps")
        
        # Create a single scene directory
        scene_dir = self.output_dir / 'scene_qc_v1_sequence'
        scene_dir.mkdir(parents=True, exist_ok=True)
        
        # Create result directory
        result_dir = scene_dir / 'result'
        result_dir.mkdir(parents=True, exist_ok=True)
        
        total_objects = 0
        
        # Process each timestamp
        for frame_index, timestamp in enumerate(timestamps):
            print(f"Processing timestamp: {timestamp} (frame {frame_index + 1}/{len(timestamps)})")
            
            # Combine 3D and 2D annotations
            objects_3d = self.process_3d_annotations(timestamp)
            objects_2d = self.process_2d_annotations(timestamp)
            
            # Add frame and sequence information to each object
            for obj in objects_3d + objects_2d:
                obj['frameIndex'] = frame_index
                obj['timestamp'] = timestamp
                obj['frameId'] = timestamp
                obj['sequenceId'] = 'qc_v1_sequence_001'
                obj['isSequenceData'] = True
            
            all_objects = objects_3d + objects_2d
            total_objects += len(all_objects)
            
            # Create result file for this timestamp
            result_data = {
                'objects': all_objects
            }
            
            # Save result file in the result directory
            result_file = result_dir / f'{timestamp}.json'
            with open(result_file, 'w') as f:
                json.dump(result_data, f, indent=2)
            
            print(f"Frame {frame_index + 1}: {len(all_objects)} objects ({len(objects_3d)} 3D, {len(objects_2d)} 2D)")
        
        # Create overall sequence manifest file in the scene directory
        manifest_data = {
            'datasetType': 'LIDAR_FUSION_SEQUENCE',
            'sequenceId': 'qc_v1_sequence_001',
            'sequenceName': 'QC.v1 Dataset Sequence',
            'totalFrames': len(timestamps),
            'totalObjects': total_objects,
            'frameRate': 2.0,  # 500ms intervals = 2 FPS
            'duration': len(timestamps) * 0.5,  # in seconds
            'startTime': timestamps[0] if timestamps else None,
            'endTime': timestamps[-1] if timestamps else None,
            'timestamps': timestamps,
            'structure': 'sensor_based_single_scene',
            'sensors': {
                'cameras': list(self.camera_mapping.values()) + ['camera_image_11'],
                'lidar': ['lidar_point_cloud_0']
            },
            'classMapping': self.class_mapping,
            'calibrationInfo': {
                'hasRealCalibration': self.camera_configs is not None,
                'configSource': self.config_file if self.config_file else 'default'
            }
        }
        
        # Save manifest file in the scene directory
        manifest_file = scene_dir / 'sequence_manifest.json'
        with open(manifest_file, 'w') as f:
            json.dump(manifest_data, f, indent=2)
        
        print(f"Created single scene with sensor-based structure")
        print(f"Total objects across all timestamps: {total_objects}")
        
    def create_dataset_info(self):
        """Create dataset information file"""
        print("Creating dataset information...")
        
        # Check scene directory
        scene_dir = self.output_dir / 'scene_qc_v1_sequence'
        
        # Check manifest file
        manifest_file = scene_dir / 'sequence_manifest.json' if scene_dir.exists() else None
        frame_count = 0
        if manifest_file and manifest_file.exists():
            try:
                with open(manifest_file, 'r') as f:
                    data = json.load(f)
                frame_count = len(data.get('timestamps', []))
            except:
                pass
        
        info = {
            'dataset_name': 'qc_v1_dataset_converted',
            'dataset_type': 'LIDAR_FUSION_SEQUENCE',
            'description': 'Converted QC.v1 dataset for Xtreme1 - Single Scene with Sensor-based Structure',
            'scene_name': 'scene_qc_v1_sequence',
            'frames': frame_count,
            'cameras': len(self.camera_mapping) + 1,  # +1 for root directory camera
            'lidar_sensors': 1,
            'class_mapping': self.class_mapping,
            'calibration_info': {
                'has_real_calibration': self.camera_configs is not None,
                'config_source': self.config_file if self.config_file else 'default',
                'total_cameras': len(self.camera_configs) if self.camera_configs else 11
            },
            'conversion_info': {
                'source_format': 'QC.v1',
                'target_format': 'Xtreme1_Single_Scene_Sensor_Based',
                'conversion_date': '2024',
                'notes': 'Converted from QC.v1 format with sensor-based structure for single scene'
            }
        }
        
        info_file = self.output_dir / 'dataset_info.json'
        with open(info_file, 'w') as f:
            json.dump(info, f, indent=2)
        
        config_type = "Real calibration" if self.camera_configs else "Default"
        print(f"Dataset info created: {len(self.camera_mapping)+1} cameras, 1 scene, {frame_count} frames ({config_type})")

    def validate_conversion(self):
        """Validate the converted dataset"""
        print("\nValidating conversion...")
        
        errors = []
        warnings = []
        
        # Check scene directory
        scene_dir = self.output_dir / 'scene_qc_v1_sequence'
        if not scene_dir.exists():
            errors.append("Missing scene_qc_v1_sequence directory")
        else:
            print(f"✓ Found scene directory")
            
            # Check manifest file
            manifest_file = scene_dir / 'sequence_manifest.json'
            if not manifest_file.exists():
                warnings.append("Missing sequence_manifest.json in scene directory")
            else:
                print("✓ Found sequence manifest file")
            
            # Check LiDAR directory
            lidar_dir = scene_dir / 'lidar_point_cloud_0'
            if not lidar_dir.exists():
                errors.append("Missing lidar_point_cloud_0 directory")
            else:
                pcd_files = list(lidar_dir.glob('*.pcd'))
                if not pcd_files:
                    errors.append("No PCD files in lidar_point_cloud_0 directory")
                else:
                    print(f"✓ Found {len(pcd_files)} PCD files in lidar_point_cloud_0")
            
            # Check camera directories
            all_cameras = list(self.camera_mapping.values()) + ['camera_image_11']
            for cam_name in all_cameras:
                cam_dir = scene_dir / cam_name
                if not cam_dir.exists():
                    warnings.append(f"Missing camera directory: {cam_name}")
                else:
                    img_files = list(cam_dir.glob('*.jpg'))
                    if not img_files:
                        warnings.append(f"No images in {cam_name}")
                    else:
                        print(f"✓ Found {len(img_files)} images in {cam_name}")
            
            # Check camera configuration directory
            camera_config_dir = scene_dir / 'camera_config'
            if not camera_config_dir.exists():
                errors.append("Missing camera_config directory")
            else:
                config_files = list(camera_config_dir.glob('*.json'))
                if not config_files:
                    errors.append("No camera configuration files found")
                else:
                    print(f"✓ Found {len(config_files)} camera configuration files")
                    
                    # Validate that real calibration was used
                    if self.camera_configs:
                        print("✓ Using real camera calibration data")
                    else:
                        print("⚠️  Using default camera calibration data")
            
            # Check result directory
            result_dir = scene_dir / 'result'
            if not result_dir.exists():
                errors.append("Missing result directory")
            else:
                json_files = list(result_dir.glob('*.json'))
                if not json_files:
                    errors.append("No JSON files in result directory")
                else:
                    print(f"✓ Found {len(json_files)} result files")
        
        # Report results
        if errors:
            print(f"\n❌ Validation failed with {len(errors)} errors:")
            for error in errors:
                print(f"  - {error}")
        else:
            print(f"\n✅ Validation passed!")
        
        if warnings:
            print(f"\n⚠️  {len(warnings)} warnings:")
            for warning in warnings:
                print(f"  - {warning}")
        
        return len(errors) == 0

    def convert(self):
        """Main conversion process"""
        print(f"Converting QC.v1 dataset from {self.input_dir} to {self.output_dir}")
        
        if self.config_file:
            print(f"Using camera configuration from: {self.config_file}")
        else:
            print("Using default camera configurations")
        
        # Create output directory
        self.output_dir.mkdir(parents=True, exist_ok=True)
        
        # Step 1: Copy camera images
        self.copy_camera_images()
        
        # Step 2: Copy LiDAR data
        self.copy_lidar_data()
        
        # Step 3: Create camera configuration files
        self.create_camera_config()
        
        # Step 4: Convert annotations
        self.convert_annotations()
        
        # Step 5: Create dataset info
        self.create_dataset_info()
        
        # Step 6: Validate conversion
        success = self.validate_conversion()
        
        if success:
            print(f"\n🎉 Conversion completed successfully!")
            print(f"Converted dataset is ready at: {self.output_dir}")
            print(f"You can now import this dataset into Xtreme1")
            
            if self.camera_configs:
                print(f"✅ Using real camera calibration data with {len(self.camera_configs)} cameras")
            else:
                print(f"⚠️  Using default camera calibration data")
        else:
            print(f"\n❌ Conversion completed with errors. Please check the issues above.")
        
        return success

def main():
    parser = argparse.ArgumentParser(description='Convert QC.v1 dataset to Xtreme1 format')
    parser.add_argument('--input', '-i', default='QC.v1',
                       help='Input dataset directory (extracted from QC.v1.zip)')
    parser.add_argument('--output', '-o', default='qc_v1_dataset_xtreme1_converted',
                       help='Output directory for converted dataset')
    parser.add_argument('--config', '-c', default=None,
                       help='Camera configuration JSON file (generated by convert_qc_config_to_xtreme1.py)')
    
    args = parser.parse_args()
    
    if not os.path.exists(args.input):
        print(f"Error: Input directory not found: {args.input}")
        return 1
    
    if args.config and not os.path.exists(args.config):
        print(f"Error: Camera config file not found: {args.config}")
        return 1
    
    converter = QCToXtreme1Converter(args.input, args.output, args.config)
    success = converter.convert()
    
    return 0 if success else 1

if __name__ == '__main__':
    exit(main()) 