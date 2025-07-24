-- Add ISS tool type to existing enum columns
ALTER TABLE `class` MODIFY COLUMN `tool_type` 
    enum('POLYGON','BOUNDING_BOX','POLYLINE','KEY_POINT','SEGMENTATION','CUBOID','ISS') 
    CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL;

ALTER TABLE `dataset_class` MODIFY COLUMN `tool_type` 
    enum('POLYGON','BOUNDING_BOX','POLYLINE','KEY_POINT','SEGMENTATION','CUBOID','ISS') 
    CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL; 