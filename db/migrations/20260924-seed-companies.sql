-- ============================================================
-- Seed: ข้อมูลสถานประกอบการตั้งต้น (companies)
-- รัน: mysql -u <user> -p <database> < 20260924-seed-companies.sql
-- หมายเหตุ: idempotent — ข้ามบริษัทที่มีชื่อเดียวกันอยู่แล้ว
-- ============================================================

INSERT INTO `companies` (`name`, `businessType`, `address`, `province`, `contactPerson`, `phone`, `email`, `website`, `positions`, `departments`)
SELECT * FROM (SELECT
  'บริษัท โอเล่ จำกัด' AS name,
  'ค้าปลีก/จัดจำหน่ายสินค้าอุปโภคบริโภค' AS businessType,
  'ถนนกุขัน ตำบลเมืองใต้ อำเภอเมืองศรีสะเกษ จังหวัดศรีสะเกษ 33000' AS address,
  'ศรีสะเกษ' AS province,
  'ฝ่ายทรัพยากรบุคคล' AS contactPerson,
  '045-611-234' AS phone,
  'hr@ole.co.th' AS email,
  '' AS website,
  'นักศึกษาฝึกงานฝ่ายขาย, นักศึกษาฝึกงานฝ่ายจัดซื้อ' AS positions,
  'สาขาวิชาวิทยาการคอมพิวเตอร์, สาขาวิชาเทคโนโลยีคอมพิวเตอร์และดิจิทัล' AS departments
) AS seed WHERE NOT EXISTS (SELECT 1 FROM `companies` WHERE `name` = 'บริษัท โอเล่ จำกัด');

INSERT INTO `companies` (`name`, `businessType`, `address`, `province`, `contactPerson`, `phone`, `email`, `website`, `positions`, `departments`)
SELECT * FROM (SELECT
  'บริษัท ซีพี ออลล์ จำกัด (มหาชน)' AS name,
  'ค้าปลีกสะดวกซื้อ/โลจิสติกส์' AS businessType,
  'เลขที่ 313 ซอยสีลม แขวงสีลม เขตบางรัก กรุงเทพมหานคร 10500' AS address,
  'กรุงเทพมหานคร' AS province,
  'ฝ่ายสรรหาและว่าจ้าง' AS contactPerson,
  '02-071-9000' AS phone,
  'recruit@cpall.co.th' AS email,
  'https://www.cpall.co.th' AS website,
  'นักศึกษาฝึกงาน IT Support, นักศึกษาฝึกงานระบบสารสนเทศ' AS positions,
  'สาขาวิชาวิทยาการคอมพิวเตอร์, สาขาวิชาวิศวกรรมซอฟต์แวร์และปัญญาประดิษฐ์' AS departments
) AS seed WHERE NOT EXISTS (SELECT 1 FROM `companies` WHERE `name` = 'บริษัท ซีพี ออลล์ จำกัด (มหาชน)');

INSERT INTO `companies` (`name`, `businessType`, `address`, `province`, `contactPerson`, `phone`, `email`, `website`, `positions`, `departments`)
SELECT * FROM (SELECT
  'โรงพยาบาลศรีสะเกษ' AS name,
  'สถานพยาบาล/บริการสาธารณสุข' AS businessType,
  'ถนนเลิศนิมิตร ตำบลเมืองเหนือ อำเภอเมืองศรีสะเกษ จังหวัดศรีสะเกษ 33000' AS address,
  'ศรีสะเกษ' AS province,
  'ฝ่ายทรัพยากรบุคคล' AS contactPerson,
  '045-612-000' AS phone,
  'hr@skhospital.go.th' AS email,
  'https://www.skhospital.go.th' AS website,
  'นักศึกษาฝึกงานเวชสารสนเทศ, นักศึกษาฝึกงานสาธารณสุขชุมชน' AS positions,
  'สาขาวิชาสาธารณสุขชุมชน, สาขาวิชาอาชีวอนามัยและความปลอดภัย' AS departments
) AS seed WHERE NOT EXISTS (SELECT 1 FROM `companies` WHERE `name` = 'โรงพยาบาลศรีสะเกษ');

