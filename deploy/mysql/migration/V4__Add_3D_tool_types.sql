-- Add new 3D tool types to class table tool_type enum
ALTER TABLE `class` MODIFY COLUMN `tool_type` 
enum ('POLYGON','BOUNDING_BOX','POLYLINE','KEY_POINT','SEGMENTATION','CUBOID','POLYLINE_3D','POLYGON_3D','SEGMENTATION_3D') 
CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL;

-- Add new 3D tool types to dataset_class table tool_type enum  
ALTER TABLE `dataset_class` MODIFY COLUMN `tool_type` 
enum ('POLYGON','BOUNDING_BOX','POLYLINE','KEY_POINT','SEGMENTATION','CUBOID','ISS','POLYLINE_3D','POLYGON_3D','SEGMENTATION_3D') 
CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL; 