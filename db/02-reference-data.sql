-- Required reference data only. No accounts or personal data belong here.

USE `lascstudent`;

INSERT INTO `faculties` (`id`, `faculty_name`) VALUES
  (1, 'คณะศิลปศาสตร์และวิทยาศาสตร์')
ON DUPLICATE KEY UPDATE `faculty_name` = VALUES(`faculty_name`);

INSERT INTO `departments`
  (`id`, `faculty_id`, `department_id`, `department_name`, `is_active`)
VALUES
  (1,  1, 'DEPT-1',  'สาขาวิชาวิทยาการคอมพิวเตอร์', 1),
  (2,  1, 'DEPT-2',  'สาขาวิชาเทคโนโลยีคอมพิวเตอร์และดิจิทัล', 1),
  (3,  1, 'DEPT-3',  'สาขาวิชาสาธารณสุขชุมชน', 1),
  (4,  1, 'DEPT-4',  'สาขาวิชาวิทยาศาสตร์การกีฬา', 1),
  (5,  1, 'DEPT-5',  'สาขาวิชาเทคโนโลยีการเกษตร', 1),
  (6,  1, 'DEPT-6',  'สาขาวิชาเทคโนโลยีและนวัตกรรมอาหาร', 1),
  (7,  1, 'DEPT-7',  'สาขาวิชาอาชีวอนามัยและความปลอดภัย', 1),
  (8,  1, 'DEPT-8',  'สาขาวิชาวิศวกรรมซอฟต์แวร์และปัญญาประดิษฐ์', 1),
  (9,  1, 'DEPT-9',  'สาขาวิชาวิศวกรรมโลจิสติกส์', 1),
  (10, 1, 'DEPT-10', 'สาขาวิชาวิศวกรรมการจัดการอุตสาหกรรมและสิ่งแวดล้อม', 1),
  (11, 1, 'DEPT-11', 'สาขาวิชาการออกแบบผลิตภัณฑ์และนวัตกรรมวัสดุ', 1),
  (12, 1, 'DEPT-12', 'สาขาวิชาเทคโนโลยีโยธาและสถาปัตยกรรม', 1)
ON DUPLICATE KEY UPDATE
  `faculty_id` = VALUES(`faculty_id`),
  `department_id` = VALUES(`department_id`),
  `department_name` = VALUES(`department_name`),
  `is_active` = VALUES(`is_active`);
