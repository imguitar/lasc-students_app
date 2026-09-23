-- Script สำหรับตั้งค่ารหัสผ่านบัญชีทดสอบในเครื่อง Localhost
-- รหัสผ่านเริ่มต้นคือ: password123
-- Hash: $2a$10$OBZ.UMFG.QGMhJVl7DAyXeMTzRbA/MkTKGNtjduEm/8mPo/kloiiO

USE `lascstudent`;

UPDATE `user`
SET `password` = '$2a$10$OBZ.UMFG.QGMhJVl7DAyXeMTzRbA/MkTKGNtjduEm/8mPo/kloiiO'
WHERE `username` <> '6610014111';
