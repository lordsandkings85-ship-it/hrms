-- phpMyAdmin SQL Dump
-- version 5.2.2
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1:3306
-- Generation Time: Aug 15, 2026 at 06:13 AM
-- Server version: 11.8.8-MariaDB-log
-- PHP Version: 7.2.34

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `u593848004_hrms`
--

-- --------------------------------------------------------

--
-- Table structure for table `AdditionalPayout`
--

CREATE TABLE `AdditionalPayout` (
  `id` varchar(191) NOT NULL,
  `employeeId` varchar(191) NOT NULL,
  `month` int(11) NOT NULL,
  `year` int(11) NOT NULL,
  `type` varchar(191) NOT NULL,
  `amount` double NOT NULL,
  `notes` varchar(191) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `Announcement`
--

CREATE TABLE `Announcement` (
  `id` varchar(191) NOT NULL,
  `companyId` varchar(191) NOT NULL,
  `title` varchar(191) NOT NULL,
  `body` varchar(191) NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `Asset`
--

CREATE TABLE `Asset` (
  `id` varchar(191) NOT NULL,
  `companyId` varchar(191) NOT NULL,
  `type` varchar(191) NOT NULL,
  `identifier` varchar(191) DEFAULT NULL,
  `status` varchar(191) NOT NULL DEFAULT 'available',
  `condition` varchar(191) DEFAULT 'good',
  `name` varchar(191) DEFAULT NULL,
  `purchaseDate` datetime(3) DEFAULT NULL,
  `purchasePrice` double DEFAULT NULL,
  `serialNumber` varchar(191) DEFAULT NULL,
  `warrantyUntil` datetime(3) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `Asset`
--

INSERT INTO `Asset` (`id`, `companyId`, `type`, `identifier`, `status`, `condition`, `name`, `purchaseDate`, `purchasePrice`, `serialNumber`, `warrantyUntil`) VALUES
('ae4be44f-b4ff-4b00-989e-9838c1299b3e', 'e87debef-a662-4fd7-b255-2e50c9f86d5b', 'phone ', 'moto', 'assigned', 'good', NULL, NULL, NULL, NULL, NULL),
('c1d85151-5d2b-4178-8c94-bd5b6b33af14', 'e87debef-a662-4fd7-b255-2e50c9f86d5b', 'laptop', '001245862', 'assigned', 'good', NULL, NULL, NULL, NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `AssetAssignment`
--

CREATE TABLE `AssetAssignment` (
  `id` varchar(191) NOT NULL,
  `assetId` varchar(191) NOT NULL,
  `employeeId` varchar(191) NOT NULL,
  `assignedAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `returnedAt` datetime(3) DEFAULT NULL,
  `notes` varchar(191) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `AssetAssignment`
--

INSERT INTO `AssetAssignment` (`id`, `assetId`, `employeeId`, `assignedAt`, `returnedAt`, `notes`) VALUES
('10e48d6b-bdcf-40e8-94b6-e6a2cb2e8887', 'c1d85151-5d2b-4178-8c94-bd5b6b33af14', '2623fc64-fa89-47c1-a7de-4d65fecaf0c8', '2026-08-07 07:20:14.686', '2026-08-07 07:20:19.782', NULL),
('ac0ce9b4-5d34-4171-8360-b138ee65c81a', 'ae4be44f-b4ff-4b00-989e-9838c1299b3e', '7e4c13c9-3803-4b2b-aa6e-8bd11c4f61c3', '2026-08-07 07:23:47.470', NULL, NULL),
('c2a39e63-6e66-47e5-8563-ac5e473d7397', 'ae4be44f-b4ff-4b00-989e-9838c1299b3e', '2623fc64-fa89-47c1-a7de-4d65fecaf0c8', '2026-08-07 07:23:31.304', '2026-08-07 07:23:39.936', NULL),
('cf84a86c-6ff4-4ca3-8f3d-f723ff860488', 'c1d85151-5d2b-4178-8c94-bd5b6b33af14', '7e4c13c9-3803-4b2b-aa6e-8bd11c4f61c3', '2026-08-07 07:23:48.993', NULL, NULL),
('eb2814c8-0c6b-4af1-8e8a-774b9f3a6acd', 'c1d85151-5d2b-4178-8c94-bd5b6b33af14', '2623fc64-fa89-47c1-a7de-4d65fecaf0c8', '2026-08-07 07:23:33.167', '2026-08-07 07:23:41.763', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `AttendanceLog`
--

CREATE TABLE `AttendanceLog` (
  `id` varchar(191) NOT NULL,
  `employeeId` varchar(191) NOT NULL,
  `date` datetime(3) NOT NULL,
  `checkIn` datetime(3) DEFAULT NULL,
  `checkOut` datetime(3) DEFAULT NULL,
  `method` varchar(191) DEFAULT NULL,
  `latitude` double DEFAULT NULL,
  `longitude` double DEFAULT NULL,
  `status` varchar(191) NOT NULL DEFAULT 'present',
  `overtimeMinutes` int(11) NOT NULL DEFAULT 0,
  `correctionOf` varchar(191) DEFAULT NULL,
  `isWithinGeofence` tinyint(1) DEFAULT NULL,
  `regularizationNote` varchar(191) DEFAULT NULL,
  `regularizationStatus` varchar(191) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `AttendanceLog`
--

INSERT INTO `AttendanceLog` (`id`, `employeeId`, `date`, `checkIn`, `checkOut`, `method`, `latitude`, `longitude`, `status`, `overtimeMinutes`, `correctionOf`, `isWithinGeofence`, `regularizationNote`, `regularizationStatus`) VALUES
('11558072-0626-4a28-936a-116dc4b2cbe4', '7e4c13c9-3803-4b2b-aa6e-8bd11c4f61c3', '2026-08-06 18:30:00.000', '2026-08-07 07:12:40.846', NULL, 'WEB', NULL, NULL, 'late', 0, NULL, NULL, NULL, NULL),
('1c038bde-8730-4b35-a7d4-af7a80a51c89', '7e4c13c9-3803-4b2b-aa6e-8bd11c4f61c3', '2026-08-14 00:00:00.000', '2026-08-14 10:14:44.168', NULL, 'WEB', NULL, NULL, 'present', 0, NULL, NULL, NULL, NULL),
('1e5eb3fa-9959-43b1-99f0-03dc6bff1d07', '7e4c13c9-3803-4b2b-aa6e-8bd11c4f61c3', '2026-07-31 00:00:00.000', '2026-07-31 10:26:42.926', '2026-07-31 10:27:03.553', 'WEB', NULL, NULL, 'present', 0, NULL, NULL, NULL, NULL),
('378053aa-305f-4271-8e86-faaf799855e0', '7e4c13c9-3803-4b2b-aa6e-8bd11c4f61c3', '2026-08-05 18:30:00.000', '2026-08-06 05:49:38.685', '2026-08-06 05:49:39.027', 'WEB', NULL, NULL, 'present', 0, NULL, NULL, NULL, NULL),
('6515628c-8303-430f-a999-c4519155e288', '7e4c13c9-3803-4b2b-aa6e-8bd11c4f61c3', '2026-08-03 00:00:00.000', '2026-08-03 11:10:42.240', NULL, 'WEB', NULL, NULL, 'present', 0, NULL, NULL, NULL, NULL),
('67b3aaef-b5ea-49f7-8caf-3578b13343f8', '7e4c13c9-3803-4b2b-aa6e-8bd11c4f61c3', '2026-08-10 00:00:00.000', '2026-08-10 04:53:45.360', NULL, 'WEB', NULL, NULL, 'present', 0, NULL, NULL, NULL, NULL),
('67e86454-0796-404c-905e-6333346f3c01', '7e4c13c9-3803-4b2b-aa6e-8bd11c4f61c3', '2026-08-03 00:00:00.000', '2026-08-03 08:11:25.637', '2026-08-03 11:10:18.677', 'WEB', NULL, NULL, 'present', 0, NULL, NULL, NULL, NULL),
('70d73de2-eb6b-4791-b766-8d5e436b0457', '7e4c13c9-3803-4b2b-aa6e-8bd11c4f61c3', '2026-08-05 00:00:00.000', '2026-08-05 05:30:32.435', '2026-08-05 05:31:55.625', 'WEB', NULL, NULL, 'present', 0, NULL, NULL, NULL, NULL),
('7fe5a0ac-b444-446f-812c-e966380ccfec', '7e4c13c9-3803-4b2b-aa6e-8bd11c4f61c3', '2026-08-06 00:00:00.000', '2026-08-06 06:11:29.100', NULL, 'WEB', NULL, NULL, 'present', 0, NULL, NULL, NULL, NULL),
('84c551fa-2ea8-44d9-aa5a-e66ac7be27fd', '7e4c13c9-3803-4b2b-aa6e-8bd11c4f61c3', '2026-07-30 18:30:00.000', '2026-07-31 07:27:05.165', NULL, 'WEB', NULL, NULL, 'present', 0, NULL, NULL, NULL, NULL),
('8ec69d53-82ab-4c39-9513-77d75b5989ea', '7e4c13c9-3803-4b2b-aa6e-8bd11c4f61c3', '2026-08-03 00:00:00.000', '2026-08-03 11:10:14.109', NULL, 'WEB', NULL, NULL, 'present', 0, NULL, NULL, NULL, NULL),
('93cad850-0774-47cf-8306-b29b57abe437', '7e4c13c9-3803-4b2b-aa6e-8bd11c4f61c3', '2026-08-03 00:00:00.000', '2026-08-03 11:10:16.766', NULL, 'WEB', NULL, NULL, 'present', 0, NULL, NULL, NULL, NULL),
('9beb44d2-da1d-4622-a37a-dcd2971953b3', '7e4c13c9-3803-4b2b-aa6e-8bd11c4f61c3', '2026-07-31 00:00:00.000', '2026-07-31 10:26:50.847', NULL, 'WEB', NULL, NULL, 'present', 0, NULL, NULL, NULL, NULL),
('a0f13c6c-3c0d-44bb-81e5-31f3c4ded008', '7e4c13c9-3803-4b2b-aa6e-8bd11c4f61c3', '2026-07-30 18:30:00.000', '2026-07-31 07:27:02.878', NULL, 'WEB', NULL, NULL, 'present', 0, NULL, NULL, NULL, NULL),
('ce0e813c-80d2-4ee2-9c85-37c47265a22e', '7e4c13c9-3803-4b2b-aa6e-8bd11c4f61c3', '2026-08-02 00:00:00.000', '2026-08-02 06:39:46.312', NULL, 'WEB', NULL, NULL, 'present', 0, NULL, NULL, NULL, NULL),
('d1c26173-e9c9-4f03-bd28-f00fe71e7fed', '7e4c13c9-3803-4b2b-aa6e-8bd11c4f61c3', '2026-08-05 00:00:00.000', '2026-08-05 05:30:23.102', NULL, 'WEB', NULL, NULL, 'present', 0, NULL, NULL, NULL, NULL),
('ed89829c-9ad5-40bc-83fc-b295fbcca6c1', '7e4c13c9-3803-4b2b-aa6e-8bd11c4f61c3', '2026-08-03 00:00:00.000', '2026-08-03 11:10:32.646', NULL, 'WEB', NULL, NULL, 'present', 0, NULL, NULL, NULL, NULL),
('f669e9f8-bf1f-40b1-9490-430c61e50a75', '7e4c13c9-3803-4b2b-aa6e-8bd11c4f61c3', '2026-08-03 00:00:00.000', '2026-08-03 11:10:21.748', NULL, 'WEB', NULL, NULL, 'present', 0, NULL, NULL, NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `AttendancePolicy`
--

CREATE TABLE `AttendancePolicy` (
  `id` varchar(191) NOT NULL,
  `companyId` varchar(191) NOT NULL,
  `key` varchar(191) NOT NULL,
  `value` varchar(191) NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `AuditLog`
--

CREATE TABLE `AuditLog` (
  `id` varchar(191) NOT NULL,
  `companyId` varchar(191) NOT NULL,
  `userId` varchar(191) DEFAULT NULL,
  `action` varchar(191) NOT NULL,
  `entity` varchar(191) NOT NULL,
  `entityId` varchar(191) DEFAULT NULL,
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`metadata`)),
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `AuditLog`
--

INSERT INTO `AuditLog` (`id`, `companyId`, `userId`, `action`, `entity`, `entityId`, `metadata`, `createdAt`) VALUES
('033ad4ee-8f1e-4222-a9ac-e6ffb8309791', 'e87debef-a662-4fd7-b255-2e50c9f86d5b', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', 'update', 'employee', '7e4c13c9-3803-4b2b-aa6e-8bd11c4f61c3', NULL, '2026-08-06 09:42:25.856'),
('0458cce0-1e65-4cfb-a16a-e94e7a3eebc7', 'e87debef-a662-4fd7-b255-2e50c9f86d5b', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', 'create', 'employee', '7e4c13c9-3803-4b2b-aa6e-8bd11c4f61c3', NULL, '2026-07-15 09:52:48.757'),
('09213b6f-b0f1-4cf5-a5d2-8a8cd720f63f', 'e87debef-a662-4fd7-b255-2e50c9f86d5b', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', 'archive', 'employee', '91825148-e42e-4a9d-a7ed-04a27ffc1181', NULL, '2026-07-28 08:39:09.752'),
('0c27e2eb-800d-4325-aba5-6cab6019a72e', 'e87debef-a662-4fd7-b255-2e50c9f86d5b', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', 'update', 'employee', '7e4c13c9-3803-4b2b-aa6e-8bd11c4f61c3', NULL, '2026-07-31 06:29:03.465'),
('145ccd12-6393-4007-8502-9d67b9506873', 'e87debef-a662-4fd7-b255-2e50c9f86d5b', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', 'update', 'employee', '7e4c13c9-3803-4b2b-aa6e-8bd11c4f61c3', NULL, '2026-07-31 06:29:02.864'),
('262b3e1b-d848-4bda-ba0b-8445a3677d27', 'e87debef-a662-4fd7-b255-2e50c9f86d5b', 'f4f162b0-d691-40fa-8ae1-704b095f0302', 'update', 'employee', '7e4c13c9-3803-4b2b-aa6e-8bd11c4f61c3', NULL, '2026-08-07 09:43:52.712'),
('33997d35-a578-48e9-9055-f0639a1cadc9', 'e87debef-a662-4fd7-b255-2e50c9f86d5b', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', 'update', 'employee', '7e4c13c9-3803-4b2b-aa6e-8bd11c4f61c3', NULL, '2026-08-06 09:35:55.825'),
('5058fa34-4060-4408-9087-471e9e15d54f', 'e87debef-a662-4fd7-b255-2e50c9f86d5b', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', 'update', 'employee', '7e4c13c9-3803-4b2b-aa6e-8bd11c4f61c3', NULL, '2026-07-31 06:29:04.054'),
('52e37263-b9a9-4485-9012-caa3df22e611', 'e87debef-a662-4fd7-b255-2e50c9f86d5b', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', 'update', 'employee', '7e4c13c9-3803-4b2b-aa6e-8bd11c4f61c3', NULL, '2026-07-30 05:09:44.063'),
('583a10dd-298d-4475-9568-9c82e305b5a8', 'e87debef-a662-4fd7-b255-2e50c9f86d5b', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', 'update', 'employee', '7e4c13c9-3803-4b2b-aa6e-8bd11c4f61c3', NULL, '2026-07-31 06:29:04.644'),
('58a680e9-5873-4aa6-9c44-eaba4ebdb67b', 'e87debef-a662-4fd7-b255-2e50c9f86d5b', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', 'update', 'employee', '7e4c13c9-3803-4b2b-aa6e-8bd11c4f61c3', NULL, '2026-07-15 10:35:59.772'),
('608e9680-15f4-48bb-bb9a-30e29b184ac6', 'e87debef-a662-4fd7-b255-2e50c9f86d5b', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', 'archive', 'employee', 'a78c0097-f222-4894-9bdb-3f8465557db3', NULL, '2026-07-27 11:30:11.258'),
('631db861-111c-4f34-9248-a9d937b91bb7', 'e87debef-a662-4fd7-b255-2e50c9f86d5b', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', 'update', 'employee', '7e4c13c9-3803-4b2b-aa6e-8bd11c4f61c3', NULL, '2026-07-31 06:28:35.177'),
('6b5da9b5-54ed-4be1-a933-4f8726beaaa6', 'e87debef-a662-4fd7-b255-2e50c9f86d5b', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', 'create', 'employee', '908d675c-e81e-4c68-9e56-3253a95b5fa5', NULL, '2026-07-15 10:01:49.469'),
('6c85e349-c803-4c50-9ced-4c145fcf777b', 'e87debef-a662-4fd7-b255-2e50c9f86d5b', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', 'update', 'employee', '7e4c13c9-3803-4b2b-aa6e-8bd11c4f61c3', NULL, '2026-07-27 07:31:56.838'),
('771cfaa1-2923-4537-9b33-023243ac17c7', 'e87debef-a662-4fd7-b255-2e50c9f86d5b', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', 'update', 'employee', '7e4c13c9-3803-4b2b-aa6e-8bd11c4f61c3', NULL, '2026-07-31 06:28:36.352'),
('787827ba-d9d1-4c55-bbbe-91ce516e624f', 'e87debef-a662-4fd7-b255-2e50c9f86d5b', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', 'delete', 'employee', '91825148-e42e-4a9d-a7ed-04a27ffc1181', NULL, '2026-07-29 07:14:47.047'),
('7d91e865-824d-4658-8dad-1187fac71842', 'e87debef-a662-4fd7-b255-2e50c9f86d5b', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', 'archive', 'employee', '908d675c-e81e-4c68-9e56-3253a95b5fa5', NULL, '2026-07-27 10:09:37.504'),
('7eceda4f-9913-4d8f-acc0-af5ff3918416', 'e87debef-a662-4fd7-b255-2e50c9f86d5b', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', 'update', 'employee', '7e4c13c9-3803-4b2b-aa6e-8bd11c4f61c3', NULL, '2026-07-31 06:28:31.520'),
('824689eb-d99d-4c86-af04-a8bd3573f2f9', 'e87debef-a662-4fd7-b255-2e50c9f86d5b', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', 'update', 'employee', '7e4c13c9-3803-4b2b-aa6e-8bd11c4f61c3', NULL, '2026-07-31 06:28:33.972'),
('9229d7eb-0775-427a-8a1e-989ad28359d5', 'e87debef-a662-4fd7-b255-2e50c9f86d5b', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', 'update', 'employee', '7e4c13c9-3803-4b2b-aa6e-8bd11c4f61c3', NULL, '2026-07-31 06:29:04.533'),
('9420f2c8-9186-45c8-ad38-d6b3c2491e48', 'e87debef-a662-4fd7-b255-2e50c9f86d5b', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', 'archive', 'employee', '908d675c-e81e-4c68-9e56-3253a95b5fa5', NULL, '2026-07-27 11:19:18.372'),
('a7b3a683-c769-42a0-bbd0-dcdd4041f058', 'e87debef-a662-4fd7-b255-2e50c9f86d5b', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', 'update', 'employee', '7e4c13c9-3803-4b2b-aa6e-8bd11c4f61c3', NULL, '2026-08-06 09:38:58.428'),
('af8ad203-15f0-4f40-a45c-46e9f5ce03fd', 'e87debef-a662-4fd7-b255-2e50c9f86d5b', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', 'archive', 'employee', '908d675c-e81e-4c68-9e56-3253a95b5fa5', NULL, '2026-07-27 11:19:11.019'),
('c7bb9a08-8755-4f10-b3dc-070ded559567', 'e87debef-a662-4fd7-b255-2e50c9f86d5b', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', 'archive', 'employee', 'a78c0097-f222-4894-9bdb-3f8465557db3', NULL, '2026-07-28 05:16:46.297'),
('c8cb7257-a8aa-44dc-bcdc-d57e2ff98169', 'e87debef-a662-4fd7-b255-2e50c9f86d5b', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', 'update', 'employee', '7e4c13c9-3803-4b2b-aa6e-8bd11c4f61c3', NULL, '2026-07-31 06:29:04.306'),
('ca0e41bf-7435-49e8-87a9-5f6d725f60ed', 'e87debef-a662-4fd7-b255-2e50c9f86d5b', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', 'update', 'employee', '908d675c-e81e-4c68-9e56-3253a95b5fa5', NULL, '2026-07-17 04:58:30.034'),
('ccfcc862-4ea4-4d8a-a3d5-1b8f72180992', 'e87debef-a662-4fd7-b255-2e50c9f86d5b', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', 'update', 'employee', '7e4c13c9-3803-4b2b-aa6e-8bd11c4f61c3', NULL, '2026-07-31 06:29:03.813'),
('dc59cf8c-a765-4895-b7dd-0bb7035efc26', 'e87debef-a662-4fd7-b255-2e50c9f86d5b', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', 'archive', 'employee', 'a78c0097-f222-4894-9bdb-3f8465557db3', NULL, '2026-07-27 11:30:03.447'),
('dddd4b1a-0259-4836-978b-073605576634', 'e87debef-a662-4fd7-b255-2e50c9f86d5b', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', 'update', 'employee', '7e4c13c9-3803-4b2b-aa6e-8bd11c4f61c3', NULL, '2026-08-06 09:43:16.022'),
('e3a03ea9-b665-4f5f-98c3-c7c4a54c4796', 'e87debef-a662-4fd7-b255-2e50c9f86d5b', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', 'archive', 'employee', '908d675c-e81e-4c68-9e56-3253a95b5fa5', NULL, '2026-07-27 10:20:17.158'),
('f68eb36d-d309-453b-9bff-d0b0526d86ae', 'e87debef-a662-4fd7-b255-2e50c9f86d5b', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', 'create', 'employee', 'a78c0097-f222-4894-9bdb-3f8465557db3', NULL, '2026-07-20 06:13:10.398'),
('f8612cf0-4538-4cae-8cd0-e83059e0cc51', 'e87debef-a662-4fd7-b255-2e50c9f86d5b', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', 'update', 'employee', '7e4c13c9-3803-4b2b-aa6e-8bd11c4f61c3', NULL, '2026-07-31 06:28:32.803'),
('fc761bcd-44fa-4c22-a1f7-f206469855d1', 'e87debef-a662-4fd7-b255-2e50c9f86d5b', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', 'update', 'employee', '908d675c-e81e-4c68-9e56-3253a95b5fa5', NULL, '2026-07-15 10:36:22.444'),
('fd9d747c-869e-473a-ad7b-883dd75625c3', 'e87debef-a662-4fd7-b255-2e50c9f86d5b', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', 'create', 'employee', '91825148-e42e-4a9d-a7ed-04a27ffc1181', NULL, '2026-07-24 06:01:22.780');

-- --------------------------------------------------------

--
-- Table structure for table `Branch`
--

CREATE TABLE `Branch` (
  `id` varchar(191) NOT NULL,
  `companyId` varchar(191) NOT NULL,
  `name` varchar(191) NOT NULL,
  `address` varchar(191) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `Branch`
--

INSERT INTO `Branch` (`id`, `companyId`, `name`, `address`) VALUES
('3d81b25a-4190-4816-86fc-6e2b02070aed', 'e87debef-a662-4fd7-b255-2e50c9f86d5b', 'koyambedu', '328, 2nd floor, Ten Square Mall, Jawaharlal Nehru Road, Koyambedu, Chennai, Tamil Nadu - 600107'),
('b10abdb4-1f4d-487b-8e05-1cda3e1e8f60', 'e87debef-a662-4fd7-b255-2e50c9f86d5b', 'nungambakkam', 'd5,second floor,parsn complex, Kodambakkam High Rd,nungambakkam-600034');

-- --------------------------------------------------------

--
-- Table structure for table `Candidate`
--

CREATE TABLE `Candidate` (
  `id` varchar(191) NOT NULL,
  `jobId` varchar(191) NOT NULL,
  `name` varchar(191) NOT NULL,
  `email` varchar(191) NOT NULL,
  `resumeUrl` varchar(191) DEFAULT NULL,
  `stage` varchar(191) NOT NULL DEFAULT 'applied'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `Company`
--

CREATE TABLE `Company` (
  `id` varchar(191) NOT NULL,
  `name` varchar(191) NOT NULL,
  `logoUrl` varchar(191) DEFAULT NULL,
  `timezone` varchar(191) NOT NULL DEFAULT 'Asia/Kolkata',
  `currency` varchar(191) NOT NULL DEFAULT 'INR',
  `planId` varchar(191) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  `geofenceLat` double DEFAULT NULL,
  `geofenceLng` double DEFAULT NULL,
  `geofenceRadius` double DEFAULT 500,
  `address` varchar(191) DEFAULT NULL,
  `companyType` varchar(191) DEFAULT NULL,
  `email` varchar(191) DEFAULT NULL,
  `financialYearEnd` int(11) DEFAULT NULL,
  `financialYearStart` int(11) DEFAULT NULL,
  `gstNumber` varchar(191) DEFAULT NULL,
  `industry` varchar(191) DEFAULT NULL,
  `panNumber` varchar(191) DEFAULT NULL,
  `payrollEffectiveFrom` int(11) DEFAULT NULL,
  `phone` varchar(191) DEFAULT NULL,
  `website` varchar(191) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `Company`
--

INSERT INTO `Company` (`id`, `name`, `logoUrl`, `timezone`, `currency`, `planId`, `createdAt`, `updatedAt`, `geofenceLat`, `geofenceLng`, `geofenceRadius`, `address`, `companyType`, `email`, `financialYearEnd`, `financialYearStart`, `gstNumber`, `industry`, `panNumber`, `payrollEffectiveFrom`, `phone`, `website`) VALUES
('e87debef-a662-4fd7-b255-2e50c9f86d5b', 'lords and kings', 'https://kommodo.ai/i/oj0zFAjrD7V3g5baRCpO', 'Asia/Kolkata', 'INR', NULL, '2026-07-15 06:23:58.372', '2026-08-10 10:51:58.207', NULL, NULL, 500, '328, 2nd floor, Ten Square Mall,\nJawaharlal Nehru Road, Koyambedu,\nChennai, Tamil Nadu - 600107', 'Private Limited', NULL, 3, 4, NULL, NULL, NULL, NULL, NULL, 'https://lordsandkings.co/');

-- --------------------------------------------------------

--
-- Table structure for table `ComplianceForm`
--

CREATE TABLE `ComplianceForm` (
  `id` varchar(191) NOT NULL,
  `companyId` varchar(191) NOT NULL,
  `formName` varchar(191) NOT NULL,
  `category` varchar(191) NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `CompOffRequest`
--

CREATE TABLE `CompOffRequest` (
  `id` varchar(191) NOT NULL,
  `companyId` varchar(191) NOT NULL,
  `employeeId` varchar(191) NOT NULL,
  `date` datetime(3) NOT NULL,
  `reason` varchar(191) DEFAULT NULL,
  `status` varchar(191) NOT NULL DEFAULT 'pending',
  `approvedBy` varchar(191) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `CompOffRequest`
--

INSERT INTO `CompOffRequest` (`id`, `companyId`, `employeeId`, `date`, `reason`, `status`, `approvedBy`, `createdAt`) VALUES
('591f75ac-7ccf-4ff9-a2b8-69fc3590ae82', 'e87debef-a662-4fd7-b255-2e50c9f86d5b', '7e4c13c9-3803-4b2b-aa6e-8bd11c4f61c3', '2026-08-08 00:00:00.000', 'API verification', 'rejected', 'bc3515dd-c5d7-4266-9147-de69624d5b1f', '2026-08-02 14:53:30.567');

-- --------------------------------------------------------

--
-- Table structure for table `CourseEnrollment`
--

CREATE TABLE `CourseEnrollment` (
  `id` varchar(191) NOT NULL,
  `courseId` varchar(191) NOT NULL,
  `employeeId` varchar(191) NOT NULL,
  `progress` double NOT NULL DEFAULT 0,
  `completedAt` datetime(3) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `Department`
--

CREATE TABLE `Department` (
  `id` varchar(191) NOT NULL,
  `companyId` varchar(191) NOT NULL,
  `name` varchar(191) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `Department`
--

INSERT INTO `Department` (`id`, `companyId`, `name`) VALUES
('06ef1b41-b348-423e-a450-5efe292107b5', 'e87debef-a662-4fd7-b255-2e50c9f86d5b', 'Business & Strategy'),
('656af9e9-d270-4b78-a9e0-38b20da76e31', 'e87debef-a662-4fd7-b255-2e50c9f86d5b', 'Operations'),
('7fb42f78-0dc9-4ca7-bb46-dd6e2eb26700', 'e87debef-a662-4fd7-b255-2e50c9f86d5b', 'Administration'),
('8c5f9027-c703-44b1-8df1-5ac826c0a8bb', 'e87debef-a662-4fd7-b255-2e50c9f86d5b', 'Human Resources'),
('981fc553-2795-4243-9d9c-d7171748a759', 'e87debef-a662-4fd7-b255-2e50c9f86d5b', 'IT & Engineering'),
('ef107928-b593-4187-a414-9ba0123c8bdf', 'e87debef-a662-4fd7-b255-2e50c9f86d5b', 'Finance & Accounts');

-- --------------------------------------------------------

--
-- Table structure for table `Designation`
--

CREATE TABLE `Designation` (
  `id` varchar(191) NOT NULL,
  `companyId` varchar(191) NOT NULL,
  `title` varchar(191) NOT NULL,
  `grade` varchar(191) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `Designation`
--

INSERT INTO `Designation` (`id`, `companyId`, `title`, `grade`) VALUES
('04e18985-8fc4-4528-9afa-276c06fa38bf', 'e87debef-a662-4fd7-b255-2e50c9f86d5b', 'Accounts Associate', NULL),
('16963df8-3e67-459b-86ed-1cc15611ffea', 'e87debef-a662-4fd7-b255-2e50c9f86d5b', 'Web Developer', 'L4'),
('36264fdd-0c54-4608-bfc1-f2fd58e20dc2', 'e87debef-a662-4fd7-b255-2e50c9f86d5b', 'Executive Assistant', NULL),
('38d3e082-1a9b-4c36-b285-519c96a59d88', 'e87debef-a662-4fd7-b255-2e50c9f86d5b', 'Accounts Manager', NULL),
('4790aa97-9aad-4f7b-96ec-44f901f1dd7b', 'e87debef-a662-4fd7-b255-2e50c9f86d5b', 'Sales Executive ', ''),
('47e9aa54-1d87-4873-8677-3e7884cf43f4', 'e87debef-a662-4fd7-b255-2e50c9f86d5b', 'Head of Finance', NULL),
('4d6db1e9-d0d2-4657-bcef-49f165f0c2cd', 'e87debef-a662-4fd7-b255-2e50c9f86d5b', 'Consultant', NULL),
('618c297d-9eb9-44fd-b09b-078da47e80db', 'e87debef-a662-4fd7-b255-2e50c9f86d5b', 'Operations Associate', NULL),
('621d6a10-0af2-4605-8956-13d68d129bad', 'e87debef-a662-4fd7-b255-2e50c9f86d5b', 'Associate Accountant', NULL),
('77170650-c624-4fdc-9604-e57b335fa2b0', 'e87debef-a662-4fd7-b255-2e50c9f86d5b', 'Fullstack Developer', NULL),
('79a36116-411f-4666-84c0-4146d18e01c9', 'e87debef-a662-4fd7-b255-2e50c9f86d5b', 'IT Associate', NULL),
('7d69192e-289c-4f4b-a10d-c5ee6fde33fd', 'e87debef-a662-4fd7-b255-2e50c9f86d5b', 'Accounts Executive', NULL),
('87c1ed67-313f-45d7-898a-32d23073ce18', 'e87debef-a662-4fd7-b255-2e50c9f86d5b', 'Business Analyst', NULL),
('b2b68bd6-9081-44cd-88cd-f6c3ccbde5cb', 'e87debef-a662-4fd7-b255-2e50c9f86d5b', 'HR Department', 'L3'),
('c5dce967-f682-4258-88ae-2bfbc54a0b11', 'e87debef-a662-4fd7-b255-2e50c9f86d5b', 'Digital Marketing', NULL),
('ccbed25a-2863-44e9-b98e-36e743be2a6b', 'e87debef-a662-4fd7-b255-2e50c9f86d5b', 'Operations Manager', NULL),
('ee2c8bc1-1e83-43eb-b221-7153df0a4e64', 'e87debef-a662-4fd7-b255-2e50c9f86d5b', 'Project Manager', ''),
('fd564e17-da76-4a93-87bc-0cde935d8b3c', 'e87debef-a662-4fd7-b255-2e50c9f86d5b', 'Head of HR', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `Employee`
--

CREATE TABLE `Employee` (
  `id` varchar(191) NOT NULL,
  `companyId` varchar(191) NOT NULL,
  `employeeCode` varchar(191) NOT NULL,
  `photoUrl` varchar(191) DEFAULT NULL,
  `firstName` varchar(191) NOT NULL,
  `lastName` varchar(191) NOT NULL,
  `email` varchar(191) NOT NULL,
  `phone` varchar(191) DEFAULT NULL,
  `emergencyContact` varchar(191) DEFAULT NULL,
  `address` varchar(191) DEFAULT NULL,
  `aadhaar` varchar(191) DEFAULT NULL,
  `pan` varchar(191) DEFAULT NULL,
  `passport` varchar(191) DEFAULT NULL,
  `drivingLicense` varchar(191) DEFAULT NULL,
  `uan` varchar(191) DEFAULT NULL,
  `esic` varchar(191) DEFAULT NULL,
  `pfNumber` varchar(191) DEFAULT NULL,
  `bankAccountNumber` varchar(191) DEFAULT NULL,
  `bankIfsc` varchar(191) DEFAULT NULL,
  `joiningDate` datetime(3) DEFAULT NULL,
  `confirmationDate` datetime(3) DEFAULT NULL,
  `branchId` varchar(191) DEFAULT NULL,
  `departmentId` varchar(191) DEFAULT NULL,
  `designationId` varchar(191) DEFAULT NULL,
  `managerId` varchar(191) DEFAULT NULL,
  `employmentType` varchar(191) DEFAULT NULL,
  `workLocation` varchar(191) DEFAULT NULL,
  `status` varchar(191) NOT NULL DEFAULT 'active',
  `skills` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`skills`)),
  `notes` varchar(191) DEFAULT NULL,
  `workingDaysPerWeek` int(11) NOT NULL DEFAULT 5,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  `education` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`education`)),
  `experience` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`experience`)),
  `category` varchar(191) DEFAULT NULL,
  `dob` datetime(3) DEFAULT NULL,
  `grade` varchar(191) DEFAULT NULL,
  `middleName` varchar(191) DEFAULT NULL,
  `probation` varchar(191) DEFAULT NULL,
  `reportingManager` varchar(191) DEFAULT NULL,
  `reportingManager2` varchar(191) DEFAULT NULL,
  `state` varchar(191) DEFAULT NULL,
  `subCategory` varchar(191) DEFAULT NULL,
  `subDepartment` varchar(191) DEFAULT NULL,
  `subDepartment1` varchar(191) DEFAULT NULL,
  `subDepartment2` varchar(191) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `Employee`
--

INSERT INTO `Employee` (`id`, `companyId`, `employeeCode`, `photoUrl`, `firstName`, `lastName`, `email`, `phone`, `emergencyContact`, `address`, `aadhaar`, `pan`, `passport`, `drivingLicense`, `uan`, `esic`, `pfNumber`, `bankAccountNumber`, `bankIfsc`, `joiningDate`, `confirmationDate`, `branchId`, `departmentId`, `designationId`, `managerId`, `employmentType`, `workLocation`, `status`, `skills`, `notes`, `workingDaysPerWeek`, `createdAt`, `updatedAt`, `education`, `experience`, `category`, `dob`, `grade`, `middleName`, `probation`, `reportingManager`, `reportingManager2`, `state`, `subCategory`, `subDepartment`, `subDepartment1`, `subDepartment2`) VALUES
('2623fc64-fa89-47c1-a7de-4d65fecaf0c8', 'e87debef-a662-4fd7-b255-2e50c9f86d5b', 'HR-001', NULL, 'Team', 'HR', 'hr@lordsandkings.co', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-07-20 07:57:26.680', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active', NULL, NULL, 5, '2026-07-20 07:57:26.682', '2026-08-03 05:10:24.647', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
('7e4c13c9-3803-4b2b-aa6e-8bd11c4f61c3', 'e87debef-a662-4fd7-b255-2e50c9f86d5b', 'LKE1807', NULL, 'sathishkumar', 's', 'emp1786009393879@company.com', '9962952097', NULL, NULL, '', '', NULL, NULL, '', '', '', NULL, NULL, '2024-04-12 00:00:00.000', NULL, 'b10abdb4-1f4d-487b-8e05-1cda3e1e8f60', '981fc553-2795-4243-9d9c-d7171748a759', '77170650-c624-4fdc-9604-e57b335fa2b0', NULL, NULL, NULL, 'active', NULL, NULL, 5, '2026-07-15 09:52:41.194', '2026-08-06 09:43:15.137', NULL, NULL, NULL, '1999-01-09 00:00:00.000', NULL, NULL, NULL, NULL, NULL, 'Tamil Nadu', NULL, NULL, NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `EmployeeAdminInfo`
--

CREATE TABLE `EmployeeAdminInfo` (
  `id` varchar(191) NOT NULL,
  `employeeId` varchar(191) NOT NULL,
  `salaryOn` varchar(191) DEFAULT NULL,
  `ptApplicable` tinyint(1) NOT NULL DEFAULT 0,
  `esicApplicable` tinyint(1) NOT NULL DEFAULT 0,
  `esiNo` varchar(191) DEFAULT NULL,
  `pfAsPerGovt` tinyint(1) NOT NULL DEFAULT 0,
  `pfOnTotalBasic` tinyint(1) NOT NULL DEFAULT 0,
  `employerPfAsPerGovt` tinyint(1) NOT NULL DEFAULT 0,
  `pensionNotApplicable` tinyint(1) NOT NULL DEFAULT 0,
  `otApplicable` varchar(191) DEFAULT NULL,
  `attendancePolicy` tinyint(1) NOT NULL DEFAULT 1,
  `rfidCardNo` varchar(191) DEFAULT NULL,
  `resignationNoticePeriod` varchar(191) DEFAULT NULL,
  `dateOfLeaving` datetime(3) DEFAULT NULL,
  `geoTagging` tinyint(1) NOT NULL DEFAULT 0,
  `tdsApplicable` tinyint(1) NOT NULL DEFAULT 0,
  `compOffApplicable` tinyint(1) NOT NULL DEFAULT 0,
  `employerEsicApplicable` tinyint(1) NOT NULL DEFAULT 0,
  `vpfPercentage` varchar(191) DEFAULT NULL,
  `pfNo` varchar(191) DEFAULT NULL,
  `uan` varchar(191) DEFAULT NULL,
  `employerPfOnTotalBasic` tinyint(1) NOT NULL DEFAULT 0,
  `gratuityApplicable` tinyint(1) NOT NULL DEFAULT 0,
  `gratuityNo` varchar(191) DEFAULT NULL,
  `aadhaarCardNo` varchar(191) DEFAULT NULL,
  `fingerPrintId` varchar(191) DEFAULT NULL,
  `voterCardNo` varchar(191) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `EmployeeAdminInfo`
--

INSERT INTO `EmployeeAdminInfo` (`id`, `employeeId`, `salaryOn`, `ptApplicable`, `esicApplicable`, `esiNo`, `pfAsPerGovt`, `pfOnTotalBasic`, `employerPfAsPerGovt`, `pensionNotApplicable`, `otApplicable`, `attendancePolicy`, `rfidCardNo`, `resignationNoticePeriod`, `dateOfLeaving`, `geoTagging`, `tdsApplicable`, `compOffApplicable`, `employerEsicApplicable`, `vpfPercentage`, `pfNo`, `uan`, `employerPfOnTotalBasic`, `gratuityApplicable`, `gratuityNo`, `aadhaarCardNo`, `fingerPrintId`, `voterCardNo`) VALUES
('876f74d9-f37a-453b-82c1-c38bf4da7e4b', '7e4c13c9-3803-4b2b-aa6e-8bd11c4f61c3', NULL, 0, 0, NULL, 0, 0, 0, 0, NULL, 1, NULL, NULL, NULL, 0, 0, 0, 0, NULL, NULL, NULL, 0, 0, NULL, NULL, NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `EmployeeCertificationInfo`
--

CREATE TABLE `EmployeeCertificationInfo` (
  `id` varchar(191) NOT NULL,
  `employeeId` varchar(191) NOT NULL,
  `certification` varchar(191) NOT NULL,
  `certifiedBy` varchar(191) NOT NULL,
  `year` varchar(191) DEFAULT NULL,
  `score` varchar(191) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `EmployeeContactInfo`
--

CREATE TABLE `EmployeeContactInfo` (
  `id` varchar(191) NOT NULL,
  `employeeId` varchar(191) NOT NULL,
  `currentAddress` varchar(191) DEFAULT NULL,
  `currentCountry` varchar(191) DEFAULT NULL,
  `currentDistrict` varchar(191) DEFAULT NULL,
  `currentTaluka` varchar(191) DEFAULT NULL,
  `currentPost` varchar(191) DEFAULT NULL,
  `currentPhoneNo` varchar(191) DEFAULT NULL,
  `currentPersonalEmail` varchar(191) DEFAULT NULL,
  `currentState` varchar(191) DEFAULT NULL,
  `currentCity` varchar(191) DEFAULT NULL,
  `currentVillage` varchar(191) DEFAULT NULL,
  `currentPostCode` varchar(191) DEFAULT NULL,
  `currentMobileNo` varchar(191) DEFAULT NULL,
  `isPermanentSameAsCurrent` tinyint(1) NOT NULL DEFAULT 1,
  `permanentAddress` varchar(191) DEFAULT NULL,
  `permanentCountry` varchar(191) DEFAULT NULL,
  `permanentDistrict` varchar(191) DEFAULT NULL,
  `permanentTaluka` varchar(191) DEFAULT NULL,
  `permanentPost` varchar(191) DEFAULT NULL,
  `permanentPhoneNo` varchar(191) DEFAULT NULL,
  `permanentState` varchar(191) DEFAULT NULL,
  `permanentCity` varchar(191) DEFAULT NULL,
  `permanentVillage` varchar(191) DEFAULT NULL,
  `permanentPostCode` varchar(191) DEFAULT NULL,
  `permanentMobileNo` varchar(191) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `EmployeeContactInfo`
--

INSERT INTO `EmployeeContactInfo` (`id`, `employeeId`, `currentAddress`, `currentCountry`, `currentDistrict`, `currentTaluka`, `currentPost`, `currentPhoneNo`, `currentPersonalEmail`, `currentState`, `currentCity`, `currentVillage`, `currentPostCode`, `currentMobileNo`, `isPermanentSameAsCurrent`, `permanentAddress`, `permanentCountry`, `permanentDistrict`, `permanentTaluka`, `permanentPost`, `permanentPhoneNo`, `permanentState`, `permanentCity`, `permanentVillage`, `permanentPostCode`, `permanentMobileNo`) VALUES
('e89f90f6-84f2-4458-91da-bf9874586651', '7e4c13c9-3803-4b2b-aa6e-8bd11c4f61c3', '3/e,bharathamadha street,vallalar nager,madambakkam', 'India', 'kanchipuran', '', NULL, '9962952097', 'sathishkumar999199@gmail.com', 'Tamil Nadu', 'Guduvancheri', NULL, '603202', '9962952097', 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `EmployeeDocument`
--

CREATE TABLE `EmployeeDocument` (
  `id` varchar(191) NOT NULL,
  `employeeId` varchar(191) NOT NULL,
  `type` varchar(191) NOT NULL,
  `fileUrl` varchar(191) NOT NULL,
  `uploadedAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `isSigned` tinyint(1) NOT NULL DEFAULT 0,
  `signedAt` datetime(3) DEFAULT NULL,
  `signatureHash` varchar(191) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `EmployeeDocument`
--

INSERT INTO `EmployeeDocument` (`id`, `employeeId`, `type`, `fileUrl`, `uploadedAt`, `isSigned`, `signedAt`, `signatureHash`) VALUES
('f5cc0803-c786-48b6-b50e-5012e8454cab', '7e4c13c9-3803-4b2b-aa6e-8bd11c4f61c3', 'pan', 'mztps6427f', '2026-07-15 10:15:30.336', 0, NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `EmployeeDocumentInfo`
--

CREATE TABLE `EmployeeDocumentInfo` (
  `id` varchar(191) NOT NULL,
  `employeeId` varchar(191) NOT NULL,
  `documentName` varchar(191) NOT NULL,
  `documentFile` varchar(191) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `EmployeeEmergencyContact`
--

CREATE TABLE `EmployeeEmergencyContact` (
  `id` varchar(191) NOT NULL,
  `employeeId` varchar(191) NOT NULL,
  `name` varchar(191) NOT NULL,
  `address` varchar(191) DEFAULT NULL,
  `mobileNo` varchar(191) NOT NULL,
  `telNo` varchar(191) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `EmployeeEmergencyContact`
--

INSERT INTO `EmployeeEmergencyContact` (`id`, `employeeId`, `name`, `address`, `mobileNo`, `telNo`) VALUES
('5051a604-275a-4834-aeb2-1ac1c1ac01dd', '7e4c13c9-3803-4b2b-aa6e-8bd11c4f61c3', 'selva kumar', NULL, '8248553771', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `EmployeeExperienceInfo`
--

CREATE TABLE `EmployeeExperienceInfo` (
  `id` varchar(191) NOT NULL,
  `employeeId` varchar(191) NOT NULL,
  `organization` varchar(191) NOT NULL,
  `designation` varchar(191) NOT NULL,
  `startDate` datetime(3) NOT NULL,
  `endDate` datetime(3) NOT NULL,
  `lastSalary` varchar(191) DEFAULT NULL,
  `reasonForLeaving` varchar(191) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `EmployeeFamilyMember`
--

CREATE TABLE `EmployeeFamilyMember` (
  `id` varchar(191) NOT NULL,
  `employeeId` varchar(191) NOT NULL,
  `relation` varchar(191) NOT NULL,
  `name` varchar(191) NOT NULL,
  `mobile` varchar(191) DEFAULT NULL,
  `description` varchar(191) DEFAULT NULL,
  `occupation` varchar(191) DEFAULT NULL,
  `birthDate` datetime(3) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `EmployeeImmigrationInfo`
--

CREATE TABLE `EmployeeImmigrationInfo` (
  `id` varchar(191) NOT NULL,
  `employeeId` varchar(191) NOT NULL,
  `type` varchar(191) NOT NULL,
  `documentNumber` varchar(191) NOT NULL,
  `citizenship` varchar(191) DEFAULT NULL,
  `issuedDate` datetime(3) NOT NULL,
  `expiryDate` datetime(3) NOT NULL,
  `comments` varchar(191) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `EmployeePaymentInfo`
--

CREATE TABLE `EmployeePaymentInfo` (
  `id` varchar(191) NOT NULL,
  `employeeId` varchar(191) NOT NULL,
  `paymentMethod` varchar(191) DEFAULT NULL,
  `payeeName` varchar(191) DEFAULT NULL,
  `bankName` varchar(191) DEFAULT NULL,
  `branchCode` varchar(191) DEFAULT NULL,
  `branchName` varchar(191) DEFAULT NULL,
  `branchPhone` varchar(191) DEFAULT NULL,
  `accountType` varchar(191) DEFAULT NULL,
  `accountNo` varchar(191) DEFAULT NULL,
  `ifscCode` varchar(191) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `EmployeePaymentInfo`
--

INSERT INTO `EmployeePaymentInfo` (`id`, `employeeId`, `paymentMethod`, `payeeName`, `bankName`, `branchCode`, `branchName`, `branchPhone`, `accountType`, `accountNo`, `ifscCode`) VALUES
('1d2c4457-bbb9-4e95-aa09-f458026f4fab', '7e4c13c9-3803-4b2b-aa6e-8bd11c4f61c3', 'Bank Transfer', 'sathishkumar', 'SBI', '12932', 'guduvanchery', NULL, 'Savings', '32599748671', 'sbin0012932');

-- --------------------------------------------------------

--
-- Table structure for table `EmployeePersonalInfo`
--

CREATE TABLE `EmployeePersonalInfo` (
  `id` varchar(191) NOT NULL,
  `employeeId` varchar(191) NOT NULL,
  `gender` varchar(191) DEFAULT NULL,
  `maritalStatus` varchar(191) DEFAULT NULL,
  `marriageDate` datetime(3) DEFAULT NULL,
  `drivingLicenseNo` varchar(191) DEFAULT NULL,
  `nationality` varchar(191) DEFAULT NULL,
  `identificationMark` varchar(191) DEFAULT NULL,
  `nomineeName` varchar(191) DEFAULT NULL,
  `panNo` varchar(191) DEFAULT NULL,
  `height` varchar(191) DEFAULT NULL,
  `weight` varchar(191) DEFAULT NULL,
  `bloodGroup` varchar(191) DEFAULT NULL,
  `licenseExpiry` datetime(3) DEFAULT NULL,
  `religion` varchar(191) DEFAULT NULL,
  `nss` varchar(191) DEFAULT NULL,
  `relationship` varchar(191) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `EmployeePersonalInfo`
--

INSERT INTO `EmployeePersonalInfo` (`id`, `employeeId`, `gender`, `maritalStatus`, `marriageDate`, `drivingLicenseNo`, `nationality`, `identificationMark`, `nomineeName`, `panNo`, `height`, `weight`, `bloodGroup`, `licenseExpiry`, `religion`, `nss`, `relationship`) VALUES
('4e1acef2-3cf3-4387-89fd-4a2c5259fd65', '7e4c13c9-3803-4b2b-aa6e-8bd11c4f61c3', 'Male', 'Single', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'A+', NULL, NULL, NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `EmployeeQualificationInfo`
--

CREATE TABLE `EmployeeQualificationInfo` (
  `id` varchar(191) NOT NULL,
  `employeeId` varchar(191) NOT NULL,
  `qualification` varchar(191) NOT NULL,
  `boardUniversity` varchar(191) NOT NULL,
  `subject` varchar(191) DEFAULT NULL,
  `score` varchar(191) NOT NULL,
  `schoolCollege` varchar(191) DEFAULT NULL,
  `passingYear` varchar(191) NOT NULL,
  `description` varchar(191) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `ESICConfig`
--

CREATE TABLE `ESICConfig` (
  `id` varchar(191) NOT NULL,
  `companyId` varchar(191) NOT NULL,
  `component` varchar(191) NOT NULL,
  `rate` varchar(191) NOT NULL,
  `wageLimit` varchar(191) NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `Evaluation360`
--

CREATE TABLE `Evaluation360` (
  `id` varchar(191) NOT NULL,
  `companyId` varchar(191) NOT NULL,
  `employeeId` varchar(191) NOT NULL,
  `cycle` varchar(191) NOT NULL,
  `avgScore` double NOT NULL,
  `rating` varchar(191) NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `EvaluationSetup`
--

CREATE TABLE `EvaluationSetup` (
  `id` varchar(191) NOT NULL,
  `companyId` varchar(191) NOT NULL,
  `employeeId` varchar(191) NOT NULL,
  `type` varchar(191) NOT NULL,
  `reviewers` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`reviewers`)),
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `ExitChecklist`
--

CREATE TABLE `ExitChecklist` (
  `id` varchar(191) NOT NULL,
  `exitRequestId` varchar(191) NOT NULL,
  `task` varchar(191) NOT NULL,
  `completedAt` datetime(3) DEFAULT NULL,
  `completedBy` varchar(191) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `ExitRequest`
--

CREATE TABLE `ExitRequest` (
  `id` varchar(191) NOT NULL,
  `companyId` varchar(191) NOT NULL,
  `employeeId` varchar(191) NOT NULL,
  `resignationDate` datetime(3) NOT NULL,
  `lastWorkingDay` datetime(3) NOT NULL,
  `reason` varchar(191) DEFAULT NULL,
  `exitInterviewNote` varchar(191) DEFAULT NULL,
  `status` varchar(191) NOT NULL DEFAULT 'initiated',
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `Expense`
--

CREATE TABLE `Expense` (
  `id` varchar(191) NOT NULL,
  `employeeId` varchar(191) NOT NULL,
  `category` varchar(191) NOT NULL,
  `amount` double NOT NULL,
  `status` varchar(191) NOT NULL DEFAULT 'pending',
  `receiptUrl` varchar(191) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `Expense`
--

INSERT INTO `Expense` (`id`, `employeeId`, `category`, `amount`, `status`, `receiptUrl`, `createdAt`) VALUES
('4bc81221-8f9f-4393-b25a-da83e4d0a307', '7e4c13c9-3803-4b2b-aa6e-8bd11c4f61c3', 'travel', 500, 'pending', '', '2026-08-05 10:14:06.973');

-- --------------------------------------------------------

--
-- Table structure for table `FlexibleHolidayRequest`
--

CREATE TABLE `FlexibleHolidayRequest` (
  `id` varchar(191) NOT NULL,
  `companyId` varchar(191) NOT NULL,
  `employeeId` varchar(191) NOT NULL,
  `date` datetime(3) NOT NULL,
  `reason` varchar(191) DEFAULT NULL,
  `status` varchar(191) NOT NULL DEFAULT 'pending',
  `approvedBy` varchar(191) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `FnfSettlement`
--

CREATE TABLE `FnfSettlement` (
  `id` varchar(191) NOT NULL,
  `employeeId` varchar(191) NOT NULL,
  `lastWorkingDay` datetime(3) NOT NULL,
  `noticePeriodDays` int(11) NOT NULL DEFAULT 0,
  `noticeRecovery` double NOT NULL DEFAULT 0,
  `unpaidSalaryDays` int(11) NOT NULL DEFAULT 0,
  `unpaidSalaryAmt` double NOT NULL DEFAULT 0,
  `gratuityAmount` double NOT NULL DEFAULT 0,
  `leaveEncashDays` double NOT NULL DEFAULT 0,
  `leaveEncashAmount` double NOT NULL DEFAULT 0,
  `otherDeductions` double NOT NULL DEFAULT 0,
  `netSettlement` double NOT NULL,
  `isGratuityEligible` tinyint(1) NOT NULL DEFAULT 0,
  `status` varchar(191) NOT NULL DEFAULT 'draft',
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `Goal`
--

CREATE TABLE `Goal` (
  `id` varchar(191) NOT NULL,
  `employeeId` varchar(191) NOT NULL,
  `title` varchar(191) NOT NULL,
  `description` varchar(191) DEFAULT NULL,
  `progress` double NOT NULL DEFAULT 0,
  `dueDate` datetime(3) DEFAULT NULL,
  `status` varchar(191) NOT NULL DEFAULT 'pending'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `HelpdeskTicket`
--

CREATE TABLE `HelpdeskTicket` (
  `id` varchar(191) NOT NULL,
  `companyId` varchar(191) NOT NULL,
  `employeeId` varchar(191) DEFAULT NULL,
  `subject` varchar(191) NOT NULL,
  `description` text NOT NULL,
  `status` varchar(191) NOT NULL DEFAULT 'open',
  `priority` varchar(191) NOT NULL DEFAULT 'medium',
  `category` varchar(191) NOT NULL DEFAULT 'general',
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `Holiday`
--

CREATE TABLE `Holiday` (
  `id` varchar(191) NOT NULL,
  `companyId` varchar(191) NOT NULL,
  `name` varchar(191) NOT NULL,
  `date` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `Holiday`
--

INSERT INTO `Holiday` (`id`, `companyId`, `name`, `date`) VALUES
('1cf60e7c-c226-4eca-a89e-d071b71f5dca', 'e87debef-a662-4fd7-b255-2e50c9f86d5b', 'Vinayakar Chathurthi', '2026-09-14 00:00:00.000'),
('52df3f86-37c1-49fc-8980-fb3a649a1855', 'e87debef-a662-4fd7-b255-2e50c9f86d5b', 'Independence Day', '2026-08-15 00:00:00.000'),
('591f9b59-5953-4dfa-a36a-f52ae9691cf0', 'e87debef-a662-4fd7-b255-2e50c9f86d5b', 'Ayutha Pooja', '2026-10-19 00:00:00.000'),
('8a6fe45e-b747-4539-a939-d75ec80bdd8b', 'e87debef-a662-4fd7-b255-2e50c9f86d5b', 'Christmas Day', '2026-12-25 00:00:00.000'),
('9d534f7e-85bc-401f-8244-9c6e18063a60', 'e87debef-a662-4fd7-b255-2e50c9f86d5b', 'Vijaya Dasami', '2026-10-20 00:00:00.000'),
('a6ccde9f-6243-47f7-b380-816ce07faf8f', 'e87debef-a662-4fd7-b255-2e50c9f86d5b', 'Krishna Jayanti', '2026-09-04 00:00:00.000'),
('a73126ba-35ed-42bd-b1d4-f59a3d28e1aa', 'e87debef-a662-4fd7-b255-2e50c9f86d5b', 'Gandhi Jayanti', '2026-10-02 00:00:00.000'),
('df393aab-1d2c-4c5e-9769-68c36d281f25', 'e87debef-a662-4fd7-b255-2e50c9f86d5b', 'Milad-un-Nabi', '2026-08-26 00:00:00.000');

-- --------------------------------------------------------

--
-- Table structure for table `HRForm`
--

CREATE TABLE `HRForm` (
  `id` varchar(191) NOT NULL,
  `companyId` varchar(191) NOT NULL,
  `formName` varchar(191) NOT NULL,
  `category` varchar(191) NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `HRMaster`
--

CREATE TABLE `HRMaster` (
  `id` varchar(191) NOT NULL,
  `companyId` varchar(191) NOT NULL,
  `master` varchar(191) NOT NULL,
  `value` varchar(191) NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `ImportMapping`
--

CREATE TABLE `ImportMapping` (
  `id` varchar(191) NOT NULL,
  `companyId` varchar(191) NOT NULL,
  `employee` varchar(191) NOT NULL,
  `manager` varchar(191) NOT NULL,
  `email` varchar(191) NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `IncomeSlabCategory`
--

CREATE TABLE `IncomeSlabCategory` (
  `id` varchar(191) NOT NULL,
  `companyId` varchar(191) NOT NULL,
  `category` varchar(191) NOT NULL,
  `applicability` varchar(191) NOT NULL,
  `regime` varchar(191) NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `Integration`
--

CREATE TABLE `Integration` (
  `id` varchar(191) NOT NULL,
  `companyId` varchar(191) NOT NULL,
  `provider` varchar(191) NOT NULL,
  `status` varchar(191) NOT NULL DEFAULT 'disconnected',
  `config` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`config`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `Integration`
--

INSERT INTO `Integration` (`id`, `companyId`, `provider`, `status`, `config`) VALUES
('114ba017-5f4d-46b1-89fa-f9a49e73c360', 'e87debef-a662-4fd7-b255-2e50c9f86d5b', 'tally', 'connected', '{}'),
('4f917668-6670-4d2b-9aa8-31d6347bdef1', 'e87debef-a662-4fd7-b255-2e50c9f86d5b', 'google_calendar', 'connected', '{}'),
('71e0e027-6ee2-4ee5-8b7d-ba694c22652c', 'e87debef-a662-4fd7-b255-2e50c9f86d5b', 'razorpay', 'connected', '{}'),
('ebef7583-8dac-4ad8-aa2e-ac0bef0a19ea', 'e87debef-a662-4fd7-b255-2e50c9f86d5b', 'tax-master', 'connected', '{\"financialYear\":\"FY 2025-26\",\"standardDeduction\":50000,\"rebateLimit\":700000,\"healthEducationCess\":4,\"oldRegimeSlabs\":[{\"minIncome\":0,\"maxIncome\":250000,\"rate\":0}],\"newRegimeSlabs\":[{\"minIncome\":0,\"maxIncome\":300000,\"rate\":0}]}');

-- --------------------------------------------------------

--
-- Table structure for table `Interview`
--

CREATE TABLE `Interview` (
  `id` varchar(191) NOT NULL,
  `candidateId` varchar(191) NOT NULL,
  `scheduledAt` datetime(3) NOT NULL,
  `interviewer` varchar(191) DEFAULT NULL,
  `feedback` varchar(191) DEFAULT NULL,
  `rating` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `Invoice`
--

CREATE TABLE `Invoice` (
  `id` varchar(191) NOT NULL,
  `companyId` varchar(191) NOT NULL,
  `subscriptionId` varchar(191) DEFAULT NULL,
  `amount` double NOT NULL,
  `gstAmount` double NOT NULL DEFAULT 0,
  `status` varchar(191) NOT NULL DEFAULT 'unpaid',
  `issuedAt` datetime(3) NOT NULL DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `Job`
--

CREATE TABLE `Job` (
  `id` varchar(191) NOT NULL,
  `companyId` varchar(191) NOT NULL,
  `title` varchar(191) NOT NULL,
  `description` varchar(191) DEFAULT NULL,
  `status` varchar(191) NOT NULL DEFAULT 'open'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `KPA`
--

CREATE TABLE `KPA` (
  `id` varchar(191) NOT NULL,
  `companyId` varchar(191) NOT NULL,
  `name` varchar(191) NOT NULL,
  `weight` varchar(191) NOT NULL,
  `description` varchar(191) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `KPI`
--

CREATE TABLE `KPI` (
  `id` varchar(191) NOT NULL,
  `companyId` varchar(191) NOT NULL,
  `kraId` varchar(191) NOT NULL,
  `name` varchar(191) NOT NULL,
  `category` varchar(191) NOT NULL,
  `unit` varchar(191) NOT NULL,
  `weight` varchar(191) NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `KPIAssignment`
--

CREATE TABLE `KPIAssignment` (
  `id` varchar(191) NOT NULL,
  `companyId` varchar(191) NOT NULL,
  `employeeId` varchar(191) NOT NULL,
  `kpiId` varchar(191) NOT NULL,
  `weight` varchar(191) NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `KPITarget`
--

CREATE TABLE `KPITarget` (
  `id` varchar(191) NOT NULL,
  `companyId` varchar(191) NOT NULL,
  `employeeId` varchar(191) NOT NULL,
  `kpiId` varchar(191) NOT NULL,
  `period` varchar(191) NOT NULL,
  `target` varchar(191) NOT NULL,
  `type` varchar(191) NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `KRA`
--

CREATE TABLE `KRA` (
  `id` varchar(191) NOT NULL,
  `companyId` varchar(191) NOT NULL,
  `kpaId` varchar(191) NOT NULL,
  `name` varchar(191) NOT NULL,
  `description` varchar(191) DEFAULT NULL,
  `weight` varchar(191) NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `LeaveBalance`
--

CREATE TABLE `LeaveBalance` (
  `id` varchar(191) NOT NULL,
  `employeeId` varchar(191) NOT NULL,
  `leaveTypeId` varchar(191) NOT NULL,
  `year` int(11) NOT NULL,
  `allotted` double NOT NULL,
  `used` double NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `LeaveBalance`
--

INSERT INTO `LeaveBalance` (`id`, `employeeId`, `leaveTypeId`, `year`, `allotted`, `used`) VALUES
('b3bebcda-3f71-4279-ba1a-d55f6abbb1e0', '7e4c13c9-3803-4b2b-aa6e-8bd11c4f61c3', '326c0a5b-0ee0-4040-8562-949b19e8e3a5', 2026, 0, 6.5);

-- --------------------------------------------------------

--
-- Table structure for table `LeaveCancellationRequest`
--

CREATE TABLE `LeaveCancellationRequest` (
  `id` varchar(191) NOT NULL,
  `companyId` varchar(191) NOT NULL,
  `leaveRequestId` varchar(191) NOT NULL,
  `employeeId` varchar(191) NOT NULL,
  `reason` varchar(191) DEFAULT NULL,
  `status` varchar(191) NOT NULL DEFAULT 'pending',
  `approvedBy` varchar(191) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `LeaveRequest`
--

CREATE TABLE `LeaveRequest` (
  `id` varchar(191) NOT NULL,
  `employeeId` varchar(191) NOT NULL,
  `leaveTypeId` varchar(191) NOT NULL,
  `startDate` datetime(3) NOT NULL,
  `endDate` datetime(3) NOT NULL,
  `isHalfDay` tinyint(1) NOT NULL DEFAULT 0,
  `reason` varchar(191) DEFAULT NULL,
  `status` varchar(191) NOT NULL DEFAULT 'pending',
  `approverId` varchar(191) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `LeaveRequest`
--

INSERT INTO `LeaveRequest` (`id`, `employeeId`, `leaveTypeId`, `startDate`, `endDate`, `isHalfDay`, `reason`, `status`, `approverId`, `createdAt`) VALUES
('4dfbb448-331b-4770-8a2f-fb6496b9eb08', '7e4c13c9-3803-4b2b-aa6e-8bd11c4f61c3', '326c0a5b-0ee0-4040-8562-949b19e8e3a5', '2026-07-22 00:00:00.000', '2026-07-22 00:00:00.000', 0, '', 'approved', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '2026-07-21 10:21:21.039'),
('7e0906b1-1161-483a-92a3-a7abc6d4ea07', '7e4c13c9-3803-4b2b-aa6e-8bd11c4f61c3', '326c0a5b-0ee0-4040-8562-949b19e8e3a5', '2026-08-06 00:00:00.000', '2026-08-06 00:00:00.000', 0, '', 'approved', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '2026-08-05 05:32:36.025'),
('b0f5f492-be7d-44f8-af8b-ba96b212689e', '7e4c13c9-3803-4b2b-aa6e-8bd11c4f61c3', '326c0a5b-0ee0-4040-8562-949b19e8e3a5', '2026-07-01 00:00:00.000', '2026-07-15 00:00:00.000', 0, '', 'rejected', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '2026-07-15 11:03:19.627'),
('e1e193a7-577f-4c1f-b7ff-8ebe060dcc95', '7e4c13c9-3803-4b2b-aa6e-8bd11c4f61c3', '326c0a5b-0ee0-4040-8562-949b19e8e3a5', '2026-08-07 00:00:00.000', '2026-08-07 00:00:00.000', 1, '', 'approved', 'bc3515dd-c5d7-4266-9147-de69624d5b1f', '2026-08-07 09:21:28.390');

-- --------------------------------------------------------

--
-- Table structure for table `LeaveType`
--

CREATE TABLE `LeaveType` (
  `id` varchar(191) NOT NULL,
  `companyId` varchar(191) NOT NULL,
  `name` varchar(191) NOT NULL,
  `paid` tinyint(1) NOT NULL DEFAULT 1,
  `accrualRate` double NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `LeaveType`
--

INSERT INTO `LeaveType` (`id`, `companyId`, `name`, `paid`, `accrualRate`) VALUES
('326c0a5b-0ee0-4040-8562-949b19e8e3a5', 'e87debef-a662-4fd7-b255-2e50c9f86d5b', 'sick leave', 1, 0);

-- --------------------------------------------------------

--
-- Table structure for table `LoanRequest`
--

CREATE TABLE `LoanRequest` (
  `id` varchar(191) NOT NULL,
  `companyId` varchar(191) NOT NULL,
  `employeeId` varchar(191) NOT NULL,
  `type` varchar(191) NOT NULL DEFAULT 'loan',
  `purpose` varchar(191) NOT NULL,
  `amount` double NOT NULL,
  `emiMonths` int(11) NOT NULL DEFAULT 0,
  `emi` double NOT NULL DEFAULT 0,
  `amountRepaid` double NOT NULL DEFAULT 0,
  `status` varchar(191) NOT NULL DEFAULT 'pending',
  `appliedOn` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `approvedOn` datetime(3) DEFAULT NULL,
  `approvedBy` varchar(191) DEFAULT NULL,
  `notes` varchar(191) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `LWFConfig`
--

CREATE TABLE `LWFConfig` (
  `id` varchar(191) NOT NULL,
  `companyId` varchar(191) NOT NULL,
  `state` varchar(191) NOT NULL,
  `employeeShare` double NOT NULL,
  `employerShare` double NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `Offer`
--

CREATE TABLE `Offer` (
  `id` varchar(191) NOT NULL,
  `candidateId` varchar(191) NOT NULL,
  `ctc` double NOT NULL,
  `status` varchar(191) NOT NULL DEFAULT 'pending'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `OptionalHolidayRequest`
--

CREATE TABLE `OptionalHolidayRequest` (
  `id` varchar(191) NOT NULL,
  `companyId` varchar(191) NOT NULL,
  `employeeId` varchar(191) NOT NULL,
  `date` datetime(3) NOT NULL,
  `holidayName` varchar(191) DEFAULT NULL,
  `reason` varchar(191) DEFAULT NULL,
  `status` varchar(191) NOT NULL DEFAULT 'pending',
  `approvedBy` varchar(191) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `OvertimeRequest`
--

CREATE TABLE `OvertimeRequest` (
  `id` varchar(191) NOT NULL,
  `companyId` varchar(191) NOT NULL,
  `employeeId` varchar(191) NOT NULL,
  `date` datetime(3) NOT NULL,
  `hours` double NOT NULL,
  `reason` varchar(191) DEFAULT NULL,
  `status` varchar(191) NOT NULL DEFAULT 'pending',
  `approvedBy` varchar(191) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `PayrollCycle`
--

CREATE TABLE `PayrollCycle` (
  `id` varchar(191) NOT NULL,
  `companyId` varchar(191) NOT NULL,
  `month` int(11) NOT NULL,
  `year` int(11) NOT NULL,
  `status` varchar(191) NOT NULL DEFAULT 'draft'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `PayrollCycle`
--

INSERT INTO `PayrollCycle` (`id`, `companyId`, `month`, `year`, `status`) VALUES
('a9b7d97a-f865-4482-b9e5-d7f8174b534b', 'e87debef-a662-4fd7-b255-2e50c9f86d5b', 7, 2026, 'processed'),
('df1e9f17-ad4f-4082-af82-b3a5f9adb370', 'e87debef-a662-4fd7-b255-2e50c9f86d5b', 8, 2026, 'processed');

-- --------------------------------------------------------

--
-- Table structure for table `Payslip`
--

CREATE TABLE `Payslip` (
  `id` varchar(191) NOT NULL,
  `employeeId` varchar(191) NOT NULL,
  `payrollCycleId` varchar(191) NOT NULL,
  `grossPay` double NOT NULL,
  `totalDeductions` double NOT NULL,
  `netPay` double NOT NULL,
  `breakdown` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`breakdown`)),
  `generatedAt` datetime(3) NOT NULL DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `Payslip`
--

INSERT INTO `Payslip` (`id`, `employeeId`, `payrollCycleId`, `grossPay`, `totalDeductions`, `netPay`, `breakdown`, `generatedAt`) VALUES
('08bc5317-3067-4276-9ddc-3c02b5896c9b', '7e4c13c9-3803-4b2b-aa6e-8bd11c4f61c3', 'a9b7d97a-f865-4482-b9e5-d7f8174b534b', 20000, 1350, 18650, '{\"basic\":10000,\"hra\":4000,\"da\":0,\"conveyance\":1000,\"medical\":1250,\"specialAllowance\":3750,\"shiftAllowance\":0,\"pfDeduction\":1200,\"esiDeduction\":150,\"ptDeduction\":0,\"tdsMonthly\":0,\"taxRegime\":\"new\",\"taxableAnnual\":165000,\"effectiveTaxRate\":\"0.00%\",\"lopDays\":0,\"lopAmount\":0,\"totalWorkingDays\":23}', '2026-07-15 10:11:25.640'),
('1ccc587b-976e-44a1-9dd8-00a4707fc67a', '2623fc64-fa89-47c1-a7de-4d65fecaf0c8', 'df1e9f17-ad4f-4082-af82-b3a5f9adb370', 47068, 3140.144, 43927.856, '{\"basic\":23534,\"hra\":9414,\"da\":0,\"conveyance\":1600,\"medical\":1250,\"specialAllowance\":11270,\"shiftAllowance\":0,\"pfDeduction\":1800,\"esiDeduction\":0,\"ptDeduction\":0,\"tdsMonthly\":1340,\"taxRegime\":\"old\",\"taxableAnnual\":514816,\"effectiveTaxRate\":\"2.85%\",\"lopDays\":0,\"lopAmount\":0,\"totalWorkingDays\":21}', '2026-08-03 05:13:22.111'),
('298d576b-a0bd-4737-87f8-b1f0ce6c04d1', '7e4c13c9-3803-4b2b-aa6e-8bd11c4f61c3', 'df1e9f17-ad4f-4082-af82-b3a5f9adb370', 20000, 1350, 18650, '{\"basic\":10000,\"hra\":5000,\"da\":0,\"conveyance\":0,\"medical\":0,\"specialAllowance\":5000,\"shiftAllowance\":0,\"pfDeduction\":1200,\"esiDeduction\":150,\"ptDeduction\":0,\"tdsMonthly\":0,\"taxRegime\":\"old\",\"taxableAnnual\":190000,\"effectiveTaxRate\":\"0.00%\",\"lopDays\":0,\"lopAmount\":0,\"totalWorkingDays\":21}', '2026-08-03 05:13:22.351');

-- --------------------------------------------------------

--
-- Table structure for table `PerformanceReview`
--

CREATE TABLE `PerformanceReview` (
  `id` varchar(191) NOT NULL,
  `employeeId` varchar(191) NOT NULL,
  `reviewerId` varchar(191) NOT NULL,
  `cycle` varchar(191) NOT NULL,
  `type` varchar(191) NOT NULL,
  `score` double DEFAULT NULL,
  `comments` varchar(191) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `Permission`
--

CREATE TABLE `Permission` (
  `id` varchar(191) NOT NULL,
  `roleId` varchar(191) NOT NULL,
  `module` varchar(191) NOT NULL,
  `action` varchar(191) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `Permission`
--

INSERT INTO `Permission` (`id`, `roleId`, `module`, `action`) VALUES
('0be5df4a-bb46-47a7-a7fb-74dcdbe86673', 'a0fa27f0-c3e1-4f1d-a050-0e030039cbfe', 'ALL', 'ALL'),
('d9a2de57-35cf-472e-8bc3-3275914d2be4', 'a46db7db-2575-47e7-8f10-64d0b0d4382d', 'ALL', 'ALL');

-- --------------------------------------------------------

--
-- Table structure for table `PFConfig`
--

CREATE TABLE `PFConfig` (
  `id` varchar(191) NOT NULL,
  `companyId` varchar(191) NOT NULL,
  `component` varchar(191) NOT NULL,
  `rate` varchar(191) NOT NULL,
  `cap` varchar(191) NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `ProfessionalTaxSlab`
--

CREATE TABLE `ProfessionalTaxSlab` (
  `id` varchar(191) NOT NULL,
  `companyId` varchar(191) NOT NULL,
  `state` varchar(191) NOT NULL,
  `fromAmount` double NOT NULL,
  `toAmount` double NOT NULL,
  `amount` double NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `Project`
--

CREATE TABLE `Project` (
  `id` varchar(191) NOT NULL,
  `companyId` varchar(191) NOT NULL,
  `name` varchar(191) NOT NULL,
  `status` varchar(191) NOT NULL DEFAULT 'active',
  `billableHours` double NOT NULL DEFAULT 0,
  `billedAmount` double NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `RefreshToken`
--

CREATE TABLE `RefreshToken` (
  `id` varchar(191) NOT NULL,
  `userId` varchar(191) NOT NULL,
  `tokenHash` varchar(191) NOT NULL,
  `expiresAt` datetime(3) NOT NULL,
  `revoked` tinyint(1) NOT NULL DEFAULT 0,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `RefreshToken`
--

INSERT INTO `RefreshToken` (`id`, `userId`, `tokenHash`, `expiresAt`, `revoked`, `createdAt`) VALUES
('005a9082-ef64-4e53-a5b9-e09754dd19a0', 'bc3515dd-c5d7-4266-9147-de69624d5b1f', '$2b$10$/4jYZnfZk5hTZYtlOYwXJ.Lk17TbN2CzsmQ/lOI2xcikebueJAFWu', '2026-07-27 10:26:53.653', 0, '2026-07-20 10:26:53.654'),
('0073fda5-7132-4127-bbfd-f0945556fd7f', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$tZ1XB7kY3PMpL2igN1CxTOwpyXUfhARHazHrtRprnZ2rmz/zdH6UW', '2026-08-17 10:47:24.247', 1, '2026-08-10 10:47:24.248'),
('009b25b8-f8a0-40d7-bf97-a63c27cca1c7', 'bc3515dd-c5d7-4266-9147-de69624d5b1f', '$2b$10$8gxznrbEh7Ny4tSfC2CNhe32GYunp3yKOePD/W8lXzT6qlqu391JS', '2026-08-10 10:02:44.831', 1, '2026-08-03 10:02:44.843'),
('014fb268-6b3b-4835-81be-093783f01369', 'f4f162b0-d691-40fa-8ae1-704b095f0302', '$2b$10$Zz/8bLj5tnb0f6ANdhRMXefOOwU3vTgJ3DZRMt22PC/xpWGej2iUO', '2026-08-13 06:14:11.121', 1, '2026-08-06 06:14:11.123'),
('02443d42-cfdf-4832-915f-f6f08db7e7fe', 'bc3515dd-c5d7-4266-9147-de69624d5b1f', '$2b$10$dfak0J7wyqja7P0qmywgAOrgNwxVxVINE1eKpq8wQQd./JWyljyje', '2026-08-10 05:32:15.667', 1, '2026-08-03 05:32:15.677'),
('04183617-c643-4e48-967e-c68dec72b545', 'f4f162b0-d691-40fa-8ae1-704b095f0302', '$2b$10$LqNimm6an0tuaqM92ZTYTei1/tSwyJWdPNHFx1O9IiO7TTFYgI0QW', '2026-08-06 10:18:43.695', 0, '2026-07-30 10:18:43.696'),
('0578474a-347b-4bb1-b8f2-3b4c63b6fe0c', 'bc3515dd-c5d7-4266-9147-de69624d5b1f', '$2b$10$HQC9A6X/nMT59eZv0X/ih..cK7W6ZRkaUurQrGYGCBlY/O0/jlHWi', '2026-08-10 10:03:56.672', 1, '2026-08-03 10:03:56.675'),
('05a3d011-c48e-4957-87fc-ea641ffff736', 'f4f162b0-d691-40fa-8ae1-704b095f0302', '$2b$10$0mSGWp5K.GLFGeIDycU11.8HrbuoiwhhRbz4xwlotWHR2UEhxNNC.', '2026-08-06 16:11:40.731', 1, '2026-07-30 16:11:40.734'),
('06d6aa5c-29c4-4000-bb32-1742252c469f', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$nMmflYicJsbN8w5ebfycHuRYfETlOLBfaBxUSTTjQpx3ob2KiDze.', '2026-08-13 10:45:11.559', 1, '2026-08-06 10:45:11.561'),
('08a62214-86c0-409e-b617-fbace8398de4', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$bsRnJtNOtvq8dO8ctgtq.OiSZ0RMQhkOj5mkOR7HbgYhBcC9Mr6Va', '2026-08-06 09:21:07.246', 0, '2026-07-30 09:21:07.249'),
('08b8d1ef-f828-45be-a0f5-c685d63cec3a', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$cyoO6Lbc1ckdHNip6QDKdOsPFfJxfcLsqSqaomjY1pXpUYiGZx0rq', '2026-08-10 05:11:11.047', 1, '2026-08-03 05:11:11.052'),
('08ca945f-ad34-4913-9251-537e58a0bd8d', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$TbnhpPBc1VfGU7asAeeejugG46mnIAPgWTGKRa7ahN1obYcm/DrAS', '2026-08-10 07:45:10.342', 1, '2026-08-03 07:45:10.375'),
('0a51415e-eb31-49b2-bf16-9d52dfdf9fec', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$y/C3VA8SLK3208TWNcPiSeu0R2NYgKKa0A1jvQhw4EobG7lfZfTgK', '2026-08-13 07:58:30.744', 1, '2026-08-06 07:58:30.745'),
('0ab4df35-284a-4202-9200-b8a9826e5e01', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$koQodvuBjM4u9/T9Yr.BGeLFzyolg4hkW5ENnX65/XDaXPdwBpGVO', '2026-08-07 06:00:16.293', 1, '2026-07-31 06:00:16.294'),
('0bf86690-3e73-4af6-a6d1-d3dbf39a0c27', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$FiDGzwtG3JGQUXYTuQTNTOY59dudY4jsFXs6YYp4o8891NsvkQGAK', '2026-08-10 10:04:24.428', 1, '2026-08-03 10:04:24.431'),
('0c7a677c-2429-400d-a5a6-fd9705c40d75', 'f4f162b0-d691-40fa-8ae1-704b095f0302', '$2b$10$rGr/TphE6LLOOsObn6jlC.iz92TZNiGW7SksdIoSNAFY9Ae3.EAWS', '2026-07-23 09:53:40.326', 0, '2026-07-16 09:53:40.327'),
('0cc9557a-2dde-4121-b9bc-fb7ca37cb7df', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$MRiACm8by1jNhIPW9EMNCeo0umj5nh9.4sQhsigPGV93dRFVsDEZ2', '2026-08-14 05:47:12.789', 1, '2026-08-07 05:47:12.791'),
('0d0fe0bc-e00b-40bc-b2f9-8b4a42d8735f', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$c/C04uS81VN9Tmusk3DXCu82mZk5JBdspzpHSiH8nHP9518NBN0Ce', '2026-07-31 09:40:48.561', 0, '2026-07-24 09:40:48.562'),
('0e53e4bc-c3d7-41f7-beb4-1918d43b962e', 'f4f162b0-d691-40fa-8ae1-704b095f0302', '$2b$10$qjjLWHmpSo8eSHt1hxyHy.Jba6WRvn4eMcP9I8sfQZEES0Ey58c8C', '2026-08-13 06:17:07.640', 1, '2026-08-06 06:17:07.642'),
('0ee495af-2b4c-4718-b1f6-2e591d810d3b', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$jsHDAcu6tclDjyhXRFoghOqXDyY4wnFWk53a55gtEYDx1qVQhGYSm', '2026-07-31 10:02:55.660', 0, '2026-07-24 10:02:55.661'),
('0f9df03d-2add-4e5c-9017-9aee875e33d2', 'bc3515dd-c5d7-4266-9147-de69624d5b1f', '$2b$10$zeUe0HlUOirSHZB03MUSaexESpZmjXjpp68wjLrZV7H3hywZXMd5W', '2026-08-13 10:12:20.834', 1, '2026-08-06 10:12:20.835'),
('0fc764bc-4e4c-4571-a5fa-a736252ecf02', 'f4f162b0-d691-40fa-8ae1-704b095f0302', '$2b$10$zmjmefnXxuswRJiiwspuXef5LRCYqUDdbeFYmLBWvxBW819dP.B5C', '2026-08-14 10:30:11.688', 1, '2026-08-07 10:30:11.689'),
('10aa31fc-bc2e-4e92-928f-a2f889366316', 'f4f162b0-d691-40fa-8ae1-704b095f0302', '$2b$10$C0tswDwJ45oIblL/hNGYOuMTdMwpKoK0fIAkbvCUtKoI3.Suq1OKa', '2026-08-17 09:31:56.511', 1, '2026-08-10 09:31:56.512'),
('1281c0e3-1830-4d27-a639-24e051806dce', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$NvUKkdyMRcSxj2xTt0tG0udYNXA7kCpSQmDG3KYmwZkJVYpoTSHUS', '2026-08-07 09:21:18.087', 1, '2026-07-31 09:21:18.089'),
('132a33bc-49c5-4a04-9ebe-70a025b6755e', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$uJp5rRyYr2wbE1Bdq/RAOuGdCxk032ZzhXqEoDBgHk2Y/8IW120qe', '2026-08-14 06:36:00.431', 1, '2026-08-07 06:36:00.433'),
('133890ac-f697-415c-a3f7-bf2a0be5e1bb', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$4ISrUzk.uNaMcTl6mCfNa.f2iq85NUBE8yYKYR8819RVSc3ZAlTDC', '2026-08-14 11:05:33.378', 1, '2026-08-07 11:05:33.378'),
('13941030-5336-4889-8cc1-84373017378e', 'bc3515dd-c5d7-4266-9147-de69624d5b1f', '$2b$10$R60jEAsMEOoPwq7DsmveYOKOUGk5RnRg2yq5TA4XmE7LYiYQpupmW', '2026-08-13 10:12:21.546', 1, '2026-08-06 10:12:21.548'),
('14314657-4e3b-426f-92df-4d55fb320725', 'bc3515dd-c5d7-4266-9147-de69624d5b1f', '$2b$10$Fh8hPF9ic6q4yfdDFSAc6eVzpd./V8nHwmwEhy7Lz6m.Ic8T3cNZG', '2026-07-29 06:39:42.495', 0, '2026-07-22 06:39:42.496'),
('1477bb6d-b9bd-4902-a51d-a156d8811b4f', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$gGh1Rxk3ApQU73f6doGI6.acQzQeodNCBgyZIdmwucUbqpTit7m7W', '2026-08-13 10:44:30.584', 1, '2026-08-06 10:44:30.586'),
('150eaec7-6251-4184-84ba-1fd467a5f0ed', 'f4f162b0-d691-40fa-8ae1-704b095f0302', '$2b$10$JGXe2Z0ZwRhSIssla/4rvO3cNZcbdgrVXs5M430fyF0EAezMJ.9NS', '2026-08-17 10:43:35.247', 1, '2026-08-10 10:43:35.248'),
('155eb4ea-38e2-41b0-9ea4-6fb9f9f13dd9', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$d/f7gya2UYhDSGaWGIl5Yeo6CF.fs5203hlDGUwIi6hga2S6.jGMq', '2026-08-07 09:02:30.793', 1, '2026-07-31 09:02:30.794'),
('15a40a96-3bce-488d-801c-1648bb6406e3', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$Q5Smxwlo0mUFe4vv5jpXU.0blESwn06dF3hbw/lh4kP61X2FonHrG', '2026-08-13 10:30:10.125', 1, '2026-08-06 10:30:10.127'),
('15cccd9d-e104-4aa9-ac87-c59d515e2737', 'f4f162b0-d691-40fa-8ae1-704b095f0302', '$2b$10$G/n20UQbc04/UQFx7jMiVOmwqhBllVnEYHG30XYZt1B6ur40SdJUe', '2026-08-13 06:22:20.792', 1, '2026-08-06 06:22:20.802'),
('16067fb7-56e8-4667-a19b-5ae9702349d5', 'f4f162b0-d691-40fa-8ae1-704b095f0302', '$2b$10$eyUAD3e2j8Eha/IpjLcbm..w1WC.nYveIEAzdvrZpLTiYcTJSAWwq', '2026-07-31 04:49:25.753', 0, '2026-07-24 04:49:25.754'),
('16317bb4-34b1-4fa1-a6ba-cf4c15bad2d9', 'bc3515dd-c5d7-4266-9147-de69624d5b1f', '$2b$10$jOkLuPXgnku.Xj3m9XeaTe5xC2P05xmD5zuPY7Glu2Tqsb9VBP4Se', '2026-07-29 06:58:42.596', 0, '2026-07-22 06:58:42.597'),
('16754ddc-1628-47e0-abca-86083751dbb6', 'f4f162b0-d691-40fa-8ae1-704b095f0302', '$2b$10$x5g3CSfQjEWv5Whg8YZaIeJqtthR3GjgTzUlf3D6NAOBNxrKtLCAC', '2026-08-06 11:23:10.481', 1, '2026-07-30 11:23:10.487'),
('16dd2b89-14d4-484e-b505-6082009179c6', 'f4f162b0-d691-40fa-8ae1-704b095f0302', '$2b$10$BXgMWbKOegV8QkwkplBtH.3PBfIlNsKGA4Mfo2eOtZJsHQq2LcpPC', '2026-08-10 05:11:03.188', 1, '2026-08-03 05:11:03.193'),
('16e742d0-4b7c-4386-b7c4-523e188884eb', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$O/4zrpneexr2PxhbNpraruvjPFok7W5RL45GXe4d4Wbn7RU1jIqwq', '2026-07-28 07:28:19.613', 0, '2026-07-21 07:28:19.614'),
('17166e7d-e719-4889-8aca-713440ba885f', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$ItgOQvNCMwuBXRm1R03tweVHkwL5txZqDf3Tk8Ipqt1OOgamCD14C', '2026-08-04 08:34:32.794', 0, '2026-07-28 08:34:32.801'),
('1753704c-77d6-4f29-a15c-29b755f00bf3', 'bc3515dd-c5d7-4266-9147-de69624d5b1f', '$2b$10$AbdI8a1BVK8lhuvHiYEIL.VGhKLCd8Atb36ZxAvC494PWVX6jfXzK', '2026-08-10 06:45:07.281', 0, '2026-08-03 06:45:07.281'),
('1755af7f-755f-44ec-9970-0345b7ff5732', 'bc3515dd-c5d7-4266-9147-de69624d5b1f', '$2b$10$VN2Tbpz.0ANDGDUNUsg2E.CXEtTlw4hsVTiu3p1n8OELl5wDt3fqS', '2026-08-12 06:06:54.724', 1, '2026-08-05 06:06:54.725'),
('17a584df-5a23-47fc-bf5d-b0e4f33d2bc6', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$Sf/EccDLOXs6vvqZ4AYRce7nEvEo1hSllLzqHJJ01H36PsBf1ijpK', '2026-07-31 07:33:56.370', 0, '2026-07-24 07:33:56.371'),
('17e40d29-1af9-4825-a3b3-0ba59c7ae8e6', 'bc3515dd-c5d7-4266-9147-de69624d5b1f', '$2b$10$WEhatECyDoFyFYHXkptK2eqkSbfZpGl4YOlXwssrXPOKgzhfraHey', '2026-08-07 02:35:45.315', 0, '2026-07-31 02:35:45.316'),
('181729a7-537f-4db4-b29d-87f75e71f814', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$isn/9zwAyc5ko0y2ea2U8uvT/semhUkgHCxA4jXdY1jw2ZGNufeDm', '2026-08-14 10:07:09.980', 1, '2026-08-07 10:07:09.982'),
('1878e18e-ae46-498e-b68c-ec69f01854fb', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$ACqr139mvhoJ6NWgDO8bA.JSORQ8DAhgr37r2iyCTm16iII4irXF6', '2026-08-13 06:53:53.656', 1, '2026-08-06 06:53:53.660'),
('19a98287-1719-4257-a316-55b481e04c07', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$Uy7QyFiC8WqC1iGGTkoHR.7Xq5QUthMb499unpmIDH8C5PnYm4oh.', '2026-08-14 07:45:24.364', 1, '2026-08-07 07:45:24.366'),
('1a04417c-afd4-4d7f-afbd-c245fdc668f9', 'f4f162b0-d691-40fa-8ae1-704b095f0302', '$2b$10$NJGy97mzRHpyRA/8YQ1oweMbFTauPRFZyoFlq3HUONTI0K00MULzC', '2026-08-17 10:04:01.886', 1, '2026-08-10 10:04:01.887'),
('1aad589c-052f-450c-bbef-bf6660d03375', 'f4f162b0-d691-40fa-8ae1-704b095f0302', '$2b$10$twg2TW7AT3oeBfN5JDRg5ehgVDCzL4ujbMcrQnai6Ux5/EzCrpAqS', '2026-08-17 07:18:24.842', 1, '2026-08-10 07:18:24.843'),
('1c587a02-8651-4d99-98d7-ce56dbecefa9', 'f4f162b0-d691-40fa-8ae1-704b095f0302', '$2b$10$0.GRMyruEIEvsdKBiiPpu.IXgKl1VAU1hfF4qpDV2wACH9Cts4MYO', '2026-08-13 10:56:53.592', 1, '2026-08-06 10:56:53.596'),
('1cc71078-f50e-41e6-9a37-cbe8709ff81c', 'f4f162b0-d691-40fa-8ae1-704b095f0302', '$2b$10$E6IcZRITvZBRHNlk9LD.3e8PB6ylzTaeAp.ddz2gyBJMPs9y1MsDm', '2026-08-10 07:51:38.194', 1, '2026-08-03 07:51:38.194'),
('1d1bfdf6-5956-4351-ad84-7a0060943a61', 'f4f162b0-d691-40fa-8ae1-704b095f0302', '$2b$10$VKG7Jq9bR0pUT6NHsSz14.B5E4D4xkKxjeWZNpNxY1RH.4.U8ztBm', '2026-08-17 10:27:55.728', 1, '2026-08-10 10:27:55.728'),
('1d4c4080-fbf9-45e7-966e-1ea4c68572c1', 'bc3515dd-c5d7-4266-9147-de69624d5b1f', '$2b$10$dLXcVA9SfIpYhUzh8B5zJOfSq3RWrXwAfkXKEvFH4Z4jb/gFwatYq', '2026-08-13 10:47:20.096', 1, '2026-08-06 10:47:20.097'),
('1da43fb4-20ff-4c7e-ba15-ca6d4c605dc8', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$YMUQtFj.8sbYze2P3Zn8MuB4FEz6lHevHgqol1s80GhsoAnS6TVu.', '2026-08-21 05:38:11.479', 1, '2026-08-14 05:38:11.480'),
('1e8930c5-22a5-4e76-abc6-b59ed1514320', 'f4f162b0-d691-40fa-8ae1-704b095f0302', '$2b$10$S2HohWiManyUI9ovFHqZDucIeUgGI4aUlstzCryDLWGrnyTGusoHi', '2026-08-17 06:10:16.485', 1, '2026-08-10 06:10:16.572'),
('1f30ce74-248e-4fee-b138-25c0aa01ac20', 'f4f162b0-d691-40fa-8ae1-704b095f0302', '$2b$10$..U4d86KqAz6tzh9XcEeh.xZFdm/Z2GKEVJRU13QC38SwRt1PFhTa', '2026-07-27 10:50:27.671', 0, '2026-07-20 10:50:27.675'),
('1f5f2c05-81e2-4972-8d95-60bd77370bf9', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$DZm5o0I1ScFsSFxPUSTuAeoHaqC.OxaILk/t/3dRt9bdEbipCEZHa', '2026-08-06 05:32:12.545', 0, '2026-07-30 05:32:12.547'),
('1f7bd5e1-0b42-4c44-a31f-91fe0c75638f', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$L4hIyVXbQBfEgz2nBAmYleOCuOEKI.YC/kLxxrLcT1bTmCacQs/Tq', '2026-08-14 07:06:32.103', 1, '2026-08-07 07:06:32.108'),
('211fbbe7-073f-41cc-9c4e-311619eb9133', 'bc3515dd-c5d7-4266-9147-de69624d5b1f', '$2b$10$aDbRKr31k0Cka90a375/q.BKySILxDU.TgyvmJD3ce/YbFx2CFlly', '2026-07-27 10:10:45.753', 0, '2026-07-20 10:10:45.754'),
('22134086-f5b0-42d1-8c53-43ae3f8e0de0', 'f4f162b0-d691-40fa-8ae1-704b095f0302', '$2b$10$WnrHUJvgaPT5j.NeQ0PUN.RvqIJ/41/elf1pjvldH6JcnMXWfW3we', '2026-08-13 05:49:38.271', 1, '2026-08-06 05:49:38.273'),
('23a2dc27-b5a9-48ce-8f5d-0009b1963aaa', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$OMr/zkQFflzOBBsBaHDIg.D5Iqx3ZETYcvsaRwiBYcnOUv26fgAgW', '2026-08-03 06:31:02.452', 0, '2026-07-27 06:31:02.453'),
('23e10ba0-143c-4aeb-aaee-335227aed2a0', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$hVDy91GJQllLRUaNNjtotOQvDdrtGV6sVOgsB3C1csSYG.C9b4COW', '2026-08-05 06:55:47.232', 0, '2026-07-29 06:55:47.234'),
('24d5baec-db7a-4538-b5f0-6c24777b2144', 'f4f162b0-d691-40fa-8ae1-704b095f0302', '$2b$10$HJa3ljMrGOXpqxR51IeBSu2FhudSAqPAd4HWRfdl7VtBSrfp6WwLW', '2026-08-10 08:07:04.097', 1, '2026-08-03 08:07:04.099'),
('258e3bb8-faf8-4b17-9cc5-db6f1d34aed0', 'bc3515dd-c5d7-4266-9147-de69624d5b1f', '$2b$10$lxqPl4kfYti00FZtxJUHguUN7UXEGS1IFD/A4hhfaAJERoAooTSZS', '2026-08-14 09:20:06.007', 0, '2026-08-07 09:20:06.009'),
('25ebf43e-0933-4550-85ce-7d76c95ea47a', 'bc3515dd-c5d7-4266-9147-de69624d5b1f', '$2b$10$tmeNdhaPHVXYgIxidb2WSOTUIoxvuWoZY0G72dt3.HWf65jOx6.la', '2026-08-13 10:57:44.819', 0, '2026-08-06 10:57:44.823'),
('26996af2-f73a-4e9e-9daf-fb28570e5256', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$7MEU/8CymM5h42q4E1hh6OWfpBKgLP9R95tFVXaymQK8JnFDj/jkm', '2026-08-17 09:42:02.510', 1, '2026-08-10 09:42:02.510'),
('26ead6b9-064f-46ee-9cef-f0d4234f5b18', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$YUM9GSlc.FhggeI8XAr2duILkognTZfMLRw7jxu/o4hEXSajKZlh2', '2026-08-10 07:58:30.694', 1, '2026-08-03 07:58:30.695'),
('2874e55d-baaa-45b7-bd20-e57e50479fe9', 'bc3515dd-c5d7-4266-9147-de69624d5b1f', '$2b$10$Rz4E/g1wNTY2PaMrRHoBX.fBdGReOxrEqt2H6U5OX5HwC0uTisgru', '2026-07-27 13:50:57.490', 0, '2026-07-20 13:50:57.491'),
('28ae78f8-1873-4f80-9f40-ae5ca62fe77b', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$gLNzYcRCeYIQK0f6BGXOzek9aClmMFkIgiW4E5qyJ12PEfMlqja/S', '2026-08-03 10:19:48.540', 0, '2026-07-27 10:19:48.543'),
('2a6c69fb-5bc1-48aa-8f60-167d969ab66f', 'f4f162b0-d691-40fa-8ae1-704b095f0302', '$2b$10$N.Ai8po2yfwCEjSMEz1ti.iiWmrF6Ir7sPgQaJEQMlxv8YsX.lY/S', '2026-08-07 10:25:14.787', 1, '2026-07-31 10:25:14.787'),
('2ad959de-ba73-4460-8543-22e328e5f0af', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$5Xgd0M45WqfJx4XIn7LZauHSlWC4eb6yaTBfQ7OUWXRocf8aRgT0G', '2026-08-14 06:45:01.671', 1, '2026-08-07 06:45:01.672'),
('2cc7be2c-7d06-4e98-af66-4df3174113cb', 'f4f162b0-d691-40fa-8ae1-704b095f0302', '$2b$10$y0QkLVyDONz/xawyQv845eEuz93kXyUJXG/IRJNcB3HL949TuX/KK', '2026-08-21 07:24:32.132', 1, '2026-08-14 07:24:32.133'),
('2d7b46c1-923d-45c9-bf70-732babf2aa58', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$XPiLkpKC8L0Qxh5I9JXW7.mjYvjUeLVDMLWK..LoZ3YUGSvcxtspe', '2026-08-13 10:56:53.224', 1, '2026-08-06 10:56:53.228'),
('2ed54bae-4514-4e34-82c2-e1423186fc1f', 'f4f162b0-d691-40fa-8ae1-704b095f0302', '$2b$10$jyiq657rLPRHqA1NsSK6YuCNLQqPUWX13UH/U8nWYQfbCmKOWTHpG', '2026-08-17 10:46:40.946', 1, '2026-08-10 10:46:40.947'),
('2f5ecb3b-9385-4dd6-a835-162eb253327c', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$zXPYDNwhHykwOU3iJ9.FbOwO2pC8lRzwKQlTHshLaMFYR1.CR56MW', '2026-07-28 06:05:19.486', 0, '2026-07-21 06:05:19.487'),
('2fa1f3c5-163d-41e0-8de7-3fb07ff8c709', 'f4f162b0-d691-40fa-8ae1-704b095f0302', '$2b$10$wgSgh68xyBwFZe/.RmOqHOZ3851M/OS9QwoS1e0QgNar6Qrpd5y2G', '2026-08-14 09:50:56.755', 1, '2026-08-07 09:50:56.757'),
('31325808-f578-47b1-a535-11be43590e44', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$eL2/hfQHow4pRfdvy8gHeOT73/iY.8C6bJ32h12bJ7pr85VRnhIw2', '2026-07-30 08:24:20.460', 0, '2026-07-23 08:24:20.461'),
('33af4e7c-6e3e-4372-b2fd-c224687035c4', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$xH0jfqmHaJkbdW.Ln5CbjuQLe3x8qjgJSGDLL0jFcHibPCDJda1PG', '2026-08-07 08:08:08.551', 0, '2026-07-31 08:08:08.553'),
('34871fe8-9bbe-462c-9ca1-1a24be78ebfc', 'bc3515dd-c5d7-4266-9147-de69624d5b1f', '$2b$10$oGALEKOe5Ype.074FWrS0OakyE751MzQq..vS8DFYiUNKdbkpyJu2', '2026-08-10 07:46:39.679', 0, '2026-08-03 07:46:39.693'),
('34bec974-ae0b-4b93-b2ef-1afce866933f', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$lJYt2AR0P6gfnBypgPiIDO7LaGH8oHfxs.oBuaL2L2D/54A4rixF6', '2026-08-13 14:21:54.606', 1, '2026-08-06 14:21:54.608'),
('34d3532e-d0c2-4f5d-a25a-c72d6a69890d', 'f4f162b0-d691-40fa-8ae1-704b095f0302', '$2b$10$KUWB14JqxXh.XiNwQEgMWuHc/YDsPNKlNIQctB0Qjw/TqK.GR45Je', '2026-08-10 07:49:50.341', 1, '2026-08-03 07:49:50.344'),
('3525fa27-2932-4fee-93d6-aa5720661ac9', 'f4f162b0-d691-40fa-8ae1-704b095f0302', '$2b$10$tVVHjFre.imk5tL2s2ecxunbJT78WTZaPuhWMo2sLGYfxZ7VtZA5W', '2026-08-10 11:08:21.966', 1, '2026-08-03 11:08:21.967'),
('36f65355-5002-4053-9aa3-4c0c36c0d8ea', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$fGFE9raKrqBO1vWLRxBC0uw620xUsbn228DoC5vynGA..vUexhkBi', '2026-08-13 07:39:57.938', 1, '2026-08-06 07:39:57.940'),
('3806584e-4e00-49e4-9e0c-8b38ece5b116', 'bc3515dd-c5d7-4266-9147-de69624d5b1f', '$2b$10$jiDvmMJq2A2G6/OZR3rbXeW0d0wEe746wfqRNvFSDiIpSgc8boTC2', '2026-08-07 05:24:47.460', 0, '2026-07-31 05:24:47.462'),
('3811b576-73a8-4411-977b-53c49eca5e0f', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$PYR57GxKayt6hOoCPan6j.D1cL2z0U0CWNP4lFttCOPjtFnO8U99S', '2026-07-24 11:21:32.083', 0, '2026-07-17 11:21:32.084'),
('38a4d55d-1908-4849-8bc4-8d03cfca79af', 'f4f162b0-d691-40fa-8ae1-704b095f0302', '$2b$10$.RMEzOtiwwKTMxeVMD78Z.nZyhVmkAcCxZo.lJtBqkeeHZD0Ybyl.', '2026-08-17 10:14:39.830', 1, '2026-08-10 10:14:39.831'),
('38a6dc2b-b38c-4c15-b3b1-9c415cd3e2cd', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$H4Gks0zKkmZ1YcBk1fqXIOkSPy3bczAlJi9fFTQjldyULpIGQLhcu', '2026-08-10 05:11:01.828', 0, '2026-08-03 05:11:01.863'),
('39115984-4348-404f-863f-82b286937796', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$4OfDvXR0FOpclr7aX0z1/ubf2/O1ZX9Rx7pmKwrL18Pq5PNGaJr7q', '2026-08-14 07:08:20.387', 1, '2026-08-07 07:08:20.389'),
('3a6d9d8a-e798-4c86-b8e5-717221827d07', 'f4f162b0-d691-40fa-8ae1-704b095f0302', '$2b$10$lswoGjw8.VHIgry2ivpS2.INwPDhDXGvfPs2dPm/TAwmTGanK.yk6', '2026-08-21 10:14:32.104', 1, '2026-08-14 10:14:32.105'),
('3a9660ee-ac5e-4653-a356-54fc63670d46', 'f4f162b0-d691-40fa-8ae1-704b095f0302', '$2b$10$RDSpP8FWG80DyvPIhQsgnOQKQC7O6En403gKSX3V14qByH.VYV2pC', '2026-08-06 11:04:35.312', 0, '2026-07-30 11:04:35.313'),
('3b840003-1c0e-4056-9e1a-8b25cff29026', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$15hTzcwum1Kn5QwNIaUGO.C43jAM3rB2m6HxNH6dK.bZwnfqtxGhm', '2026-08-06 05:09:01.872', 0, '2026-07-30 05:09:01.911'),
('3ccdf1e0-84e4-4924-9bf7-e381cbbb07df', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$sEXyHIf/uiQ3I1mhWz6OVOCOWSGcDqkjVvKg5r5pnsKgR0tQ58SO6', '2026-07-29 06:18:14.685', 0, '2026-07-22 06:18:14.686'),
('3dd540fe-590e-44a1-a3c8-e9218501dfa6', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$jE9j5IeHABKqcMbORLdAa.hNOdwDrGsU0jJitUoryMdB3MdQku7TK', '2026-08-05 11:09:09.764', 0, '2026-07-29 11:09:09.766'),
('3e0364fe-ecbb-49c9-af00-06ed922f9f38', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$oDBm20OMjMpnmA8MLe3xwuq/HHNJ0UiyaAy0KyQ9aNaEeRGnewahS', '2026-07-27 06:05:33.387', 0, '2026-07-20 06:05:33.388'),
('3e46f06c-3174-42a4-90fb-a9d74410c029', 'f4f162b0-d691-40fa-8ae1-704b095f0302', '$2b$10$dEzY03gmP9/zSA1dqWFoEO2JVfGXLH4LHq4hfO30AKHEpySl.qbrO', '2026-08-13 11:00:55.275', 1, '2026-08-06 11:00:55.277'),
('3e54edc9-ba35-4585-9ba3-b09162e503ad', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$lXnryv87e/IeUVxLrt1goOV96EN5u6pRUerPo724sGu5x1FcyUyJ.', '2026-08-14 06:43:36.917', 1, '2026-08-07 06:43:36.919'),
('3e7843db-af68-47a8-96f7-2609cd6c7fba', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$wDtd3E2gSwNkKE..b/7.te4bCqFPCXF9geCkLq6RoBTokGsTZrxmO', '2026-08-21 10:28:59.903', 0, '2026-08-14 10:28:59.903'),
('3e807303-cee5-462a-88ae-6f36ea8750b8', 'bc3515dd-c5d7-4266-9147-de69624d5b1f', '$2b$10$Toqzv1p.LcWz0mOnK.gOIeae.FutWBXsR9kUCKxKzCOXmJxojnj/C', '2026-08-17 10:03:34.886', 1, '2026-08-10 10:03:34.887'),
('3e895dad-8678-4f2d-9c86-002e5c5247cc', 'bc3515dd-c5d7-4266-9147-de69624d5b1f', '$2b$10$UHeoe7UC8xYhKHpLjNusFOV6dhkZCtVx/cxx6E9sCoit8ooNIRDyO', '2026-07-27 09:30:30.651', 0, '2026-07-20 09:30:30.652'),
('3f5bf8d8-5e40-48f3-bf5a-48751f77fb04', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$A1DSN6FAFCzdQf7/x.uIl.AIAf6a1rNnNJggtqrzmdfvIW4tlJmZi', '2026-07-29 05:37:42.098', 0, '2026-07-22 05:37:42.099'),
('405fbf4b-415d-4e2f-8de5-9b5fcbc3bcec', 'f4f162b0-d691-40fa-8ae1-704b095f0302', '$2b$10$EIHPpJESejJG1Ae0gTA5ru5JU5H.d3fF8Gk.b3GfaoTjiNoGEXg8u', '2026-08-10 10:29:29.839', 1, '2026-08-03 10:29:29.842'),
('40696330-b10f-44b3-a78f-74966b511a78', 'f4f162b0-d691-40fa-8ae1-704b095f0302', '$2b$10$yDr.OdvNhEAVd9LL70SGWu12XKZsM37.oAABMPEzFtZBWkY5D6ZEK', '2026-08-13 10:58:01.388', 1, '2026-08-06 10:58:01.395'),
('40bb7dee-57b1-4204-b1d2-c1f8d48ef069', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$sskS.AbsKZXRtlaHeWAO4e.jJCTx0v9XJYw7HRgC0DcLv8Tt0Azum', '2026-08-14 06:06:34.289', 1, '2026-08-07 06:06:34.291'),
('40d884a6-251e-4e84-9f01-febe7423c67a', 'f4f162b0-d691-40fa-8ae1-704b095f0302', '$2b$10$262fHu5qcfdzpbAqkU0rFORuhJobEDdmLay6Q/I82uhUnmvW2BfH6', '2026-08-07 07:25:15.606', 0, '2026-07-31 07:25:15.607'),
('4233f533-8b8a-4935-b48a-faa9778b0e82', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$lDTsacV89H3pyJZob.s/o.n9WOcw1Q4DW4O33GfkGOiLa8vmtn5Ma', '2026-08-14 06:44:05.126', 1, '2026-08-07 06:44:05.128'),
('4281dbc2-9bc7-4f17-b889-d8a50ec1f610', 'f4f162b0-d691-40fa-8ae1-704b095f0302', '$2b$10$TBveTkhhT8TUu3ba1YoPPeB6BnI9qZyhhbbVaxSq5180JAWRYQ5vK', '2026-08-14 10:27:03.083', 1, '2026-08-07 10:27:03.084'),
('4329b8cc-68f5-4293-a4ee-c9f5497a4611', 'f4f162b0-d691-40fa-8ae1-704b095f0302', '$2b$10$A4BPEji66Um8MlmBF.ew1.h.FI88/ZpfrHcaQNFxZ6HgXyArEsqm2', '2026-08-09 06:39:33.777', 1, '2026-08-02 06:39:33.778'),
('44e3f894-6207-400c-9980-2e97c6d9c82d', 'bc3515dd-c5d7-4266-9147-de69624d5b1f', '$2b$10$g9pNic7pulKOV.CEQqCCreXa9knjrebtc2eWFDI/FDU99efh4JcJy', '2026-08-13 10:58:46.257', 0, '2026-08-06 10:58:46.264'),
('45992b8c-ec32-4461-9d68-552f339c084f', 'f4f162b0-d691-40fa-8ae1-704b095f0302', '$2b$10$qaQQNesNyG3ZnNJy7wcseuzjVK0WUg7vPBe2P9UkzCjhi9Jtlb3Eq', '2026-08-13 11:10:22.352', 1, '2026-08-06 11:10:22.354'),
('45ca9022-5c27-4378-a9ed-d639cebabfcf', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$uaMwJZwapvPFcITxyy3XqO3eegZfJloOvBuoIbP87P1W.dQi7EBqi', '2026-08-06 06:04:42.246', 0, '2026-07-30 06:04:42.248'),
('46ca56d0-2358-41bc-b203-5c127b17f142', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$tCXfh7yGfPPAuc3Cf0fpsOVquJLW4.ARfllUi.ETLwiNutrt1Kopi', '2026-08-14 10:30:11.382', 1, '2026-08-07 10:30:11.386'),
('4761efe9-055e-428c-b1a0-d5eafea61d04', 'bc3515dd-c5d7-4266-9147-de69624d5b1f', '$2b$10$hM.aQTIx1vhzIhA/iyre2OivKUJlhTj5m0UbT6OBL3CUD1zS/rxoO', '2026-08-10 10:29:29.285', 0, '2026-08-03 10:29:29.289'),
('493e140a-58f0-4afb-9093-893458e93844', 'f4f162b0-d691-40fa-8ae1-704b095f0302', '$2b$10$5fnjzzDOhSI7TqPtC.b8leXZC77cJnBQFdXmuWUb9SOGJaUGyHQzu', '2026-08-10 07:48:48.162', 1, '2026-08-03 07:48:48.166'),
('496a8903-111b-44f2-a8d1-8aaed2df577c', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$HIh2GhDwH/bDjROJmAs9YOuskPBzKTlEy9LUWlcd1q40b1JmgRvQW', '2026-08-14 06:58:17.198', 0, '2026-08-07 06:58:17.206'),
('499100ed-8fb8-4eae-8422-6c6a990cf994', 'bc3515dd-c5d7-4266-9147-de69624d5b1f', '$2b$10$yWc2KVfsz2hW3g9RiIHnUOyClV8DbYw0tCdO2ggb3UYCZYKA.M1mW', '2026-08-18 09:46:15.849', 1, '2026-08-11 09:46:15.849'),
('49e29ac1-46c7-4071-b173-67421ee1948d', 'f4f162b0-d691-40fa-8ae1-704b095f0302', '$2b$10$7PDjCRxCzIx4vVzQtDy6vONH1uLTuupj4BXLfaKycCTj4BPUBR0/u', '2026-07-30 10:10:07.358', 0, '2026-07-23 10:10:07.359'),
('4a23dd90-61f2-4ff7-8692-d478ef3c0e04', 'f4f162b0-d691-40fa-8ae1-704b095f0302', '$2b$10$eWPyv6MASe6UPpAsYYa4aOd4iS6B0ZxLq28kudbkak0NLN2qpKUZy', '2026-08-06 16:53:11.534', 0, '2026-07-30 16:53:11.535'),
('4a273f1f-4a4a-4b87-9232-df29dd917ed6', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$KeVGPYUfGp44XhB6quFDaePq1fZMLc4Zx4odGIX30TEYuYmmE/k1u', '2026-08-10 07:41:39.597', 0, '2026-08-03 07:41:39.598'),
('4a2a993d-5099-4220-bc18-2032893eed96', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$HH2p7VP.D/9m8WwiIKXniekaHllYlLsvMkuwbLmMBycDmlt99veIu', '2026-08-21 10:12:14.807', 1, '2026-08-14 10:12:14.808'),
('4b55a073-3c41-4e91-b236-58a35522ca8d', 'f4f162b0-d691-40fa-8ae1-704b095f0302', '$2b$10$DsBTYUVOHuabbZkCZ3EBjuzSp0dfnb5UIaMSBl6T3Dv/PADGAMGBW', '2026-07-24 09:15:00.011', 0, '2026-07-17 09:15:00.011'),
('4b79cc0b-ef2c-4a11-b25d-4be55836b6e1', 'f4f162b0-d691-40fa-8ae1-704b095f0302', '$2b$10$38EYFFiIoTYQN9MnsSyRP.T.lLBOoOrzsfVq3tmFCJH/VL69MTIlK', '2026-08-13 11:10:10.194', 0, '2026-08-06 11:10:10.195'),
('4d3c95ea-c8cb-4c34-a97c-4db9bf6cfbc9', 'bc3515dd-c5d7-4266-9147-de69624d5b1f', '$2b$10$tlp4el6zJGy05XF2f0ZhX.p9RB/RTYMxbGvKP0wYBT96ydJsZSNWK', '2026-07-29 06:42:56.194', 0, '2026-07-22 06:42:56.194'),
('4d89358e-2f7f-42cf-89da-963083fcf5f4', 'bc3515dd-c5d7-4266-9147-de69624d5b1f', '$2b$10$WSy2X./8LB5vJrfMbTUVn.NeDhHp0vouo2vg0.mt9SCuEr4ElF.vi', '2026-07-24 10:40:37.877', 0, '2026-07-17 10:40:37.878'),
('4de04574-704a-4722-b2bf-014eb247b2f9', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$oxuI5YwXD0gXa6NDG.5oQOLegd1WwQYybJOcWCA9qh0vQoQSv2WDW', '2026-08-14 06:52:21.210', 0, '2026-08-07 06:52:21.215'),
('4e7f9cfb-83f8-41b9-91ca-432415a40e3f', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$OeBezDa7H9YFcrLVpwGIBOBuGkgNAETDEVqut44nIDHIg.9eh4CnC', '2026-08-13 10:11:13.993', 0, '2026-08-06 10:11:13.995'),
('4eb1055f-896c-4052-bf2e-9051e4f5eaac', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$wcwo0ny1PVxJ6r/kHRG8H.tmlUANVpucrUYlayxSRC9eFjNXcpjDK', '2026-08-19 07:06:44.873', 0, '2026-08-12 07:06:44.874'),
('4edc0860-589e-4160-b202-58094243007f', 'bc3515dd-c5d7-4266-9147-de69624d5b1f', '$2b$10$Pc1SqHIhby.rfBD1xr.G2eIZB7N3uvf7MeCGUUCv5G1nSf.aPG/7a', '2026-08-10 05:11:43.643', 0, '2026-08-03 05:11:43.648'),
('4edcd7b0-083c-450d-90cf-2fd15e618a51', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$EC5KXHPCg6Muluwwb5ZlfeKXoITXi5BbJXEYBc5zkTAv953wXr7u6', '2026-07-22 07:57:23.184', 0, '2026-07-15 07:57:23.186'),
('4f553287-15ce-4709-9e35-24b2f7d578d1', 'bc3515dd-c5d7-4266-9147-de69624d5b1f', '$2b$10$eFhdWj.Hqn74hv1LySKfg.MQTPvmT5UzTiL4lzArfgbEq8Fq/OkWe', '2026-08-13 10:58:00.997', 0, '2026-08-06 10:58:01.004'),
('50182bd7-0375-4c73-b400-2a96cbee0270', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$fp5uGfkBPeFFO56X6dqne.O0gmWwerdDTOSz.ASHlp.WBO4Fsea5K', '2026-08-10 08:13:53.094', 0, '2026-08-03 08:13:53.094'),
('5051aecc-e728-47f0-b66f-26c0fef53efe', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$Qpl1w2jtk4P/9FIGjoJgQ..degngTVJ34FqEtx/qcvomlHBFwlXHe', '2026-08-14 09:44:55.837', 0, '2026-08-07 09:44:55.838'),
('508ab089-ff0c-44b1-b97d-8445ce7038ba', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$4CWa5hIDF0MQoCpwrydRSuKEOo6NbPDxyHihRYOvP607cHUkaahXa', '2026-07-22 10:06:35.806', 0, '2026-07-15 10:06:35.807'),
('50fdbc78-fe30-44fc-a5f4-d349706ce490', 'bc3515dd-c5d7-4266-9147-de69624d5b1f', '$2b$10$B84Q/7IUJudCl5Fx.xpN5uKFXwV59VSidUxKaFdL6o6EwRAZCNs4K', '2026-08-07 05:46:38.981', 0, '2026-07-31 05:46:38.982'),
('514cfbfb-8997-4056-a77e-617be2aad3ed', 'f4f162b0-d691-40fa-8ae1-704b095f0302', '$2b$10$uCzO7mBvfzexdEzQfgf9R.UHrBJVzPsJ4Q2qQX8PLiUo7F3xOpkAK', '2026-07-22 10:04:31.207', 0, '2026-07-15 10:04:31.208'),
('514e3780-2f82-4092-8249-6117ae0ade9a', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$kEoqH54liynhIE7uK7wtF.Mt2Txv8rr/oR1Abcshcmm1geb57DMXu', '2026-07-29 05:55:59.298', 0, '2026-07-22 05:55:59.299'),
('527d2b6c-555a-4b76-a75b-f8825e0832ef', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$QjR2DqbtbhuhToWPRK5ok.vHjemoy6FJg8QSR93sdfKXYFgpggsS6', '2026-08-07 07:33:54.847', 0, '2026-07-31 07:33:54.849'),
('530d98aa-f7bb-481c-8162-36dab7527bad', 'f4f162b0-d691-40fa-8ae1-704b095f0302', '$2b$10$XbNBeweSlwNFgt5rgEeBWuv1rwAb0g/ePTdoLjioKoQsEVNthAf/W', '2026-08-13 10:23:33.921', 0, '2026-08-06 10:23:33.922'),
('53635558-4296-4f31-9efd-0a2727dd2676', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$rqDf2CahUu/JGg.8mOtnge5tilYUyccW97x94wvbQy0Vc.Bk3YfKy', '2026-07-27 06:51:54.434', 0, '2026-07-20 06:51:54.519'),
('5376c7c5-cf25-425a-9726-e75ed210605b', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$MMn9TC7CkXFEwdUnS.uT9.NKGusUcWcx0p1ErZc8wVVfz88lyNfqW', '2026-07-24 11:00:53.874', 0, '2026-07-17 11:00:53.875'),
('54ab0fa9-90f0-4999-af4d-cfc1080df497', 'f4f162b0-d691-40fa-8ae1-704b095f0302', '$2b$10$WKAO/fxGAIzHnuZR/MrmAuY2Ur0Q0W3Ku8zBpCYlojtx78qqLo96O', '2026-08-07 07:43:38.863', 0, '2026-07-31 07:43:38.866'),
('54cbec81-df14-4a69-bc20-326fcb8daee5', 'bc3515dd-c5d7-4266-9147-de69624d5b1f', '$2b$10$M3Fs2uJ335b2Plmn9n7BPO4mFpMM/a0mbSxnyzW95q8vOUekac.uS', '2026-07-27 11:08:11.954', 0, '2026-07-20 11:08:11.955'),
('54f8ac3c-a025-4f7e-b085-242fa33a4a4f', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$zCGRJA4Kh7pWqFPZvtIdVeNOxuTKCP192lAXzamWv3/DF/xomh2A.', '2026-07-28 10:15:49.844', 0, '2026-07-21 10:15:49.845'),
('55959b58-9ec4-4871-9c07-177b8aae9131', 'f4f162b0-d691-40fa-8ae1-704b095f0302', '$2b$10$ILdgFCRe/dwO34wMYe..BeyT0jC2RQMEfHlrrjDaiplL5A/vHk98S', '2026-08-06 17:10:02.075', 0, '2026-07-30 17:10:02.077'),
('5640a84b-7743-4b4c-a800-06672fd80f60', 'bc3515dd-c5d7-4266-9147-de69624d5b1f', '$2b$10$yryOhB8nl9xcwqnZb2DO1.E5AHo2kcbpet6UxfwN3PJk9pHTl/6mS', '2026-08-10 07:46:54.344', 0, '2026-08-03 07:46:54.356'),
('566a9029-831f-4b9b-811f-4490da57d9b2', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$lbm7NX8SHdoVd1GG92o9nuNdD5pM5pQKQsczr2hrYK/LH9/G6c2vS', '2026-07-23 05:40:21.631', 0, '2026-07-16 05:40:21.632'),
('56aa55c9-13d2-4dc6-9949-1eb829f05980', 'f4f162b0-d691-40fa-8ae1-704b095f0302', '$2b$10$GSonGMmTx/Bk/I0loDpSAubON72CDfttOkf7/lRyg26s4G/jK3vi2', '2026-08-13 11:04:25.184', 0, '2026-08-06 11:04:25.187'),
('56c3ab6e-17bb-4c7a-a1b7-341e11faa274', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$i.g6W7Qyoq.L/DwswD9qcOKhSy/1hPGxsZvSKPKiRNyEGgb9Ip9SC', '2026-08-03 11:18:52.637', 0, '2026-07-27 11:18:52.638'),
('571c8b0c-3b39-43f9-acd1-1c6aca77725d', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$YMUMdVV3aTL2hcqNsJ/dSuC54c5uAj8q9lakya4IfMPYSjQmEtftu', '2026-07-28 10:20:03.980', 0, '2026-07-21 10:20:03.981'),
('58010937-dab7-40db-a6b4-ce5b6a2ad4e6', 'f4f162b0-d691-40fa-8ae1-704b095f0302', '$2b$10$SxTWMfVA.B0KP/gQKC6/jOnsMsuidi1ktmiWmcWcF6Cq8uawfj9aq', '2026-08-14 09:19:04.972', 0, '2026-08-07 09:19:05.016'),
('59ce71de-b54f-48d3-961c-3d3cc0d26da5', 'bc3515dd-c5d7-4266-9147-de69624d5b1f', '$2b$10$oWjWPPtq1YGDqoiZX9BPQew7xt0o6RCI317qx.Z0GGERDHxK2tP/S', '2026-07-27 08:45:01.598', 0, '2026-07-20 08:45:01.599'),
('5b102225-dae8-4e9b-8161-97b3a223e3cc', 'f4f162b0-d691-40fa-8ae1-704b095f0302', '$2b$10$VVmdNP1CYuF2lHe8AEKplOUSVCVi8YAESSqbWPkP7hN9OR6ZowgJy', '2026-07-29 06:42:04.102', 0, '2026-07-22 06:42:04.102'),
('5b16ace2-22b5-4113-af4d-d9a2d1b1a31d', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$jTyj6jr3d9cA0/um9uyoP.qRMhTHhBRgvUHPtqskCRRpCLKmzJb9e', '2026-08-05 06:19:04.392', 0, '2026-07-29 06:19:04.393'),
('5b24c791-49c3-4ab9-9873-4f43c33e5bae', 'f4f162b0-d691-40fa-8ae1-704b095f0302', '$2b$10$RJDG.gPXiej2H43SlcrtfeeZ0n/0li9zCZMWOjkirvACkWUzPV2bS', '2026-08-17 10:01:44.174', 1, '2026-08-10 10:01:44.175'),
('5c53aa24-4519-415e-ab7d-2653d9fc3b6d', 'f4f162b0-d691-40fa-8ae1-704b095f0302', '$2b$10$DD/4W56oren.cgSqOQF0Wu/ddawYFOTELUc/Pe7JkVKbl8sQC98W.', '2026-08-06 10:00:50.148', 0, '2026-07-30 10:00:50.150'),
('5c5d0bd2-2d94-4645-9bb3-45f6f9814ff9', 'bc3515dd-c5d7-4266-9147-de69624d5b1f', '$2b$10$BsxUpYflaKr3kj5rFqKLIeCydnBRz.TnI4OE81m/YyhysA03wmcc2', '2026-08-19 04:51:50.493', 1, '2026-08-12 04:51:50.494'),
('5caab3cf-640b-4b97-94ae-2a69b87b2d86', 'bc3515dd-c5d7-4266-9147-de69624d5b1f', '$2b$10$N5vTqwQzMvD2FiCBKfEWcOpA7gSuy0TFWVPGbDN8TKI5JvBGCDTd6', '2026-08-21 10:25:17.504', 1, '2026-08-14 10:25:17.505'),
('5cdef5c8-5e85-40b3-97d5-c621aeeaa62f', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$AlPg9cqQx5Tg0OrHBuCU3.eLQoSWrqRCl32IM4wGNBRD0e5vCIj1a', '2026-07-24 09:06:20.113', 0, '2026-07-17 09:06:20.114'),
('5cef087f-e849-4584-a0bd-3629e34264e4', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$DSUjlf8yszeplV94VhSAE.yJbLZbZGw2q7ZyoWHPz1RpDeU3cRrpC', '2026-08-21 10:24:56.704', 0, '2026-08-14 10:24:56.705'),
('5d9e34d6-14df-4920-b50e-641c682bee7e', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$wt7qMVZS/UgJAwWe.6Q5IOtptVzJEjSpd2lS/0aoY2rxeTjjSLqly', '2026-08-03 09:54:42.359', 0, '2026-07-27 09:54:42.365'),
('5df5bf5c-7828-48f0-bf5d-9043b07306fe', 'f4f162b0-d691-40fa-8ae1-704b095f0302', '$2b$10$UfRj.EXVTdx3lOCCqZMzP.Lt46VKszKA5lbcY7KgjKLAzXKMbgCoe', '2026-08-10 08:09:57.292', 0, '2026-08-03 08:09:57.294'),
('5ef04541-c2b3-44b9-ac13-d8097dd151af', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$aORcefLe9j6oLzkM6SMNk.0uHdcha5T8Dhr7VofB/YDYYS071ga4C', '2026-08-07 10:07:21.593', 0, '2026-07-31 10:07:21.594'),
('5fc781ea-4bee-4cde-a54c-7735b1524107', 'f4f162b0-d691-40fa-8ae1-704b095f0302', '$2b$10$QB1bNbFhUl6hFAsQsaB49evevPM6lmcLdYQcbthXLvzjX.TAOMTDe', '2026-08-13 09:39:32.517', 0, '2026-08-06 09:39:32.518'),
('6016f54e-2d47-4970-8bd3-381d0481acab', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$jJUi2Rh07yRmS3rnGGzkXuf9W8CebZKfp34Qw7EfGIslCKLl80bg6', '2026-08-07 06:59:41.895', 0, '2026-07-31 06:59:41.897'),
('6063a54b-935d-49d2-9603-611dc28ea979', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$fWY5rZ6IV4KHGvC9irrGRu5autMMcz0u3n5pDHUtJF9o7NHJpoQ6y', '2026-08-10 10:59:24.366', 0, '2026-08-03 10:59:24.367'),
('6095520b-0fce-498a-ba75-ce69855f853c', 'f4f162b0-d691-40fa-8ae1-704b095f0302', '$2b$10$/JdCKDvoTQKpgvskbWR5qu3Tj9xrrhN8NCcwmDHXkPKkRXNN0LIQ.', '2026-08-12 10:04:53.389', 0, '2026-08-05 10:04:53.389'),
('60f87183-45e6-4db0-bf12-ebe850f31152', 'bc3515dd-c5d7-4266-9147-de69624d5b1f', '$2b$10$vuKu8LmMDwKTTVlJENABze3uKYaXfYMnzp8aPNUBTYQPpmjLTAsXy', '2026-08-07 07:32:11.537', 0, '2026-07-31 07:32:11.539'),
('61b2f8ed-e65e-4198-8a77-4dfed80dd8f5', 'bc3515dd-c5d7-4266-9147-de69624d5b1f', '$2b$10$r0A1a1Mu0FIJdWyuDJucB.vL4V76cZrhUStK5uMCKqrWmhilp6r.C', '2026-07-27 10:51:27.246', 0, '2026-07-20 10:51:27.247'),
('61e86486-6d1b-40a3-b4ff-8d47446d86e5', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$YMU1tPfYBNuc9ukQCJj9B.EXBGh76/i1jhQrXeCaH00c5P/V7cMPe', '2026-08-14 05:50:33.895', 0, '2026-08-07 05:50:33.896'),
('622615eb-fe41-4d9f-b07d-c62231b09a80', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$La2Q1wipsjMkcOSOQG.K.ev7yU9vvtxz1edCRrBWUPZrnCLUe7tQK', '2026-08-07 06:27:54.218', 0, '2026-07-31 06:27:54.220'),
('62388f26-e232-4161-b0bc-504e4ddccd55', 'f4f162b0-d691-40fa-8ae1-704b095f0302', '$2b$10$4bG0cCTxmYhfsCgg4gOuU.47bwApEEr5rA9z8DvJqq85/vO2UPh/i', '2026-08-14 10:15:51.328', 0, '2026-08-07 10:15:51.329'),
('63d532af-af82-4ea8-ad7b-2356d7b4acc2', 'bc3515dd-c5d7-4266-9147-de69624d5b1f', '$2b$10$Tw/qp.HNz5x7ibhM41jtJOQtxzeGc7zeutR9v3P.rlCuLfTqH8xRi', '2026-08-10 05:14:40.611', 0, '2026-08-03 05:14:40.612'),
('63f44671-ba70-4d15-a3e8-fba3e345b16f', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$XOv4gRwbaO3CFM78k31eIu112HdYPLfhqmS.9NK716LsWjGPKyHnO', '2026-08-14 06:36:00.573', 0, '2026-08-07 06:36:00.576'),
('64002f04-c346-45dd-82d1-a7e184698bc0', 'bc3515dd-c5d7-4266-9147-de69624d5b1f', '$2b$10$Hv7u8si4WI.z0I7mbyTKyO3aSBIZEFurcFalG9K/gFSWCcf7Gp8h2', '2026-08-13 09:30:04.293', 0, '2026-08-06 09:30:04.295'),
('649836d6-d3ee-492a-b07f-733add3d8d28', 'f4f162b0-d691-40fa-8ae1-704b095f0302', '$2b$10$xnRRLx3tpI.JzgfulLIfuuS/GwQ11AUyVXF3xhH8pHGSa83uuoSV.', '2026-08-10 10:33:34.504', 0, '2026-08-03 10:33:34.505'),
('65c14506-6b76-4472-86c2-f8326d8ed469', 'f4f162b0-d691-40fa-8ae1-704b095f0302', '$2b$10$OaY8rvj0El9smaYiyBlWPuMZyrvjSJQ3UnzqOu8bZ6yv/5HMuMONu', '2026-08-17 04:52:39.901', 0, '2026-08-10 04:52:39.902'),
('6603eb9e-97b0-44f7-99f8-fde811fc6aa2', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$wxulgTeLUQjqBtkyq0sIvO2JMpc8vW0FI6wFHB3/Qi1jwaQz8WdQ2', '2026-08-08 12:05:34.920', 0, '2026-08-01 12:05:34.920'),
('67dd9348-a50a-4e07-b5de-84417bf466ce', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$1XpevbBxjzhn7oX9xg5m3.rUPtSk96TmPEjRe0vhCrmzDqPKYZaXG', '2026-08-04 05:16:23.587', 0, '2026-07-28 05:16:23.589'),
('688e7522-fb46-495d-a4b0-c708bdec4973', 'bc3515dd-c5d7-4266-9147-de69624d5b1f', '$2b$10$F04V7J6f8aN4MW2IyYTlaOVVvnZD6txyy.M4oGRfPyUFSqXRuVElO', '2026-08-10 05:14:34.024', 0, '2026-08-03 05:14:34.026'),
('688fa533-76bc-43f8-9b20-cdf2e95c317b', 'f4f162b0-d691-40fa-8ae1-704b095f0302', '$2b$10$LjoK4GpmMGWpVHqlRtTIfuUzqrSoUBLZG3N8ZXBMMqhF7ff3I7N8O', '2026-08-14 09:19:13.583', 0, '2026-08-07 09:19:13.586'),
('68b9d04f-e4f4-482e-8d6a-d782b990bacd', 'f4f162b0-d691-40fa-8ae1-704b095f0302', '$2b$10$bdO0sAVipAcVTQHvhEnJw.wlMRELKcS.TbjMhJ.j5bpTi2bxww43y', '2026-08-18 05:37:39.023', 0, '2026-08-11 05:37:39.024'),
('69b155bb-9ff3-4cd2-a87f-b3edf77783da', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$/DdinQEA3asaFLvuAB5vZe.zDRzH6Bg1F2ERpZyplbjB10AODU5n6', '2026-08-06 10:18:12.728', 0, '2026-07-30 10:18:12.730'),
('69b9c018-d62a-47fc-8d5e-fa3a3b9ed1be', 'bc3515dd-c5d7-4266-9147-de69624d5b1f', '$2b$10$2lOVc76UdSG3maZsJ.fhDOkfdOJsw5RIDWOvNaDx8doQ/VIEjoHTy', '2026-07-27 15:33:29.674', 0, '2026-07-20 15:33:29.675'),
('6a0f0edd-7ad9-4b74-b013-99ca753ab093', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$zBuzgkE1fGkL9pycgbPxouQ9HwTIMixxwudHGAHgIektYhg9oEeRS', '2026-08-13 10:45:03.966', 0, '2026-08-06 10:45:03.968'),
('6aee11c1-f194-419f-b42e-7939bf10311f', 'bc3515dd-c5d7-4266-9147-de69624d5b1f', '$2b$10$Dy7J7biAZGmj4DEH7e8l8eLBwy3RWnE7e91rimnQOarR6LLaFpMJy', '2026-08-13 11:10:23.372', 0, '2026-08-06 11:10:23.374'),
('6b26cd55-bb52-47f7-9fb9-91f284b72065', 'f4f162b0-d691-40fa-8ae1-704b095f0302', '$2b$10$tP9IcmTOOICTMwWEKWUWxeTWMBJ64k6fxmy8won4kwWoZKEMJ5C.S', '2026-08-13 10:39:06.978', 0, '2026-08-06 10:39:06.979'),
('6c9e470d-507b-4133-a66d-faff6c5d5977', 'bc3515dd-c5d7-4266-9147-de69624d5b1f', '$2b$10$pXNgwLCijBQ/qltVjF6Nl.9yEnLUrxSg3RTbI6cGo/W1gqk0AH3z.', '2026-07-27 14:44:06.262', 0, '2026-07-20 14:44:06.263'),
('6da8c198-a99f-47fc-ac1c-a934df71bb93', 'bc3515dd-c5d7-4266-9147-de69624d5b1f', '$2b$10$6y4XVIWKu/ZR7eVo0zUCdeqifBpS8IrSta1bVlyW2lXPZlJhfHquu', '2026-08-07 10:23:08.678', 0, '2026-07-31 10:23:08.679'),
('6e4eca4a-fd69-4f54-8b90-322c863ea2da', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$xLooylVp1CJw0/EfOtiBx.6aCQ1oarQxbp3C7QYL6CIeNr609pXUa', '2026-07-27 07:27:08.783', 0, '2026-07-20 07:27:08.784'),
('6e4feccb-9090-4d2e-a2c0-d05204b35e57', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$59Pnfs4Q3rq7c4lAnK62dOImcbI4i9GYJ0EYCEpt748aRGGqR840u', '2026-07-31 06:04:15.585', 0, '2026-07-24 06:04:15.586'),
('6ed063fd-54c2-4d32-9a6d-78e32554d93c', 'f4f162b0-d691-40fa-8ae1-704b095f0302', '$2b$10$FH5lFUBdw2GgwrdW.yqCZumnxrDb14Ab0d0/fTqIF0wPs6KW3mhDO', '2026-08-19 07:06:45.771', 0, '2026-08-12 07:06:45.772'),
('6f0d1049-0f7e-4b9f-b44b-40c5fc19d372', 'bc3515dd-c5d7-4266-9147-de69624d5b1f', '$2b$10$WSeGvLbze9Yjo1o58eniyeRAi0eDaYnhycxDO0uMtMcQqY2y4SB8m', '2026-08-17 10:46:18.838', 0, '2026-08-10 10:46:18.839'),
('6f625be6-5b56-456d-afb5-a7c0c8e83699', 'bc3515dd-c5d7-4266-9147-de69624d5b1f', '$2b$10$mvxT23C622Zx264XK.iRFuShNLbRQ5RF5ypWUvucslXKQPpRTvoca', '2026-07-31 09:34:54.852', 0, '2026-07-24 09:34:54.853'),
('6fe63574-58e5-4e6e-853e-c1ee4a01c4c3', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$fTGwBIlLOm1r7b4beswGB.6iyqPvWg/FqTgpEm/FGMN8BUfyumpK6', '2026-08-14 05:14:15.343', 0, '2026-08-07 05:14:15.348'),
('70a89000-a94f-44f3-826c-798c511f76c6', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$x3FjKGIyOoTQgGPMdZev8.euuKyv4.94ko/QZncoFCT7J8F9Hm/fi', '2026-08-06 10:55:22.026', 0, '2026-07-30 10:55:22.028'),
('724766b3-3e57-4608-b9a5-010d3977e24b', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$zUgWySsv53RX4IwCY6SB3ulNrSsfIniJbL/cYXqd04ybNgBVTfTKa', '2026-08-10 11:04:13.767', 0, '2026-08-03 11:04:13.768'),
('72ca7963-8153-444f-9af3-64a24788fb41', 'f4f162b0-d691-40fa-8ae1-704b095f0302', '$2b$10$PRmkbPZzHkhIcd3JZjkM5OBAfs5ncOZNKYRYH.jy9VD23V63h76qC', '2026-08-06 13:56:21.344', 0, '2026-07-30 13:56:21.354'),
('7379e3cd-7132-4686-90c3-77f3b88fd95b', 'bc3515dd-c5d7-4266-9147-de69624d5b1f', '$2b$10$.O.ji7nNFQ.7ZTCUAkJ.yOp8n4HNXzmxPhFJTY7DADODS4E/JlDHO', '2026-08-13 09:30:16.699', 0, '2026-08-06 09:30:16.701'),
('73df8075-cd57-4a58-91d5-62f6856c72f4', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$f5MfRNTVGLoL79ddig7xv.AGDs4NjHHA9xOuw4xjYN15t8Z7Vbmxe', '2026-08-14 07:49:37.179', 0, '2026-08-07 07:49:37.180'),
('7439f1be-bb4a-4374-b1df-b403d7efdcaf', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$AjTr5SwEYQtbffSWkZeyzO0OBhIXTkFsV7/Vbnd5.eRkxBDSIHJUi', '2026-08-13 14:40:38.805', 0, '2026-08-06 14:40:38.808'),
('74af96b2-265e-43db-b506-8497751691ed', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$AX2NJlSa/gwYr2KIQJt5ZOZ.6iuuCSZMXGrNr1cyJb.FbsXY8yelC', '2026-07-28 07:21:33.409', 0, '2026-07-21 07:21:33.409'),
('74e7c590-63a3-4237-86bb-b1283f237aa3', 'f4f162b0-d691-40fa-8ae1-704b095f0302', '$2b$10$wTPido4H0IDANQlrpzWtle2fC5QRp80pdeIPG5WUFp0Gxm/uZ7Oxy', '2026-08-14 06:56:11.519', 0, '2026-08-07 06:56:11.522'),
('750e368d-ad9f-4cc7-8e35-08705de80537', 'f4f162b0-d691-40fa-8ae1-704b095f0302', '$2b$10$WaD3M7uhlKczOZHF/V8iIOc6BWQlViec9ub2kwmw6dJv6JRRLuvWq', '2026-08-17 08:54:30.686', 0, '2026-08-10 08:54:30.687'),
('7599d239-cd6f-4b89-8e18-c047284ff2fa', 'bc3515dd-c5d7-4266-9147-de69624d5b1f', '$2b$10$yJekPBb6F06CjZ2ZwAHMKuSrm5VxEMpQPZIJKGBJ9JaMOqNXdE5H.', '2026-08-21 16:46:57.606', 0, '2026-08-14 16:46:57.607'),
('75c7644d-f606-47ea-9dc9-0a219a97259e', 'f4f162b0-d691-40fa-8ae1-704b095f0302', '$2b$10$M/Zb0MKQ5ba9lwIpFFd9ZeuKqKQyNmAQf6LqrJHszjORtkSmPo7IO', '2026-08-13 10:47:20.996', 0, '2026-08-06 10:47:20.998'),
('76042b5b-2f03-42b0-9b49-d6753c817724', 'f4f162b0-d691-40fa-8ae1-704b095f0302', '$2b$10$ZfR3NEcBFkPMxsobtCDPNOjCWueIjICF0ANt40WjyBcRSns/nCt6q', '2026-08-07 02:32:52.249', 0, '2026-07-31 02:32:52.255'),
('7722afc5-e389-45bd-80af-7ed287d4c53a', 'bc3515dd-c5d7-4266-9147-de69624d5b1f', '$2b$10$eQo9Lu8enTb2YhOMp0/qsu0C7wRLMadJtf1GldMiDdJ3rY8riBRUS', '2026-08-10 05:13:08.256', 0, '2026-08-03 05:13:08.258'),
('775f4624-545c-402f-8908-709b6e2fd505', 'bc3515dd-c5d7-4266-9147-de69624d5b1f', '$2b$10$k3tAvf6PJHItc0bzKw0oG.9ChPNkrbWg0ahT/bHrSpqNrCUxqo2wi', '2026-07-27 16:03:53.731', 0, '2026-07-20 16:03:53.732'),
('77a81816-447f-4b0b-bce2-57e74353c184', 'f4f162b0-d691-40fa-8ae1-704b095f0302', '$2b$10$eZyfGUOF7tDYsEmDAADr/.cKfoUTO0B5mYmw2hUtl/qSB9ziWOlGu', '2026-08-13 10:47:30.473', 0, '2026-08-06 10:47:30.474'),
('77f414c4-f0b3-4966-a84c-198bb5ddcd2f', 'f4f162b0-d691-40fa-8ae1-704b095f0302', '$2b$10$iUv3c7f.1./T2xVBt93d4.MiAV/YsF0o/FR37s1KA2zTaOAlH53rq', '2026-08-10 09:44:15.408', 0, '2026-08-03 09:44:15.424'),
('7899a306-a22f-41a6-9914-c3b5fb67087b', 'f4f162b0-d691-40fa-8ae1-704b095f0302', '$2b$10$F0CYlzsTu44Qqf3iwFiCOeDR.NXkMeRp1mEyTFsK98w1gZjOuTV8e', '2026-07-22 09:53:26.109', 0, '2026-07-15 09:53:26.110'),
('7993362c-cfc7-4a00-bce2-a1539bca10e1', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$4Zj5gtK0qLCESoos8zNs4.WHzCCsJloNW6PCv.NuhUsnSZTuEnJGW', '2026-08-17 11:17:18.721', 0, '2026-08-10 11:17:18.722'),
('79a263a6-f39c-486f-98ab-7745d15ca80c', 'f4f162b0-d691-40fa-8ae1-704b095f0302', '$2b$10$B60SpxsL215wS0CB6MJJxu1h2XHHtWFFwaiXRrZ9lSj25wOHzjuwe', '2026-08-13 06:33:46.425', 0, '2026-08-06 06:33:46.428'),
('7a188d2f-596d-429d-b7f8-4fb15ce05b91', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$7V3ETS81Nc7SNY0OO8wb8eSCXKWPClCQFaVGuLlo0.H4zutg4T.ra', '2026-07-31 05:30:52.073', 0, '2026-07-24 05:30:52.074'),
('7a5d01c8-7a01-4652-9be5-b6cc91395ee7', 'f4f162b0-d691-40fa-8ae1-704b095f0302', '$2b$10$QkVgZ3VGiNcJD4A5ouqbhOnX6keHXPhyxmfS8HbJmp6v5AZdimTC2', '2026-07-24 09:25:46.708', 0, '2026-07-17 09:25:46.709'),
('7a75b084-9e21-479e-b6e1-9e3cc13e74b3', 'bc3515dd-c5d7-4266-9147-de69624d5b1f', '$2b$10$VrNV6ObnE.evfNh6aykHIO3.Ix5GrP3IiV4TzEr7fsYFmJ/wFjp82', '2026-08-12 11:12:50.595', 0, '2026-08-05 11:12:50.596'),
('7a9f36a3-dc5d-4aa2-b31c-84d2e7a8e739', 'f4f162b0-d691-40fa-8ae1-704b095f0302', '$2b$10$/GsCpwfTE7C.wrD47orQNOp4RWlstITWkZm83d1keD/AMl4S/.C1a', '2026-08-13 11:12:16.995', 0, '2026-08-06 11:12:16.997'),
('7b668ce8-9781-414e-a6b3-9a9368584eae', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$V3ZaFAhaCLULMxk8Qn9P7.lDazBsASaA6wKODiLEhgOMi70GYa09C', '2026-08-13 07:10:18.071', 0, '2026-08-06 07:10:18.073'),
('7b682cf2-ab75-4ffc-8f8f-05e7c8a2d178', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$1D.TBlVkWpb8zIt66vIJYuhdaR7N6WCxE.ZHF02YxFJV7bgy/x3AK', '2026-07-31 05:46:54.184', 0, '2026-07-24 05:46:54.185'),
('7c30898f-3410-45d3-97c3-b888d10464ae', 'bc3515dd-c5d7-4266-9147-de69624d5b1f', '$2b$10$d/WHTeP89eKWwUi0ZxViTuoZbe/yDbw23hmpfeVYJFF1MRV1HmlTa', '2026-08-13 09:29:30.331', 0, '2026-08-06 09:29:30.332'),
('7e6fedd9-ffa3-43f3-b689-78cf1f33a38f', 'bc3515dd-c5d7-4266-9147-de69624d5b1f', '$2b$10$ZemPcGSTubwGJ9PzGB271e3LjfXqpoFbIEadtKcdB3nJ5LPi7Yjfq', '2026-07-29 07:13:00.890', 0, '2026-07-22 07:13:00.891'),
('7eba239d-2052-4277-8836-960f59af6e01', 'f4f162b0-d691-40fa-8ae1-704b095f0302', '$2b$10$uCEQgpjBDKBzbicTzRIzKu.QvvdRucykavPNsaHYnhscL0MypK6pe', '2026-08-13 10:58:46.695', 0, '2026-08-06 10:58:46.702'),
('7f62dbf3-eb72-4279-99b5-8c4aff7c4d05', 'f4f162b0-d691-40fa-8ae1-704b095f0302', '$2b$10$AiM6rhKG1PDPi17mPMti1OqS9b0Rg9D0Y19HyIhxkEUn44HYjyyem', '2026-08-06 14:14:35.788', 0, '2026-07-30 14:14:35.792'),
('7fd6d7be-a840-488f-bf52-365bb65ca9c5', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$6fW6iPAlWFitnX7RwBnWEuicm4hf8ME9YuS5g9GiCdgjTn7hdr3Pu', '2026-07-29 05:43:44.596', 0, '2026-07-22 05:43:44.597'),
('7fe60fde-9f87-4361-bb7e-398d9a6acce5', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$Bg11foZFNqD3897B7KzBgOFPy2zk1nTXbbDqvWjZjNid56gLSzXbC', '2026-08-12 10:04:02.395', 0, '2026-08-05 10:04:02.396'),
('7ff0746e-e627-4be2-97ed-21fe6bbd8b12', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$cTC5i6Oj33FSi6yXKKnLUeH9u5CMGIBLhmaAupAPRGQiIAdGBvLyG', '2026-08-10 05:46:26.231', 0, '2026-08-03 05:46:26.232'),
('805e7ba5-3802-4d9f-98ff-34cb520e989f', 'bc3515dd-c5d7-4266-9147-de69624d5b1f', '$2b$10$KFvStcO5vYuy/EOFHP1ojez72M8rmpL0nfw5yx6cE7Eg/W1Q2iWFC', '2026-08-10 05:36:17.091', 0, '2026-08-03 05:36:17.093'),
('81303c09-fc11-4c0a-89d3-0e4008608d06', 'bc3515dd-c5d7-4266-9147-de69624d5b1f', '$2b$10$HjIEQaXLqeLLz4QhPnYfguNJtv68WY20VSQ1IpUBsPkqiAdq8PN72', '2026-08-17 10:30:47.427', 0, '2026-08-10 10:30:47.428'),
('81329417-5fda-4b7d-a1bc-a9bc1e08b7dc', 'bc3515dd-c5d7-4266-9147-de69624d5b1f', '$2b$10$DjTIJDXFqm9R44gh9M973OPjykY4tSsLeGUsdZALL7DB8CLOiWoWu', '2026-08-13 09:29:21.565', 0, '2026-08-06 09:29:21.567'),
('81c6b5b3-e773-4956-aba6-5f4b7e8db458', 'bc3515dd-c5d7-4266-9147-de69624d5b1f', '$2b$10$NW6rQ0r487gKS72GNXE8y.pEYNLWs1K92Rl0g9o6QnvWJ/jp/Eycm', '2026-07-27 11:04:03.556', 0, '2026-07-20 11:04:03.557'),
('82739c48-1113-4b74-82e1-e7b7d3ddcf45', 'f4f162b0-d691-40fa-8ae1-704b095f0302', '$2b$10$vWl6gKDUyJNGS1wTrtICqe7gvyjed50z5FxwkHXOHIoFHJsDyHhi6', '2026-08-14 07:55:31.333', 0, '2026-08-07 07:55:31.334'),
('82be4dd1-9598-4f57-a627-f56f2ecdd8c8', 'bc3515dd-c5d7-4266-9147-de69624d5b1f', '$2b$10$53zcdMHkq916A.NPTv.0leGbwJgeZiXuNtEfJOCuQvbXXT4pIYk1a', '2026-07-24 10:40:08.172', 0, '2026-07-17 10:40:08.173'),
('84ea0c11-71bc-40fb-b4aa-f8edcc055e23', 'bc3515dd-c5d7-4266-9147-de69624d5b1f', '$2b$10$VPZ.BaVng6nvNnqnKrq3JeB2L/9LyDIVUEr40hxMfxiC99E0iGRpq', '2026-08-10 05:11:25.922', 0, '2026-08-03 05:11:25.927'),
('85479052-1bb7-44ef-8f29-6b7ceabcc1af', 'f4f162b0-d691-40fa-8ae1-704b095f0302', '$2b$10$Art3osVsi35/a/1klrvBvewS5zCPBu2r7CAwAYGd66n.oloGkg88O', '2026-08-21 11:04:47.450', 0, '2026-08-14 11:04:47.451'),
('862d3d8a-4843-4078-9830-0c43829db720', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$kEx7XqOQXCQ4X2eyXtuKZOPdWZawJViyw9tSG12a13SGstt0KlahS', '2026-07-31 10:41:10.260', 0, '2026-07-24 10:41:10.261'),
('86602954-c94c-4f73-94a2-91b7e77c5fbf', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$2sQfNzeP9qwRfb.yqWzupu2QQcLSvqZWg01gbNwrRYihJTZZYBiaq', '2026-07-27 09:27:25.654', 0, '2026-07-20 09:27:25.655'),
('874538b9-6da2-464c-9fab-642d3bcf1eae', 'f4f162b0-d691-40fa-8ae1-704b095f0302', '$2b$10$RxOQbmfky..2AcsPJuf0/eoC/zJv4c2i8GXp.ph0XO.wCvOmTDSPy', '2026-08-07 10:42:51.876', 0, '2026-07-31 10:42:51.878'),
('87f27cbf-db83-4d5b-ae39-5360f242c142', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$Hx5Zho26HxvTFxxo3WWgqufAiGHue9dfO.n9FvKOb9MS1EfdiMdGy', '2026-08-14 06:49:41.252', 0, '2026-08-07 06:49:41.255'),
('88e090fe-cc54-4485-9529-aa9433759fe7', 'bc3515dd-c5d7-4266-9147-de69624d5b1f', '$2b$10$xg9j8MH4oIMqiR4.6fhmrez8fuoddz.LOoWtodG/h8.3h9HDCCpiu', '2026-08-21 11:06:31.349', 0, '2026-08-14 11:06:31.350'),
('89c7d22f-1211-4cf3-b0b0-51b8cf3db2da', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$8JncNJDSatKBOPimVa3UOOUam.cA0n1sNaIhOh6GsLZoNl2kGNjhu', '2026-08-14 05:14:15.032', 0, '2026-08-07 05:14:15.037'),
('89f6860c-09fd-498e-8c6d-e1fc8f22af9a', 'f4f162b0-d691-40fa-8ae1-704b095f0302', '$2b$10$OOAcZgKpIhGlxRBWZ28t/eLbTfF.ZxHlUteR3zsvF/tbCZJ9MnJfC', '2026-08-06 06:35:27.693', 0, '2026-07-30 06:35:27.697'),
('8a3a5d00-bd29-44ac-bf48-4c0961172133', 'f4f162b0-d691-40fa-8ae1-704b095f0302', '$2b$10$exHM3IPMXD2JdF3EeMtl7u/c0RxlIkwA8jWVF4HpH.oYdkWryIonG', '2026-08-10 10:04:21.877', 0, '2026-08-03 10:04:21.881'),
('8a6f3090-ae4f-4949-827c-21fbc3895a29', 'f4f162b0-d691-40fa-8ae1-704b095f0302', '$2b$10$MVUzQJSYm9OGFDDrPQtwf.Wq6/0iJVcgA9FXFEehkuQYsboaCyYU2', '2026-08-14 10:15:01.775', 0, '2026-08-07 10:15:01.779'),
('8b994173-f279-4ed7-ab3a-12f76a489abd', 'f4f162b0-d691-40fa-8ae1-704b095f0302', '$2b$10$GsdnjZyn7D24nXrfgz5R5.yGEC/aD6rHG0hJdOU/tWdyvy53yMWZy', '2026-08-10 10:03:57.141', 0, '2026-08-03 10:03:57.145'),
('8c57fd29-924c-4508-ab5a-b9a99c753cc6', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$DBlRwIjQaMamog7UYgD.QeOZzb7fMB7U8NQsohg5ftXWKIrMiHgSu', '2026-07-24 05:43:36.026', 0, '2026-07-17 05:43:36.027'),
('8d6d3f49-af4f-4943-88f7-672635186acd', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$m7ybtgdq3R0Ck4oSg679QO2FNmk.9X0QPVCe32PcqwhzCf0jH89bi', '2026-07-23 10:11:43.761', 0, '2026-07-16 10:11:43.766'),
('8dedf6fd-c89c-4a4b-9d1b-83bc47db74f4', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$Rx0qHubYCQfnT.48j762EuGrcasrs3.e2aKf3BqYsimPP9Ws4ndVG', '2026-08-12 05:55:51.525', 0, '2026-08-05 05:55:51.526'),
('8f6a7b39-4aa6-40bd-9658-72cb6ac50805', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$fR7Hc5XHxTWfkGKjEtb/WuQbqAb84HG1py4pcQL8w04jq4Xa3jLdm', '2026-08-06 10:10:25.021', 0, '2026-07-30 10:10:25.023'),
('8faf1f61-34b9-4410-a22c-f7c6cbfa3d9e', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$Mj8g7vsxXoSjg/pxHZ0FDerk.EMiFYt1HGb.FZfa3eWB.WG.L6zSa', '2026-08-10 10:49:16.966', 0, '2026-08-03 10:49:16.967'),
('8fd5b3f7-0027-4d48-b85d-415f0a4c0c33', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$quX/CqWujbqYu7iHIvebv.kXeMl0UerS1g5RQwN68z4BQZEbGUqCG', '2026-07-22 10:03:37.406', 0, '2026-07-15 10:03:37.407');
INSERT INTO `RefreshToken` (`id`, `userId`, `tokenHash`, `expiresAt`, `revoked`, `createdAt`) VALUES
('909875cf-0782-4678-ab5e-6a9864f8dbcf', 'bc3515dd-c5d7-4266-9147-de69624d5b1f', '$2b$10$cjuVJKHFPpr1QoHEclwHgeiAVtKRSHnAtA7.GmUzfBG6NsWCm.6iO', '2026-08-10 10:04:21.382', 0, '2026-08-03 10:04:21.385'),
('912dc5f2-02e6-4c7f-8c54-15768b3d06af', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$RMXmzgb26K8Eoxm5wMQNK.z5T3tXehWn4X/dbm21oTJ6NK4UClko2', '2026-07-31 07:01:38.171', 0, '2026-07-24 07:01:38.172'),
('9175844f-cf44-4238-9e6e-86dfd5b9b2e6', 'f4f162b0-d691-40fa-8ae1-704b095f0302', '$2b$10$0JUIJx9FeVa/9LgaMMTHUOedakloXH71ZU87oPmuXkF8KHZeGu/CC', '2026-08-14 09:35:32.617', 0, '2026-08-07 09:35:32.621'),
('91828021-02c9-45c4-bb0e-064e06422d38', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$UX8r14Sy4DsqSnIH2j920Ouvlho/Zmbmy7EdIGbc5QV9YuffXI34u', '2026-08-07 11:15:03.290', 0, '2026-07-31 11:15:03.291'),
('919d52ba-a716-4eb5-b0d1-6440ae32234a', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$64/dVTz8OUo8gs1EZGnasef1IJjpwCp8RBAwn99VFd57Ej2EFZgJG', '2026-08-14 09:48:56.821', 0, '2026-08-07 09:48:56.822'),
('91a00f7d-6788-4098-9b51-4fbd0a5a62ff', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$YzzNtbiCjO4ps9gAkijPf.q8EuAtJGjzIqTlc8wrmSDo.eCaIrwNy', '2026-07-27 07:44:13.983', 0, '2026-07-20 07:44:13.983'),
('923a89e7-825d-4621-8ddf-136b24817ce1', 'f4f162b0-d691-40fa-8ae1-704b095f0302', '$2b$10$Cmxt78e0.UgzB0uf3/mmqOUT3cUggQ5dnep90kt/ArI7BIP4x1NBu', '2026-08-13 10:41:36.829', 0, '2026-08-06 10:41:36.831'),
('9255b964-dab1-444e-b10f-614851d80de2', 'f4f162b0-d691-40fa-8ae1-704b095f0302', '$2b$10$bfAp9SGh42shCvP14uji8ucK93niwfDYBaR/czgIy/HkjbgnwyBX2', '2026-07-22 09:57:40.008', 0, '2026-07-15 09:57:40.009'),
('92c18f66-853f-459e-8008-ef39d787dfdf', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$p/QQIqIoVTGdpJpXbyBV5eFaRa/amuInnSzvzeyr7pQjjPkF5n2SC', '2026-07-31 05:41:37.584', 0, '2026-07-24 05:41:37.584'),
('93a1884a-fcfc-44f8-944a-6898fbd399f1', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$G/qNSxXkzlRp6ElYhCV7m.5IGot48pwJyXlXeR.PELc.TSpF5opwW', '2026-08-07 07:16:16.801', 0, '2026-07-31 07:16:16.807'),
('943fe7a6-8678-441a-8ab0-1942e1f11fe8', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$5X79fWLCWfdlJRmjr/pe2uOKOZKDTrbBnYdw6J4XcYQq.pohnH4y.', '2026-08-14 06:44:53.259', 0, '2026-08-07 06:44:53.259'),
('94cee862-2db4-4950-a006-041bd3bc967f', 'f4f162b0-d691-40fa-8ae1-704b095f0302', '$2b$10$umjaHlqnSVcdfSPiLB21dOhmN/4dx9gisDJNo/UxMg7kMB5/duvvW', '2026-08-10 08:12:18.093', 0, '2026-08-03 08:12:18.094'),
('94e4e6c9-540e-41c7-b0c8-aa6552501b15', 'bc3515dd-c5d7-4266-9147-de69624d5b1f', '$2b$10$d3OI6.Tr9iduL.hDwaYOf.4mEdg75gFpuj04XUMEDyS6IJTFfjD3S', '2026-08-13 11:00:54.893', 0, '2026-08-06 11:00:54.895'),
('94f47ebe-317c-4962-8a04-f6b10dbd9cba', 'bc3515dd-c5d7-4266-9147-de69624d5b1f', '$2b$10$hxR3W2S7n8Kf449.QfB1N.xxwbF6ZH3YHvTrbqO.4drk7qRpuzrl.', '2026-08-10 07:47:12.120', 0, '2026-08-03 07:47:12.133'),
('9562a68c-1e91-42d4-b8c3-f211038502b4', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$sw3Vro1RgK4AyAkKvZ1LC.HRHgD2XK1Bh6p8U46J/u15etS8FlpYW', '2026-07-22 10:26:43.910', 0, '2026-07-15 10:26:43.911'),
('957a987c-0cd9-40df-9185-31de49952d49', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$1EAce3VkRle6zxwOre0.BeqOdfPIQX6ckiC08lKLKskxjlVdWcUAS', '2026-08-10 05:14:04.038', 0, '2026-08-03 05:14:04.039'),
('964ecfd2-776d-45db-93e7-68bbecefbf3b', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$DxDzIzhXPbv2KKKUFTpFyOSPAc2ikPBjW7.pG7cOdLsDo6PrcfMja', '2026-07-23 09:51:08.394', 0, '2026-07-16 09:51:08.396'),
('96ac10be-d668-41a1-a272-31f8e8c8cc7e', 'bc3515dd-c5d7-4266-9147-de69624d5b1f', '$2b$10$YyIfoM5s.ln.yjG4KlTzfuWN5.wUf3ThzVPhSKAPmMiSiPEV5PDQC', '2026-08-10 05:11:18.103', 0, '2026-08-03 05:11:18.108'),
('96b800d8-46fb-4f86-a97e-ce5d66d4a83b', 'bc3515dd-c5d7-4266-9147-de69624d5b1f', '$2b$10$yEaAT6NFpdWL/q6BgjUw0.UcZEqahzSt4EQ9J8D//jhOSbxvDNZo2', '2026-07-27 14:33:24.751', 0, '2026-07-20 14:33:24.752'),
('97b11ecd-b409-4a5c-a38e-c83e8f1e4572', 'f4f162b0-d691-40fa-8ae1-704b095f0302', '$2b$10$MTgPKHIfbWMKCnpnpA7Hi.HOlzDlSWtUphv0mC/mc4SuikocK80oq', '2026-08-06 07:16:25.979', 0, '2026-07-30 07:16:25.981'),
('97e7eacd-191f-4acb-af7f-35897bf06cfa', 'bc3515dd-c5d7-4266-9147-de69624d5b1f', '$2b$10$WYoFsVKAgw2qx/2ABqx31uIjbSY83JD913qGYhi25.hJTklBEPt1u', '2026-07-27 08:01:52.795', 0, '2026-07-20 08:01:52.796'),
('9924cedf-dce6-48fa-8eb5-b8ad0f12dac9', 'f4f162b0-d691-40fa-8ae1-704b095f0302', '$2b$10$49rbu1D.Xg0wTvZgJin1eebycCd/VZpWzy3RqyfuWhWD.j/avp7ui', '2026-08-10 08:01:46.247', 0, '2026-08-03 08:01:46.256'),
('9974e19a-2517-4365-8821-36b978ecad94', 'f4f162b0-d691-40fa-8ae1-704b095f0302', '$2b$10$..hlQvHDQFnv7SlcD7uv0O6Yl4RkKXy6s3E53P4AMsF45Q8rr.e2q', '2026-08-13 11:04:24.787', 0, '2026-08-06 11:04:24.790'),
('9a001914-5d9f-4a85-962c-aa3032a9f3b8', 'f4f162b0-d691-40fa-8ae1-704b095f0302', '$2b$10$i/r.zAmzkxPwwzlKhSmVte16JKI6RMPfQmcmaEl46cT/j6A6wcbM6', '2026-08-13 06:11:17.987', 0, '2026-08-06 06:11:17.988'),
('9a25b164-c3b9-4144-aa01-05767200f630', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$f9V4c.GtSxOueA/.GKYw3.4K9bxpYz7TvP98uNnIckaJJm/Lt9kT2', '2026-08-14 10:47:19.025', 0, '2026-08-07 10:47:19.026'),
('9b352e5b-f579-46c7-9f5f-d50c27e31455', 'f4f162b0-d691-40fa-8ae1-704b095f0302', '$2b$10$F73MEhzD8Y5ulDUIaJogeuucxj1gQRBboc5jMDPdJGKEZVZ.GwWg6', '2026-08-14 07:54:29.449', 0, '2026-08-07 07:54:29.450'),
('9b655ca4-f4c3-4a2d-8518-c07447e02bce', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$kNuYwh8lJWkkC5RA/eIKaeJQtHerz1k5hXfJEeHZnIG1FDBusKfVi', '2026-07-22 11:04:00.671', 0, '2026-07-15 11:04:00.672'),
('9ba7f513-81df-4107-a206-b52ffb47e597', 'f4f162b0-d691-40fa-8ae1-704b095f0302', '$2b$10$STrOeGldiNDhqG8gtJDsP.90fPabqbZ0CKPr0O99mlIQhcXZqg5.S', '2026-08-14 09:19:13.230', 0, '2026-08-07 09:19:13.234'),
('9cb29cc5-b1b5-4878-9c43-8fbb72d99aed', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$4nab6QmxlUkypa7jmN8QMOX4IqcqU3HSLgxPg7V7m7DBXREHiYPx2', '2026-08-07 10:54:12.488', 0, '2026-07-31 10:54:12.489'),
('9d5ae281-ae75-4405-8948-c3941ccf750f', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$itUCQKSylUqIqRKEGNLUWOA7cCUPSCzO8CDS5Wkciiw01oDTrScca', '2026-08-21 05:38:55.483', 0, '2026-08-14 05:38:55.483'),
('9d881c96-4544-49da-a543-c59791d8869b', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$rjK88ZFIwtzPiTH7L79JG.hcSM6Mey3Uuge6dU04qzAj2xY98EUCe', '2026-08-14 06:49:02.900', 0, '2026-08-07 06:49:02.902'),
('9e67655c-7782-41fc-8e3a-af7bccacbb15', 'bc3515dd-c5d7-4266-9147-de69624d5b1f', '$2b$10$kr0qY26OEk4gIvBO4QdJ/O6lTeTXP1KxToa5LCbbAS.IDDIeTsbvq', '2026-08-07 03:01:15.738', 0, '2026-07-31 03:01:15.740'),
('9ec08aec-e682-483b-a0a0-f8a38d565bd8', 'bc3515dd-c5d7-4266-9147-de69624d5b1f', '$2b$10$aRlw8/a.Q2Mc8KNzX.0EbecAXQ.0GDajgznJh2vvcquNQOiJ.fNvK', '2026-08-17 10:15:35.332', 0, '2026-08-10 10:15:35.333'),
('9f7b7834-7e4b-45ca-bd0b-0feb36abbedb', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$MtwVm5HgaTQgPTBOV8Xq7uREg.lXTT4ZlbTvLolpvk9eolNvRvtCG', '2026-08-14 11:39:25.784', 0, '2026-08-07 11:39:25.785'),
('a093dea0-f392-43dc-9bc2-2ed581c77f73', 'bc3515dd-c5d7-4266-9147-de69624d5b1f', '$2b$10$sh9tgHRNAWtqxFMed/FNieXl28cf36WmmyfRi00qqZefXSeWmk8E2', '2026-08-10 05:13:02.104', 0, '2026-08-03 05:13:02.107'),
('a153ba84-f3a7-47b6-86a8-40d513003ea8', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$uJ2dS5HyXBmWHI6ulIfYh.1dlpnU6k07zDYfv2K6UZS/PZ2p8qrxu', '2026-07-22 11:19:46.973', 0, '2026-07-15 11:19:46.974'),
('a1f8df25-4412-430d-b118-5a821d7c7100', 'f4f162b0-d691-40fa-8ae1-704b095f0302', '$2b$10$Hzo4rGx9MfMCXk2p5N5j6Oicy//0N/oeGGHxYOmK8Set486MxHGdi', '2026-08-13 14:24:41.028', 0, '2026-08-06 14:24:41.032'),
('a2002221-bc45-4556-b1cb-7eb0967a8d62', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$mpjPnj4qxZWVhQvfYewEhOCKw.mrbkZFJ9n6nT8GqvFu9PjuxiRKC', '2026-08-10 10:35:20.869', 0, '2026-08-03 10:35:20.870'),
('a3f27f16-f013-4b45-b928-2e507d7a959d', 'f4f162b0-d691-40fa-8ae1-704b095f0302', '$2b$10$hU6WXAbcQl0yeXRsLBlF2.zCsykVve0uTOTn.qm9NarvJrxmoVX2K', '2026-08-17 10:11:01.694', 0, '2026-08-10 10:11:01.695'),
('a3fd6c2a-f7bd-4220-9288-e2be7657e09a', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$qxtE/qFGYJzhy1NcSb/f/u1JRMJloxNrts0EQe.SdRkSJK615u6Ei', '2026-07-30 05:24:31.601', 0, '2026-07-23 05:24:31.602'),
('a4d8b051-1d45-4b4c-95a9-d61d51c6c6fa', 'bc3515dd-c5d7-4266-9147-de69624d5b1f', '$2b$10$MM1Ni.BhBOJQaWhX/0UcXumBSt7gEaiAtdYAAAHzeQ1gNuMnhtC66', '2026-08-07 03:28:47.440', 0, '2026-07-31 03:28:47.443'),
('a51cc52d-77fe-4788-830f-70d6ef2ca48e', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$jFtWS7tt2sjCsUfVlh/z1uVV5bkPvSVLlM6TmtKJeA7LiFTwVSsZC', '2026-08-12 09:59:32.697', 0, '2026-08-05 09:59:32.698'),
('a5725098-7931-4015-9bad-dd4e5aac2c52', 'f4f162b0-d691-40fa-8ae1-704b095f0302', '$2b$10$DKD9SVboShA/VvKfxHcf2uvCM9Cegz9IdupEbTkI08A8QyXXlSYWq', '2026-08-10 08:12:30.899', 0, '2026-08-03 08:12:30.900'),
('a6e4680d-fa90-419e-a1c9-64d866df4ca5', 'f4f162b0-d691-40fa-8ae1-704b095f0302', '$2b$10$Tay5mn/Syibaf/oO76CQxONBlcLh.AwYO6F7NTewXgECIWhc.22pa', '2026-08-14 09:41:50.012', 0, '2026-08-07 09:41:50.013'),
('a7163ea7-2d4f-41ec-af9c-e7901da16cf9', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$PbQ7eIq3F/O1ynFJOys6YeSIGPN0mI8zOJkuAu/QT3NpxcA7F8tdu', '2026-08-17 06:10:41.862', 0, '2026-08-10 06:10:41.863'),
('a71adfde-95d3-43f1-9d38-1caf917e01f8', 'f4f162b0-d691-40fa-8ae1-704b095f0302', '$2b$10$bVeEzqJlE2bI6BSIXN4OY.WwiHfnbrGGBAt2dqHbb8tZOCjQjW7tC', '2026-08-03 05:37:04.155', 0, '2026-07-27 05:37:04.155'),
('a7309bd8-2e9d-4c06-b054-236866d22b31', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$nRmzd0xXQQI178CvBqmsaOdvlgF.QFMA3SYt20FUR20HM636dnyKC', '2026-07-22 09:13:55.482', 0, '2026-07-15 09:13:55.484'),
('a85f2da5-4e8f-4c8b-b54c-7c96ffa2bcbe', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$OfXpRrHmrZy6GjHbAtDbHO4/2JwAZtCrvt0TOvnaXetGrhRtDTHuC', '2026-07-22 09:56:54.304', 0, '2026-07-15 09:56:54.305'),
('a8773184-4213-49aa-924d-f6b610f4a681', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$Jz/GWVvVwdqE28EUazFGJ.60tv3ps8u8r645t1lI.jZ8tOUHSw.hO', '2026-08-03 05:21:43.157', 0, '2026-07-27 05:21:43.157'),
('a8fdcc15-26f4-43af-af3a-86b8e2475eba', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$Sjyd0WPJPwLscqZeyPwqZe9CyYxmBv3wLiPsAt2nF6tQSlMg6H1qC', '2026-08-17 08:54:39.784', 0, '2026-08-10 08:54:39.785'),
('a9007310-b9f9-47a0-82f1-8deb2d9d5f78', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$N9VsHuir2p5yvxsb/X9/huQOA.M/kJ7ESIl6gMU/emuzsd13Skday', '2026-08-13 10:47:01.151', 0, '2026-08-06 10:47:01.153'),
('ab8fe687-710c-4580-af6e-659fbb471021', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$mgeOhzhTmLfUEaAMIqHy5Or7o9oPiZKehNeAG3bgIEBjQpnRYSn/i', '2026-08-03 07:24:33.186', 0, '2026-07-27 07:24:33.190'),
('aca0afbc-953c-4d44-bccb-0ce098dcda06', 'bc3515dd-c5d7-4266-9147-de69624d5b1f', '$2b$10$43oMtLYwyAbN65Q8/OksF.kbhp2mNuFuHzGdoRy8mqbWLVH9DNoMm', '2026-08-17 10:46:14.848', 0, '2026-08-10 10:46:14.849'),
('ad0f36cc-062d-4c1a-9fd0-6b292750828a', 'f4f162b0-d691-40fa-8ae1-704b095f0302', '$2b$10$6MXB7RKB89mvIZQ/Y6XDWelVBpI24UH0UY0z1GppfrQX8ouCzOC0C', '2026-08-21 10:40:38.604', 0, '2026-08-14 10:40:38.605'),
('af6cdc0b-8b48-4b58-9094-c5637e69774f', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$Z0BsDyKBWhUq4kOKnUb/jemm18HjvhF6b3xIv8lJ2b3MgVazUM0Re', '2026-07-29 06:46:48.194', 0, '2026-07-22 06:46:48.194'),
('afcc1890-6c22-4043-a60f-496122f76f4d', 'bc3515dd-c5d7-4266-9147-de69624d5b1f', '$2b$10$V4UaC/ea3j4giZdf9Jgpo.edPFyU9YxEYpC25JXFaapPTroJAKl3i', '2026-08-13 10:56:52.635', 0, '2026-08-06 10:56:52.638'),
('b11a4ef7-12fd-44b1-a9a9-485e07e96711', 'f4f162b0-d691-40fa-8ae1-704b095f0302', '$2b$10$XV4VkK3kYeSQSxPopNG6leoP2CnQJq44070k/J3obKs1A7r9sG2nm', '2026-07-28 10:21:01.283', 0, '2026-07-21 10:21:01.283'),
('b17144ea-3a9f-47f1-89de-1db1d128fe1d', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$6uKKikY6Em31Ou74Ad7Yneu0ZWjSpIY.EHDXoLKasYIlk8ZhGGwpm', '2026-08-07 06:10:43.305', 0, '2026-07-31 06:10:43.316'),
('b2184e84-e49a-44c7-9624-e24060375f15', 'f4f162b0-d691-40fa-8ae1-704b095f0302', '$2b$10$Y0YA24qtNSvEUZw3QYV1CuPuDkQyo1PaaFHf.067y1nALD69TVb/W', '2026-08-14 10:15:25.929', 0, '2026-08-07 10:15:25.930'),
('b23c554b-993e-4adf-be4a-29bef101ea40', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$KyQUT7nLT3BplJvw4kp5yehXrTV0R6xWe5QzCN6rrqxsR5o0P4/Lu', '2026-07-22 07:34:43.948', 0, '2026-07-15 07:34:43.949'),
('b2b6828a-f120-4ea4-a617-781c4796b6f2', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$ikSuW2hlQVHHgnBxnFDvbOuYclMGeGwhhPzbEkDwy9QapSBkguRUK', '2026-08-14 05:34:36.822', 0, '2026-08-07 05:34:36.824'),
('b338c793-34bc-45b1-82c2-7dd6bed2f0ef', 'f4f162b0-d691-40fa-8ae1-704b095f0302', '$2b$10$a4p3Cwb34Ulb/8vZ6Za6c.YONFPmyVoj5xhbh2r6V3.5riiOKK6Ju', '2026-08-13 10:57:45.263', 0, '2026-08-06 10:57:45.267'),
('b399fa99-c13c-4a86-b813-e293ed586a07', 'bc3515dd-c5d7-4266-9147-de69624d5b1f', '$2b$10$s0.w5XWqxLCg7noPjcssHe4dBFLVU9juVFu/4R/Pk2zLFRbJzSOHy', '2026-07-28 10:22:00.484', 0, '2026-07-21 10:22:00.485'),
('b3b66300-92b9-4402-a595-94ca734a7fe5', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$f3zGbRKDvTux28UJ9ugogugmgiAapKLRXBBbkHNaF2q.tq8qqqkWG', '2026-08-07 06:42:56.699', 0, '2026-07-31 06:42:56.700'),
('b3f22d66-ae42-4f97-a5e7-638e3ef4304b', 'f4f162b0-d691-40fa-8ae1-704b095f0302', '$2b$10$AW3IdJXaF8lo4P/2q2p3veANRFMNjNbUrsIJZWY/wjUd9bH0rCY2e', '2026-08-14 07:12:06.126', 0, '2026-08-07 07:12:06.127'),
('b431115c-126c-463e-8363-3461d7f1c88d', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$Jy3dFJ6YEXb.I0IPe7UHd.FqhUNu2bPH/zkuxE70WLsLC690PfwPu', '2026-08-03 05:41:37.647', 0, '2026-07-27 05:41:37.648'),
('b46fd51f-653a-48f7-81c1-b8fce882d3ed', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$IwypvQ5kkhOdz5mqNd/W9eBT/D9gUHOP0UqsmtXchFxw0zTJPaoEu', '2026-07-27 07:06:10.020', 0, '2026-07-20 07:06:10.021'),
('b4e54db4-60ef-489e-b7cb-d0b63551ceeb', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$IYY2ugbdu5qmRl5CRuWkf.H5sempTfJL0gUx0YjlxPaZEppgc2Hh2', '2026-08-17 07:19:01.949', 0, '2026-08-10 07:19:01.950'),
('b5be61f0-6fc3-49a4-b93f-03b46a8c39c6', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$41gbZ9hzSfC5NPDIOYlBv.R9rDztGqqAaykyfTdx1IGgk6rfZaB/m', '2026-07-27 09:45:12.355', 0, '2026-07-20 09:45:12.355'),
('b5c0ded4-e0d0-46ac-9511-0a59fe240ef3', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$BunAJM.awJLn4ffYjcSH4.kXJyfuLwAmp49lQSTwdPXRnJ2j5E8JO', '2026-07-27 05:42:27.633', 0, '2026-07-20 05:42:27.634'),
('b725ab63-ee41-48dc-aa72-23d49d0dec21', 'bc3515dd-c5d7-4266-9147-de69624d5b1f', '$2b$10$/97SBAVjIxF4g2y8ygrkne8zcfHNDQTDUKM95ltkKCgKHthnz6IPC', '2026-08-13 05:50:02.136', 0, '2026-08-06 05:50:02.138'),
('b7b54d00-8681-4622-aad0-7c604c9029b8', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$MyINlHPfF7XlaoSBKrmQee/zFTY/GiJvoMxhhkLmn5uym1PZLckJS', '2026-08-03 07:56:47.099', 0, '2026-07-27 07:56:47.133'),
('b7f92165-3c64-41b4-a92b-8438c8f867f2', 'f4f162b0-d691-40fa-8ae1-704b095f0302', '$2b$10$TEd62LTHDtrkZQ/hsnn1yeAbT8WZKEixaTPep/TtkoY8253vx6tuu', '2026-08-06 16:28:43.698', 0, '2026-07-30 16:28:43.699'),
('b83e0197-a957-4b0f-be3f-69eea9b5bcec', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$c2KUaJOnUHM698ygoX7ycOS/garQKUOkM4JvUhsYm.I8e7nTb9t9S', '2026-07-23 11:05:55.139', 0, '2026-07-16 11:05:55.141'),
('b83e93f0-9e62-475a-a925-7f3a207f6221', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$cTUyEuptgNHlmxmMMmVPDe0S1gz8LrA8g3jE1szp3MQ0y5UxPZkXO', '2026-08-14 06:45:10.667', 0, '2026-08-07 06:45:10.667'),
('b88d167b-22cf-4a88-97bc-ea8a9096eda5', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$wErXzlZZiNpb6yZXfBW.b.nv4iBY0jS.kNhvbStQ5JXm9C.fGNlYq', '2026-07-24 10:00:20.099', 0, '2026-07-17 10:00:20.103'),
('b8b10bf0-d289-49df-8489-900fb70edb2a', 'f4f162b0-d691-40fa-8ae1-704b095f0302', '$2b$10$v23cWd9cGWjVvv7U6iRT6O/GzeUxhNOJTgtNxcj5EycunNnJNObie', '2026-08-14 07:55:31.012', 0, '2026-08-07 07:55:31.013'),
('b9121902-7b93-464d-90a7-331256cac66c', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$TxOyoFNSDucxSvY06ZcB0ONL654DwGphhPV.Gtd9sSfkSmI6nY35W', '2026-08-21 05:38:56.180', 0, '2026-08-14 05:38:56.181'),
('b9ade714-22cf-4ceb-a0bb-70b9f760bb81', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$UFLsm8uacAiAN5ANaNXTGO.xG0oiwAM9egKfJF4R7Ur/AQbLZ.EPC', '2026-08-10 05:49:14.134', 0, '2026-08-03 05:49:14.135'),
('bac98265-ef9a-4dd5-93dc-6ebad2326b2a', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$7cr811YaCQqWFEMzmPuareJK3ugtvFWp4DAkk.8pY6wLWI/Um1Dhm', '2026-07-22 09:41:45.600', 0, '2026-07-15 09:41:45.600'),
('bb0dbac6-af0c-409f-a05b-6a7606e34302', 'f4f162b0-d691-40fa-8ae1-704b095f0302', '$2b$10$RM06jyws02751VnAIfU9J.8NSbcA7t5UW02YBzNE4DnJiIFNd1Qsm', '2026-08-12 05:30:11.125', 0, '2026-08-05 05:30:11.126'),
('bb3fee8b-8dd5-47c9-962e-416306412d60', 'bc3515dd-c5d7-4266-9147-de69624d5b1f', '$2b$10$dPcRTL2CEMohGFMJZMTC0uZfsV0TzjWqsPCsf9ccrrKXkBncMwXqa', '2026-08-10 05:13:21.182', 0, '2026-08-03 05:13:21.185'),
('bba9c8a5-e4cc-4111-bdb9-26c6e2760935', 'f4f162b0-d691-40fa-8ae1-704b095f0302', '$2b$10$kQjryZjby5OJGPv0ZupFC.JFOdtLU6XQsw/wOObxhusqS1paHb/Lq', '2026-08-14 10:06:52.107', 0, '2026-08-07 10:06:52.109'),
('bc0d7e4d-9ef4-4311-a21b-498331486155', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$lDPMA.XVOKWVmtiGn6FxuOq19zliqXGfnwICFey8Ij/GRQQdAVjq2', '2026-07-27 06:00:47.096', 0, '2026-07-20 06:00:47.097'),
('bcb3abed-0da2-4a5e-bdee-dedb4fb25847', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$IcpXzents/kM1Dqxky78ruVO3T3Fq6LhmKTWx/Zz45MFDk3EsSx7K', '2026-08-04 05:53:26.968', 0, '2026-07-28 05:53:26.974'),
('bd7f912d-e9da-4d6d-9be1-d06b8afa5c78', 'bc3515dd-c5d7-4266-9147-de69624d5b1f', '$2b$10$mZ0sZMwiCR0zxbxbMVLEKOtAA5Z54LEKGmQTWZH4GsiwhDsm6Y9xu', '2026-07-27 14:49:44.357', 0, '2026-07-20 14:49:44.358'),
('bd98866e-91da-4d01-ad3e-0de3cdf40d5d', 'f4f162b0-d691-40fa-8ae1-704b095f0302', '$2b$10$prarG9VZrTh8Nh6sGU.YReYKxeL.AleNOtovSeq4SYpHoPvOk2LNq', '2026-08-10 08:11:38.827', 0, '2026-08-03 08:11:38.829'),
('be9082c4-b70f-4ea9-b125-5cddd4864bcd', 'bc3515dd-c5d7-4266-9147-de69624d5b1f', '$2b$10$tzeXDZzaDf8Tg1z4Qu37COzmB/TqDDkKPcym6KslUnnhjcDYVPhvu', '2026-07-27 06:04:57.395', 0, '2026-07-20 06:04:57.396'),
('be9ec743-fb40-44a9-b08e-31c0e4e01e3a', 'bc3515dd-c5d7-4266-9147-de69624d5b1f', '$2b$10$npLiXQedbIzkKTlAAbr3s.QxsOkDf4iuvSXytuUuGiIRneIc0PAwq', '2026-07-27 07:43:32.685', 0, '2026-07-20 07:43:32.686'),
('bf065d1a-7f79-4468-a585-67ea53dc0203', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$G19CLmUpEujh2a8lMi0PJehO2bQJvgRAKM5zxvE53JbVPFPQDPsGu', '2026-08-06 14:05:35.971', 0, '2026-07-30 14:05:35.975'),
('bf1e3caa-4567-4425-bece-87f1f09cdd73', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$bAtfbJIVkq9WpkNWI3kZ0ewIdDQpETTpOGfr8fehd5si4swwLMkX2', '2026-07-22 10:48:15.673', 0, '2026-07-15 10:48:15.674'),
('c0b7fe20-ccdf-4022-ba9f-05e885d55eae', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$QkJK8EerOdXm.v8FIkhTHeNJLk9pWl31oFVO4AtDmrU/PHxPMxQO.', '2026-08-03 05:05:22.859', 0, '2026-07-27 05:05:22.860'),
('c0cba2bb-9362-482e-af82-0d7ae9d4c312', 'bc3515dd-c5d7-4266-9147-de69624d5b1f', '$2b$10$6Mk2t1lSHytVCxHqArY1d.K5AoaEkLmdrt9EwaISZtISQavaC3Q12', '2026-07-27 11:05:58.787', 0, '2026-07-20 11:05:58.789'),
('c1502b8c-e050-4131-b422-a7c904d1dce9', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$j2h3BmIMbC.2.xcK98Kazusco/YdhZsujSOEGI5isoJURSsslpd6G', '2026-08-13 11:00:51.490', 0, '2026-08-06 11:00:51.492'),
('c317d0d2-7161-4fa4-bb86-6618c6c91c45', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$57fKHE7mNr4LqsA5f0ICkObb0h7rriUCPByvOnAJea1eAdRDvsen.', '2026-07-30 05:41:54.219', 0, '2026-07-23 05:41:54.220'),
('c3ce5348-21b0-4ce0-8c0f-47cbf792fac1', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$stuZ1SANVg6YHNx4jACU0.JIhQcq9PyHusia2TdAmr8GWNx.NyRNa', '2026-08-13 10:41:50.086', 0, '2026-08-06 10:41:50.087'),
('c3fe294e-ed27-4221-a765-c211f159cfe0', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$yfq7C6zBnTF4zL6AnA9jxuSKgXgCdJUMLc.jr.M7lSA7hma1Wbfyi', '2026-07-27 07:37:18.380', 0, '2026-07-20 07:37:18.381'),
('c46335ba-abbe-4506-90ac-a68e27057069', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$pG6FbWCo5IG0SVv/KIxRJuRW8ZUGcnoeu.HJ3M35i1KcqT4mASFbC', '2026-07-23 07:51:12.590', 0, '2026-07-16 07:51:12.591'),
('c507814d-d7e0-4019-b430-068302e77c9d', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$Bwq3OKD7xdjsR7EmzZlzWuItUE2rSZ.OnI5jdenI4kTGiweSawNt2', '2026-08-17 05:29:48.474', 0, '2026-08-10 05:29:48.476'),
('c694e34c-b60c-4709-a277-4a1bedac4e8e', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$K.O0FTlrI.kUhii.XIbHoO0a8ETXsbXk4vT4DtMFZyVtwFzHh4ozC', '2026-08-14 09:51:28.455', 0, '2026-08-07 09:51:28.456'),
('c739ccde-4b5f-4172-b065-1b9f5057969f', 'f4f162b0-d691-40fa-8ae1-704b095f0302', '$2b$10$owMshhkUyH1DWyJE/v2gl.zbJSDYxMcxgTWHHTYmRBjeBU7o4dmYu', '2026-08-14 07:54:32.275', 0, '2026-08-07 07:54:32.276'),
('c7869cfc-5d32-4407-98f7-33fcc678a967', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$BRFpcgrqdkM.FuFPbdDU.Ol8y77x7Z6OSEh7SkrPdUgDqgiAqyuS.', '2026-08-14 05:52:01.543', 0, '2026-08-07 05:52:01.545'),
('c7a267a5-eb94-40c4-8e09-1090fe93d782', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$StizJ1zV5tFFOn7vz97uyeW29Woa10tiV62AuVEflIBf8xEAblRwO', '2026-08-06 10:38:00.540', 0, '2026-07-30 10:38:00.541'),
('c7a64620-3d71-4875-8842-451c46d28c52', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$q/GLWSvW2PsP2ggrIyZvxesI.v97s55yDmh570S39MmHpHFSayYOK', '2026-08-14 06:03:32.113', 0, '2026-08-07 06:03:32.115'),
('c7ca1186-662b-41b0-9cbf-8b6a980690e3', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$XS02JDxZggO6..5Lynyi2eUda8HUC.IA6VXXyDB8aVIaAD94rEBpG', '2026-08-10 10:29:32.833', 0, '2026-08-03 10:29:32.836'),
('c88201eb-8d97-419f-b6fe-4913ce5f8b03', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$N4Sb2FrpFpLHySWSYG6YouzJh0e2MkMW7k7G2ntBj1KJwZbyvNKiy', '2026-07-22 11:27:00.076', 0, '2026-07-15 11:27:00.077'),
('c9107c31-a2ae-4b65-96f7-611c8a31f2aa', 'bc3515dd-c5d7-4266-9147-de69624d5b1f', '$2b$10$OZ4SzzAlZp1zOMWlKJ3T5OfeyMLk1KKufYVPB92SHM6Z1OZchvaLK', '2026-08-10 05:11:02.615', 0, '2026-08-03 05:11:02.620'),
('ca514a39-c769-4832-af44-794b34d24446', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$ISDUI7NIySMMJUcNE2qhfuq4S/ruf/aksCMPPHZGY1uYhMvj6nEzC', '2026-08-10 06:34:02.482', 0, '2026-08-03 06:34:02.483'),
('ca6fb383-7c8d-45db-9fd9-05fec777de74', 'bc3515dd-c5d7-4266-9147-de69624d5b1f', '$2b$10$XZHbOVBjp/rcWIHej/3X0uLjDIWKL6PyL41wcIOKmyMKM9N2ja/Fu', '2026-07-31 05:05:35.144', 0, '2026-07-24 05:05:35.145'),
('cabbfbc6-4c4f-4cc3-80cf-9b6b350f7086', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$hbtcdiAsLdNrySayHz2aiOKCfckNFiA6kAisB1jDqUmme8/NN.v92', '2026-08-07 11:21:40.888', 0, '2026-07-31 11:21:40.889'),
('cc6680b6-7866-4243-8305-528da353960c', 'bc3515dd-c5d7-4266-9147-de69624d5b1f', '$2b$10$bLXiGaPN2rDN4WQoh1rD1.a3.xauNFSfUMQ0U96K8v0jtjpxaZiEW', '2026-07-27 08:00:14.087', 0, '2026-07-20 08:00:14.088'),
('ce19605e-8b41-4b5c-8275-c20fcfd557fd', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$XO3uRCxOZo5yTxYSd7/TkelIjtl12LWTyy27qGKrhz2JNR749oSoK', '2026-08-14 07:23:26.547', 0, '2026-08-07 07:23:26.550'),
('cefe471f-f20b-41ea-8093-1486cefbd1fd', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$OcqRTqolwNHAH5yjG.5F1esydJ83q/2b3qSX12xahyXcGcK6GjkqK', '2026-08-14 04:52:48.720', 0, '2026-08-07 04:52:48.723'),
('cf4a3279-b26c-4524-8fac-e34b68c49476', 'bc3515dd-c5d7-4266-9147-de69624d5b1f', '$2b$10$JQt9QomvQpDGAGwaWFEb5.gk5fGAEEsG6bKe0u9G.2uXAMEGjWldG', '2026-08-21 10:40:37.204', 0, '2026-08-14 10:40:37.205'),
('cfb6a247-238f-48ad-b7da-cbef52c96afb', 'f4f162b0-d691-40fa-8ae1-704b095f0302', '$2b$10$K8YOsG18F1uArDtsKrIUw.K9QTESwfor.0CG8XovoUoSlSKr1o15u', '2026-08-06 14:35:59.955', 0, '2026-07-30 14:35:59.957'),
('d00c1004-7989-41d8-8903-2154ec7ddb0d', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$kyKCV5tfTlnlHeGWqjATduTDbPRC5q4NXIZNIEiGKY4H3y/X3ugl2', '2026-07-24 09:17:56.809', 0, '2026-07-17 09:17:56.810'),
('d0ffd0a7-332e-494b-8521-a9712ef343f4', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$FyBJbQ6CbSI1c7Z7DcM0MevD9uqdqCpq4UwstDCFN3TqTX.VUhq0q', '2026-08-10 10:12:51.097', 0, '2026-08-03 10:12:51.098'),
('d16f539f-66ea-496f-b4fc-767a0156d052', 'bc3515dd-c5d7-4266-9147-de69624d5b1f', '$2b$10$NOPt.URwS9nTUlM8o7kGC.Di43D/lTiWdm0t8zUZlF0DBFQVeT7Cm', '2026-08-14 07:55:53.260', 0, '2026-08-07 07:55:53.261'),
('d1f85296-b209-4215-bcba-4fa327aca046', 'bc3515dd-c5d7-4266-9147-de69624d5b1f', '$2b$10$hMzNO4b/3jxOG5qkhsrtneBCc5gVQVW/22IHlRr3ACZHtgZK09mNq', '2026-08-07 07:48:57.331', 0, '2026-07-31 07:48:57.333'),
('d22cfcb5-6901-44a7-86cc-8b7a9627cc52', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$edqfJu7uQngc3ZlQWRW7xeqCU0j1UssNNBhSGhqLCWm6PPFX22a1y', '2026-07-31 09:23:58.653', 0, '2026-07-24 09:23:58.654'),
('d26c0e35-f397-4d8d-be22-1942b784f82f', 'f4f162b0-d691-40fa-8ae1-704b095f0302', '$2b$10$jbVC9tjKsLfo2lrF0KQUYuAfd1orO0ZCZCoInK6M1WY2LkSSNKoqO', '2026-08-13 10:47:20.733', 0, '2026-08-06 10:47:20.735'),
('d31a10e2-7ff5-4662-889b-29c71f63a10f', 'f4f162b0-d691-40fa-8ae1-704b095f0302', '$2b$10$fxMp2uRW2iTxTSIsUHmupOgQBXkG4nFzTduAw5okviNyY2wEfer4C', '2026-08-21 11:25:10.247', 0, '2026-08-14 11:25:10.248'),
('d41a986c-9322-4461-9565-896acd3fd569', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$/ayDrcLtkjRlvc38tyLK1uf5xAqFJLMuVRqVgr/sLssxChTccZoN2', '2026-07-30 10:13:22.061', 0, '2026-07-23 10:13:22.062'),
('d456f5ae-b775-46f4-807c-c1b9f6adeb09', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$7IxRKmVpdf4G19zKlQZGT.QQ07y6MgCXUWPBxF2GSGL8.8Kz5Lo.q', '2026-08-03 05:58:13.654', 0, '2026-07-27 05:58:13.655'),
('d46cf16e-7fbb-4cde-b98f-7427f69c9a79', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$LmKQs/00msf2FqsqqKaaE.qHKbv.kFWAMIPAffge2GpCGXPykRKM2', '2026-08-03 06:15:23.357', 0, '2026-07-27 06:15:23.358'),
('d518c981-947c-4093-bca5-c9caf7d3ca09', 'f4f162b0-d691-40fa-8ae1-704b095f0302', '$2b$10$OdatUn4Xtfwq3M0WCEVlnuAtgMgD18ITXEWeFEuMdKjK/CjIk2HH.', '2026-08-10 10:31:45.189', 0, '2026-08-03 10:31:45.190'),
('d5a97a5d-e81f-4d40-b962-6cc753868924', 'bc3515dd-c5d7-4266-9147-de69624d5b1f', '$2b$10$.WnA1CB0NKa/bnvnENKhx.Dc/AXVOmWbqkx9n6.V0OZ1YcGdKNxHe', '2026-08-13 10:31:04.748', 0, '2026-08-06 10:31:04.750'),
('d5c0c231-83ae-4870-b8d1-2b97054fc9a2', 'f4f162b0-d691-40fa-8ae1-704b095f0302', '$2b$10$D26zFXZeHzYeMcgPOiwet.r2ZQLJwrTsrg.BxVdCQFA6gGCSVsDHu', '2026-08-10 05:11:12.237', 0, '2026-08-03 05:11:12.241'),
('d5e11e5f-befe-430a-9c81-dc29ae84121f', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$UCjA/kdIWDADAb5folxREODap8S8LkxYxLmRAWE/jt55DEqyIwyd6', '2026-08-10 10:39:51.355', 0, '2026-08-03 10:39:51.356'),
('d77b6e10-7a7e-4cd1-9239-2e462957119f', 'f4f162b0-d691-40fa-8ae1-704b095f0302', '$2b$10$o2qnWPvAgaKoll4QLN6NY.yqTs0wBblFUlAqgfSYPL04rN01p9VRO', '2026-08-14 10:16:17.688', 0, '2026-08-07 10:16:17.689'),
('d7db8d8f-8295-42b9-ab87-ae428c295a2e', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$4KP.WwrAtXRcJRbUw/4rfeRJ00gwlX/1WXj/WfCkRyhVDfwRMzxhS', '2026-08-10 09:16:02.149', 0, '2026-08-03 09:16:02.150'),
('d931465a-cf9e-424a-8324-3fa2ed65bf7c', 'f4f162b0-d691-40fa-8ae1-704b095f0302', '$2b$10$VAu01QaS2lenx4gboPfTYezsXMxCj4dupTwPFmzyYzvWma.4P3UNa', '2026-08-17 08:54:04.889', 0, '2026-08-10 08:54:04.890'),
('d9815fbd-dc3e-4092-9499-9875acbfe921', 'bc3515dd-c5d7-4266-9147-de69624d5b1f', '$2b$10$k2To8nsbhU7qW1nxgnijXuMZMF.6Kz/i7uWkhPQDN2HQqme70C/W6', '2026-07-27 10:41:41.542', 0, '2026-07-20 10:41:41.543'),
('d9d595e7-0d2c-44ad-8614-23aacd79036c', 'f4f162b0-d691-40fa-8ae1-704b095f0302', '$2b$10$NZDLrtYQHCcG7ZjM5oDMwut0QBIJTOy3nZ6qhIoEBw1Aqle5dgRh6', '2026-08-17 07:31:41.750', 0, '2026-08-10 07:31:41.751'),
('dad263c7-8e01-43fc-8123-c1b329e189a0', 'bc3515dd-c5d7-4266-9147-de69624d5b1f', '$2b$10$IFXx9RWKgQMDfacUoIw.WeEYcunXRk4KkauCssxkheZdxKm7iRhL2', '2026-08-21 10:09:54.410', 0, '2026-08-14 10:09:54.493'),
('dbfc6b5b-3d5a-44d2-935d-71df55d3be55', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$/suThInwMHCfDcxzgE.my.8xgWECzQUTi3O/3Ki7eFaZjfSSA7PuS', '2026-07-24 05:05:18.386', 0, '2026-07-17 05:05:18.387'),
('dc8467c5-ce90-450b-9187-a3752e1bcf5e', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$Ke5qjf4z3sFd9lonedkDEuCN.VKDm/BwlX8dPDI.EKcQHJ78bWrRC', '2026-08-14 06:43:42.998', 0, '2026-08-07 06:43:42.999'),
('df866af5-d9ba-445c-8f34-5ee1c1be69a8', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$WG37pPqwdtc8ebiTzM3iv.wnq/hfaTS8GDXr3YDm3diNbXR.SwT8q', '2026-07-27 10:00:32.049', 0, '2026-07-20 10:00:32.050'),
('dfc9eb02-33b1-4baf-b6db-d10c1edfe9fe', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$GeNiFY/Aj0XvvrWjQ0IRpeDdSnjOEPCs4xrkRsoXLdja9GRlEkaLO', '2026-07-24 04:57:52.612', 0, '2026-07-17 04:57:52.613'),
('dfcd3972-8186-4ddf-9d47-a85765ac52a2', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$pPgM/zsxd0rG.K5JmK5sGe7401a2A1KXxujYktm1UBms.NFDH2Yh.', '2026-07-29 06:31:29.495', 0, '2026-07-22 06:31:29.496'),
('e08291f7-0113-4441-a06e-505abd391716', 'bc3515dd-c5d7-4266-9147-de69624d5b1f', '$2b$10$YeZ61vEUMe5bdD8nz2E6He75LNwJX85jrLSbTEEYqVbVBwEoSeIym', '2026-08-10 07:45:44.124', 0, '2026-08-03 07:45:44.126'),
('e197f80c-67f2-43ae-a786-21b81134cbd9', 'bc3515dd-c5d7-4266-9147-de69624d5b1f', '$2b$10$pFh.xsljlZkXr7XL5PaAo.Z4yWxi2uLamaDlQHrLBD/M.sKLH0MtK', '2026-08-06 14:30:32.968', 0, '2026-07-30 14:30:32.970'),
('e1fb2fcf-8a5b-469a-82f3-2f3f03f49de3', 'f4f162b0-d691-40fa-8ae1-704b095f0302', '$2b$10$kOsudewwQK/ViJmyuR6U3OQeqIApGHAFhMM.e3AH5paKIvRVNtZ0q', '2026-08-14 10:15:13.562', 0, '2026-08-07 10:15:13.566'),
('e28d0670-db16-4274-9ee3-2c50b344cb31', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$pzzFaQVPMwg7OlPlkMohJeITCEopr6lwpnOrQxIhkKN37KX52UYOy', '2026-07-27 07:53:36.278', 0, '2026-07-20 07:53:36.279'),
('e2cb89c9-369d-405c-98a6-14a9ec1c1d3f', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$0sHsOyjuRVqYMtlTrs3o7e5dhsXgo8vUFGunL27lkcGyRbQLpdrem', '2026-07-30 06:02:30.909', 0, '2026-07-23 06:02:30.910'),
('e3ee6632-75b7-464c-9195-4082d4e88af2', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$uF0wmxbauDYdf.5yj.KJcuMrs8aKVO.C5QYgTBaYpBdnDWaAQn55.', '2026-07-28 07:00:57.511', 0, '2026-07-21 07:00:57.512'),
('e547d80d-2e7c-4a09-9a45-4379fe868220', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$sPfh0UMLH85X3gFLb41dd.szH1pj26zHBi/KekgeqgMV0PD0LAn8q', '2026-08-10 11:05:32.063', 0, '2026-08-03 11:05:32.064'),
('e666a65f-59a2-402e-84f0-fb1d589a0969', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$45nS5opQugStGyMIUHGRXe4OEY2NV/RfXUjWCLYu8y34fnYWQNO3C', '2026-07-28 05:34:43.797', 0, '2026-07-21 05:34:43.798'),
('e6f51abe-6c05-4b4b-a957-c8946632ac17', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$VBujub9xDvqbSG8Mv62X7eeXG/a6uJ3iXquDnUU01LEMXCr6ovW4C', '2026-08-14 06:03:25.681', 0, '2026-08-07 06:03:25.682'),
('e736f120-47bd-4237-a28a-58fb9ed26c8e', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$Sukk2L//24UQfqQ8f0tOiem.5CEEKrZjsQ0QOc90coh3FkbTmXTQi', '2026-08-14 06:45:49.852', 0, '2026-08-07 06:45:49.853'),
('e91812ad-ca0d-4a67-a3f3-f39c9488605d', 'bc3515dd-c5d7-4266-9147-de69624d5b1f', '$2b$10$mM9.T3BZrG61zoZQnSpr3e838zERsL3lhBRjETlJzs0OxTxQ1MCpO', '2026-08-13 09:29:53.704', 0, '2026-08-06 09:29:53.705'),
('e983892c-2007-4c02-80f3-9de115775910', 'bc3515dd-c5d7-4266-9147-de69624d5b1f', '$2b$10$HS7dDK.plwuWeYKCuZLuOu3.9VFkw13M3aj3ZBcr41DB5WZxjGUJe', '2026-08-10 10:03:04.433', 0, '2026-08-03 10:03:04.446'),
('e9917569-a5fb-44c2-a97f-ce00c908c9ec', 'f4f162b0-d691-40fa-8ae1-704b095f0302', '$2b$10$2BDIAWOMjNzwvsFA4YUzGOBGS9AypCJbl0oHlOZURpvm51pDsODBG', '2026-08-06 15:11:08.108', 0, '2026-07-30 15:11:08.110'),
('e9e8552a-3d6c-47a8-a2a7-e8f4dce4bc9d', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$sFuK1COHQfXHuzBUrskvTu8ij/EODzGPbjStifLLzruhVFx/fjQs2', '2026-08-03 06:57:05.199', 0, '2026-07-27 06:57:05.201'),
('ea2effa2-9bbc-4233-b5eb-f8eebcfd2190', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$QeITMZuePPH8lkBia89iz.C560Op1sMTc5CslorrkaPausWs0rHxa', '2026-08-05 07:14:24.749', 0, '2026-07-29 07:14:24.751'),
('ea9a0b08-ba19-43ba-b7d1-fb239bdfb48a', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$q1buHTSkLTM02ZUz6pDageppAjDn5DvYababzk0JXH6UeB3AvLuse', '2026-07-30 05:42:18.311', 0, '2026-07-23 05:42:18.311'),
('ebeaf079-a839-4d04-8b59-34344fb6f6ca', 'f4f162b0-d691-40fa-8ae1-704b095f0302', '$2b$10$/63mBETFwNwt03GwO.ay8uDwNZCH3.w6NnjFgmLE5xZuJSzpR7NR6', '2026-08-10 08:01:22.553', 0, '2026-08-03 08:01:22.562'),
('ec67aae5-d072-42a8-a123-776cd89cbffe', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$.hKk.RmrWTraKxl3aNpmsuJb17lu4iZUkooHwkjxE7z1H762pKweC', '2026-07-22 10:40:22.773', 0, '2026-07-15 10:40:22.774'),
('ee2b1218-06c4-43b6-a23c-d75d0f31140e', 'f4f162b0-d691-40fa-8ae1-704b095f0302', '$2b$10$HOpjL9TGtNrQpzZVBi2u9u.nmiSqVmErSJq.rWtoE3K3sCTYFGb7a', '2026-08-10 07:48:36.175', 0, '2026-08-03 07:48:36.178'),
('eeb28942-8091-42a2-831e-533f6c483a53', 'bc3515dd-c5d7-4266-9147-de69624d5b1f', '$2b$10$H62A4gsMCUeSSnRQF1gJVuEcssmsD.g6Ii90c/SgdVV3RA.mNUkmK', '2026-08-06 16:27:17.833', 0, '2026-07-30 16:27:17.834'),
('efe32cb2-9723-4fdd-980a-6690851e79b1', 'bc3515dd-c5d7-4266-9147-de69624d5b1f', '$2b$10$I/CmHpLsuw3xPgh2PgB6u.3sudVO2F49qB0xmFS6cJVkMNb3cQidS', '2026-08-13 10:47:55.419', 0, '2026-08-06 10:47:55.420'),
('f05f900e-c125-4cef-b466-f7946b7561f7', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$X3ztF2usGR7G/BoLyMuXYOL.5YIebl55q3z9316qz6BuR7q5vdSoa', '2026-07-22 10:33:39.265', 0, '2026-07-15 10:33:39.266'),
('f16ede2a-4302-4966-8336-f07e76a36d63', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$5bO3l.9poE77X1Zr1I5vM.mmE6H802J5NuUG2xm80WQ4dSjhSI.bm', '2026-07-29 10:18:49.688', 0, '2026-07-22 10:18:49.689'),
('f19472fa-6abf-4746-bcb0-176c502909a5', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$xkXKHFvmDUB8DkZZw8Exnux4VATTFcQvRjyuYFdnxcD4kny1OLLiq', '2026-07-28 06:46:04.309', 0, '2026-07-21 06:46:04.310'),
('f25b1da5-47d8-4b95-a9a1-b69c68bbaf62', 'bc3515dd-c5d7-4266-9147-de69624d5b1f', '$2b$10$E4mBWgrvduEd9rs1hnIaPu4aVdlDbtzW6550m7vdSWHibzekHO5rK', '2026-08-10 05:11:11.670', 0, '2026-08-03 05:11:11.675'),
('f3071f40-6ae6-4e7f-8312-eba356f0f60a', 'f4f162b0-d691-40fa-8ae1-704b095f0302', '$2b$10$9evuOyrE1xmM/eqmDh67mefbQPe1aVrMSq8JlEWXdO.46QBDxsmw2', '2026-08-14 10:54:00.872', 0, '2026-08-07 10:54:00.873'),
('f4407b24-455c-4b68-b6f0-aaf9f983d04f', 'f4f162b0-d691-40fa-8ae1-704b095f0302', '$2b$10$59PsTk3oUgu/ddu46.8qQuDDk/./N3WLv9Jr2EGIcAY304rFHn3nm', '2026-07-22 10:59:00.673', 0, '2026-07-15 10:59:00.674'),
('f4959f97-92fd-4108-80ed-cc310475f99d', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$Mq2TbXt3T.YBF4PqHcLcsuv34zkXL4eqgMxliQHLbxa76lYYUH.bS', '2026-07-28 07:15:04.907', 0, '2026-07-21 07:15:04.908'),
('f5347c61-f40b-4583-bae8-cf81a2136a76', 'f4f162b0-d691-40fa-8ae1-704b095f0302', '$2b$10$JTexK2sskWyqQ3e8tHHMvevpk4HPmO9WAQ7o0KMRUCcpN2tfyeoDW', '2026-07-28 10:18:56.282', 0, '2026-07-21 10:18:56.283'),
('f5fa1262-eb5c-4024-bb94-447908da046c', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$sVG3C9E/xpTITGo2SD4MTu4ngbDpmd0oABGaInlZ2SvYQ9dost0ru', '2026-07-24 10:41:12.575', 0, '2026-07-17 10:41:12.576'),
('f6dbaee9-3b03-4775-b007-618cfd57297d', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$lJ2YuyFVluKjU4UdsPJUVeFkTEysLFT.6RHdg/q1oauZxVMCinpDe', '2026-07-28 07:15:43.306', 0, '2026-07-21 07:15:43.307'),
('f6f4e23f-c0b6-41e0-825f-36f3e4fc274d', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$hn10vy0uZm1rNksuHPKpEeA9H.P0porBkJ0xpUgMoFNSbQwe0WL86', '2026-07-28 05:13:59.078', 0, '2026-07-21 05:13:59.079'),
('f7920cff-e096-43bc-8ae3-6151e0648ce5', 'bc3515dd-c5d7-4266-9147-de69624d5b1f', '$2b$10$72yEBPKjesTYhr4uQWs7gOfW/tZCBYm.hX8EUi3GAVJfUu/jhOV2m', '2026-08-10 07:47:21.383', 0, '2026-08-03 07:47:21.396'),
('f7977b2d-f9f3-40c1-b6a4-ba299909c283', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$ZhmuxDHQ.7shiVGaev1Y3.KqLpNvbxlMs8J.qt/cYrta09E4e46p6', '2026-08-10 06:07:31.135', 0, '2026-08-03 06:07:31.136'),
('f7acba4f-07c4-41f2-b06d-474ae0439fee', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$8NJbbXQFoTpdO5GDwPpuPeDFtHNRcAjbvZZzU7DCHqFrTLVHA.geC', '2026-07-30 06:44:27.614', 0, '2026-07-23 06:44:27.615'),
('f8ea0453-89e1-48bf-9111-2da8db18682b', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$Ap9bOJ3Bvu38yXKiuCJuWuwPLDvtxlrpbdoMbb.20ueiGEi8xxJxe', '2026-08-12 09:43:24.849', 0, '2026-08-05 09:43:24.850'),
('f93d2132-02c2-4358-90e5-2d946d187e91', 'f4f162b0-d691-40fa-8ae1-704b095f0302', '$2b$10$DnP.cruiwJ7hCLQRCAhS7.MD.9ViGTxqEGtFKwfwMxN/T8mI6NCKK', '2026-08-06 15:51:10.284', 0, '2026-07-30 15:51:10.293'),
('f9cb39d0-009d-4cb3-bca4-0faf70982461', 'bc3515dd-c5d7-4266-9147-de69624d5b1f', '$2b$10$NzC7iMS.d4z07BpJb29sxOegpiQu.mSeO.KWMfcvfmd7fz.7/RHM2', '2026-07-27 15:32:24.975', 0, '2026-07-20 15:32:24.976'),
('fa1b6056-1a65-4a89-a531-81ac2d4ada47', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$BG1D06j3sBxbIxUUipkqQuFdEcFuefwYgkmyxAFUwbzpgJnroAJLO', '2026-08-14 10:25:52.183', 0, '2026-08-07 10:25:52.184'),
('fa30c3a4-27e8-4d8e-8597-a709a017f15f', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$.egQ/9gFJcTFjGy/fdVtv.4am.YUTkeeyeVQQUfn2ZteY8BaeL6SK', '2026-07-22 09:55:36.406', 0, '2026-07-15 09:55:36.407'),
('fa5d820c-1f85-4996-aa7b-a8a0f0986671', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$tD.A8XPI7oBat4LPfXwMAOaUOiBK/h3wKe8d0.fWDYIZDLhOD0XFq', '2026-07-24 09:45:55.292', 0, '2026-07-17 09:45:55.293'),
('faa453c1-c6b8-4a9c-8607-aee5ebf07ed5', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$sHAsSePyXxh9Zx8avprinOFHUcvhEiL.jo.JmtsLJcwwbVJkbWDUy', '2026-08-13 09:34:41.961', 0, '2026-08-06 09:34:41.962'),
('fae2ae1b-3c87-400e-af3c-e0ac3901e195', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$hUVfvZq5zIcXgG7Epq.r0eLxGKJK7mD4Br7P58Rl1kYEj2u82pCYO', '2026-08-07 10:43:21.076', 0, '2026-07-31 10:43:21.078'),
('fae5e911-7ee7-4c1b-b1b7-1401c31d175a', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$OlcjC14Y8pwsEmijiCPaPOV41m7AtZH1hhXBjhoLy9PsvoNG8zs4a', '2026-07-31 11:16:44.155', 0, '2026-07-24 11:16:44.156'),
('fbb5278f-5dd1-4dbb-9fe3-6d88aaa97f35', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$XxYY/YC7wVlvfJXEsmoj5.bev2WLtlCKFOXRFBUwvgyAbLdQjiPba', '2026-08-13 10:26:14.945', 0, '2026-08-06 10:26:14.946'),
('fc1a36a5-e442-4304-ba05-e567791da538', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$rGRWdYvM9sB/l038Z6cOVuFsF1HY5/82niIxYzRox7FFDfy8RUgVy', '2026-08-13 11:21:30.941', 0, '2026-08-06 11:21:30.944'),
('fca462b6-e7ca-4bd3-9931-17da1e875b64', 'f4f162b0-d691-40fa-8ae1-704b095f0302', '$2b$10$b1Kk.8QZEEXVXhLLHGIiyeehpYJb04l9sMI91.XLqv0WeGF0vykfm', '2026-08-06 09:41:59.807', 0, '2026-07-30 09:41:59.809'),
('fcf51948-6bb8-493e-8669-44a17b8aed35', 'f4f162b0-d691-40fa-8ae1-704b095f0302', '$2b$10$fPn6MIp0fL5PK3wstIRXLOuwmNp6nDWaPwfNPm5i/E6JrFEfS8jPa', '2026-08-14 07:39:18.807', 0, '2026-08-07 07:39:18.814'),
('fd419f54-b1c2-469c-a2fb-7ab461ec7518', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$B7MkgiQj1VBmiUyXcw/8uuPJlmPsBg9MdVq.5lq/t.KV6mDaJ3TcG', '2026-08-07 10:34:48.486', 0, '2026-07-31 10:34:48.487'),
('fe51ffe1-a53a-4062-b77c-86955ac829e5', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$oVcZ8/s.UQpPUA2Vfyp2zuviY15y47gczkpvhaV7mZWm.S1oQXa9O', '2026-08-14 06:52:13.724', 0, '2026-08-07 06:52:13.729'),
('feb53b35-958e-4ce1-8d7b-dd48b55342c7', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$/BFGw0JUbCSi5KZXaRW4g.bXwaU9AQgQsvTBC7rOphEDsOPmyLB8G', '2026-07-29 07:11:14.497', 0, '2026-07-22 07:11:14.497'),
('ff05390e-0e0e-40b2-9aa7-15e71303d0a2', 'bc3515dd-c5d7-4266-9147-de69624d5b1f', '$2b$10$9tS4AnPxQkJnMBNE.704neZ57k/YJpFBIrbloBuuCohJX6o2vNTEe', '2026-07-27 07:57:53.983', 0, '2026-07-20 07:57:53.984'),
('ff4925e6-a51a-40dd-a81b-ca3defbb5fb0', 'f4f162b0-d691-40fa-8ae1-704b095f0302', '$2b$10$SVoxB6yjfmkHdMWGDkdMVenRuTYGf9n7VVHU59M.gPMsT4zCXM6BG', '2026-08-14 10:15:07.210', 0, '2026-08-07 10:15:07.214'),
('ff5e8a2c-6a7e-436d-aca4-402515996b2d', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$7a3XDKYmx2axvNJZ3Ood0OJC2uSk0Z14.ezbJuwGNXzCTbsYpMQKe', '2026-08-13 14:21:55.033', 0, '2026-08-06 14:21:55.035'),
('ff6b1ffb-4981-4a60-85b5-2020ac988731', 'bc3515dd-c5d7-4266-9147-de69624d5b1f', '$2b$10$d94YuVsNBBdCz2CDdeitUuuC.QyJV91IWQw4XMkITjNOlMj3llp5m', '2026-08-06 17:34:18.990', 0, '2026-07-30 17:34:18.991'),
('ff8c21bb-bb02-4371-95b7-6093d0ee0697', '79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', '$2b$10$T5rG9Vf4QbNegtIvS99B.eYQdGA5xfqScFfAoWO8AaQdNHuHRpy1C', '2026-08-13 07:19:33.087', 0, '2026-08-06 07:19:33.101'),
('ff937dc0-e47a-44a8-950c-65b126de82c4', 'bc3515dd-c5d7-4266-9147-de69624d5b1f', '$2b$10$ertJQe6SQ9A0RijdIX0Fu.AOK0tGqTnCW9W0WTzU1FfCj5zcKa1W2', '2026-08-10 05:47:37.632', 0, '2026-08-03 05:47:37.632'),
('ffe3d311-29c3-4578-b1fc-309a0301d6a6', 'f4f162b0-d691-40fa-8ae1-704b095f0302', '$2b$10$.MNojVpbN3N8IzBiN2H6HuOPF1/C/cshCB22foA0XqILm5c2yPgBa', '2026-08-10 08:24:21.424', 0, '2026-08-03 08:24:21.425');

-- --------------------------------------------------------

--
-- Table structure for table `RegularizationRequest`
--

CREATE TABLE `RegularizationRequest` (
  `id` varchar(191) NOT NULL,
  `attendanceLogId` varchar(191) NOT NULL,
  `employeeId` varchar(191) NOT NULL,
  `requestedCheckIn` datetime(3) DEFAULT NULL,
  `requestedCheckOut` datetime(3) DEFAULT NULL,
  `reason` varchar(191) NOT NULL,
  `status` varchar(191) NOT NULL DEFAULT 'pending',
  `approverId` varchar(191) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `ReviewCycle`
--

CREATE TABLE `ReviewCycle` (
  `id` varchar(191) NOT NULL,
  `companyId` varchar(191) NOT NULL,
  `name` varchar(191) NOT NULL,
  `startDate` datetime(3) NOT NULL,
  `endDate` datetime(3) NOT NULL,
  `status` varchar(191) NOT NULL DEFAULT 'active'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `Role`
--

CREATE TABLE `Role` (
  `id` varchar(191) NOT NULL,
  `companyId` varchar(191) NOT NULL,
  `name` varchar(191) NOT NULL,
  `isSystem` tinyint(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `Role`
--

INSERT INTO `Role` (`id`, `companyId`, `name`, `isSystem`) VALUES
('2799715c-527e-4d0d-be43-29c6829bf27c', 'e87debef-a662-4fd7-b255-2e50c9f86d5b', 'Employee', 0),
('a0fa27f0-c3e1-4f1d-a050-0e030039cbfe', 'e87debef-a662-4fd7-b255-2e50c9f86d5b', 'Super Admin', 1),
('a46db7db-2575-47e7-8f10-64d0b0d4382d', 'e87debef-a662-4fd7-b255-2e50c9f86d5b', 'HR Admin', 0);

-- --------------------------------------------------------

--
-- Table structure for table `SalaryRevision`
--

CREATE TABLE `SalaryRevision` (
  `id` varchar(191) NOT NULL,
  `companyId` varchar(191) NOT NULL,
  `employeeId` varchar(191) NOT NULL,
  `effectiveFrom` datetime(3) NOT NULL,
  `revisedCtc` double NOT NULL,
  `previousCtc` double NOT NULL DEFAULT 0,
  `reason` varchar(191) NOT NULL DEFAULT 'annual_appraisal',
  `remarks` varchar(191) DEFAULT NULL,
  `approvedBy` varchar(191) DEFAULT NULL,
  `status` varchar(191) NOT NULL DEFAULT 'approved',
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `SalaryStructure`
--

CREATE TABLE `SalaryStructure` (
  `id` varchar(191) NOT NULL,
  `employeeId` varchar(191) NOT NULL,
  `effectiveFrom` datetime(3) NOT NULL,
  `basic` double NOT NULL,
  `hra` double NOT NULL DEFAULT 0,
  `da` double NOT NULL DEFAULT 0,
  `conveyance` double NOT NULL DEFAULT 0,
  `medical` double NOT NULL DEFAULT 0,
  `specialAllowance` double NOT NULL DEFAULT 0,
  `pfDeduction` double NOT NULL DEFAULT 0,
  `esiDeduction` double NOT NULL DEFAULT 0,
  `ptDeduction` double NOT NULL DEFAULT 0,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `SalaryStructure`
--

INSERT INTO `SalaryStructure` (`id`, `employeeId`, `effectiveFrom`, `basic`, `hra`, `da`, `conveyance`, `medical`, `specialAllowance`, `pfDeduction`, `esiDeduction`, `ptDeduction`, `createdAt`) VALUES
('3105f21c-e8dd-4523-a927-6063f7f76bf1', '7e4c13c9-3803-4b2b-aa6e-8bd11c4f61c3', '2026-07-24 09:53:17.014', 10000, 5000, 0, 0, 0, 5000, 0, 0, 0, '2026-07-24 09:53:17.014'),
('4174ee92-53e0-4215-8451-e5de1f7d9d6e', '2623fc64-fa89-47c1-a7de-4d65fecaf0c8', '2024-01-01 00:00:00.000', 23534, 9414, 0, 1600, 1250, 11270, 0, 0, 0, '2024-01-01 00:00:00.000'),
('53921eaa-7cfe-4fba-ad5c-256c58e594ab', '7e4c13c9-3803-4b2b-aa6e-8bd11c4f61c3', '2026-07-15 11:24:29.769', 10000, 4000, 0, 1000, 1250, 3750, 0, 0, 0, '2026-07-15 11:24:29.769'),
('8749cd27-c4c0-4e7f-9c45-124a12a89abc', '7e4c13c9-3803-4b2b-aa6e-8bd11c4f61c3', '2024-04-12 00:00:00.000', 10000, 5000, 1000, 1000, 1000, 2000, 0, 0, 0, '2024-04-12 00:00:00.000'),
('90f5511e-32a6-4f0c-8dc1-5694b0453733', '7e4c13c9-3803-4b2b-aa6e-8bd11c4f61c3', '2026-07-24 00:00:00.000', 10000, 5000, 1000, 1000, 1000, 2000, 0, 0, 0, '2026-08-07 07:08:29.246'),
('9f6b6c08-2608-4410-b237-db83db160de8', '7e4c13c9-3803-4b2b-aa6e-8bd11c4f61c3', '2026-07-15 11:24:18.630', 10000, 4000, 0, 1000, 1250, 3750, 0, 0, 0, '2026-07-15 11:24:18.630'),
('a384fbe6-f7c7-479e-b647-d350a6e00e00', '7e4c13c9-3803-4b2b-aa6e-8bd11c4f61c3', '2026-07-15 09:52:47.203', 10000, 5000, 0, 0, 0, 10000, 0, 0, 0, '2026-07-15 09:52:47.203'),
('c275f4c9-1246-416d-a27c-cdab68cb5fc5', '7e4c13c9-3803-4b2b-aa6e-8bd11c4f61c3', '2026-07-24 09:53:17.014', 10000, 5000, 0, 0, 0, 5000, 0, 0, 0, '2026-07-24 09:53:17.014');

-- --------------------------------------------------------

--
-- Table structure for table `Setting`
--

CREATE TABLE `Setting` (
  `id` varchar(191) NOT NULL,
  `companyId` varchar(191) NOT NULL,
  `key` varchar(191) NOT NULL,
  `value` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`value`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `Shift`
--

CREATE TABLE `Shift` (
  `id` varchar(191) NOT NULL,
  `companyId` varchar(191) NOT NULL,
  `name` varchar(191) NOT NULL,
  `startTime` varchar(191) NOT NULL,
  `endTime` varchar(191) NOT NULL,
  `type` varchar(191) NOT NULL DEFAULT 'fixed',
  `allowance` double NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `Shift`
--

INSERT INTO `Shift` (`id`, `companyId`, `name`, `startTime`, `endTime`, `type`, `allowance`) VALUES
('24600944-8e16-40ca-b6eb-7a749c2764f8', 'e87debef-a662-4fd7-b255-2e50c9f86d5b', 'shift2', '10:30', '19:30', 'regular', 0),
('a142f892-3023-4478-9814-c095e8bd0969', 'e87debef-a662-4fd7-b255-2e50c9f86d5b', 'shift1', '10:30', '17:00', 'regular', 0);

-- --------------------------------------------------------

--
-- Table structure for table `ShiftAssignment`
--

CREATE TABLE `ShiftAssignment` (
  `id` varchar(191) NOT NULL,
  `shiftId` varchar(191) NOT NULL,
  `employeeId` varchar(191) NOT NULL,
  `effectiveFrom` datetime(3) NOT NULL,
  `rosterWeek` varchar(191) DEFAULT NULL,
  `weekDay` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `ShiftAssignment`
--

INSERT INTO `ShiftAssignment` (`id`, `shiftId`, `employeeId`, `effectiveFrom`, `rosterWeek`, `weekDay`) VALUES
('46f2258e-ff88-4c95-b801-21a5207a0e43', 'a142f892-3023-4478-9814-c095e8bd0969', '7e4c13c9-3803-4b2b-aa6e-8bd11c4f61c3', '2024-04-12 00:00:00.000', NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `ShiftChangeRequest`
--

CREATE TABLE `ShiftChangeRequest` (
  `id` varchar(191) NOT NULL,
  `companyId` varchar(191) NOT NULL,
  `employeeId` varchar(191) NOT NULL,
  `shiftId` varchar(191) DEFAULT NULL,
  `requestedShiftId` varchar(191) NOT NULL,
  `reason` varchar(191) DEFAULT NULL,
  `effectiveFrom` datetime(3) NOT NULL,
  `status` varchar(191) NOT NULL DEFAULT 'pending',
  `approvedBy` varchar(191) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `Subscription`
--

CREATE TABLE `Subscription` (
  `id` varchar(191) NOT NULL,
  `companyId` varchar(191) NOT NULL,
  `planName` varchar(191) NOT NULL,
  `status` varchar(191) NOT NULL DEFAULT 'active',
  `renewsAt` datetime(3) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `Subscription`
--

INSERT INTO `Subscription` (`id`, `companyId`, `planName`, `status`, `renewsAt`) VALUES
('8bb9d5bc-7ade-43f2-82d3-d91d6b364607', 'e87debef-a662-4fd7-b255-2e50c9f86d5b', 'enterprise', 'active', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `Task`
--

CREATE TABLE `Task` (
  `id` varchar(191) NOT NULL,
  `projectId` varchar(191) NOT NULL,
  `title` varchar(191) NOT NULL,
  `status` varchar(191) NOT NULL DEFAULT 'todo',
  `assigneeId` varchar(191) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `TaxDeclaration`
--

CREATE TABLE `TaxDeclaration` (
  `id` varchar(191) NOT NULL,
  `companyId` varchar(191) NOT NULL,
  `employeeId` varchar(191) NOT NULL,
  `financialYear` varchar(191) NOT NULL DEFAULT 'FY 2025-26',
  `section` varchar(191) NOT NULL,
  `description` varchar(191) DEFAULT NULL,
  `declaredAmount` double NOT NULL,
  `approvedAmount` double NOT NULL DEFAULT 0,
  `status` varchar(191) NOT NULL DEFAULT 'pending',
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `TaxDeclaration`
--

INSERT INTO `TaxDeclaration` (`id`, `companyId`, `employeeId`, `financialYear`, `section`, `description`, `declaredAmount`, `approvedAmount`, `status`, `createdAt`) VALUES
('09c3130f-33a8-45ba-8ed1-76d55e29a265', 'e87debef-a662-4fd7-b255-2e50c9f86d5b', '7e4c13c9-3803-4b2b-aa6e-8bd11c4f61c3', 'FY 2025-26', '80C', 'Public Provident Fund', 50000, 50000, 'approved', '2026-08-02 14:53:29.695');

-- --------------------------------------------------------

--
-- Table structure for table `TDSSection`
--

CREATE TABLE `TDSSection` (
  `id` varchar(191) NOT NULL,
  `companyId` varchar(191) NOT NULL,
  `section` varchar(191) NOT NULL,
  `name` varchar(191) NOT NULL,
  `limit` varchar(191) NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `TDSSlab`
--

CREATE TABLE `TDSSlab` (
  `id` varchar(191) NOT NULL,
  `companyId` varchar(191) NOT NULL,
  `regime` varchar(191) NOT NULL,
  `fromAmount` double NOT NULL,
  `toAmount` double NOT NULL,
  `rate` varchar(191) NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `Timesheet`
--

CREATE TABLE `Timesheet` (
  `id` varchar(191) NOT NULL,
  `employeeId` varchar(191) NOT NULL,
  `projectId` varchar(191) DEFAULT NULL,
  `date` datetime(3) NOT NULL,
  `hours` double NOT NULL,
  `isBillable` tinyint(1) NOT NULL DEFAULT 1,
  `status` varchar(191) NOT NULL DEFAULT 'submitted'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `TrainingCourse`
--

CREATE TABLE `TrainingCourse` (
  `id` varchar(191) NOT NULL,
  `title` varchar(191) NOT NULL,
  `description` varchar(191) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `TrainingCourse`
--

INSERT INTO `TrainingCourse` (`id`, `title`, `description`) VALUES
('c3d8f94f-b36e-4836-bc2c-a100c40557a7', 'OWASP Security Protocols for Backend APIs', 'Mandatory standard compliance training regarding server injection vulnerability protections.'),
('eed6c20d-a71a-45c6-93f2-d8528658d169', 'OWASP Security Protocols for Backend APIs', 'Mandatory standard compliance training regarding server injection vulnerability protections.');

-- --------------------------------------------------------

--
-- Table structure for table `TravelRequest`
--

CREATE TABLE `TravelRequest` (
  `id` varchar(191) NOT NULL,
  `employeeId` varchar(191) NOT NULL,
  `purpose` varchar(191) DEFAULT NULL,
  `fromDate` datetime(3) NOT NULL,
  `toDate` datetime(3) NOT NULL,
  `advance` double NOT NULL DEFAULT 0,
  `status` varchar(191) NOT NULL DEFAULT 'pending'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `TravelRequest`
--

INSERT INTO `TravelRequest` (`id`, `employeeId`, `purpose`, `fromDate`, `toDate`, `advance`, `status`) VALUES
('5f2ea5e0-3525-43d6-88c5-003f6b843224', '7e4c13c9-3803-4b2b-aa6e-8bd11c4f61c3', 'Testing', '2026-08-05 00:00:00.000', '2026-08-08 00:00:00.000', 1000, 'approved');

-- --------------------------------------------------------

--
-- Table structure for table `User`
--

CREATE TABLE `User` (
  `id` varchar(191) NOT NULL,
  `companyId` varchar(191) NOT NULL,
  `email` varchar(191) NOT NULL,
  `passwordHash` varchar(191) NOT NULL,
  `mfaEnabled` tinyint(1) NOT NULL DEFAULT 0,
  `mfaSecret` varchar(191) DEFAULT NULL,
  `roleId` varchar(191) DEFAULT NULL,
  `employeeId` varchar(191) DEFAULT NULL,
  `isSuperAdmin` tinyint(1) NOT NULL DEFAULT 0,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `lastLoginAt` datetime(3) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `User`
--

INSERT INTO `User` (`id`, `companyId`, `email`, `passwordHash`, `mfaEnabled`, `mfaSecret`, `roleId`, `employeeId`, `isSuperAdmin`, `createdAt`, `lastLoginAt`) VALUES
('79f5e9fe-3a2b-4dd2-9015-1feca4bf9e5e', 'e87debef-a662-4fd7-b255-2e50c9f86d5b', '2018@lordsandkings.co', '$2b$12$GXYtpq83WXV/eyZuCiuYieW8G8R0Q0fMyUYJxgIagV4rCVqTCKbh2', 0, NULL, 'a0fa27f0-c3e1-4f1d-a050-0e030039cbfe', NULL, 1, '2026-07-15 06:23:58.822', '2026-08-14 10:12:12.503'),
('bc3515dd-c5d7-4266-9147-de69624d5b1f', 'e87debef-a662-4fd7-b255-2e50c9f86d5b', 'hr@lordsandkings.co', '$2b$10$sJQ5TExbYf1qdoj60HMeE.uJryxJ8HDrMRfb54KPR5Fly3cddDwlq', 0, NULL, 'a46db7db-2575-47e7-8f10-64d0b0d4382d', '2623fc64-fa89-47c1-a7de-4d65fecaf0c8', 0, '2026-07-17 10:40:06.323', '2026-08-14 10:25:15.196'),
('f4f162b0-d691-40fa-8ae1-704b095f0302', 'e87debef-a662-4fd7-b255-2e50c9f86d5b', 'sathish@lordsandkings.co', '$2b$10$6O9rEtzkdEYNTchyeM3rleJhNTTVCNoK9wPM.tg.qwyld4CrtswtK', 0, NULL, '2799715c-527e-4d0d-be43-29c6829bf27c', '7e4c13c9-3803-4b2b-aa6e-8bd11c4f61c3', 0, '2026-07-15 09:52:44.108', '2026-08-10 10:46:38.444');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `AdditionalPayout`
--
ALTER TABLE `AdditionalPayout`
  ADD PRIMARY KEY (`id`),
  ADD KEY `AdditionalPayout_employeeId_fkey` (`employeeId`);

--
-- Indexes for table `Announcement`
--
ALTER TABLE `Announcement`
  ADD PRIMARY KEY (`id`),
  ADD KEY `Announcement_companyId_fkey` (`companyId`);

--
-- Indexes for table `Asset`
--
ALTER TABLE `Asset`
  ADD PRIMARY KEY (`id`),
  ADD KEY `Asset_companyId_fkey` (`companyId`);

--
-- Indexes for table `AssetAssignment`
--
ALTER TABLE `AssetAssignment`
  ADD PRIMARY KEY (`id`),
  ADD KEY `AssetAssignment_assetId_fkey` (`assetId`),
  ADD KEY `AssetAssignment_employeeId_fkey` (`employeeId`);

--
-- Indexes for table `AttendanceLog`
--
ALTER TABLE `AttendanceLog`
  ADD PRIMARY KEY (`id`),
  ADD KEY `AttendanceLog_employeeId_date_idx` (`employeeId`,`date`);

--
-- Indexes for table `AttendancePolicy`
--
ALTER TABLE `AttendancePolicy`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `AttendancePolicy_companyId_key_key` (`companyId`,`key`);

--
-- Indexes for table `AuditLog`
--
ALTER TABLE `AuditLog`
  ADD PRIMARY KEY (`id`),
  ADD KEY `AuditLog_companyId_fkey` (`companyId`);

--
-- Indexes for table `Branch`
--
ALTER TABLE `Branch`
  ADD PRIMARY KEY (`id`),
  ADD KEY `Branch_companyId_fkey` (`companyId`);

--
-- Indexes for table `Candidate`
--
ALTER TABLE `Candidate`
  ADD PRIMARY KEY (`id`),
  ADD KEY `Candidate_jobId_fkey` (`jobId`);

--
-- Indexes for table `Company`
--
ALTER TABLE `Company`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `ComplianceForm`
--
ALTER TABLE `ComplianceForm`
  ADD PRIMARY KEY (`id`),
  ADD KEY `ComplianceForm_companyId_fkey` (`companyId`);

--
-- Indexes for table `CompOffRequest`
--
ALTER TABLE `CompOffRequest`
  ADD PRIMARY KEY (`id`),
  ADD KEY `CompOffRequest_companyId_status_idx` (`companyId`,`status`),
  ADD KEY `CompOffRequest_employeeId_fkey` (`employeeId`);

--
-- Indexes for table `CourseEnrollment`
--
ALTER TABLE `CourseEnrollment`
  ADD PRIMARY KEY (`id`),
  ADD KEY `CourseEnrollment_courseId_fkey` (`courseId`),
  ADD KEY `CourseEnrollment_employeeId_fkey` (`employeeId`);

--
-- Indexes for table `Department`
--
ALTER TABLE `Department`
  ADD PRIMARY KEY (`id`),
  ADD KEY `Department_companyId_fkey` (`companyId`);

--
-- Indexes for table `Designation`
--
ALTER TABLE `Designation`
  ADD PRIMARY KEY (`id`),
  ADD KEY `Designation_companyId_fkey` (`companyId`);

--
-- Indexes for table `Employee`
--
ALTER TABLE `Employee`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `Employee_companyId_employeeCode_key` (`companyId`,`employeeCode`),
  ADD KEY `Employee_companyId_status_idx` (`companyId`,`status`),
  ADD KEY `Employee_branchId_fkey` (`branchId`),
  ADD KEY `Employee_departmentId_fkey` (`departmentId`),
  ADD KEY `Employee_designationId_fkey` (`designationId`),
  ADD KEY `Employee_managerId_fkey` (`managerId`);

--
-- Indexes for table `EmployeeAdminInfo`
--
ALTER TABLE `EmployeeAdminInfo`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `EmployeeAdminInfo_employeeId_key` (`employeeId`);

--
-- Indexes for table `EmployeeCertificationInfo`
--
ALTER TABLE `EmployeeCertificationInfo`
  ADD PRIMARY KEY (`id`),
  ADD KEY `EmployeeCertificationInfo_employeeId_fkey` (`employeeId`);

--
-- Indexes for table `EmployeeContactInfo`
--
ALTER TABLE `EmployeeContactInfo`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `EmployeeContactInfo_employeeId_key` (`employeeId`);

--
-- Indexes for table `EmployeeDocument`
--
ALTER TABLE `EmployeeDocument`
  ADD PRIMARY KEY (`id`),
  ADD KEY `EmployeeDocument_employeeId_fkey` (`employeeId`);

--
-- Indexes for table `EmployeeDocumentInfo`
--
ALTER TABLE `EmployeeDocumentInfo`
  ADD PRIMARY KEY (`id`),
  ADD KEY `EmployeeDocumentInfo_employeeId_fkey` (`employeeId`);

--
-- Indexes for table `EmployeeEmergencyContact`
--
ALTER TABLE `EmployeeEmergencyContact`
  ADD PRIMARY KEY (`id`),
  ADD KEY `EmployeeEmergencyContact_employeeId_fkey` (`employeeId`);

--
-- Indexes for table `EmployeeExperienceInfo`
--
ALTER TABLE `EmployeeExperienceInfo`
  ADD PRIMARY KEY (`id`),
  ADD KEY `EmployeeExperienceInfo_employeeId_fkey` (`employeeId`);

--
-- Indexes for table `EmployeeFamilyMember`
--
ALTER TABLE `EmployeeFamilyMember`
  ADD PRIMARY KEY (`id`),
  ADD KEY `EmployeeFamilyMember_employeeId_fkey` (`employeeId`);

--
-- Indexes for table `EmployeeImmigrationInfo`
--
ALTER TABLE `EmployeeImmigrationInfo`
  ADD PRIMARY KEY (`id`),
  ADD KEY `EmployeeImmigrationInfo_employeeId_fkey` (`employeeId`);

--
-- Indexes for table `EmployeePaymentInfo`
--
ALTER TABLE `EmployeePaymentInfo`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `EmployeePaymentInfo_employeeId_key` (`employeeId`);

--
-- Indexes for table `EmployeePersonalInfo`
--
ALTER TABLE `EmployeePersonalInfo`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `EmployeePersonalInfo_employeeId_key` (`employeeId`);

--
-- Indexes for table `EmployeeQualificationInfo`
--
ALTER TABLE `EmployeeQualificationInfo`
  ADD PRIMARY KEY (`id`),
  ADD KEY `EmployeeQualificationInfo_employeeId_fkey` (`employeeId`);

--
-- Indexes for table `ESICConfig`
--
ALTER TABLE `ESICConfig`
  ADD PRIMARY KEY (`id`),
  ADD KEY `ESICConfig_companyId_fkey` (`companyId`);

--
-- Indexes for table `Evaluation360`
--
ALTER TABLE `Evaluation360`
  ADD PRIMARY KEY (`id`),
  ADD KEY `Evaluation360_companyId_fkey` (`companyId`),
  ADD KEY `Evaluation360_employeeId_fkey` (`employeeId`);

--
-- Indexes for table `EvaluationSetup`
--
ALTER TABLE `EvaluationSetup`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `EvaluationSetup_employeeId_type_key` (`employeeId`,`type`),
  ADD KEY `EvaluationSetup_companyId_fkey` (`companyId`);

--
-- Indexes for table `ExitChecklist`
--
ALTER TABLE `ExitChecklist`
  ADD PRIMARY KEY (`id`),
  ADD KEY `ExitChecklist_exitRequestId_fkey` (`exitRequestId`);

--
-- Indexes for table `ExitRequest`
--
ALTER TABLE `ExitRequest`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `ExitRequest_employeeId_key` (`employeeId`),
  ADD KEY `ExitRequest_companyId_fkey` (`companyId`);

--
-- Indexes for table `Expense`
--
ALTER TABLE `Expense`
  ADD PRIMARY KEY (`id`),
  ADD KEY `Expense_employeeId_fkey` (`employeeId`);

--
-- Indexes for table `FlexibleHolidayRequest`
--
ALTER TABLE `FlexibleHolidayRequest`
  ADD PRIMARY KEY (`id`),
  ADD KEY `FlexibleHolidayRequest_companyId_status_idx` (`companyId`,`status`),
  ADD KEY `FlexibleHolidayRequest_employeeId_fkey` (`employeeId`);

--
-- Indexes for table `FnfSettlement`
--
ALTER TABLE `FnfSettlement`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `FnfSettlement_employeeId_key` (`employeeId`);

--
-- Indexes for table `Goal`
--
ALTER TABLE `Goal`
  ADD PRIMARY KEY (`id`),
  ADD KEY `Goal_employeeId_fkey` (`employeeId`);

--
-- Indexes for table `HelpdeskTicket`
--
ALTER TABLE `HelpdeskTicket`
  ADD PRIMARY KEY (`id`),
  ADD KEY `HelpdeskTicket_companyId_fkey` (`companyId`),
  ADD KEY `HelpdeskTicket_employeeId_fkey` (`employeeId`);

--
-- Indexes for table `Holiday`
--
ALTER TABLE `Holiday`
  ADD PRIMARY KEY (`id`),
  ADD KEY `Holiday_companyId_fkey` (`companyId`);

--
-- Indexes for table `HRForm`
--
ALTER TABLE `HRForm`
  ADD PRIMARY KEY (`id`),
  ADD KEY `HRForm_companyId_fkey` (`companyId`);

--
-- Indexes for table `HRMaster`
--
ALTER TABLE `HRMaster`
  ADD PRIMARY KEY (`id`),
  ADD KEY `HRMaster_companyId_fkey` (`companyId`);

--
-- Indexes for table `ImportMapping`
--
ALTER TABLE `ImportMapping`
  ADD PRIMARY KEY (`id`),
  ADD KEY `ImportMapping_companyId_fkey` (`companyId`);

--
-- Indexes for table `IncomeSlabCategory`
--
ALTER TABLE `IncomeSlabCategory`
  ADD PRIMARY KEY (`id`),
  ADD KEY `IncomeSlabCategory_companyId_fkey` (`companyId`);

--
-- Indexes for table `Integration`
--
ALTER TABLE `Integration`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `Integration_companyId_provider_key` (`companyId`,`provider`);

--
-- Indexes for table `Interview`
--
ALTER TABLE `Interview`
  ADD PRIMARY KEY (`id`),
  ADD KEY `Interview_candidateId_fkey` (`candidateId`);

--
-- Indexes for table `Invoice`
--
ALTER TABLE `Invoice`
  ADD PRIMARY KEY (`id`),
  ADD KEY `Invoice_companyId_fkey` (`companyId`),
  ADD KEY `Invoice_subscriptionId_fkey` (`subscriptionId`);

--
-- Indexes for table `Job`
--
ALTER TABLE `Job`
  ADD PRIMARY KEY (`id`),
  ADD KEY `Job_companyId_fkey` (`companyId`);

--
-- Indexes for table `KPA`
--
ALTER TABLE `KPA`
  ADD PRIMARY KEY (`id`),
  ADD KEY `KPA_companyId_fkey` (`companyId`);

--
-- Indexes for table `KPI`
--
ALTER TABLE `KPI`
  ADD PRIMARY KEY (`id`),
  ADD KEY `KPI_companyId_fkey` (`companyId`),
  ADD KEY `KPI_kraId_fkey` (`kraId`);

--
-- Indexes for table `KPIAssignment`
--
ALTER TABLE `KPIAssignment`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `KPIAssignment_employeeId_kpiId_key` (`employeeId`,`kpiId`),
  ADD KEY `KPIAssignment_companyId_fkey` (`companyId`),
  ADD KEY `KPIAssignment_kpiId_fkey` (`kpiId`);

--
-- Indexes for table `KPITarget`
--
ALTER TABLE `KPITarget`
  ADD PRIMARY KEY (`id`),
  ADD KEY `KPITarget_companyId_fkey` (`companyId`),
  ADD KEY `KPITarget_employeeId_fkey` (`employeeId`),
  ADD KEY `KPITarget_kpiId_fkey` (`kpiId`);

--
-- Indexes for table `KRA`
--
ALTER TABLE `KRA`
  ADD PRIMARY KEY (`id`),
  ADD KEY `KRA_companyId_fkey` (`companyId`),
  ADD KEY `KRA_kpaId_fkey` (`kpaId`);

--
-- Indexes for table `LeaveBalance`
--
ALTER TABLE `LeaveBalance`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `LeaveBalance_employeeId_leaveTypeId_year_key` (`employeeId`,`leaveTypeId`,`year`),
  ADD KEY `LeaveBalance_leaveTypeId_fkey` (`leaveTypeId`);

--
-- Indexes for table `LeaveCancellationRequest`
--
ALTER TABLE `LeaveCancellationRequest`
  ADD PRIMARY KEY (`id`),
  ADD KEY `LeaveCancellationRequest_companyId_status_idx` (`companyId`,`status`),
  ADD KEY `LeaveCancellationRequest_leaveRequestId_fkey` (`leaveRequestId`),
  ADD KEY `LeaveCancellationRequest_employeeId_fkey` (`employeeId`);

--
-- Indexes for table `LeaveRequest`
--
ALTER TABLE `LeaveRequest`
  ADD PRIMARY KEY (`id`),
  ADD KEY `LeaveRequest_leaveTypeId_fkey` (`leaveTypeId`),
  ADD KEY `LeaveRequest_employeeId_fkey` (`employeeId`);

--
-- Indexes for table `LeaveType`
--
ALTER TABLE `LeaveType`
  ADD PRIMARY KEY (`id`),
  ADD KEY `LeaveType_companyId_fkey` (`companyId`);

--
-- Indexes for table `LoanRequest`
--
ALTER TABLE `LoanRequest`
  ADD PRIMARY KEY (`id`),
  ADD KEY `LoanRequest_companyId_status_idx` (`companyId`,`status`),
  ADD KEY `LoanRequest_employeeId_fkey` (`employeeId`);

--
-- Indexes for table `LWFConfig`
--
ALTER TABLE `LWFConfig`
  ADD PRIMARY KEY (`id`),
  ADD KEY `LWFConfig_companyId_fkey` (`companyId`);

--
-- Indexes for table `Offer`
--
ALTER TABLE `Offer`
  ADD PRIMARY KEY (`id`),
  ADD KEY `Offer_candidateId_fkey` (`candidateId`);

--
-- Indexes for table `OptionalHolidayRequest`
--
ALTER TABLE `OptionalHolidayRequest`
  ADD PRIMARY KEY (`id`),
  ADD KEY `OptionalHolidayRequest_companyId_status_idx` (`companyId`,`status`),
  ADD KEY `OptionalHolidayRequest_employeeId_fkey` (`employeeId`);

--
-- Indexes for table `OvertimeRequest`
--
ALTER TABLE `OvertimeRequest`
  ADD PRIMARY KEY (`id`),
  ADD KEY `OvertimeRequest_companyId_status_idx` (`companyId`,`status`),
  ADD KEY `OvertimeRequest_employeeId_fkey` (`employeeId`);

--
-- Indexes for table `PayrollCycle`
--
ALTER TABLE `PayrollCycle`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `PayrollCycle_companyId_month_year_key` (`companyId`,`month`,`year`);

--
-- Indexes for table `Payslip`
--
ALTER TABLE `Payslip`
  ADD PRIMARY KEY (`id`),
  ADD KEY `Payslip_payrollCycleId_fkey` (`payrollCycleId`),
  ADD KEY `Payslip_employeeId_fkey` (`employeeId`);

--
-- Indexes for table `PerformanceReview`
--
ALTER TABLE `PerformanceReview`
  ADD PRIMARY KEY (`id`),
  ADD KEY `PerformanceReview_employeeId_fkey` (`employeeId`),
  ADD KEY `PerformanceReview_reviewerId_fkey` (`reviewerId`);

--
-- Indexes for table `Permission`
--
ALTER TABLE `Permission`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `Permission_roleId_module_action_key` (`roleId`,`module`,`action`);

--
-- Indexes for table `PFConfig`
--
ALTER TABLE `PFConfig`
  ADD PRIMARY KEY (`id`),
  ADD KEY `PFConfig_companyId_fkey` (`companyId`);

--
-- Indexes for table `ProfessionalTaxSlab`
--
ALTER TABLE `ProfessionalTaxSlab`
  ADD PRIMARY KEY (`id`),
  ADD KEY `ProfessionalTaxSlab_companyId_fkey` (`companyId`);

--
-- Indexes for table `Project`
--
ALTER TABLE `Project`
  ADD PRIMARY KEY (`id`),
  ADD KEY `Project_companyId_fkey` (`companyId`);

--
-- Indexes for table `RefreshToken`
--
ALTER TABLE `RefreshToken`
  ADD PRIMARY KEY (`id`),
  ADD KEY `RefreshToken_userId_fkey` (`userId`);

--
-- Indexes for table `RegularizationRequest`
--
ALTER TABLE `RegularizationRequest`
  ADD PRIMARY KEY (`id`),
  ADD KEY `RegularizationRequest_attendanceLogId_fkey` (`attendanceLogId`),
  ADD KEY `RegularizationRequest_employeeId_fkey` (`employeeId`);

--
-- Indexes for table `ReviewCycle`
--
ALTER TABLE `ReviewCycle`
  ADD PRIMARY KEY (`id`),
  ADD KEY `ReviewCycle_companyId_fkey` (`companyId`);

--
-- Indexes for table `Role`
--
ALTER TABLE `Role`
  ADD PRIMARY KEY (`id`),
  ADD KEY `Role_companyId_fkey` (`companyId`);

--
-- Indexes for table `SalaryRevision`
--
ALTER TABLE `SalaryRevision`
  ADD PRIMARY KEY (`id`),
  ADD KEY `SalaryRevision_employeeId_idx` (`employeeId`),
  ADD KEY `SalaryRevision_companyId_fkey` (`companyId`);

--
-- Indexes for table `SalaryStructure`
--
ALTER TABLE `SalaryStructure`
  ADD PRIMARY KEY (`id`),
  ADD KEY `SalaryStructure_employeeId_fkey` (`employeeId`);

--
-- Indexes for table `Setting`
--
ALTER TABLE `Setting`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `Setting_companyId_key_key` (`companyId`,`key`);

--
-- Indexes for table `Shift`
--
ALTER TABLE `Shift`
  ADD PRIMARY KEY (`id`),
  ADD KEY `Shift_companyId_fkey` (`companyId`);

--
-- Indexes for table `ShiftAssignment`
--
ALTER TABLE `ShiftAssignment`
  ADD PRIMARY KEY (`id`),
  ADD KEY `ShiftAssignment_shiftId_fkey` (`shiftId`),
  ADD KEY `ShiftAssignment_employeeId_fkey` (`employeeId`);

--
-- Indexes for table `ShiftChangeRequest`
--
ALTER TABLE `ShiftChangeRequest`
  ADD PRIMARY KEY (`id`),
  ADD KEY `ShiftChangeRequest_companyId_status_idx` (`companyId`,`status`),
  ADD KEY `ShiftChangeRequest_employeeId_fkey` (`employeeId`),
  ADD KEY `ShiftChangeRequest_shiftId_fkey` (`shiftId`),
  ADD KEY `ShiftChangeRequest_requestedShiftId_fkey` (`requestedShiftId`);

--
-- Indexes for table `Subscription`
--
ALTER TABLE `Subscription`
  ADD PRIMARY KEY (`id`),
  ADD KEY `Subscription_companyId_fkey` (`companyId`);

--
-- Indexes for table `Task`
--
ALTER TABLE `Task`
  ADD PRIMARY KEY (`id`),
  ADD KEY `Task_projectId_fkey` (`projectId`);

--
-- Indexes for table `TaxDeclaration`
--
ALTER TABLE `TaxDeclaration`
  ADD PRIMARY KEY (`id`),
  ADD KEY `TaxDeclaration_employeeId_financialYear_idx` (`employeeId`,`financialYear`),
  ADD KEY `TaxDeclaration_companyId_fkey` (`companyId`);

--
-- Indexes for table `TDSSection`
--
ALTER TABLE `TDSSection`
  ADD PRIMARY KEY (`id`),
  ADD KEY `TDSSection_companyId_fkey` (`companyId`);

--
-- Indexes for table `TDSSlab`
--
ALTER TABLE `TDSSlab`
  ADD PRIMARY KEY (`id`),
  ADD KEY `TDSSlab_companyId_fkey` (`companyId`);

--
-- Indexes for table `Timesheet`
--
ALTER TABLE `Timesheet`
  ADD PRIMARY KEY (`id`),
  ADD KEY `Timesheet_projectId_fkey` (`projectId`),
  ADD KEY `Timesheet_employeeId_fkey` (`employeeId`);

--
-- Indexes for table `TrainingCourse`
--
ALTER TABLE `TrainingCourse`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `TravelRequest`
--
ALTER TABLE `TravelRequest`
  ADD PRIMARY KEY (`id`),
  ADD KEY `TravelRequest_employeeId_fkey` (`employeeId`);

--
-- Indexes for table `User`
--
ALTER TABLE `User`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `User_email_key` (`email`),
  ADD UNIQUE KEY `User_employeeId_key` (`employeeId`),
  ADD KEY `User_companyId_fkey` (`companyId`),
  ADD KEY `User_roleId_fkey` (`roleId`);

--
-- Constraints for dumped tables
--

--
-- Constraints for table `AdditionalPayout`
--
ALTER TABLE `AdditionalPayout`
  ADD CONSTRAINT `AdditionalPayout_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `Employee` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `Announcement`
--
ALTER TABLE `Announcement`
  ADD CONSTRAINT `Announcement_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company` (`id`) ON UPDATE CASCADE;

--
-- Constraints for table `Asset`
--
ALTER TABLE `Asset`
  ADD CONSTRAINT `Asset_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company` (`id`) ON UPDATE CASCADE;

--
-- Constraints for table `AssetAssignment`
--
ALTER TABLE `AssetAssignment`
  ADD CONSTRAINT `AssetAssignment_assetId_fkey` FOREIGN KEY (`assetId`) REFERENCES `Asset` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `AssetAssignment_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `Employee` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `AttendanceLog`
--
ALTER TABLE `AttendanceLog`
  ADD CONSTRAINT `AttendanceLog_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `Employee` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `AttendancePolicy`
--
ALTER TABLE `AttendancePolicy`
  ADD CONSTRAINT `AttendancePolicy_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company` (`id`) ON UPDATE CASCADE;

--
-- Constraints for table `AuditLog`
--
ALTER TABLE `AuditLog`
  ADD CONSTRAINT `AuditLog_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company` (`id`) ON UPDATE CASCADE;

--
-- Constraints for table `Branch`
--
ALTER TABLE `Branch`
  ADD CONSTRAINT `Branch_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company` (`id`) ON UPDATE CASCADE;

--
-- Constraints for table `Candidate`
--
ALTER TABLE `Candidate`
  ADD CONSTRAINT `Candidate_jobId_fkey` FOREIGN KEY (`jobId`) REFERENCES `Job` (`id`) ON UPDATE CASCADE;

--
-- Constraints for table `ComplianceForm`
--
ALTER TABLE `ComplianceForm`
  ADD CONSTRAINT `ComplianceForm_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company` (`id`) ON UPDATE CASCADE;

--
-- Constraints for table `CompOffRequest`
--
ALTER TABLE `CompOffRequest`
  ADD CONSTRAINT `CompOffRequest_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `CompOffRequest_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `Employee` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `CourseEnrollment`
--
ALTER TABLE `CourseEnrollment`
  ADD CONSTRAINT `CourseEnrollment_courseId_fkey` FOREIGN KEY (`courseId`) REFERENCES `TrainingCourse` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `CourseEnrollment_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `Employee` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `Department`
--
ALTER TABLE `Department`
  ADD CONSTRAINT `Department_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company` (`id`) ON UPDATE CASCADE;

--
-- Constraints for table `Designation`
--
ALTER TABLE `Designation`
  ADD CONSTRAINT `Designation_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company` (`id`) ON UPDATE CASCADE;

--
-- Constraints for table `Employee`
--
ALTER TABLE `Employee`
  ADD CONSTRAINT `Employee_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `Branch` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `Employee_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `Employee_departmentId_fkey` FOREIGN KEY (`departmentId`) REFERENCES `Department` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `Employee_designationId_fkey` FOREIGN KEY (`designationId`) REFERENCES `Designation` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `Employee_managerId_fkey` FOREIGN KEY (`managerId`) REFERENCES `Employee` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `EmployeeAdminInfo`
--
ALTER TABLE `EmployeeAdminInfo`
  ADD CONSTRAINT `EmployeeAdminInfo_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `Employee` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `EmployeeCertificationInfo`
--
ALTER TABLE `EmployeeCertificationInfo`
  ADD CONSTRAINT `EmployeeCertificationInfo_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `Employee` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `EmployeeContactInfo`
--
ALTER TABLE `EmployeeContactInfo`
  ADD CONSTRAINT `EmployeeContactInfo_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `Employee` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `EmployeeDocument`
--
ALTER TABLE `EmployeeDocument`
  ADD CONSTRAINT `EmployeeDocument_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `Employee` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `EmployeeDocumentInfo`
--
ALTER TABLE `EmployeeDocumentInfo`
  ADD CONSTRAINT `EmployeeDocumentInfo_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `Employee` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `EmployeeEmergencyContact`
--
ALTER TABLE `EmployeeEmergencyContact`
  ADD CONSTRAINT `EmployeeEmergencyContact_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `Employee` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `EmployeeExperienceInfo`
--
ALTER TABLE `EmployeeExperienceInfo`
  ADD CONSTRAINT `EmployeeExperienceInfo_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `Employee` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `EmployeeFamilyMember`
--
ALTER TABLE `EmployeeFamilyMember`
  ADD CONSTRAINT `EmployeeFamilyMember_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `Employee` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `EmployeeImmigrationInfo`
--
ALTER TABLE `EmployeeImmigrationInfo`
  ADD CONSTRAINT `EmployeeImmigrationInfo_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `Employee` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `EmployeePaymentInfo`
--
ALTER TABLE `EmployeePaymentInfo`
  ADD CONSTRAINT `EmployeePaymentInfo_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `Employee` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `EmployeePersonalInfo`
--
ALTER TABLE `EmployeePersonalInfo`
  ADD CONSTRAINT `EmployeePersonalInfo_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `Employee` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `EmployeeQualificationInfo`
--
ALTER TABLE `EmployeeQualificationInfo`
  ADD CONSTRAINT `EmployeeQualificationInfo_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `Employee` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `ESICConfig`
--
ALTER TABLE `ESICConfig`
  ADD CONSTRAINT `ESICConfig_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company` (`id`) ON UPDATE CASCADE;

--
-- Constraints for table `Evaluation360`
--
ALTER TABLE `Evaluation360`
  ADD CONSTRAINT `Evaluation360_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `Evaluation360_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `Employee` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `EvaluationSetup`
--
ALTER TABLE `EvaluationSetup`
  ADD CONSTRAINT `EvaluationSetup_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `EvaluationSetup_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `Employee` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `ExitChecklist`
--
ALTER TABLE `ExitChecklist`
  ADD CONSTRAINT `ExitChecklist_exitRequestId_fkey` FOREIGN KEY (`exitRequestId`) REFERENCES `ExitRequest` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `ExitRequest`
--
ALTER TABLE `ExitRequest`
  ADD CONSTRAINT `ExitRequest_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `ExitRequest_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `Employee` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `Expense`
--
ALTER TABLE `Expense`
  ADD CONSTRAINT `Expense_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `Employee` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `FlexibleHolidayRequest`
--
ALTER TABLE `FlexibleHolidayRequest`
  ADD CONSTRAINT `FlexibleHolidayRequest_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `FlexibleHolidayRequest_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `Employee` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `FnfSettlement`
--
ALTER TABLE `FnfSettlement`
  ADD CONSTRAINT `FnfSettlement_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `Employee` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `Goal`
--
ALTER TABLE `Goal`
  ADD CONSTRAINT `Goal_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `Employee` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `HelpdeskTicket`
--
ALTER TABLE `HelpdeskTicket`
  ADD CONSTRAINT `HelpdeskTicket_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `HelpdeskTicket_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `Employee` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `Holiday`
--
ALTER TABLE `Holiday`
  ADD CONSTRAINT `Holiday_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company` (`id`) ON UPDATE CASCADE;

--
-- Constraints for table `HRForm`
--
ALTER TABLE `HRForm`
  ADD CONSTRAINT `HRForm_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company` (`id`) ON UPDATE CASCADE;

--
-- Constraints for table `HRMaster`
--
ALTER TABLE `HRMaster`
  ADD CONSTRAINT `HRMaster_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company` (`id`) ON UPDATE CASCADE;

--
-- Constraints for table `ImportMapping`
--
ALTER TABLE `ImportMapping`
  ADD CONSTRAINT `ImportMapping_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company` (`id`) ON UPDATE CASCADE;

--
-- Constraints for table `IncomeSlabCategory`
--
ALTER TABLE `IncomeSlabCategory`
  ADD CONSTRAINT `IncomeSlabCategory_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company` (`id`) ON UPDATE CASCADE;

--
-- Constraints for table `Interview`
--
ALTER TABLE `Interview`
  ADD CONSTRAINT `Interview_candidateId_fkey` FOREIGN KEY (`candidateId`) REFERENCES `Candidate` (`id`) ON UPDATE CASCADE;

--
-- Constraints for table `Invoice`
--
ALTER TABLE `Invoice`
  ADD CONSTRAINT `Invoice_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `Invoice_subscriptionId_fkey` FOREIGN KEY (`subscriptionId`) REFERENCES `Subscription` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `Job`
--
ALTER TABLE `Job`
  ADD CONSTRAINT `Job_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company` (`id`) ON UPDATE CASCADE;

--
-- Constraints for table `KPA`
--
ALTER TABLE `KPA`
  ADD CONSTRAINT `KPA_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company` (`id`) ON UPDATE CASCADE;

--
-- Constraints for table `KPI`
--
ALTER TABLE `KPI`
  ADD CONSTRAINT `KPI_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `KPI_kraId_fkey` FOREIGN KEY (`kraId`) REFERENCES `KRA` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `KPIAssignment`
--
ALTER TABLE `KPIAssignment`
  ADD CONSTRAINT `KPIAssignment_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `KPIAssignment_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `Employee` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `KPIAssignment_kpiId_fkey` FOREIGN KEY (`kpiId`) REFERENCES `KPI` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `KPITarget`
--
ALTER TABLE `KPITarget`
  ADD CONSTRAINT `KPITarget_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `KPITarget_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `Employee` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `KPITarget_kpiId_fkey` FOREIGN KEY (`kpiId`) REFERENCES `KPI` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `KRA`
--
ALTER TABLE `KRA`
  ADD CONSTRAINT `KRA_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `KRA_kpaId_fkey` FOREIGN KEY (`kpaId`) REFERENCES `KPA` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `LeaveBalance`
--
ALTER TABLE `LeaveBalance`
  ADD CONSTRAINT `LeaveBalance_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `Employee` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `LeaveBalance_leaveTypeId_fkey` FOREIGN KEY (`leaveTypeId`) REFERENCES `LeaveType` (`id`) ON UPDATE CASCADE;

--
-- Constraints for table `LeaveCancellationRequest`
--
ALTER TABLE `LeaveCancellationRequest`
  ADD CONSTRAINT `LeaveCancellationRequest_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `LeaveCancellationRequest_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `Employee` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `LeaveCancellationRequest_leaveRequestId_fkey` FOREIGN KEY (`leaveRequestId`) REFERENCES `LeaveRequest` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `LeaveRequest`
--
ALTER TABLE `LeaveRequest`
  ADD CONSTRAINT `LeaveRequest_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `Employee` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `LeaveRequest_leaveTypeId_fkey` FOREIGN KEY (`leaveTypeId`) REFERENCES `LeaveType` (`id`) ON UPDATE CASCADE;

--
-- Constraints for table `LeaveType`
--
ALTER TABLE `LeaveType`
  ADD CONSTRAINT `LeaveType_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company` (`id`) ON UPDATE CASCADE;

--
-- Constraints for table `LoanRequest`
--
ALTER TABLE `LoanRequest`
  ADD CONSTRAINT `LoanRequest_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `LoanRequest_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `Employee` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `LWFConfig`
--
ALTER TABLE `LWFConfig`
  ADD CONSTRAINT `LWFConfig_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company` (`id`) ON UPDATE CASCADE;

--
-- Constraints for table `Offer`
--
ALTER TABLE `Offer`
  ADD CONSTRAINT `Offer_candidateId_fkey` FOREIGN KEY (`candidateId`) REFERENCES `Candidate` (`id`) ON UPDATE CASCADE;

--
-- Constraints for table `OptionalHolidayRequest`
--
ALTER TABLE `OptionalHolidayRequest`
  ADD CONSTRAINT `OptionalHolidayRequest_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `OptionalHolidayRequest_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `Employee` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `OvertimeRequest`
--
ALTER TABLE `OvertimeRequest`
  ADD CONSTRAINT `OvertimeRequest_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `OvertimeRequest_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `Employee` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `Payslip`
--
ALTER TABLE `Payslip`
  ADD CONSTRAINT `Payslip_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `Employee` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `Payslip_payrollCycleId_fkey` FOREIGN KEY (`payrollCycleId`) REFERENCES `PayrollCycle` (`id`) ON UPDATE CASCADE;

--
-- Constraints for table `PerformanceReview`
--
ALTER TABLE `PerformanceReview`
  ADD CONSTRAINT `PerformanceReview_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `Employee` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `PerformanceReview_reviewerId_fkey` FOREIGN KEY (`reviewerId`) REFERENCES `Employee` (`id`) ON UPDATE CASCADE;

--
-- Constraints for table `Permission`
--
ALTER TABLE `Permission`
  ADD CONSTRAINT `Permission_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `Role` (`id`) ON UPDATE CASCADE;

--
-- Constraints for table `PFConfig`
--
ALTER TABLE `PFConfig`
  ADD CONSTRAINT `PFConfig_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company` (`id`) ON UPDATE CASCADE;

--
-- Constraints for table `ProfessionalTaxSlab`
--
ALTER TABLE `ProfessionalTaxSlab`
  ADD CONSTRAINT `ProfessionalTaxSlab_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company` (`id`) ON UPDATE CASCADE;

--
-- Constraints for table `Project`
--
ALTER TABLE `Project`
  ADD CONSTRAINT `Project_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company` (`id`) ON UPDATE CASCADE;

--
-- Constraints for table `RefreshToken`
--
ALTER TABLE `RefreshToken`
  ADD CONSTRAINT `RefreshToken_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `RegularizationRequest`
--
ALTER TABLE `RegularizationRequest`
  ADD CONSTRAINT `RegularizationRequest_attendanceLogId_fkey` FOREIGN KEY (`attendanceLogId`) REFERENCES `AttendanceLog` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `RegularizationRequest_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `Employee` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `ReviewCycle`
--
ALTER TABLE `ReviewCycle`
  ADD CONSTRAINT `ReviewCycle_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company` (`id`) ON UPDATE CASCADE;

--
-- Constraints for table `Role`
--
ALTER TABLE `Role`
  ADD CONSTRAINT `Role_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company` (`id`) ON UPDATE CASCADE;

--
-- Constraints for table `SalaryRevision`
--
ALTER TABLE `SalaryRevision`
  ADD CONSTRAINT `SalaryRevision_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `SalaryRevision_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `Employee` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `SalaryStructure`
--
ALTER TABLE `SalaryStructure`
  ADD CONSTRAINT `SalaryStructure_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `Employee` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `Setting`
--
ALTER TABLE `Setting`
  ADD CONSTRAINT `Setting_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company` (`id`) ON UPDATE CASCADE;

--
-- Constraints for table `Shift`
--
ALTER TABLE `Shift`
  ADD CONSTRAINT `Shift_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company` (`id`) ON UPDATE CASCADE;

--
-- Constraints for table `ShiftAssignment`
--
ALTER TABLE `ShiftAssignment`
  ADD CONSTRAINT `ShiftAssignment_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `Employee` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `ShiftAssignment_shiftId_fkey` FOREIGN KEY (`shiftId`) REFERENCES `Shift` (`id`) ON UPDATE CASCADE;

--
-- Constraints for table `ShiftChangeRequest`
--
ALTER TABLE `ShiftChangeRequest`
  ADD CONSTRAINT `ShiftChangeRequest_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `ShiftChangeRequest_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `Employee` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `ShiftChangeRequest_requestedShiftId_fkey` FOREIGN KEY (`requestedShiftId`) REFERENCES `Shift` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `ShiftChangeRequest_shiftId_fkey` FOREIGN KEY (`shiftId`) REFERENCES `Shift` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `Subscription`
--
ALTER TABLE `Subscription`
  ADD CONSTRAINT `Subscription_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company` (`id`) ON UPDATE CASCADE;

--
-- Constraints for table `Task`
--
ALTER TABLE `Task`
  ADD CONSTRAINT `Task_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `Project` (`id`) ON UPDATE CASCADE;

--
-- Constraints for table `TaxDeclaration`
--
ALTER TABLE `TaxDeclaration`
  ADD CONSTRAINT `TaxDeclaration_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `TaxDeclaration_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `Employee` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `TDSSection`
--
ALTER TABLE `TDSSection`
  ADD CONSTRAINT `TDSSection_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company` (`id`) ON UPDATE CASCADE;

--
-- Constraints for table `TDSSlab`
--
ALTER TABLE `TDSSlab`
  ADD CONSTRAINT `TDSSlab_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company` (`id`) ON UPDATE CASCADE;

--
-- Constraints for table `Timesheet`
--
ALTER TABLE `Timesheet`
  ADD CONSTRAINT `Timesheet_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `Employee` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `Timesheet_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `Project` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `TravelRequest`
--
ALTER TABLE `TravelRequest`
  ADD CONSTRAINT `TravelRequest_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `Employee` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `User`
--
ALTER TABLE `User`
  ADD CONSTRAINT `User_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `User_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `Employee` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `User_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `Role` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
