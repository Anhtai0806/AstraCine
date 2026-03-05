USE astracine;

ALTER TABLE invoices MODIFY COLUMN staff_id BIGINT NULL;
ALTER TABLE invoices DROP COLUMN customer_id;