INSERT INTO `companies` (`name`, `businessType`, `address`, `province`, `contactPerson`, `phone`, `email`, `website`, `positions`, `departments`)
SELECT * FROM (SELECT
  'บริษัท ไทยวาโก้ จำกัด (มหาชน)' AS name,
  'ผลิตเครื่องแต่งกาย/สิ่งทอ' AS businessType,
  'เลขที่ 132 ถนนเพชรเกษม ตำบลบางขุนเทียน เขตจอมทอง กรุงเทพมหานคร 10150' AS address,
  'กรุงเทพมหานคร' AS province,
  'ฝ่ายทรัพยากรบุคคล' AS contactPerson,
  '02-476-6126' AS phone,
  'hr@thaiwacoal.co.th' AS email,
  'https://www.wacoal.co.th' AS website,
  'นักศึกษาฝึกงานวางผังการผลิต, นักศึกษาฝึกงานออกแบบผลิตภัณฑ์' AS positions,
  'สาขาวิชาวิศวกรรมการจัดการอุตสาหกรรมและสิ่งแวดล้อม, สาขาวิชาการออกแบบผลิตภัณฑ์และนวัตกรรมวัสดุ' AS departments
) AS seed WHERE NOT EXISTS (SELECT 1 FROM `companies` WHERE `name` = 'บริษัท ไทยวาโก้ จำกัด (มหาชน)');

INSERT INTO `companies` (`name`, `businessType`, `address`, `province`, `contactPerson`, `phone`, `email`, `website`, `positions`, `departments`)
SELECT * FROM (SELECT
  'บริษัท ข้าวตราฉัตร จำกัด' AS name,
  'แปรรูปและจำหน่ายข้าว/เกษตร' AS businessType,
  'เลขที่ 88 หมู่ 4 ตำบลหนองแค อำเภอหนองแค จังหวัดสระบุรี 18140' AS address,
  'สระบุรี' AS province,
  'ฝ่ายบุคคล' AS contactPerson,
  '036-373-000' AS phone,
  'hr@khaotra.com' AS email,
  '' AS website,
  'นักศึกษาฝึกงานควบคุมคุณภาพ, นักศึกษาฝึกงานเทคโนโลยีการเกษตร' AS positions,
  'สาขาวิชาเทคโนโลยีการเกษตร, สาขาวิชาเทคโนโลยีและนวัตกรรมอาหาร' AS departments
) AS seed WHERE NOT EXISTS (SELECT 1 FROM `companies` WHERE `name` = 'บริษัท ข้าวตราฉัตร จำกัด');

INSERT INTO `companies` (`name`, `businessType`, `address`, `province`, `contactPerson`, `phone`, `email`, `website`, `positions`, `departments`)
SELECT * FROM (SELECT
  'บริษัท อีสานไอที โซลูชั่น จำกัด' AS name,
  'พัฒนาซอฟต์แวร์/บริการไอที' AS businessType,
  'เลขที่ 55 ถนนอุบล ตำบลในเมือง อำเภอเมืองอุบลราชธานี จังหวัดอุบลราชธานี 34000' AS address,
  'อุบลราชธานี' AS province,
  'คุณสมชาย ใจดี' AS contactPerson,
  '045-255-678' AS phone,
  'contact@isanit.co.th' AS email,
  '' AS website,
  'นักศึกษาฝึกงานพัฒนาเว็บแอปพลิเคชัน, นักศึกษาฝึกงานระบบเครือข่าย' AS positions,
  'สาขาวิชาวิทยาการคอมพิวเตอร์, สาขาวิชาวิศวกรรมซอฟต์แวร์และปัญญาประดิษฐ์, สาขาวิชาเทคโนโลยีคอมพิวเตอร์และดิจิทัล' AS departments
) AS seed WHERE NOT EXISTS (SELECT 1 FROM `companies` WHERE `name` = 'บริษัท อีสานไอที โซลูชั่น จำกัด');

INSERT INTO `companies` (`name`, `businessType`, `address`, `province`, `contactPerson`, `phone`, `email`, `website`, `positions`, `departments`)
SELECT * FROM (SELECT
  'การไฟฟ้าส่วนภูมิภาค สาขาศรีสะเกษ' AS name,
  'สาธารณูปโภค/พลังงานไฟฟ้า' AS businessType,
  'ถนนหลวงพรหม ตำบลเมืองเหนือ อำเภอเมืองศรีสะเกษ จังหวัดศรีสะเกษ 33000' AS address,
  'ศรีสะเกษ' AS province,
  'ฝ่ายบริหารทั่วไป' AS contactPerson,
  '045-611-900' AS phone,
  'sisaket@pea.co.th' AS email,
  'https://www.pea.co.th' AS website,
  'นักศึกษาฝึกงานระบบสารสนเทศ, นักศึกษาฝึกงานงานโยธา' AS positions,
  'สาขาวิชาวิทยาการคอมพิวเตอร์, สาขาวิชาเทคโนโลยีโยธาและสถาปัตยกรรม' AS departments
) AS seed WHERE NOT EXISTS (SELECT 1 FROM `companies` WHERE `name` = 'การไฟฟ้าส่วนภูมิภาค สาขาศรีสะเกษ');

