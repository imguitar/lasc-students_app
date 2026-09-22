-- phpMyAdmin SQL Dump
-- version 5.2.1deb3
-- https://www.phpmyadmin.net/
--
-- Host: localhost:3306
-- Generation Time: Sep 16, 2026 at 10:28 AM
-- Server version: 8.0.46-0ubuntu0.24.04.4
-- PHP Version: 8.3.6

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `lascstudent`
--

-- --------------------------------------------------------

--
-- Table structure for table `advisor_evaluations`
--

CREATE TABLE `advisor_evaluations` (
  `id` int NOT NULL,
  `requestId` int NOT NULL,
  `advisorName` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `c1` int DEFAULT NULL,
  `c2` int DEFAULT NULL,
  `c3` int DEFAULT NULL,
  `c4` int DEFAULT NULL,
  `c5` int DEFAULT NULL,
  `c6` int DEFAULT NULL,
  `c7` int DEFAULT NULL,
  `c8` int DEFAULT NULL,
  `c9` int DEFAULT NULL,
  `c10` int DEFAULT NULL,
  `c11` int DEFAULT NULL,
  `c12` int DEFAULT NULL,
  `c13` int DEFAULT NULL,
  `c14` int DEFAULT NULL,
  `c15` int DEFAULT NULL,
  `c16` int DEFAULT NULL,
  `c17` int DEFAULT NULL,
  `companyComments` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `s1` int DEFAULT NULL,
  `s2` int DEFAULT NULL,
  `s3` int DEFAULT NULL,
  `s4` int DEFAULT NULL,
  `s5` int DEFAULT NULL,
  `s6` int DEFAULT NULL,
  `s7` int DEFAULT NULL,
  `s8` int DEFAULT NULL,
  `s9` int DEFAULT NULL,
  `s10` int DEFAULT NULL,
  `s11` int DEFAULT NULL,
  `s12` int DEFAULT NULL,
  `s13` int DEFAULT NULL,
  `s14` int DEFAULT NULL,
  `s15` int DEFAULT NULL,
  `s16` int DEFAULT NULL,
  `s17` int DEFAULT NULL,
  `s18` int DEFAULT NULL,
  `s19` int DEFAULT NULL,
  `s20` int DEFAULT NULL,
  `studentComments` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `alumni_employments`
--

CREATE TABLE `alumni_employments` (
  `id` int NOT NULL,
  `profile_id` varchar(13) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `company_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `position` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `department` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `job_type` enum('full_time','part_time','contract','freelance','internship') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'full_time',
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `is_current` tinyint(1) NOT NULL DEFAULT '1',
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `location` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `company_url` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `announcements`
--

CREATE TABLE `announcements` (
  `id` int NOT NULL,
  `title` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `content` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `category` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'ทั่วไป',
  `coverImage` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `is_pinned` tinyint(1) DEFAULT '0',
  `is_active` tinyint(1) DEFAULT '1',
  `author` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `announcements`
--

INSERT INTO `announcements` (`id`, `title`, `content`, `category`, `coverImage`, `is_pinned`, `is_active`, `author`, `created_at`, `updated_at`) VALUES
(1, 'เปิดรับสมัครฝึกงานประจำปี 2569', 'ขอให้นักศึกษาทุกคนตรวจสอบสถานประกอบการที่เปิดรับสมัคร', 'รับสมัคร', NULL, 1, 1, 'admin', '2026-08-12 18:20:50', '2026-08-12 18:20:50'),
(2, 'เปิดรับสมัครฝึกงานประจำปี 2569', 'ขอให้นักศึกษาทุกคนตรวจสอบสถานประกอบการที่เปิดรับสมัคร', 'รับสมัคร', NULL, 1, 1, 'admin', '2026-08-12 18:21:17', '2026-08-12 18:21:17'),
(3, 'เปิดรับสมัครฝึกงานประจำปี 2569', 'ขอให้นักศึกษาทุกคนตรวจสอบสถานประกอบการที่เปิดรับสมัคร', 'รับสมัคร', NULL, 1, 1, 'admin', '2026-08-12 18:36:50', '2026-08-12 18:36:50'),
(4, 'เปิดรับสมัครฝึกงานประจำปี 2569', 'ขอให้นักศึกษาทุกคนตรวจสอบสถานประกอบการที่เปิดรับสมัคร', 'รับสมัคร', NULL, 1, 1, 'admin', '2026-08-12 18:42:00', '2026-08-12 18:42:00'),
(5, 'เปิดรับสมัครฝึกงานประจำปี 2569', 'ขอให้นักศึกษาทุกคนตรวจสอบสถานประกอบการที่เปิดรับสมัคร', 'รับสมัคร', NULL, 1, 1, 'admin', '2026-08-12 18:46:28', '2026-08-12 18:46:28');

-- --------------------------------------------------------

--
-- Table structure for table `companies`
--

CREATE TABLE `companies` (
  `id` int NOT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `businessType` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `address` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `province` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `contactPerson` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `phone` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `email` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `website` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `positions` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `benefits` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `imageUrl` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `note` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `department` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `departments` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `companies`
--

INSERT INTO `companies` (`id`, `name`, `businessType`, `address`, `province`, `contactPerson`, `phone`, `email`, `website`, `positions`, `benefits`, `imageUrl`, `note`, `created_at`, `updated_at`, `department`, `departments`) VALUES
(3, 'บริษัท สยาม ซอฟต์แวร์ อินโนเวชั่น จำกัด', 'พัฒนาซอฟต์แวร์และ AI', '123 อาคารสยามทาวเวอร์ ถ.พหลโยธิน แขวงพญาไท', 'กรุงเทพมหานคร', 'คุณธนภัทร ใจดี (ฝ่ายทรัพยากรบุคคล)', '02-999-8888', 'hr@siamsoftware.co.th', 'https://siamsoftware.co.th', 'Frontend Developer, Backend Developer, AI Engineer', 'เบี้ยเลี้ยง 400 บาท/วัน มีโน้ตบุ๊กสำหรับทำงาน และเงินพิเศษตามผลงาน', NULL, 'เปิดรับนักศึกษาฝึกงานตลอดทั้งปี บรรยากาศการทำงานแบบมืออาชีพ', '2026-08-26 11:04:24', '2026-08-26 11:04:24', NULL, NULL),
(4, 'ศูนย์เทคโนโลยีและการเกษตรดิจิทัล ศรีสะเกษ', 'เทคโนโลยีการเกษตรและ IoT', '99 หมู่ 2 ต.หนองครก อ.เมือง', 'ศรีสะเกษ', 'คุณวิภาดา มั่นคง', '045-678-901', 'contact@ssktech.go.th', 'https://ssktech.go.th', 'IoT Specialist, Web Developer, Graphic & Media', 'มีอาหารกลางวันฟรี และเบี้ยเลี้ยงรายเดือน 3,000 บาท', NULL, 'ยินดีต้อนรับนักศึกษาคณะศิลปศาสตร์และวิทยาศาสตร์ มรภ.ศรีสะเกษ', '2026-08-26 11:04:24', '2026-08-26 11:04:24', NULL, NULL),
(5, 'โรงพยาบาลส่งเสริมสุขภาพและเวชศาสตร์ชุมชน', 'บริการสุขภาพและสาธารณสุข', '456 ถ.แจ้งสนิท ต.ในเมือง อ.เมือง', 'อุบลราชธานี', 'นพ.สมศักดิ์ บริการดี', '045-123-456', 'health@ubonhospital.go.th', 'https://ubonhospital.go.th', 'นักวิชาการสาธารณสุข, เจ้าหน้าที่เวชสถิติ, ข้อมูลและสารสนเทศ', 'มีหอพักบุคลากรให้ และเบี้ยเลี้ยงพิเศษ', NULL, 'เน้นการฝึกปฏิบัติงานจริงในชุมชนและการดูแลสุขภาพ', '2026-08-26 11:04:24', '2026-08-26 11:04:24', NULL, NULL),
(6, 'บริษัท ดิจิทัล มีเดีย ครีเอทีฟ จำกัด', 'ออกแบบและผลิตสื่อดิจิทัล', '789 ถ.สุขุมวิท แขวงคลองเตยเหนือ เขตวัฒนา', 'กรุงเทพมหานคร', 'คุณกิตติศักดิ์ พัฒนา', '02-345-6789', 'jobs@digitalmedia.co.th', 'https://digitalmedia.co.th', 'UX/UI Designer, Motion Graphic, Content Creator', 'มีเครื่อง Mac ให้ใช้งาน และค่าเดินทาง 250 บาท/วัน', NULL, 'รับนักศึกษาที่มีความคิดสร้างสรรค์และพร้อมเรียนรู้งานจริง', '2026-08-26 11:04:24', '2026-08-26 11:04:24', NULL, NULL),
(7, 'บริษัท ไอที โซลูชั่นส์ จำกัด', 'พัฒนาซอฟต์แวร์และไอที', '123/45 ถ.วิภาวดีรังสิต', 'กรุงเทพมหานคร', 'คุณสมชาย ใจดี', '02-123-4567', 'hr@itsolutions.co.th', 'https://itsolutions.co.th', 'Software Engineer / Web Developer', 'มีเบี้ยเลี้ยงรายวัน / มีโน้ตบุ๊กให้', NULL, 'เปิดรับตลอดทั้งปี', '2026-08-26 11:26:31', '2026-08-26 11:26:31', NULL, NULL),
(8, 'ศูนย์เทคโนโลยีศรีสะเกษ', 'บริการดิจิทัลและเน็ตเวิร์ก', '99 หมู่ 2 ต.หนองครก', 'ศรีสะเกษ', 'คุณวิภาดา มั่นคง', '045-678-901', 'contact@ssktech.go.th', NULL, 'Network Admin / Graphic Design', 'มีอาหารกลางวัน', NULL, 'รับสมัครเทอม 2', '2026-08-26 11:26:31', '2026-08-26 11:26:31', NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `daily_checkins`
--

CREATE TABLE `daily_checkins` (
  `id` int NOT NULL,
  `studentId` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `studentName` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `date` date NOT NULL,
  `status` enum('present','late','absent') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'present',
  `note` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `work_experience` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `supervisor_signature` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `supervisor_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `supervisor_comment` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `departments`
--

CREATE TABLE `departments` (
  `id` int NOT NULL,
  `faculty_id` int NOT NULL,
  `department_name` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `department_id` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `department_head_id` int DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `departments`
--

INSERT INTO `departments` (`id`, `faculty_id`, `department_name`, `department_id`, `is_active`, `department_head_id`, `created_at`, `updated_at`) VALUES
(1, 1, 'สาขาวิชาวิทยาการคอมพิวเตอร์', 'DEPT-1', 1, NULL, '2026-08-26 16:09:32.000', '2026-08-26 16:09:32.000'),
(2, 1, 'สาขาวิชาเทคโนโลยีคอมพิวเตอร์และดิจิทัล', 'DEPT-2', 1, NULL, '2026-08-26 16:09:32.000', '2026-08-26 16:09:32.000'),
(3, 1, 'สาขาวิชาสาธารณสุขชุมชน', 'DEPT-3', 1, NULL, '2026-08-26 16:09:32.000', '2026-08-26 16:09:32.000'),
(4, 1, 'สาขาวิชาวิทยาศาสตร์การกีฬา', 'DEPT-4', 1, NULL, '2026-08-26 16:09:32.000', '2026-08-26 16:09:32.000'),
(5, 1, 'สาขาวิชาเทคโนโลยีการเกษตร', 'DEPT-5', 1, NULL, '2026-08-26 16:09:32.000', '2026-08-26 16:09:32.000'),
(6, 1, 'สาขาวิชาเทคโนโลยีและนวัตกรรมอาหาร', 'DEPT-6', 1, NULL, '2026-08-26 16:09:32.000', '2026-08-26 16:09:32.000'),
(7, 1, 'สาขาวิชาอาชีวอนามัยและความปลอดภัย', 'DEPT-7', 1, NULL, '2026-08-26 16:09:32.000', '2026-08-26 16:09:32.000'),
(8, 1, 'สาขาวิชาวิศวกรรมซอฟต์แวร์และปัญญาประดิษฐ์', 'DEPT-8', 1, NULL, '2026-08-26 16:09:32.000', '2026-08-26 16:09:32.000'),
(9, 1, 'สาขาวิชาวิศวกรรมโลจิสติกส์', 'DEPT-9', 1, NULL, '2026-08-26 16:09:32.000', '2026-08-26 16:09:32.000'),
(10, 1, 'สาขาวิชาวิศวกรรมการจัดการอุตสาหกรรมและสิ่งแวดล้อม', 'DEPT-10', 1, NULL, '2026-08-26 16:09:32.000', '2026-08-26 16:09:32.000'),
(11, 1, 'สาขาวิชาการออกแบบผลิตภัณฑ์และนวัตกรรมวัสดุ', 'DEPT-11', 1, NULL, '2026-08-26 16:09:32.000', '2026-08-26 16:09:32.000'),
(12, 1, 'สาขาวิชาเทคโนโลยีโยธาและสถาปัตยกรรม', 'DEPT-12', 1, NULL, '2026-08-26 16:09:32.000', '2026-08-26 16:09:32.000');

-- --------------------------------------------------------

--
-- Table structure for table `evaluations`
--

CREATE TABLE `evaluations` (
  `id` int NOT NULL,
  `requestId` int NOT NULL,
  `studentId` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `evaluatorName` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `evaluatorPosition` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `evaluatorDepartment` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `q1` int DEFAULT NULL,
  `q2` int DEFAULT NULL,
  `q3` int DEFAULT NULL,
  `q4` int DEFAULT NULL,
  `q5` int DEFAULT NULL,
  `q6` int DEFAULT NULL,
  `q7` int DEFAULT NULL,
  `q8` int DEFAULT NULL,
  `q9` int DEFAULT NULL,
  `q10` int DEFAULT NULL,
  `q11` int DEFAULT NULL,
  `q12` int DEFAULT NULL,
  `q13` int DEFAULT NULL,
  `q14` int DEFAULT NULL,
  `q15` int DEFAULT NULL,
  `q16` int DEFAULT NULL,
  `q17` int DEFAULT NULL,
  `q18` int DEFAULT NULL,
  `q19` int DEFAULT NULL,
  `q20` int DEFAULT NULL,
  `strengths` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `improvements` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `hireFuture` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `overallScore` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `projectUsage` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `otherComments` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `signature` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `evaluation_rounds`
--

CREATE TABLE `evaluation_rounds` (
  `id` int NOT NULL,
  `title` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `academicYear` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `semester` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `startDate` date NOT NULL,
  `endDate` date NOT NULL,
  `isActive` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `faculties`
--

CREATE TABLE `faculties` (
  `id` int NOT NULL,
  `faculty_name` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `faculties`
--

INSERT INTO `faculties` (`id`, `faculty_name`) VALUES
(1, 'คณะศิลปศาสตร์และวิทยาศาสตร์');

-- --------------------------------------------------------

--
-- Table structure for table `internships`
--

CREATE TABLE `internships` (
  `id` int NOT NULL,
  `profile_id` varchar(13) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `company_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `position` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `department` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `hours` int DEFAULT '0',
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `skills_used` json DEFAULT NULL,
  `evaluation_score` double DEFAULT NULL,
  `evaluation_status` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `status` enum('in_progress','completed','cancelled') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'in_progress',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `payment_proofs`
--

CREATE TABLE `payment_proofs` (
  `id` int NOT NULL,
  `studentId` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `studentName` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `date` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('pending','approved','rejected') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `department` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `slipDataUrl` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `slipFileName` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `profile`
--

CREATE TABLE `profile` (
  `id` int NOT NULL,
  `profile_id` varchar(13) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `firstname` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `lastname` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `faculty_id` int NOT NULL,
  `department_id` int NOT NULL,
  `address` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `prefix` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `first_name_en` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `last_name_en` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `birth_date` date DEFAULT NULL,
  `avatar_url` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `bio` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `graduation_year` int DEFAULT NULL,
  `linkedin_url` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `github_url` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `portfolio_url` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `graduation_batch` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `graduation_date` date DEFAULT NULL,
  `student_status` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'active'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `profile`
--

INSERT INTO `profile` (`id`, `profile_id`, `firstname`, `lastname`, `faculty_id`, `department_id`, `address`, `prefix`, `phone`, `first_name_en`, `last_name_en`, `birth_date`, `avatar_url`, `bio`, `graduation_year`, `linkedin_url`, `github_url`, `portfolio_url`, `graduation_batch`, `graduation_date`, `student_status`) VALUES
(1, 'AD005', 'ทองปักษ์', 'ดอนประจำ', 1, 3, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(2, 'AD004', 'อนุพันธ์', 'สุวรรณพันธ์', 1, 3, NULL, 'ดร.', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(3, 'AD003', 'ไมยรา', 'เศรษฐมาศ', 1, 3, NULL, 'ดร.', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(4, 'AD001', 'วิรยา', 'บุญรินทร์', 1, 3, NULL, 'ผศ.', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(5, 'AD002', 'กฤษฎารัตน์', 'ลีเขาสูง', 1, 3, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(6, 'AD006', 'ปราณี', 'ศรีบุญเรือง', 1, 3, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(7, 'AD008', 'กวิสทรารินทร์', 'คะณะพันธ์', 1, 3, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(8, 'AD007', 'ธนะพัฒน์', 'ทักษิณทร์', 1, 3, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(9, 'AD009', 'กาญจนา', 'แซ่อึง', 1, 3, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(10, 'AD010', 'วิพา', 'ชุปวา', 1, 3, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(11, 'AD012', 'อัฐพร', 'กิ่งบู', 1, 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(12, 'AD011', 'ภาภรณ์', 'เหล่าพิลัย', 1, 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(13, 'AD014', 'ธีรพงศ์', 'สงผัด', 1, 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(14, 'AD013', 'พัฒนพงษ์', 'โพธิ์ปัสสา', 1, 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(15, 'AD015', 'จุฑามณี', 'รุ้งแก้ว', 1, 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(16, 'AD020', 'กริชบดินทร์', 'ผิวหอม', 1, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(17, 'AD016', 'เจษฎา', 'ชาตรี', 1, 1, NULL, 'ดร.', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(18, 'AD019', 'กนิษฐา', 'อินธิชิต', 1, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(19, 'AD018', 'พิศาล', 'สุขขี', 1, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(20, 'AD017', 'อุรารัตน์', 'แก้วดวงงาม', 1, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(21, 'AD023', 'พิศาล', 'สมบัติวงค์', 1, 10, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(22, 'AD025', 'ณัฐวุฒิ', 'พลศรี', 1, 10, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(23, 'AD024', 'อนุวัฒน์', 'ศรีสุวรรณ์', 1, 10, NULL, 'ดร.', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(24, 'AD021', 'อรทัย', 'จำปาใด', 1, 10, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(25, 'AD022', 'กนกกาญจน์', 'จิรศิริเลิศ', 1, 10, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(26, 'AD027', 'เชี่ยวชาญ', 'แสงทอง', 1, 11, NULL, 'ดร.', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(27, 'AD028', 'เมธี', 'ไชยหา', 1, 11, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(28, 'AD030', 'วรรธนะ', 'พงษ์เสนา', 1, 8, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(29, 'AD026', 'นรพล', 'รามฤทธิ์', 1, 11, NULL, 'ดร.', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(30, 'AD029', 'ปณต', 'นวลใส', 1, 11, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(31, 'AD031', 'ชนินทร', 'เรืองอุดมสกุล', 1, 8, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(32, 'AD032', 'ปฏิมากร', 'จริยฐิติพงศ์', 1, 8, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(33, 'AD033', 'ภาคภูมิ', 'ชินพฤทธิวงศ์', 1, 8, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(34, 'AD034', 'ศุภชัย', 'ทองสุข', 1, 8, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(35, 'AD035', 'เตชภณ', 'ทองเติม', 1, 4, NULL, 'ดร.', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(36, 'AD036', 'ขนิษฐา', 'ฉิมพาลี', 1, 4, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(37, 'AD037', 'วารี', 'นันทสิงห์', 1, 4, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(38, 'AD038', 'นันท์ชนก', 'เปียแก้ว', 1, 4, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(39, 'AD039', 'ศิรินันท์', 'รามฤทธิ์', 1, 4, NULL, 'ดร.', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(40, 'AD040', 'อธิวัฒน์', 'สายทอง', 1, 4, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(41, 'AD041', 'พงศธร', 'ทวีธนวาณิชย์', 1, 10, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(42, 'AD045', 'ทัย', 'กาบบัว', 1, 10, NULL, 'ดร.', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(43, 'AD042', 'สิริพร', 'ยศแสน', 1, 10, NULL, 'ผศ.ดร.', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(44, 'AD044', 'อภิญญา', 'ธิปเทศ', 1, 10, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(45, 'AD043', 'พัชรวรรณ', 'สิทธิศาสตร์', 1, 10, NULL, 'ดร.', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(46, 'AD047', 'ณัฐกร', 'โต๊ะสิงห์', 1, 9, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(47, 'AD049', 'ณัฏฐ์พัชร์', 'วณิชย์กุล', 1, 9, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(48, 'AD048', 'ทิพย์สุดา', 'กุมผัน', 1, 9, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(49, 'AD046', 'ชูวิทย์', 'นาเพีย', 1, 9, NULL, 'ดร.', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(50, 'AD050', 'โชติรส', 'นพพลกรัง', 1, 9, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(51, 'AD052', 'นิโรธ', 'ศรีมันตะ', 1, 12, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(52, 'AD053', 'วรายุทธ', 'อินอร่าม', 1, 12, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(53, 'AD051', 'เดชณรงค์', 'วนสันเทียะ', 1, 12, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(54, 'AD054', 'โชคชัย', 'ไตรยสุทธิ์', 1, 12, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(55, 'AD055', 'ภูมิเกียรติ', 'สว่างวงศ์', 1, 12, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(56, 'AD057', 'พนารัตน์', 'สังข์อินทร์', 1, 6, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(57, 'AD059', 'ธนวรรณ', 'อวยศักดิ์ไชยงค์', 1, 6, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(58, 'AD058', 'จิรายุ', 'มุสิกา', 1, 6, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(59, 'AD060', 'จิรนันต์', 'รัตสีวอ', 1, 6, NULL, 'ดร.', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(60, 'AD056', 'จีระนันท์', 'วงศ์วทัญญู', 1, 6, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(61, 'AD062', 'ราชิต', 'เพ็งสีแสง', 1, 5, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(62, 'AD064', 'วิมลศิริ', 'สีหะวงษ์', 1, 5, NULL, 'ดร.', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(63, 'AD061', 'ดวงจันทร์', 'โพธิสาร', 1, 5, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(64, 'AD065', 'ณัฎฐิยา', 'เกื้อทาน', 1, 5, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(65, 'AD063', 'สายัณห์', 'สืบผาง', 1, 5, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(66, '6917796101', 'ชัยภูมิพัฒน์', 'สารติ', 1, 7, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(67, '6917796106', 'ลัทธพล', 'หล้าพา', 1, 7, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(68, '6917796105', 'ระพีภัทร', 'วันทาพงษ์', 1, 7, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(69, '6917796102', 'ธนัช', 'แพจั่น', 1, 7, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(70, '6917796103', 'พัชรพล', 'ดุษฎีวิมล', 1, 7, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(71, '6917796107', 'วรชาติ', 'เพชรไทย', 1, 7, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(72, '6917796104', 'พีรพัฒน์', 'บุญขันธ์', 1, 7, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(73, '6917796108', 'อดิเทพ', 'บุญเพ็ง', 1, 7, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(74, '6917796109', 'อนุพัฒน์', 'แปลงกาย', 1, 7, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(75, '6917796110', 'กานต์พิชชา', 'คำศรี', 1, 7, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(76, '6917796111', 'กุลกัลญา', 'ทาระ', 1, 7, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(77, '6917796113', 'ชลธิชา', 'ช้ำเกตุ', 1, 7, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(78, '6917796115', 'ณัฐพัชร์', 'โคตรชัย', 1, 7, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(79, '6917796112', 'จันทร์จิรา', 'จันทร์นวม', 1, 7, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(80, '6917796114', 'ชุติมา', 'ยอดอ่อน', 1, 7, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(81, '6917796116', 'ธัญชนก', 'บัวคำศรี', 1, 7, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(82, '6917796117', 'ธีนิดา', 'จังอินทร์', 1, 7, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(83, '6917796118', 'นภัสสร', 'มอมประโคน', 1, 7, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(84, '6917796119', 'นัฐธิดา', 'มั่นยืน', 1, 7, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(85, '6917796120', 'นันทพร', 'น้ำพลอย', 1, 7, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(86, '6917796121', 'เบญญาภา', 'สมแสน', 1, 7, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(87, '6917796123', 'ปวันรัตน์', 'สีหะวงษ์', 1, 7, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(88, '6917796122', 'ปพิชญา', 'สิงพวง', 1, 7, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(89, '6917796125', 'เปรมจิตร', 'จันทร์เพ็ญมงคล', 1, 7, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(90, '6917796126', 'พรชิตา', 'สุขจันทร์', 1, 7, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(91, '6917796124', 'ปาริชาติ', 'เพียพยัคฆ์', 1, 7, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(92, '6917796127', 'ภูวิตา', 'แสงกล้า', 1, 7, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(93, '6917796128', 'รวิพร', 'ผ่านพรม', 1, 7, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(94, '6917796129', 'รัตน์ฑิกาญจน์', 'เจริญศิลป์', 1, 7, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(95, '6917796130', 'วรรณวิภา', 'อินทร์แก้ว', 1, 7, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(96, '6917796131', 'วิณัฐตา', 'ดาวใส', 1, 7, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(97, '6917796132', 'ศิรินทร์ทิพย์', 'พิพิธศาลา', 1, 7, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(98, '6917796133', 'สรัลพร', 'สุทธิเสน', 1, 7, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(99, '6917796134', 'สริญญา', 'เสือขำ', 1, 7, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(100, '6917796135', 'สุธานัน', 'มาลัยทอง', 1, 7, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(101, '6917796136', 'สุธิตา', 'ไชยมาศ', 1, 7, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(102, '6917796137', 'หทัยชนก', 'บุญใหญ่', 1, 7, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(103, '6917796138', 'อภิญญา', 'สายเสน', 1, 7, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(104, '6917796139', 'อภิสรา', 'สายพงษ์', 1, 7, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(105, '6917796140', 'อรอนงค์', 'สมาคม', 1, 7, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(106, '6917796141', 'อริษรา', 'งิ้วโสม', 1, 7, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(107, '6917796145', 'กันณพงศ์', 'สุทธสน', 1, 7, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(108, '6917796143', 'กมลฉัตร', 'กองปัด', 1, 7, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(109, '6917796144', 'ลัดดาวัลย์', 'บุญรักษา', 1, 7, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(110, '6917796142', 'อุทัยวดี', 'เสน่ห์วงษ์', 1, 7, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(111, '6917796146', 'กรพินธุ์', 'บุญส่ง', 1, 7, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(112, '6917796147', 'พนิตธิดา', 'อุตพันธ์', 1, 7, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(113, '6917796148', 'อนงค์นาฎ', 'จันตะ', 1, 7, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(114, '6915964201', 'จักริน', 'ศิริพันธ์', 1, 12, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(115, '6915964202', 'นพอนันต์', 'ยืนยง', 1, 12, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(116, '6915964204', 'ขวัญฤดี', 'ภาเภา', 1, 12, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(117, '6915964205', 'ทัดดาว', 'ศรีพูล', 1, 12, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(118, '6915964206', 'นภาภรณ์', 'ดวนใหญ่', 1, 12, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(119, '6915964203', 'ปรเมศวร์', 'สุลาเลิศ', 1, 12, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(120, '6915964208', 'ปรียาภัทร', 'อินสนอง', 1, 12, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(121, '6915964207', 'นลินี', 'ฤทธิ์เดช', 1, 12, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(122, '6915964101', 'กิจติพัฒน์', 'ทัดแก้ว', 1, 12, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(123, '6915964209', 'รุจิราภรณ์', 'จันทำ', 1, 12, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(124, '6915964104', 'ไทวกฤต', 'แสงฤทธิ์', 1, 12, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(125, '6915964103', 'เจษฎาภรณ์', 'ทวีชาติ', 1, 12, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(126, '6915964106', 'ปัณณวิชญ์', 'วงค์ทอง', 1, 12, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(127, '6915964108', 'ศุภวิชญ์', 'เกตุย้อย', 1, 12, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(128, '6915964107', 'พลกฤต', 'สีเที่ยง', 1, 12, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(129, '6915964111', 'สุเมธี', 'สมรักษ์', 1, 12, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(130, '6915964110', 'สุนธร', 'เชื้อบริบูรณ์', 1, 12, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(131, '6915964109', 'สุทิวัช', 'วงค์วาน', 1, 12, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(132, '6915964112', 'อาธาร', 'รีส', 1, 12, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(133, '6915964113', 'อำนวย', 'ราชธานี', 1, 12, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(134, '6915964118', 'นารีรัตน์', 'กุลพิมาย', 1, 12, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(135, '6915964114', 'ณัฐธนนท์', 'อุราเเก้ว', 1, 12, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(136, '6915964121', 'รัตติยา', 'โทสา', 1, 12, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(137, '6915964123', 'วรานุสรณ์', 'ไชยมูล', 1, 12, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(138, '6915964120', 'ปาลิตา', 'ปฏิเหตุ', 1, 12, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(139, '6915964126', 'เกียรติศักดิ์', 'บัวไข', 1, 12, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(140, '6915953102', 'ธีรวัฒน์', 'มนตรีวงษ์', 1, 11, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(141, '6915953101', 'กฤษณพงศ์', 'สุทธสนธิ์', 1, 11, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(142, '6912732201', 'กรวิชญ์', 'ดวนสูง', 1, 1, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(143, '6915953103', 'ภีมากร', 'ยาระสี', 1, 11, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(144, '6915953104', 'วณัฐพงศ์', 'คำดี', 1, 11, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(145, '6912732101', 'สิรวิชญ์', 'อ่อนเหลา', 1, 1, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(146, '6912732102', 'ณรงค์ศักดิ์', 'จรุงพานิชเจริญ', 1, 1, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(147, '6912732105', 'ทิณกรณ์', 'อินเเพง', 1, 1, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(148, '6912732103', 'ณัฐวุฒิ', 'โคตรประทุม', 1, 1, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(149, '6912732104', 'ไตรภพ', 'จารุนัย', 1, 1, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(150, '6912732106', 'เทพพิทักษ์', 'มะปราง', 1, 1, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(151, '6912732107', 'ธนโชติ', 'คำบาง', 1, 1, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(152, '6912732109', 'นวพล', 'พวงพุ่ม', 1, 1, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(153, '6912732108', 'ธีรวิทย์', 'กวางลา', 1, 1, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(154, '6912732110', 'ปิยวัฒน์', 'ทัศราช', 1, 1, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(155, '6912732111', 'พิรุณ', 'แซ่จึง', 1, 1, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(156, '6912732112', 'พีรพล', 'จันทร์เพ็ญ', 1, 1, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(157, '6912732114', 'พุทธิชาต', 'ผลดี', 1, 1, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(158, '6912732113', 'พีรภาส', 'แซ่เตียว', 1, 1, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(159, '6912732115', 'ภานุวัฒน์', 'รักษาพงค์', 1, 1, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(160, '6912732116', 'ยศวัต', 'ผดุงนาค', 1, 1, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(161, '6912732117', 'รัฐนนท์', 'คำผาย', 1, 1, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(162, '6912732118', 'วรกฤศ', 'คุณมาศ', 1, 1, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(163, '6912732119', 'วัชรพล', 'สุภาพงษ์', 1, 1, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(164, '6912732120', 'อนันดา', 'ไชยสุวรรณ', 1, 1, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(165, '6912732121', 'ธมลวรรณ', 'ศรีจันทร์', 1, 1, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(166, '6912732122', 'ปริชญา', 'นัยนิตย์', 1, 1, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(167, '6912732123', 'ปาริฉัตร', 'บุญเสริม', 1, 1, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(168, '6912732124', 'วิภาดา', 'เพชรินทร์', 1, 1, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(169, '6912732125', '6912732125', 'Student', 1, 5, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(170, '6912269102', 'คฑาเทพ', 'สิงห์คํา', 1, 2, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(171, '6912269101', 'กฤษณ์ฎาณุวัฒณ์', 'เติมใจ', 1, 2, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(172, '6912269103', 'จักรพรรดิ', 'มูลเหล็ก', 1, 2, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(173, '6912269104', 'ณรงค์ฤทธิ์', 'สงค์แก้ว', 1, 2, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(174, '6912269105', 'ธนวินท์', 'หล้าเเหล่ง', 1, 2, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(175, '6912269106', 'พรหมราช', 'ผู้มีสัตย์', 1, 2, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(176, '6912269109', 'วโรดม', 'พงษ์สุวรรณ์', 1, 2, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(177, '6912269108', 'ภาณุพงศ์', 'ไชยสุวรรณ', 1, 2, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(178, '6912269107', 'พิชญุตม์', 'วิรุณพันธ์', 1, 2, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(179, '6911506301', 'ณชพล', 'สุพรรณ', 1, 3, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(180, '6912269110', 'ชิษณุพงศ์', 'ช่างยันต์', 1, 2, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(181, '6911506302', 'ภานุพงศ์', 'ขันธโสภา', 1, 3, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(182, '6911506303', 'กมลวรรณ', 'ถึงไชย', 1, 3, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(183, '6911506305', 'จิรชยา', 'ลือขจร', 1, 3, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(184, '6911506306', 'จุฑารัตน์', 'สลางสิงห์', 1, 3, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(185, '6911506304', 'กิตติกานต์', 'ศรีเนตร', 1, 3, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(186, '6911506307', 'ชมพูนุช', 'พรมชาติ', 1, 3, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(187, '6911506309', 'ฐานิตดา', 'ถาวร', 1, 3, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(188, '6911506308', 'ช่อผกา', 'สุนิพัฒน์', 1, 3, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(189, '6911506310', 'นิวาริน', 'อภัยพงษ์', 1, 3, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(190, '6911506311', 'ดวงสมร', 'แก่นสุวรรณ์', 1, 3, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(191, '6911506312', 'นราวดี', 'ฟักวงษ์', 1, 3, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(192, '6911506313', 'ณัฐชา', 'ศรีบุญ', 1, 3, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(193, '6911506316', 'พลอยไพลิน', 'รุ่งเรือง', 1, 3, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(194, '6911506314', 'ปณิตา', 'สมเทพ', 1, 3, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(195, '6911506315', 'ปาณปวีณ์', 'แจ่มแจ้ง', 1, 3, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(196, '6911506317', 'เพชรชมพู', 'ศรีสมบูรณ์', 1, 3, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(197, '6911506322', 'พิชชาภา', 'ดาวสิงห์', 1, 3, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(198, '6911506319', 'รักษ์น้ำ', 'ธรรมบุตร', 1, 3, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(199, '6911506318', 'ภัทรธิดา', 'บุตรวงค์', 1, 3, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(200, '6911506320', 'วรรณวิสา', 'คำเเก้ว', 1, 3, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(201, '6911506323', 'สิรินดา', 'ศรีมงคล', 1, 3, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(202, '6911506324', 'อนันตญา', 'มะพันธ์', 1, 3, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(203, '6911506325', 'วโรชา', 'เนียมสุวรรณ', 1, 3, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(204, '6911506326', 'กัตติกา', 'ศรีบุญจัทร์', 1, 3, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(205, '6911506327', 'กมลชนก', 'ป้องเคน', 1, 3, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(206, '6911506201', 'ชิษณุพงศ์', 'ก้านน้อย', 1, 3, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(207, '6911506202', 'ภาคภูมิ', 'หงำกระโทก', 1, 3, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(208, '6911506205', 'ศุภิตฌญา', 'ศรีมายา', 1, 3, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(209, '6911506203', 'กมลชนก', 'กลมพันธ์', 1, 3, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(210, '6911506204', 'กวิศรา', 'นามปัญญา', 1, 3, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(211, '6911506206', 'ณัฏฐธิดา', 'ประเสริฐศรี', 1, 3, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(212, '6911506207', 'ชนากานต์', 'จันทร์สมุทร', 1, 3, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(213, '6911506208', 'ชลลดา', 'คุริโน', 1, 3, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(214, '6911506209', 'จิราวรรณ', 'เพียรเสมอ', 1, 3, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(215, '6911506210', 'นาริศา', 'เงินมา', 1, 3, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(216, '6911506211', 'ณิชกมล', 'กิ่งก้าน', 1, 3, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(217, '6911506215', 'ปวีณรัตน์', 'พิมพ์ศร', 1, 3, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(218, '6911506212', 'ทัศนีย์', 'มณีสาย', 1, 3, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(219, '6911506213', 'นวพร', 'มหาโภชน์', 1, 3, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(220, '6911506214', 'ณัฐวลัญช์', 'อุ่นเมือง', 1, 3, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(221, '6911506216', 'พรชนก', 'ขันทวี', 1, 3, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(222, '6911506217', 'ศิริลักษณ์', 'นาเจ็ก', 1, 3, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(223, '6911506218', 'ภัทรวรินทร์', 'บุราไกร', 1, 3, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(224, '6911506219', 'เยาวภา', 'เคนคำ', 1, 3, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(225, '6911506220', 'วรรณณิสา', 'วงษ์ใหญ่', 1, 3, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(226, '6911506223', 'สลิลทิพย์', 'อินทร์ประโคน', 1, 3, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(227, '6911506222', 'ศศิธร', 'ศรีงาม', 1, 3, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(228, '6911506221', 'วิชญาพร', 'นิลแสง', 1, 3, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(229, '6911506224', 'สุทธภา', 'ทิวาวงศ์', 1, 3, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(230, '6911506225', 'อินทิรา', 'อนันเต่า', 1, 3, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(231, '6911506226', 'ชินกร', 'เลื่อนฤทธิ์', 1, 3, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(232, '6911506227', 'วรารัตน์', 'โคตรสาลี', 1, 3, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(233, '6911506102', 'สาธิตา', 'นามวงษ์', 1, 3, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(234, '6911506101', 'ชรินทร์ภรณ์', 'สาโสม', 1, 3, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(235, '6911506103', 'กนกพิชญ์', 'คำอ่อน', 1, 3, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(236, '6911506104', 'กมลวรรณ', 'ผิวเงินยวง', 1, 3, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(237, '6911506105', 'เกษชฎาพร', 'สมจันทร์', 1, 3, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(238, '6911506107', 'ชญานิศ', 'โคตรคำภา', 1, 3, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(239, '6911506106', 'ชุติมณฑน์', 'คำแก้ว', 1, 3, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(240, '6911506108', 'ชลธิชา', 'ใจมั่น', 1, 3, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(241, '6911506109', 'ชัชฎาพร', 'ทองทิพย์', 1, 3, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(242, '6911506110', 'ฐิตากานต์', 'ศักดิ์สมวาส', 1, 3, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(243, '6911506111', 'ณัทฐรินทร์', 'สีวะสา', 1, 3, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(244, '6911506112', 'ทัตพิชา', 'จันทร์เภา', 1, 3, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(245, '6911506113', 'นลิตา', 'วงษา', 1, 3, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(246, '6911506117', 'พัชรมัย', 'เบญจมาศ', 1, 3, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(247, '6911506116', 'ปิ่นมุก', 'ประจญ', 1, 3, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(248, '6911506115', 'ปวริศา', 'พรมโฮม', 1, 3, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(249, '6911506114', 'นิภาพร', 'ทรัพย์เจริญ', 1, 3, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(250, '6911506119', 'ยอดขวัญ', 'พันพิบูลย์', 1, 3, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(251, '6911506118', 'มัณฑิตา', 'โทอรัญ', 1, 3, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(252, '6911506120', 'วนัชพร', 'คุมมินทร์', 1, 3, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(253, '6911506122', 'ศศิขรินทร์', 'โลหะพรม', 1, 3, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(254, '6911506121', 'วันวิสาข์', 'พรมภักดิ์', 1, 3, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(255, '6911506123', 'จารุวรรณ', 'คำโฮม', 1, 3, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(256, '6911506125', 'อนุธิดา', 'บริบาล', 1, 3, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(257, '6911506126', 'รุ่งนภา', 'ช่วยรัมย์', 1, 3, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(258, '6910983101', 'กนกพล', 'ดอกพอง', 1, 9, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(259, '6911506124', 'สิรินภา', 'จำปาเรือง', 1, 3, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(260, '6910983102', 'ณรงศักดิ์', 'ทองเต็ม', 1, 9, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(261, '6910983103', 'ธนธรณ์', 'ศักดิ์เทวินทร์', 1, 9, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(262, '6910983104', 'ธนภัทร', 'สีหนาท', 1, 9, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(263, '6910983105', 'ธีรเมฆ', 'บุญยอด', 1, 9, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(264, '6910983106', 'เสฎฐวุฒิ', 'เทาศิริ', 1, 9, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(265, '6910983107', 'อนันต์ยศ', 'ปัญญาทอง', 1, 9, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(266, '6910983109', 'กนกกร', 'สมพงษ์', 1, 9, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(267, '6910983108', 'อังศุ์สูรย์', 'ภิญญาสิริดำรง', 1, 9, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(268, '6910983112', 'นุชนาถ', 'เวียงสงค์', 1, 9, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(269, '6910983110', 'ชัชฏาภรณ์', 'วงภักดี', 1, 9, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(270, '6910983111', 'ณัฐนันท์', 'พงษ์วัน', 1, 9, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(271, '6910983113', 'ประภัสสร', 'ระยับศรี', 1, 9, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(272, '6910983115', 'พรนัชชา', 'วงษ์ภักดี', 1, 9, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(273, '6910983117', 'สุธาวัลย์', 'แก่นสีดา', 1, 9, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(274, '6910983118', 'อเฌอลีญา', 'นาคหัสดี', 1, 9, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(275, '6910983119', 'อรจิรา', 'บุญสงค์', 1, 9, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(276, '6910983120', 'โชคชัย', 'มายา', 1, 9, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(277, '6910983121', 'กฤติเดช', 'งอมสงัด', 1, 9, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(278, '6910073102', 'ธนาทิป', 'บุญขาว', 1, 5, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(279, '6910073103', 'ดำรงศักดิ์', 'กองทรัพย์', 1, 5, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(280, '6910073101', 'กัลป์ชัย', 'แสงทอง', 1, 5, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(281, '6910073104', 'อภินันท์', 'มูลอ่อน', 1, 5, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(282, '6910048201', 'กิตติพงศ์', 'นามไพร', 1, 4, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(283, '6910048202', 'จักรพันธ์', 'จำปาเรือง', 1, 4, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(284, '6910048203', 'จิรวัฒน์', 'พรหมประดิษฐ์', 1, 4, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(285, '6910048204', 'ชินวัตร', 'สิมพันธ์', 1, 4, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(286, '6910048205', 'ณัฐพล', 'โยธาวงค์', 1, 4, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(287, '6910048206', 'ธกร', 'สุธาวรรณ์', 1, 4, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(288, '6910048209', 'ธีรภัทร', 'จำปี', 1, 4, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(289, '6910048207', 'ธนวัฒน์', 'ชัยเพชร', 1, 4, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(290, '6910048208', 'ธีรพงษ์', 'จิรังดา', 1, 4, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(291, '6910048210', 'นรวิชญ์', 'พรมมา', 1, 4, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(292, '6910048211', 'นันทพัทธ์', 'น้ำจั่น', 1, 4, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(293, '6910048212', 'ปฏิภาณ', 'เกษศิริ', 1, 4, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(294, '6910048213', 'ปวริศ', 'ปรือปรัก', 1, 4, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(295, '6910048214', 'พงศกร', 'บัวทับ', 1, 4, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(296, '6910048216', 'ยศพนธ์', 'รักษาพันธ์', 1, 4, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(297, '6910048215', 'ภูธเนศ', 'ตินทอง', 1, 4, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(298, '6910048219', 'ศรัณย์', 'เขียดขำ', 1, 4, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(299, '6910048218', 'วันเฉลิม', 'จิบจันทร์', 1, 4, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(300, '6910048217', 'รณกฤต', 'สีสัน', 1, 4, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(301, '6910048220', 'ศิวัฒน์', 'แสงมาศ', 1, 4, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(302, '6910048221', 'ศุภโชติ', 'คำนาโฮม', 1, 4, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(303, '6910048222', 'สิทธิชัย', 'สัญจร', 1, 4, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(304, '6910048224', 'อดลุวิย์', 'จำปา', 1, 4, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(305, '6910048223', 'สุรพัศ', 'เถาว์แก้ว', 1, 4, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(306, '6910048225', 'อดิศักดิ์', 'ธรรมสาร', 1, 4, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(307, '6910048226', 'อนุชิต', 'นิยมวงษ์', 1, 4, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(308, '6910048229', 'ญาณิศา', 'ศรีคัทนา', 1, 4, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(309, '6910048228', 'กฤติมา', 'นาสา', 1, 4, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(310, '6910048227', 'อุดมเกียรติ', 'โนนน้อย', 1, 4, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(311, '6910048230', 'ดวงมณี', 'แก่นสุวรรณ์', 1, 4, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(312, '6910048231', 'ธัญพิชชา', 'ทองดี', 1, 4, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(313, '6910048232', 'บุญญิสา', 'อินทธิเดช', 1, 4, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(314, '6910048233', 'ลักษณารีย์', 'โสระ', 1, 4, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(315, '6910048234', 'ศศิธร', 'สีตะมา', 1, 4, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(316, '6910048236', 'ธีรานนท์', 'เนาวะพันธ์', 1, 4, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(317, '6910048235', 'โสภิตตา', 'โสดาวิชิต', 1, 4, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(318, '6910048101', 'กฤษณพงศ์', 'กิ่งบู', 1, 4, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(319, '6910048102', 'กิตประภัทร', 'ขันทวิชัย', 1, 4, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(320, '6910048237', 'จิรภัทร', 'นาจำปา', 1, 4, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(321, '6910048238', 'ปิยะพงษ์', 'แผ่นผา', 1, 4, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(322, '6910048103', 'ภัทรกร', 'แก้วพวง', 1, 4, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(323, '6910048104', 'จิรายุ', 'แก้วละมุล', 1, 4, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(324, '6910048106', 'ตุลากานต์', 'โตมร', 1, 4, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(325, '6910048105', 'ฐิติพงษ์', 'ไชยมูล', 1, 4, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(326, '6910048107', 'ธนพัฒน์', 'พิมพันธ์', 1, 4, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(327, '6910048111', 'นเรนธรณ์', 'มีถาวร', 1, 4, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(328, '6910048109', 'ธีรภัทร', 'กตะศิลา', 1, 4, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(329, '6910048110', 'ธีระพล', 'แก้วมานะ', 1, 4, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(330, '6910048112', 'น้ำเพชร', 'หัวเสือ', 1, 4, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(331, '6910048108', 'ธนวัต', 'ลาสิงห์', 1, 4, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(332, '6910048113', 'ปรัญชัย', 'พวงทับทิม', 1, 4, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(333, '6910048114', 'ปิยพัทธ์', 'บัวจันทร์', 1, 4, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(334, '6910048116', 'ภูรินทร์', 'ประดิษฐ์', 1, 4, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(335, '6910048115', 'พัฒน์ธิพงศ์', 'ลาลุน', 1, 4, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(336, '6910048117', 'ยุพราช', 'มะณู', 1, 4, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(337, '6910048121', 'ศุภกฤต', 'ศิลาทอง', 1, 4, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(338, '6910048120', 'ศราวุฒิ', 'ประนามะโต', 1, 4, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(339, '6910048118', 'รพีพัฒน์', 'เพียงตา', 1, 4, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(340, '6910048119', 'วิทวัฒน์', 'พายุพัด', 1, 4, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(341, '6910048122', 'สรวิชญ์', 'นามบุตร', 1, 4, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(342, '6910048124', 'เสฎฐวุฒิ', 'ไชยพันโท', 1, 4, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(343, '6910048123', 'สิทธิศักดิ์', 'จันครา', 1, 4, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(344, '6910048125', 'อดิเทพ', 'จักรคำ', 1, 4, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(345, '6910048126', 'อนาลโย', 'โกมลศรี', 1, 4, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(346, '6910048127', 'อาทิตย์', 'ราษีบุตร', 1, 4, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(347, '6910048128', 'เอกรินทร์', 'ตรีกุล', 1, 4, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(348, '6910048130', 'ณิชาภัทร', 'อินทนิล', 1, 4, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active');
INSERT INTO `profile` (`id`, `profile_id`, `firstname`, `lastname`, `faculty_id`, `department_id`, `address`, `prefix`, `phone`, `first_name_en`, `last_name_en`, `birth_date`, `avatar_url`, `bio`, `graduation_year`, `linkedin_url`, `github_url`, `portfolio_url`, `graduation_batch`, `graduation_date`, `student_status`) VALUES
(349, '6910048129', 'จิราพร', 'สุจันทร์', 1, 4, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(350, '6910048131', 'ทิพย์รัตน์', 'วงษ์ขันธ์', 1, 4, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(351, '6910048132', 'นวิยา', 'เส้นคราม', 1, 4, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(352, '6910048133', 'รุ่งฤดี', 'ใหญ่สมพงษ์', 1, 4, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(353, '6910048135', 'สร้อยสุดา', 'หงษ์เวียงจันทร์', 1, 4, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(354, '6910048134', 'ศศิกานต์', 'ประจันตะเสน', 1, 4, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(355, '6910048136', 'อนันตญา', 'พงษ์สุวรรณ์', 1, 4, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(356, '6910048138', 'ชญชล', 'ศรีอ่อน', 1, 4, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(357, '6910048137', 'ปัณธณินวิช', 'สิงห์เทพ', 1, 4, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(358, '6910048139', 'กมลชนก', 'ศิริจันทร์', 1, 4, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(359, '6910041203', 'ศุภชัย', 'จอมคำ', 1, 10, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(360, '6910041202', 'นันธวุฒิ', 'เฉลยศักดิ์', 1, 10, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(361, '6910041201', 'ชนะสิทธิ์', 'บุญนำ', 1, 10, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(362, '6910041102', 'ชัยภัทร', 'จันทมาลา', 1, 10, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(363, '6910041103', 'พสธร', 'ร่มรื่น', 1, 10, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(364, '6910041104', 'ศุภกร', 'ชุ่มอภัย', 1, 10, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(365, '6910041105', '6910041105', 'Student', 1, 5, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(366, '6910041107', 'พรสวรรค์', 'สมจิตร', 1, 10, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(367, '6910041106', 'ปภาวี', 'เผื่อแผ่', 1, 10, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(368, '6910014203', 'คุณากร', 'ทวีชาติ', 1, 8, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(369, '6910014201', 'ธิติกร', 'ปัญญาคม', 1, 8, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(370, '6910014202', 'ศรายุทธ', 'อุ่นสอน', 1, 8, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(371, '6910014101', 'ณฐกฤต', 'สุขเกษม', 1, 8, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(372, '6910014102', 'ณัฐภัทร', 'ตันดี', 1, 8, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(373, '6910014103', 'ธนดล', 'ศรีพล', 1, 8, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(374, '6910014104', 'นฤสรณ์', 'ธุระกิจ', 1, 8, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(375, '6910014105', 'พีรธัช', 'กิ่งป้อง', 1, 8, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(376, '6910014106', 'ภัทรพล', 'สุขหล้า', 1, 8, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(377, '6910014107', 'วัชระพล', 'โสมาเกตุ', 1, 8, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(378, '6910014109', 'สืบสกุล', 'สุขสมยา', 1, 8, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(379, '6910014111', 'ชนินาถ', 'แทนพันธ์', 1, 8, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(380, '6910014112', 'ภัทรานิษฐ์', 'ป้องกัน', 1, 8, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(381, '6910014110', 'อัครชัย', 'แจ้งสว่าง', 1, 8, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(382, '6910014113', 'ศิริภิญญา', 'สมศรี', 1, 8, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(383, '6910014114', 'บุญวารี', 'สู่สุข', 1, 8, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(384, '6910014115', 'กฤษฎา', 'แก้วจันทร์', 1, 8, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(385, '6825964101', 'ศรายุทธ', 'กิ่งสุวรรณ', 1, 12, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(386, '6825964102', 'อรรถพล', 'อนุพันธ์', 1, 12, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(387, '6825964106', 'ธนวัฒน์', 'คำศรีสุข', 1, 12, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(388, '6825964105', 'อารียา', 'วงค์เศษ', 1, 12, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(389, '6825964103', 'จตุพร', 'ภาวรรณ', 1, 12, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(390, '6825964104', 'นิศานาถ', 'เชื้อทอง', 1, 12, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(391, '6825964107', 'พีระพัฒน์', 'กำปั่น', 1, 12, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(392, '6825964108', 'จิราพรรดิ', 'พิมพร', 1, 12, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(393, '6825964109', 'นวมินทร์', 'บุญเลิศ', 1, 12, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(394, '6825964111', 'สุวิชัย', 'แก่นจันทร์', 1, 12, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(395, '6825964110', 'ธีรพันธ์', 'คำภิเดช', 1, 12, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(396, '6817796101', 'กรวิชญ์', 'สุรศักดิ์', 1, 7, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(397, '6825964112', 'รังสิต', 'อุ่นเสมอ', 1, 12, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(398, '6817796103', 'ฐิติพงค์', 'จันทร์ทิพย์', 1, 7, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(399, '6817796102', 'กิตติพงษ์', 'คำเสนา', 1, 7, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(400, '6817796104', 'นราเดช', 'พระพรหม', 1, 7, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(401, '6817796105', 'ปรัชญา', 'มาระวัง', 1, 7, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(402, '6817796107', 'มารุต', 'มีชัย', 1, 7, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(403, '6817796106', 'พันธ์ธวัช', 'ศรีภารา', 1, 7, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(404, '6817796108', 'กัญญาณัฐ', 'สิทธิบุศย์', 1, 7, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(405, '6817796109', 'เกสรา', 'จันทร์กรณ์', 1, 7, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(406, '6817796113', 'ธนภรณ์', 'บุตรพรม', 1, 7, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(407, '6817796110', 'เขมจิรา', 'พลแก้ว', 1, 7, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(408, '6817796111', 'ชนกวนันท์', 'ประเมินชัย', 1, 7, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(409, '6817796114', 'ธีญาดา', 'พึ่งตา', 1, 7, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(410, '6817796115', 'นฤมล', 'ปานทอง', 1, 7, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(411, '6817796112', 'ดาราวดี', 'แย้มบรรจง', 1, 7, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(412, '6817796116', 'นิชาวดี', 'สารทา', 1, 7, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(413, '6817796117', 'ปณิดา', 'บุสดี', 1, 7, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(414, '6817796118', 'พรทิวา', 'จำปานาค', 1, 7, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(415, '6817796119', 'พัชราภรณ์', 'มีแก้ว', 1, 7, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(416, '6817796120', 'พิมพ์ผกา', 'บุญขาว', 1, 7, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(417, '6817796122', 'ภัชราภา', 'สุขชาติ', 1, 7, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(418, '6817796121', 'พิมพ์วลัญช์', 'ดวนใหญ่', 1, 7, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(419, '6817796124', 'รัตนาพร', 'กิ่งกุล', 1, 7, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(420, '6817796123', 'ภัทราพร', 'พงษ์ทอง', 1, 7, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(421, '6817796125', 'รุจิรดา', 'อย่าลืมดี', 1, 7, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(422, '6817796126', 'ลัดดา', 'วงษา', 1, 7, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(423, '6817796127', 'วริศรา', 'นันทะสาร', 1, 7, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(424, '6817796128', 'วานิสสา', 'ป้องคำสิงห์', 1, 7, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(425, '6817796129', 'ศดานันท์', 'บันไดทอง', 1, 7, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(426, '6817796131', 'สุปรียา', 'ติระพงษ์', 1, 7, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(427, '6817796132', 'สุพรรณี', 'แสงเนตร', 1, 7, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(428, '6817796130', 'ศรัญญา', 'ธงชัย', 1, 7, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(429, '6817796134', 'จิรภัทร', 'วันทุมมา', 1, 7, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(430, '6817796133', 'สุภัทรา', 'สิงห์โคตร', 1, 7, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(431, '6817796135', 'กมลรัตน์', 'พันธ์บุตร', 1, 7, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(432, '6817796136', 'ศุภิสรา', 'พรมศร', 1, 7, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(433, '6817796137', 'กิ่งกาญจน์', 'หอมชาติ', 1, 7, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(434, '6817796138', 'นิภาพร', 'สุขจันทร์', 1, 7, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(435, '6817796139', 'กรรณิกา', 'พารีตา', 1, 7, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(436, '6817796140', 'ณัฎฐา', 'ทองโนนไทย', 1, 7, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(437, '6817796141', 'ณัฐดนัย', 'คำเหลี่ยม', 1, 7, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(438, '6815964103', 'ณัฏฐนันท์', 'คำพรมมาภิรักษ์', 1, 12, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(439, '6815964102', 'พิรุณฤทธิ์', 'เจริญสุข', 1, 12, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(440, '6815964101', 'จิรัฐติกาล', 'ทรงศรี', 1, 12, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(441, '6815964105', 'นนทกร', 'นนทะการ', 1, 12, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(442, '6815964107', 'ภาณุพงค์', 'ดาบจันทร์', 1, 12, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(443, '6815964108', 'สุขเกษม', 'ศรีสุข', 1, 12, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(444, '6815964109', 'สุขสันต์', 'ครองยุทธ', 1, 12, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(445, '6815964110', 'สิริยากร', 'จันทะศิลา', 1, 12, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(446, '6815964112', 'กิตติพัฒน์', 'สุตะพันธ์', 1, 12, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(447, '6815964111', 'อคิราภ์', 'คันธรักษ์', 1, 12, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(448, '6815953102', 'ธนวัฒน์', 'คำเสน', 1, 11, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(449, '6815953101', 'ชัยมงคล', 'เกษสุภะ', 1, 11, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(450, '6815953103', 'ธัชกร', 'พันธเสน', 1, 11, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(451, '6815953104', 'ปทุมทิพย์', 'ศรีบุตร', 1, 11, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(452, '6815953105', 'อัจจิมา', 'บุญหนา', 1, 11, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(453, '6815953106', 'รามิล', 'สุจริต', 1, 11, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(454, '6815953107', 'ปราณพัชวรรณ', 'ตังธนพิพัฒน์', 1, 11, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(455, '6815953108', 'ธนบูลย์', 'แก้วคำ', 1, 11, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(456, '6812732101', 'เกียรติยศ', 'รักษาเชิ้อ', 1, 1, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(457, '6812732103', 'ชิษนุพงศ์', 'ศรีวัง', 1, 1, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(458, '6812732104', 'ญาณพัฒน์', 'ย่อมมี', 1, 1, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(459, '6815953109', 'ธีธัช', 'สมพร', 1, 11, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(460, '6812732102', 'ชัยวัฒน์', 'ศิรินัย', 1, 1, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(461, '6812732105', 'ณัฐวุฒิ', 'โพธิ์งาม', 1, 1, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(462, '6812732106', 'ธนดล', 'พฤทธิบุญญกุล', 1, 1, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(463, '6812732108', 'ธนวัฒน์', 'ศรีษะ', 1, 1, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(464, '6812732110', 'ธัญพิสิษฐ์', 'พรหมโลก', 1, 1, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(465, '6812732109', 'ธนาธร', 'โพธิ์ขาว', 1, 1, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(466, '6812732113', 'ปุณยเทพ', 'อารีย์รัตน์กุล', 1, 1, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(467, '6812732112', 'เนติพงศ์', 'ธรรมมา', 1, 1, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(468, '6812732114', 'ปุรเชษฐ์', 'พูลสุข', 1, 1, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(469, '6812732115', 'พงศพัศ', 'ศรีสว่าง', 1, 1, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(470, '6812732117', 'พิทักษ์', 'แสงลอย', 1, 1, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(471, '6812732116', 'พัสกร', 'เงาศรี', 1, 1, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(472, '6812732119', 'ภูพิรัฐ', 'แซ่โค้ว', 1, 1, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(473, '6812732118', 'พีรพัฒน์', 'พรหมลิ', 1, 1, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(474, '6812732120', 'มนต์พระกาญจน์', 'คำเหลือ', 1, 1, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(475, '6812732121', 'ยศวัต', 'ผดุงนาค', 1, 1, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(476, '6812732123', 'วายุ', 'บัวศรี', 1, 1, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(477, '6812732126', 'สิวะดล', 'รักชาติ', 1, 1, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(478, '6812732125', 'สิริราช', 'โทนัน', 1, 1, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(479, '6812732122', 'รฐนันท์', 'วสุนันต์', 1, 1, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(480, '6812732124', 'สกล', 'มะลิลา', 1, 1, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(481, '6812732127', 'อภิวัฒน์', 'อบอุ่น', 1, 1, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(482, '6812732130', 'กมลนัทธ์', 'คันศร', 1, 1, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(483, '6812732128', 'อัครัช', 'การรัมย์', 1, 1, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(484, '6812732129', 'อานนท์', 'เพิ่มพูล', 1, 1, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(485, '6812732131', 'กันยาพร', 'ชัยชนะ', 1, 1, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(486, '6812732132', 'จินดารัตน์', 'บุญตา', 1, 1, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(487, '6812732133', 'ปิยภรณ์', 'ทวีสัตย์', 1, 1, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(488, '6812732136', 'ศุภาพิชญ์', 'บุญถม', 1, 1, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(489, '6812732135', 'วนิดา', 'ศรีแก้ว', 1, 1, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(490, '6812732134', 'พัชราภรณ์', 'เเหวนหล่อ', 1, 1, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(491, '6812732137', 'ญาณภา', 'มงคล', 1, 1, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(492, '6812732138', 'ปิยะภัทร', 'สีแสง', 1, 1, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(493, '6812732139', 'โสภณวิชญ์', 'ปฏิเหตุ', 1, 1, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(494, '6812732140', 'อธิวัฒน์', 'รัตนโสภา', 1, 1, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(495, '6812269101', 'กวีวัฒน์', 'ประกอบสุข', 1, 2, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(496, '6812269102', 'ชนะชัย', 'จันทร์เเจ้ง', 1, 2, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(497, '6812269105', 'สิรดนัย', 'กระจาย', 1, 2, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(498, '6812269106', 'กนกนิภา', 'ปกป้อง', 1, 2, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(499, '6812269104', 'ภาสกร', 'วังสำเภา', 1, 2, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(500, '6812269103', 'ปกาสิทธิ์', 'ชัยกุล', 1, 2, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(501, '6812269107', 'ณภัสพร', 'รัตพันธ์', 1, 2, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(502, '6812269108', 'รัชนก', 'ศิริกิจพุทธิศักดิ์', 1, 2, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(503, '6811506201', 'ชนะภัย', 'พุกสาย', 1, 3, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(504, '6811506203', 'ศุภณัฐ', 'ทองทาบ', 1, 3, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(505, '6811506202', 'ธีรภัทร', 'หอยจันทร์', 1, 3, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(506, '6811506205', 'พัชราพร', 'กุมารสิทธิ์', 1, 3, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(507, '6811506204', 'กัญญารัตน์', 'สังสัมฤทธิ์', 1, 3, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(508, '6811506207', 'ฉัตรมณี', 'ศรีเมือง', 1, 3, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(509, '6811506206', 'จิราพร', 'บุษบงก์', 1, 3, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(510, '6811506208', 'ชุติกาญจน์', 'ดงยะโสภา', 1, 3, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(511, '6811506209', 'ณัฐฌา', 'วงศ์โสภา', 1, 3, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(512, '6811506210', 'ณัฐณิชา', 'บุดดาวงค์', 1, 3, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(513, '6811506211', 'ณันฐิชา', 'หรี่เรไร', 1, 3, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(514, '6811506213', 'นรากร', 'เขียนสวรรค์', 1, 3, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(515, '6811506212', 'ธาราทิพย์', 'ศรีธัญรัตน์', 1, 3, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(516, '6811506216', 'รัตนาภรณ์', 'วิสาพล', 1, 3, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(517, '6811506214', 'พรพิชชา', 'วงษ์พวง', 1, 3, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(518, '6811506217', 'วรรณภา', 'คำสุข', 1, 3, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(519, '6811506218', 'สรพรรณญา', 'สินวิชัย', 1, 3, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(520, '6811506215', 'พัชรี', 'แนงวงค์', 1, 3, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(521, '6811506219', 'อภิยะดา', 'สิงวงษา', 1, 3, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(522, '6811506220', 'เอมิษา', 'โสมรักษ์', 1, 3, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(523, '6811506101', 'กุลเทพ', 'ลำใย', 1, 3, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(524, '6811506221', 'นลพรรณ', 'แพงภูงา', 1, 3, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(525, '6811506102', 'ณัฐวุฒิ', 'ตั้วสูงเนิน', 1, 3, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(526, '6811506103', 'ธีรวัฒน์', 'แก้วรักษา', 1, 3, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(527, '6811506104', 'ศรัญญา', 'ลำเลียง', 1, 3, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(528, '6811506107', 'จุฬามณี', 'ภูสถาน', 1, 3, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(529, '6811506105', 'กาญจนา', 'สังข์ทอง', 1, 3, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(530, '6811506106', 'เครสมาริน', 'หน่อแก้ว', 1, 3, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(531, '6811506108', 'ชลดา', 'พอนเพชร์', 1, 3, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(532, '6811506110', 'ณัฐฐินันท์', 'บุญฤทธิ์', 1, 3, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(533, '6811506109', 'ญาณิศา', 'ทับแสง', 1, 3, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(534, '6811506111', 'ณัฐสุดา', 'อินธิเดช', 1, 3, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(535, '6811506112', 'ณิชานันท์', 'โตมร', 1, 3, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(536, '6811506113', 'ธิมาพร', 'ทองบ่อ', 1, 3, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(537, '6811506115', 'การติมา', 'คุณพาที', 1, 3, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(538, '6811506117', 'ลฎาภา', 'โสพิม', 1, 3, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(539, '6811506116', 'มาริษา', 'อมรวิทยาการ', 1, 3, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(540, '6811506114', 'ปนัดดา', 'สุวรรณสนธ์', 1, 3, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(541, '6811506118', 'ศศิกานต์', 'ตุ่นเตี้ย', 1, 3, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(542, '6811506119', 'สุวิชาดา', 'พลแก้ว', 1, 3, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(543, '6811506120', 'อารยา', 'เเสนอูบ', 1, 3, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(544, '6810983101', 'จารุวัฒน์', 'มาระศรี', 1, 9, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(545, '6810983102', 'ชลชนก', 'ดวงมณี', 1, 9, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(546, '6810983104', 'พลวัฒน์', 'งอมสงัด', 1, 9, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(547, '6810983103', 'ธนกฤต', 'แผนประไพ', 1, 9, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(548, '6810983106', 'วรพรต', 'สุระเสน', 1, 9, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(549, '6810983107', 'กชกร', 'งอนชัยภูมิ', 1, 9, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(550, '6810983105', 'ยศอนันต์', 'ตอนศรี', 1, 9, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(551, '6810983108', 'กิติยาภรณ์', 'บุญเชิญ', 1, 9, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(552, '6810983109', 'จตุพร', 'มงคล', 1, 9, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(553, '6810983110', 'จารุลักขณ์', 'ทุมวงศ์', 1, 9, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(554, '6810983111', 'ณัฐริกา', 'ภูษา', 1, 9, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(555, '6810983112', 'ลัลนา', 'เจริญกิจจาธร', 1, 9, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(556, '6810983113', 'วณิชชยา', 'สุตะคาร', 1, 9, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(557, '6810983114', 'สร้อยสวรรค์', 'นิ่มนวล', 1, 9, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(558, '6810073101', 'ชินกฤต', 'ภูน้ำเย็น', 1, 5, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(559, '6810983115', 'เอกรินทร์', 'อุตมะ', 1, 9, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(560, '6810073102', 'ธนกฤต', 'คำหอม', 1, 5, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(561, '6810073103', 'บัญชา', 'บุตรเสมียน', 1, 5, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(562, '6810073106', 'พิฬุรห์', 'สมบัติ', 1, 5, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(563, '6810073105', 'ปัณณวัฒน์', 'นันทสิงห์', 1, 5, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(564, '6810073104', 'ประวิทย์', 'สิงหา', 1, 5, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(565, '6810073107', 'วุฒิพงศ์', 'อำไพ', 1, 5, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(566, '6810073108', 'ศรัณย์พงษ์', 'พรรษา', 1, 5, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(567, '6810073109', 'อัครชัย', 'โยธิคาร์', 1, 5, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(568, '6810073113', 'อารีญา', 'มาตขาว', 1, 5, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(569, '6810073111', 'จินตภา', 'คำผาย', 1, 5, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(570, '6810073110', 'กัญญาวีร์', 'พลแก้ว', 1, 5, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(571, '6810073114', 'นพพร', 'เพ็งศิริ', 1, 5, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(572, '6810073115', 'ศรชัย', 'เมฆลี', 1, 5, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(573, '6810048201', 'กิตติภพ', 'อุดทา', 1, 4, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(574, '6810048202', 'คิรากร', 'โชติ', 1, 4, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(575, '6810048203', 'จิรภัทร', 'คำเสียง', 1, 4, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(576, '6810048205', 'ชาญณรงค์', 'สาคร', 1, 4, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(577, '6810048206', 'ชานนท์', 'เสไธสง', 1, 4, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(578, '6810048210', 'ธนากร', 'พันธ์แก่น', 1, 4, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(579, '6810048208', 'ทศพล', 'แสงนนท์', 1, 4, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(580, '6810048209', 'ธนธรณ์', 'ชนะมี', 1, 4, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(581, '6810048211', 'ธีรเทพ', 'คนเพียร', 1, 4, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(582, '6810048212', 'นิทัสน์', 'สินสวัสดิ์', 1, 4, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(583, '6810048213', 'เจษฎาภรณ์', 'ชัยชนะรุ่งเรือง', 1, 4, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(584, '6810048215', 'พีรพัฒน์', 'พาหา', 1, 4, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(585, '6810048214', 'พิชิตชัย', 'สีผาด', 1, 4, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(586, '6810048216', 'ฟ้าสร้าง', 'จรรยา', 1, 4, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(587, '6810048220', 'วีรกิจ', 'สายสมร', 1, 4, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(588, '6810048218', 'ภูสิทธิ์', 'วงแก้ว', 1, 4, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(589, '6810048217', 'ภูริพัฒน์', 'ขุนศรี', 1, 4, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(590, '6810048219', 'ยศวรรธน์', 'พงษ์สุวรรณ', 1, 4, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(591, '6810048221', 'ศิริบัญชา', 'ศรีกำพล', 1, 4, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(592, '6810048222', 'เศรษฐพงศ์', 'พลพันธุ์', 1, 4, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(593, '6810048225', 'สุรยุทธ์', 'ทองบุตร', 1, 4, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(594, '6810048223', 'สรยุทธ', 'หงษ์หา', 1, 4, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(595, '6810048226', 'สุรวุฒิ', 'นุชอุดม', 1, 4, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(596, '6810048227', 'อนันต์ประทีป', 'ยืนยั่ง', 1, 4, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(597, '6810048228', 'อภิวิชญ์', 'อันทะนิล', 1, 4, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(598, '6810048230', 'จุฑาวศินี', 'แก้วเกิด', 1, 4, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(599, '6810048231', 'ชมพูนุช', 'นวลหงษ์', 1, 4, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(600, '6810048229', 'ภูวนาถ', 'โนนสังข์', 1, 4, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(601, '6810048232', 'อานนท์', 'พละขันธ์', 1, 4, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(602, '6810048234', 'รักฤทัย', 'เวชสาร', 1, 4, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(603, '6810048235', 'รัตนากร', 'บุญเหลือ', 1, 4, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(604, '6810048233', 'ปาลิตา', 'ปีมา', 1, 4, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(605, '6810048236', 'อชิระ', 'พรมสิทธิ์', 1, 4, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(606, '6810048237', 'สุวิมล', 'บุญทะวงษ์', 1, 4, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(607, '6810048239', 'เศรษฐภูมิ', 'ดวงดาว', 1, 4, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(608, '6810048102', 'เกียรติภูมิ', 'คงประทีป', 1, 4, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(609, '6810048238', 'ชฎารัตน์', 'จิตหาร', 1, 4, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(610, '6810048101', 'กชกร', 'หอมหวล', 1, 4, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(611, '6810048103', 'จิตติพัฒน์', 'ศรีสวัสดิ์', 1, 4, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(612, '6810048104', 'จิรวัฒน์', 'นามวงศ์', 1, 4, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(613, '6810048105', 'ชนาธิป', 'น้อยมิ่ง', 1, 4, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(614, '6810048107', 'ไชยวัฒน์', 'ช่อจันทร์', 1, 4, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(615, '6810048106', 'ชานน', 'คำโสภา', 1, 4, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(616, '6810048108', 'ณัฐภัทร', 'มานิชย์สาร', 1, 4, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(617, '6810048111', 'ธนิสร', 'เล็งไธสง', 1, 4, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(618, '6810048114', 'พันธวัช', 'พวงทอง', 1, 4, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(619, '6810048110', 'ธนพล', 'พงษ์วัน', 1, 4, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(620, '6810048109', 'ธนญชัย', 'ธรรมพันธ์', 1, 4, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(621, '6810048112', 'นฤสรณ์', 'แปรงทอง', 1, 4, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(622, '6810048115', 'พิตตินันท์', 'ทาเวช', 1, 4, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(623, '6810048116', 'พีระพล', 'หมื่นสอน', 1, 4, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(624, '6810048117', 'ภาณุพงศ์', 'นกเอี้ยง', 1, 4, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(625, '6810048118', 'ศศิตา', 'กันเทพา', 1, 4, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(626, '6810048119', 'เมธาสิทธิ', 'สมใจ', 1, 4, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(627, '6810048124', 'สหรัฐ', 'สวัสดี', 1, 4, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(628, '6810048123', 'สถาพร', 'สวยรูป', 1, 4, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(629, '6810048120', 'วิชญ์พล', 'ร่วมจิตร', 1, 4, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(630, '6810048122', 'ศิวกร', 'กมูลลึก', 1, 4, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(631, '6810048125', 'สิทธินนท์', 'บุษดี', 1, 4, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(632, '6810048127', 'วรัญญา', 'นัยนิตย์', 1, 4, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(633, '6810048126', 'สุรวิชญ์', 'ศรีสวัสดิ์', 1, 4, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(634, '6810048128', 'อภิเชษฐ์', 'ขุขันธิน', 1, 4, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(635, '6810048130', 'คารีนา', 'ต้นสิงห์', 1, 4, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(636, '6810048131', 'ชฎาภรณ์', 'วามะสิงห์', 1, 4, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(637, '6810048132', 'ณัฐชนันท์', 'สานุสันต์', 1, 4, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(638, '6810048137', 'สุวรรณรัตน์', 'วามะกัน', 1, 4, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(639, '6810048133', 'นิลาวัลย์', 'เมืองจันทร์', 1, 4, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(640, '6810048134', 'พรไพลิน', 'บุญสรวง', 1, 4, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(641, '6810048135', 'รัชนีภรณ์', 'พันธ์คำ', 1, 4, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(642, '6810048138', 'อริสา', 'สานเสนา', 1, 4, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(643, '6810048139', 'ปวีณ', 'คงเจริญ', 1, 4, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(644, '6810048140', 'กฤธิติญา', 'เเพงยา', 1, 4, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(645, '6810048141', 'จิรวัฒน์', 'ยนต์ดัน', 1, 4, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(646, '6810048142', 'วรกาญจน์', 'พลมั่น', 1, 4, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(647, '6810041104', 'อนุรักษ์', 'หอมยิ่ง', 1, 10, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(648, '6810041101', 'พีรณัฐ', 'พวงเพ็ชร', 1, 10, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(649, '6810041102', 'รัฐภูมิ', 'ศรีบุญเรือง', 1, 10, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(650, '6810048143', 'พิชญ์สนันท์', 'แสงสกุล', 1, 4, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(651, '6810041103', 'วิวิธชัย', 'อุดนอก', 1, 10, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(652, '6810041105', 'อภิวัฒน์', 'ล้อมวงษ์', 1, 10, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(653, '6810041107', 'ธัญวรัตม์', 'ชาวน้ำโมง', 1, 10, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(654, '6810041106', 'อลงกรณ์', 'มากมี', 1, 10, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(655, '6810041108', 'เพียงธิดา', 'คงพิมพ์', 1, 10, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(656, '6810014103', 'ณัฏฐชัย', 'โมคศิริ', 1, 8, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(657, '6810014102', 'ชัยธวัช', 'พรหมแก้ว', 1, 8, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(658, '6810014101', 'เจษฎา', 'แก้วละมุล', 1, 8, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(659, '6810014105', 'ประมุกข์', 'สีหะวงษ์', 1, 8, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(660, '6810014104', 'ธนศักดิ์', 'กรไกร', 1, 8, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(661, '6810014106', 'ปรีดี', 'กิ่งเกษ', 1, 8, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(662, '6810014107', 'ภัทรภูมิ', 'อามาตร', 1, 8, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(663, '6810014108', 'เศรษฐพงษ์', 'บุญตา', 1, 8, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(664, '6810014109', 'สรยุทธ', 'จันทร์พินิช', 1, 8, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(665, '6810014110', 'วชิราภรณ์', 'ทองเพ็ชร', 1, 8, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(666, '6810014111', 'วริศรา', 'ถาวร', 1, 8, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(667, '6810014112', 'วลัยลักษณ์', 'แซ่เฉิ่ง', 1, 8, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(668, '6810014113', 'วิมลนาฏ', 'พรมด้วง', 1, 8, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(669, '6725964101', 'จิตติพงษ์', 'ศิลารักษ์', 1, 12, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(670, '6725964103', 'เดชรชต', 'กรณ์สกุลวณิช', 1, 12, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(671, '6725964102', 'ฐิติพัฒน์', 'ศรีสุธรรม', 1, 12, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(672, '6725964104', 'ธนวัตร', 'นันทสาร', 1, 12, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(673, '6725964105', 'ศุภวิชญ์', 'สมงาม', 1, 12, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(674, '6725964106', 'สรศักดิ์', 'ปุณประวัติ', 1, 12, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(675, '6725964107', 'วัฒนศักดิ์', 'รุ่งเรืองวานิชกุล', 1, 12, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(676, '6725964110', 'วิทวัส', 'ประสาร', 1, 12, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(677, '6725964109', 'วรัญชัย', 'จันทรหมื่น', 1, 12, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(678, '6725964108', 'อารยะ', 'ว่องไว', 1, 12, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(679, '6725964113', 'พัชรียา', 'ชาลี', 1, 12, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(680, '6725964111', 'ณัฐภูมิ', 'จันทร์พรม', 1, 12, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(681, '6725964112', 'ธีรวุฒิ', 'สุภาพันธ์', 1, 12, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(682, '6725964114', 'วรวิทย์', 'นามอนุ', 1, 12, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(683, '6717796102', 'จิรวัฒน์', 'สีสัน', 1, 7, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(684, '6717796101', 'จักรภัทร', 'สุขอ้วน', 1, 7, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(685, '6717796103', 'ณัฐพล', 'ไก่แก้ว', 1, 7, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(686, '6717796105', 'สืบศักดิ์', 'สีหบุตร', 1, 7, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(687, '6717796104', 'ภาสิตพัสตร์', 'สันดอน', 1, 7, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(688, '6717796107', 'กัญญาภัค', 'แซ่ลิ้ม', 1, 7, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(689, '6717796109', 'ขวัญพิชชา', 'สิงห์โต', 1, 7, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(690, '6717796106', 'อภินัทธ์', 'บุญตา', 1, 7, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(691, '6717796108', 'ขนิษฐา', 'แก้วลา', 1, 7, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(692, '6717796110', 'จิราภา', 'นิยาย', 1, 7, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(693, '6717796111', 'จุฑามาศ', 'ทองวงศ์ญาติ', 1, 7, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active');
INSERT INTO `profile` (`id`, `profile_id`, `firstname`, `lastname`, `faculty_id`, `department_id`, `address`, `prefix`, `phone`, `first_name_en`, `last_name_en`, `birth_date`, `avatar_url`, `bio`, `graduation_year`, `linkedin_url`, `github_url`, `portfolio_url`, `graduation_batch`, `graduation_date`, `student_status`) VALUES
(694, '6717796112', 'ฉัตรแก้ว', 'ม่วงนางรอง', 1, 7, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(695, '6717796113', 'ธิดารัตน์', 'จันทร์สมุทร์', 1, 7, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(696, '6717796116', 'ปวริศา', 'อินธิ์จักร', 1, 7, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(697, '6717796115', 'ปนัดดา', 'หัสคำ', 1, 7, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(698, '6717796119', 'พรไพลิน', 'พละขันธ์', 1, 7, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(699, '6717796117', 'ปาริฉัตร', 'พันธ์พงษ์', 1, 7, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(700, '6717796114', 'เนตรนภา', 'จงจอหอ', 1, 7, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(701, '6717796118', 'ปาริชาติ', 'ทองสุทธิ์', 1, 7, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(702, '6717796122', 'เม็ดทราย', 'นาทันลิ', 1, 7, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(703, '6717796121', 'ภูริชญา', 'ศรัทธาคลัง', 1, 7, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(704, '6717796120', 'พรรณชมพู', 'วิเชียร', 1, 7, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(705, '6717796123', 'รวินท์นิภา', 'สุตะพันธ์', 1, 7, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(706, '6717796128', 'ศิรภัส', 'วงค์ทา', 1, 7, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(707, '6717796127', 'ศรัณย์พร', 'วรพล', 1, 7, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(708, '6717796124', 'รัชนีกร', 'ธรรมโคตร', 1, 7, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(709, '6717796126', 'วิรวรรณ', 'ประดี', 1, 7, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(710, '6717796125', 'วรรณวิสา', 'วรรณแก้ว', 1, 7, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(711, '6717796129', 'ศิรินทรา', 'บัวไขย', 1, 7, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(712, '6717796130', 'สวรรยา', 'รัตนศรี', 1, 7, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(713, '6717796131', 'อรนลิน', 'ลาฤทธิ์', 1, 7, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(714, '6717796132', 'อรนุช', 'ศรียา', 1, 7, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(715, '6717796133', 'อัณสุรีพรณ์', 'มาลา', 1, 7, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(716, '6717796135', 'ภัทราวดี', 'วรรณสวาท', 1, 7, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(717, '6717796134', 'กาญจนา', 'พิมมะการ', 1, 7, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(718, '6717796137', 'ณัฐพงษ์', 'พรหมรางกูล', 1, 7, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(719, '6717796138', 'ณัฐณิชา', 'พงพันเทา', 1, 7, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(720, '6717796136', 'นาถนภัส', 'ด้วงนิล', 1, 7, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(721, '6717796139', 'ภูชิตา', 'ปิ่นหอม', 1, 7, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(722, '6715964101', 'ชาคริส', 'เเก้วภักดี', 1, 12, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(723, '6715964103', 'ณัฐวุฒิ', 'แสงงาม', 1, 12, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(724, '6715964102', 'ณัฐภัทร', 'ประถมภาส', 1, 12, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(725, '6715964104', 'ทวีศิลป์', 'ทองบาง', 1, 12, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(726, '6715964106', 'ธนวัฒน์', 'ตรีคำ', 1, 12, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(727, '6715964105', 'ทัตพงศ์', 'ตากสันเทียะ', 1, 12, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(728, '6715964107', 'ธีรเทพ', 'มะณี', 1, 12, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(729, '6715964108', 'ธีรนันท์', 'บุตราช', 1, 12, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(730, '6715964109', 'ปณต', 'โพธิ์ทะเรต', 1, 12, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(731, '6715964110', 'ปรีชา', 'ใจมนต์', 1, 12, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(732, '6715964111', 'ปิยังกูร', 'พันธ์ทอง', 1, 12, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(733, '6715964112', 'ภัทรพงศ์', 'ศรีดาพันธ์', 1, 12, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(734, '6715964113', 'วรานนท์', 'แผ่นทอง', 1, 12, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(735, '6715964115', 'สพลกิตติ์', 'ปวงสุข', 1, 12, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(736, '6715964116', 'อภิชัย', 'ทองสัมฤทธิ์', 1, 12, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(737, '6715964118', 'ธิดารัตน์', 'สีหะวงษ์', 1, 12, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(738, '6715964120', 'สุดารัตน์', 'ครองหมู่', 1, 12, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(739, '6715964119', 'ภัทรธิดา', 'สุทาบุญ', 1, 12, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(740, '6715964117', 'จุฑาธิปภรณ์', 'พันธุ์พิศาล', 1, 12, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(741, '6715964122', 'สุภศิน', 'บุญเหลือม', 1, 12, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(742, '6715964123', 'วรภัทร', 'บุญเนตร', 1, 12, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(743, '6715964124', 'ธันยพงศ์', 'วงศ์เพ็ญ', 1, 12, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(744, '6715953101', 'จิณณวัตร', 'ยาหอม', 1, 11, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(745, '6715953102', 'ณฐภัทร', 'พรรณสน', 1, 11, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(746, '6712732101', 'Mr.Lyheang', 'Heng', 1, 1, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(747, '6715953103', 'สุทธิภัทร', 'พรมประดิษฐ์', 1, 11, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(748, '6715953104', 'อภิศักดิ์', 'ถนัดทาง', 1, 11, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(749, '6712732102', 'ก้องเกียรติ', 'คงนิล', 1, 1, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(750, '6712732103', 'จิรศักดิ์', 'ทองพิละ', 1, 1, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(751, '6712732104', 'ฐิติพงศ์', 'อิงสันเทียะ', 1, 1, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(752, '6712732105', 'ณัฐพล', 'บุญนะรา', 1, 1, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(753, '6712732106', 'ธีรภัทร', 'อินทโร', 1, 1, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(754, '6712732107', 'นครินทร์', 'ศรีพูล', 1, 1, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(755, '6712732108', 'นนทพัทธ์', 'นะทีศรี', 1, 1, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(756, '6712732109', 'ปิยะภัทร', 'สีแสง', 1, 1, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(757, '6712732110', 'ปุณยเทพ', 'ศรีจันทร์', 1, 1, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(758, '6712732111', 'พงษ์พิสุทธิ์', 'บัวหอม', 1, 1, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(759, '6712732112', 'พชรพล', 'พุ่มพิน', 1, 1, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(760, '6712732113', 'พัฒนพงศ์', 'ลำภา', 1, 1, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(761, '6712732114', 'พีรัชย์ชัย', 'สุทาบุญ', 1, 1, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(762, '6712732115', 'ภัคพล', 'แก้วคำ', 1, 1, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(763, '6712732116', 'ภาคิน', 'เลื่อมรัตน์', 1, 1, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(764, '6712732117', 'วทัญญู', 'ช่างเกวียน', 1, 1, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(765, '6712732118', 'สราวุธ', 'พลคำ', 1, 1, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(766, '6712732119', 'อภิสิทธิ์', 'สุนันท์', 1, 1, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(767, '6712732120', 'อรรคพันธ์', 'พันธุ์งาม', 1, 1, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(768, '6712732121', 'จีรนันท์', 'เกิดกล้า', 1, 1, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(769, '6712732122', 'ปัทมาภรณ์', 'สมอเขียว', 1, 1, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(770, '6712732123', 'ปิยะพร', 'พงษ์วัน', 1, 1, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(771, '6712732124', 'ภัทรวดี', 'สังสีแก้ว', 1, 1, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(772, '6712732125', 'วรัญญา', 'ฉิมงาม', 1, 1, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(773, '6712732126', 'วาสินี', 'มาฤทธิ์', 1, 1, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(774, '6712732128', 'สิทธิชัย', 'ลบยุทธ', 1, 1, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(775, '6712732127', 'สุดารัตน์', 'วรรณทวี', 1, 1, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(776, '6712732130', 'นิลรักษ์', 'บุตรโพธิ์ศรี', 1, 1, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(777, '6712732129', 'สิทธินันท์', 'ชัยสิทธิ์', 1, 1, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(778, '6712732132', 'แทนไทย', 'พันธุชาติ', 1, 1, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(779, '6712732131', 'ณภัทร', 'สมาน', 1, 1, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(780, '6712732134', 'หัสยา', 'ศรศรี', 1, 1, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(781, '6712732133', 'วริชภูมิ', 'พ่วงพี', 1, 1, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(782, '6712269101', 'กชเมธ', 'บุญเรือง', 1, 2, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(783, '6712269102', 'กฤติเดช', 'จิตรศิลป์', 1, 2, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(784, '6712269103', 'กิตติพงษ์', 'ทานกวีวงศ์', 1, 2, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(785, '6712269104', 'ปวีณวัช', 'สุระสิงห์', 1, 2, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(786, '6712269106', 'รหัสชนะ', 'รุ่งแสง', 1, 2, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(787, '6712269107', 'วีรภัทร', 'สินโพธิ์', 1, 2, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(788, '6712269108', 'เศรษฐปัญญา', 'โนนกลาง', 1, 2, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(789, '6712269105', 'ภาคภูมิ', 'จึงอารยะ', 1, 2, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(790, '6712269109', 'สิรพัฒน์', 'บุญไทย', 1, 2, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(791, '6712269111', 'นันท์นภัส', 'คันศร', 1, 2, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(792, '6711506202', 'กุลปรียา', 'เงาศรี', 1, 3, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(793, '6712269113', 'จิรศักดิ์', 'เจียงเพ็ง', 1, 2, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(794, '6712269112', 'บุญสิตา', 'พรมมืด', 1, 2, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(795, '6711506201', 'ฉัตรดนัย', 'ระเบียบ', 1, 3, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(796, '6711506204', 'ชณกาณ', 'ซื่อตรงบูชา', 1, 3, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(797, '6711506206', 'ฐิติวรดา', 'มีแววแสง', 1, 3, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(798, '6711506205', 'ชรินทร์ทิพย์', 'ศรีทอง', 1, 3, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(799, '6711506203', 'เจนจิรา', 'งอมสงัด', 1, 3, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(800, '6711506207', 'ทัศน์วรรณ', 'กุลบุตร', 1, 3, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(801, '6711506208', 'ธิดารัตน์', 'มณีวงษ์', 1, 3, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(802, '6711506209', 'นัทธมน', 'สุขวงศ์', 1, 3, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(803, '6711506210', 'ปรียาพิศุทธิ์', 'ภูคำศักดิ์', 1, 3, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(804, '6711506211', 'ปาลิตา', 'มณีวงษ์', 1, 3, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(805, '6711506212', 'ปิ่นอนงค์', 'เรืองริวงค์', 1, 3, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(806, '6711506214', 'ศวรรยา', 'พรมบุตร', 1, 3, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(807, '6711506213', 'พลอยไพลิน', 'รุ่งเรือง', 1, 3, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(808, '6711506215', 'สิริวรรณ', 'ศรีสิงห์', 1, 3, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(809, '6711506217', 'สุภัชญา', 'จันทิมา', 1, 3, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(810, '6711506216', 'สุธาทิพย์', 'สมบูรณ์', 1, 3, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(811, '6711506218', 'เสาวนีย์', 'ดีพลงาม', 1, 3, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(812, '6711506219', 'อัญมณี', 'นาใจแก้ว', 1, 3, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(813, '6711506101', 'เกียรติศักดิ์', 'ทองแดง', 1, 3, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(814, '6711506102', 'อภิชัย', 'ทองใบศรี', 1, 3, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(815, '6711506103', 'จุฑารัตน์', 'แตงอ่อ', 1, 3, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(816, '6711506107', 'ตรีชฎา', 'พวงพอก', 1, 3, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(817, '6711506109', 'นภาภัทร', 'ใจมนต์', 1, 3, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(818, '6711506105', 'ชนิสรา', 'สุขชาติ', 1, 3, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(819, '6711506108', 'ธัญยาเรศ', 'ศักดิ์สกุลศรี', 1, 3, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(820, '6711506104', 'ฉวีวรรณ', 'มูลธาร์', 1, 3, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(821, '6711506110', 'บุณยานุช', 'แม่นทอง', 1, 3, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(822, '6711506111', 'ปวิณณรัตน์', 'มนตรีวงษ์', 1, 3, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(823, '6711506113', 'พรวิภา', 'สืบสิมมา', 1, 3, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(824, '6711506114', 'พิมลพรรณ', 'คุณแขวน', 1, 3, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(825, '6711506115', 'ศสิประภา', 'ชาติกระโทก', 1, 3, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(826, '6711506118', 'สุภัสตรา', 'บุตรสุวรรณ', 1, 3, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(827, '6711506116', 'สุจิตรา', 'ชูประชัย', 1, 3, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(828, '6711506117', 'สุธิตา', 'สารมะโน', 1, 3, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(829, '6711506119', 'อรวรรณ', 'จัดไทย', 1, 3, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(830, '6710983101', 'กฤษดา', 'ชารีจิต', 1, 9, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(831, '6710983102', 'จักริน', 'บุดดาวงค์', 1, 9, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(832, '6710983103', 'ธนวัฒน์', 'สมิงทอง', 1, 9, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(833, '6710983105', 'กนกวรรณ', 'วรรณมาศ', 1, 9, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(834, '6710983106', 'กนกอร', 'สินศิริ', 1, 9, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(835, '6710983104', 'พัสกร', 'ถ้ำทอง', 1, 9, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(836, '6710983107', 'กันติยา', 'อินทร์งาม', 1, 9, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(837, '6710983108', 'ดลฤดี', 'เพ็ญจันทร์', 1, 9, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(838, '6710983109', 'ปฐมพร', 'สมปาน', 1, 9, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(839, '6710983111', 'พัชรศิษย์', 'เพ็ชรพันธ์', 1, 9, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(840, '6710983110', 'พรสินี', 'เวียงคำ', 1, 9, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(841, '6710073101', 'กิตติภูมิ', 'เมืองโคตร', 1, 5, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(842, '6710073102', 'ณัฐพล', 'เสกแสร้ง', 1, 5, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(843, '6710073104', 'ธนภัทร', 'คำเพราะ', 1, 5, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(844, '6710073105', 'นฤเบศ', 'ทำนุ', 1, 5, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(845, '6710073103', 'ทวีเดช', 'นามปัญญา', 1, 5, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(846, '6710073106', 'ภูฟ้า', 'ปิยะวงษ์', 1, 5, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(847, '6710073110', 'จิรัชญา', 'เครือคุณ', 1, 5, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(848, '6710073109', 'จินตนา', 'มังษา', 1, 5, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(849, '6710073108', 'ศุภวิชญ์', 'คำน้ำแดง', 1, 5, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(850, '6710073107', 'ภูริพัฒน์', 'ดอกอพอง', 1, 5, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(851, '6710073111', 'พรไพลิน', 'พิมพะ', 1, 5, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(852, '6710073112', 'พฤกษา', 'แสงทอง', 1, 5, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(853, '6710073113', 'สุวรรณกาญจน์', 'พิมพ์ทอง', 1, 5, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(854, '6710073114', 'อมลวรรณ', 'สุทธิเสน', 1, 5, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(855, '6710073115', 'อัจจิมา', 'กัดแดง', 1, 5, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(856, '6710073116', 'พีรพัฒน์', 'ใจดี', 1, 5, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(857, '6710073117', 'พีรพงศธร', 'ฤทธิมนตรี', 1, 5, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(858, '6710073118', 'ธรรมนูญ', 'สมาน', 1, 5, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(859, '6710048202', 'อัครชัย', 'สีดา', 1, 4, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(860, '6710048203', 'กิตติภูมิ', 'อินทอง', 1, 4, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(861, '6710048201', 'กอบชัย', 'เชื้อดี', 1, 4, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(862, '6710048204', 'คณิน', 'เจริญรอย', 1, 4, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(863, '6710048206', 'ชโลทร', 'มาตรคำจันทร์', 1, 4, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(864, '6710048207', 'ณพลเดช', 'รวมจิตร', 1, 4, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(865, '6710048208', 'ณัฐพัฒน์', 'กาหลง', 1, 4, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(866, '6710048209', 'ดนัสวิน', 'ธรรมชาติ', 1, 4, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(867, '6710048210', 'ทศวรรษ', 'โคตะมะ', 1, 4, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(868, '6710048212', 'ธรรมศาสตร์', 'ดวงใจ', 1, 4, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(869, '6710048211', 'ธนากร', 'ไชยณรงค์', 1, 4, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(870, '6710048213', 'ธิชานนท์', 'สินให้อยู่สุข', 1, 4, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(871, '6710048214', 'ธีรเทพ', 'มูลศรี', 1, 4, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(872, '6710048216', 'ปฏิภาณ', 'ระหาร', 1, 4, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(873, '6710048215', 'นพรัตน์', 'วรเลิศ', 1, 4, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(874, '6710048217', 'พรมงคล', 'รัตนโสภา', 1, 4, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(875, '6710048218', 'พัชราวุธ', 'ทองอินทร์', 1, 4, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(876, '6710048219', 'ภานุกร', 'ไก่แก้ว', 1, 4, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(877, '6710048221', 'มนตรี', 'สว่างภพ', 1, 4, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(878, '6710048222', 'เรวัตร', 'เขตนิมิตร', 1, 4, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(879, '6710048220', 'ภูรี', 'สีหะวงษ์', 1, 4, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(880, '6710048223', 'วัชระ', 'มั่นขัน', 1, 4, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(881, '6710048224', 'วัฒนสิน', 'อินทร์ดี', 1, 4, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(882, '6710048226', 'สรวิศ', 'สีหาบุตร', 1, 4, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(883, '6710048225', 'วีรภัทร', 'เตชะนัง', 1, 4, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(884, '6710048227', 'สิรภัทร', 'จันทร์ภักดี', 1, 4, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(885, '6710048228', 'อรรถพันธ์', 'วงศ์พิทักษ์', 1, 4, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(886, '6710048229', 'อัษฎาวุธ', 'บุญวาส', 1, 4, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(887, '6710048233', 'รัตติยา', 'ประดับวงค์', 1, 4, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(888, '6710048230', 'กรองกาญจน์', 'รับรอง', 1, 4, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(889, '6710048231', 'ธนภรณ์', 'จันทร์ทร', 1, 4, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(890, '6710048232', 'พัชรพร', 'พรมไชยวงค์', 1, 4, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(891, '6710048234', 'ฤทัยชนก', 'ศรีโพธิ์', 1, 4, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(892, '6710048235', 'อรพินท์', 'พันพะม่า', 1, 4, NULL, 'นางสาว', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(893, '6710048101', 'กล้ารงค์', 'จันทะศิลา', 1, 4, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(894, '6710048102', 'กันตพัฒน์', 'ปัดถาอมรหิรัณย์', 1, 4, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(895, '6710048103', 'กิตติภูมิ', 'รสหอม', 1, 4, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(896, '6710048108', 'ณัฐพงษ์', 'พันคำภา', 1, 4, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(897, '6710048107', 'ชัยพัฒน์', 'พรมสวรรค์', 1, 4, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(898, '6710048105', 'จิระเดช', 'หอมจิตร', 1, 4, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(899, '6710048104', 'คงกระพัน', 'วันคำ', 1, 4, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(900, '6710048109', 'ณัฐวุฒิ', 'ศรีวิชา', 1, 4, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(901, '6710048110', 'ตุลยวัต', 'สารพล', 1, 4, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(902, '6710048112', 'ธนาธิป', 'ท่อนแก้ว', 1, 4, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(903, '6710048113', 'ธวัช', 'นรดี', 1, 4, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(904, '6710048111', 'ธนกฤต', 'คำฉิม', 1, 4, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(905, '6710048114', 'ธิติพัทธ์', 'มากนวล', 1, 4, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(906, '6710048119', 'พีรัช', 'พงษ์ประเสริฐ', 1, 4, NULL, 'นาย', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active'),
(907, '6710048116', 'ปฏิพล', 'ไวมงคุณ', 1, 4, NULL, 'นา
<truncated 820815 bytes>

NOTE: The output was truncated because it was too long. Use a more targeted query or a smaller range to get the information you need.