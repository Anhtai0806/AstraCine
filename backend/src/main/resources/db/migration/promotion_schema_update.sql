-- =========================================
-- PROMOTION TABLE SCHEMA UPDATE
-- Adding Shopee-style promotion features
-- =========================================

USE astracine;

-- Add new columns to promotions table
ALTER TABLE promotions 
ADD COLUMN max_usage INT NULL COMMENT 'Maximum number of times this code can be used (NULL = unlimited)',
ADD COLUMN current_usage INT DEFAULT 0 COMMENT 'Current usage count',
ADD COLUMN description TEXT COMMENT 'Description of the promotion for admin reference',
ADD COLUMN min_order_amount DECIMAL(12,2) DEFAULT 0 COMMENT 'Minimum order amount required to use this promotion';

-- Add index for better query performance
CREATE INDEX idx_promotions_code ON promotions(code);
CREATE INDEX idx_promotions_status ON promotions(status);
CREATE INDEX idx_promotions_dates ON promotions(start_date, end_date);

-- Verify the changes
DESCRIBE promotions;