INSERT INTO `companies` (`name`, `businessType`, `address`, `province`, `contactPerson`, `phone`, `email`, `website`, `positions`, `departments`)
SELECT * FROM (SELECT
  'บริษัท ไปรษณีย์ไทย จำกัด ศูนย์คัดแยกศรีสะเกษ' AS name,
  'โลจิสติกส์/ขนส่งพัสดุ' AS businessType,
  'ถนนเทพา ตำบลเมืองใต้ อำเภอเมืองศรีสะเกษ จังหวัดศรีสะเกษ 33000' AS address,
  'ศรีสะเกษ' AS province,
  'ผู้จัดการศูนย์คัดแยก' AS contactPerson,
  '045-614-500' AS phone,
  'sisaket@thailandpost.co.th' AS email,
  'https://www.thailandpost.co.th' AS website,
  'นักศึกษาฝึกงานจัดการโลจิสติกส์' AS positions,
  'สาขาวิชาวิศวกรรมโลจิสติกส์' AS departments
) AS seed WHERE NOT EXISTS (SELECT 1 FROM `companies` WHERE `name` = 'บริษัท ไปรษณีย์ไทย จำกัด ศูนย์คัดแยกศรีสะเกษ');

INSERT INTO `companies` (`name`, `businessType`, `address`, `province`, `contactPerson`, `phone`, `email`, `website`, `positions`, `departments`)
SELECT * FROM (SELECT
  'บริษัท เอสซีจี เซรามิกส์ จำกัด' AS name,
  'ผลิตเซรามิก/วัสดุก่อสร้าง' AS businessType,
  'นิคมอุตสาหกรรมลำพูน ตำบลมาบยางพร อำเภอปลวกแดง จังหวัดระยอง 21140' AS address,
  'ระยอง' AS province,
  'ฝ่ายทรัพยากรบุคคล' AS contactPerson,
  '038-955-000' AS phone,
  'hr@scgceramics.com' AS email,
  'https://www.scgceramics.com' AS website,
  'นักศึกษาฝึกงานนวัตกรรมวัสดุ, นักศึกษาฝึกงานวิศวกรรมอุตสาหกรรม' AS positions,
  'สาขาวิชาการออกแบบผลิตภัณฑ์และนวัตกรรมวัสดุ, สาขาวิชาวิศวกรรมการจัดการอุตสาหกรรมและสิ่งแวดล้อม' AS departments
) AS seed WHERE NOT EXISTS (SELECT 1 FROM `companies` WHERE `name` = 'บริษัท เอสซีจี เซรามิกส์ จำกัด');

INSERT INTO `companies` (`name`, `businessType`, `address`, `province`, `contactPerson`, `phone`, `email`, `website`, `positions`, `departments`)
SELECT * FROM (SELECT
  'เทศบาลเมืองศรีสะเกษ' AS name,
  'องค์กรปกครองส่วนท้องถิ่น/งานราชการ' AS businessType,
  'ถนนอุบล ตำบลเมืองเหนือ อำเภอเมืองศรีสะเกษ จังหวัดศรีสะเกษ 33000' AS address,
  'ศรีสะเกษ' AS province,
  'ฝ่ายการเจ้าหน้าที่' AS contactPerson,
  '045-611-100' AS phone,
  'office@sisaketcity.go.th' AS email,
  'https://www.sisaketcity.go.th' AS website,
  'นักศึกษาฝึกงานธุรการ, นักศึกษาฝึกงานโยธา, นักศึกษาฝึกงานสาธารณสุข' AS positions,
  'สาขาวิชาเทคโนโลยีโยธาและสถาปัตยกรรม, สาขาวิชาสาธารณสุขชุมชน, สาขาวิชาวิทยาการคอมพิวเตอร์' AS departments
) AS seed WHERE NOT EXISTS (SELECT 1 FROM `companies` WHERE `name` = 'เทศบาลเมืองศรีสะเกษ');
