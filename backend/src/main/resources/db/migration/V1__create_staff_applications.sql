ALTER TABLE staff_applications
ADD CONSTRAINT fk_staff_app_created_user
FOREIGN KEY (created_user_id) REFERENCES users(id);