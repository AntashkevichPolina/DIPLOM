
USE master;
GO

-- ПРИНУДИТЕЛЬНОЕ УДАЛЕНИЕ БАЗЫ
IF EXISTS (SELECT * FROM sys.databases WHERE name = 'AtomtechWarehouse')
BEGIN
    ALTER DATABASE AtomtechWarehouse SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    DROP DATABASE AtomtechWarehouse;
END
GO

CREATE DATABASE AtomtechWarehouse;
GO

USE AtomtechWarehouse;
GO


-- 1. УДАЛЕНИЕ ВНЕШНИХ КЛЮЧЕЙ
IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_tbl_Users_CreatedBy')
    ALTER TABLE tbl_Users DROP CONSTRAINT FK_tbl_Users_CreatedBy;
IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_tbl_Devices_CreatedBy')
    ALTER TABLE tbl_Devices DROP CONSTRAINT FK_tbl_Devices_CreatedBy;
IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_tbl_Devices_UpdatedBy')
    ALTER TABLE tbl_Devices DROP CONSTRAINT FK_tbl_Devices_UpdatedBy;
IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_tbl_PriceHistory_Device')
    ALTER TABLE tbl_PriceHistory DROP CONSTRAINT FK_tbl_PriceHistory_Device;
IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_tbl_PriceHistory_User')
    ALTER TABLE tbl_PriceHistory DROP CONSTRAINT FK_tbl_PriceHistory_User;
IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_tbl_Stock_DeviceId')
    ALTER TABLE tbl_Stock DROP CONSTRAINT FK_tbl_Stock_DeviceId;
IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_tbl_Stock_LastUpdatedBy')
    ALTER TABLE tbl_Stock DROP CONSTRAINT FK_tbl_Stock_LastUpdatedBy;
IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_tbl_StockMovements_DeviceId')
    ALTER TABLE tbl_StockMovements DROP CONSTRAINT FK_tbl_StockMovements_DeviceId;
IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_tbl_StockMovements_PerformedBy')
    ALTER TABLE tbl_StockMovements DROP CONSTRAINT FK_tbl_StockMovements_PerformedBy;
IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_tbl_DeviceImages_Device')
    ALTER TABLE tbl_DeviceImages DROP CONSTRAINT FK_tbl_DeviceImages_Device;
IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_tbl_DeviceImages_User')
    ALTER TABLE tbl_DeviceImages DROP CONSTRAINT FK_tbl_DeviceImages_User;
IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_tbl_ReplenishmentRequests_Device')
    ALTER TABLE tbl_ReplenishmentRequests DROP CONSTRAINT FK_tbl_ReplenishmentRequests_Device;
IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_tbl_ReplenishmentRequests_CreatedBy')
    ALTER TABLE tbl_ReplenishmentRequests DROP CONSTRAINT FK_tbl_ReplenishmentRequests_CreatedBy;
IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_tbl_ReplenishmentRequests_ApprovedBy')
    ALTER TABLE tbl_ReplenishmentRequests DROP CONSTRAINT FK_tbl_ReplenishmentRequests_ApprovedBy;
IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_tbl_ShipmentRequests_CreatedBy')
    ALTER TABLE tbl_ShipmentRequests DROP CONSTRAINT FK_tbl_ShipmentRequests_CreatedBy;
IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_tbl_ShipmentRequests_ProcessedBy')
    ALTER TABLE tbl_ShipmentRequests DROP CONSTRAINT FK_tbl_ShipmentRequests_ProcessedBy;
IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_tbl_ShipmentRequests_CompletedBy')
    ALTER TABLE tbl_ShipmentRequests DROP CONSTRAINT FK_tbl_ShipmentRequests_CompletedBy;
IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_tbl_ShipmentRequestItems_Request')
    ALTER TABLE tbl_ShipmentRequestItems DROP CONSTRAINT FK_tbl_ShipmentRequestItems_Request;
IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_tbl_ShipmentRequestItems_Device')
    ALTER TABLE tbl_ShipmentRequestItems DROP CONSTRAINT FK_tbl_ShipmentRequestItems_Device;
IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_tbl_Contracts_Request')
    ALTER TABLE tbl_Contracts DROP CONSTRAINT FK_tbl_Contracts_Request;
IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_tbl_Contracts_CreatedBy')
    ALTER TABLE tbl_Contracts DROP CONSTRAINT FK_tbl_Contracts_CreatedBy;
IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_tbl_Inventory_CreatedBy')
    ALTER TABLE tbl_Inventory DROP CONSTRAINT FK_tbl_Inventory_CreatedBy;
IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_tbl_Inventory_CompletedBy')
    ALTER TABLE tbl_Inventory DROP CONSTRAINT FK_tbl_Inventory_CompletedBy;
IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_tbl_InventoryItems_Inventory')
    ALTER TABLE tbl_InventoryItems DROP CONSTRAINT FK_tbl_InventoryItems_Inventory;
IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_tbl_InventoryItems_Device')
    ALTER TABLE tbl_InventoryItems DROP CONSTRAINT FK_tbl_InventoryItems_Device;
IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_tbl_ApprovalRequests_RequestedBy')
    ALTER TABLE tbl_ApprovalRequests DROP CONSTRAINT FK_tbl_ApprovalRequests_RequestedBy;
IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_tbl_ApprovalRequests_ApprovedBy')
    ALTER TABLE tbl_ApprovalRequests DROP CONSTRAINT FK_tbl_ApprovalRequests_ApprovedBy;
PRINT '✅ Внешние ключи удалены';
GO

-- 2. УДАЛЕНИЕ ТАБЛИЦ
IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[tbl_ApprovalRequests]') AND type in (N'U'))
    DROP TABLE tbl_ApprovalRequests;
IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[tbl_ShipmentRequestItems]') AND type in (N'U'))
    DROP TABLE tbl_ShipmentRequestItems;
IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[tbl_ShipmentRequests]') AND type in (N'U'))
    DROP TABLE tbl_ShipmentRequests;
IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[tbl_ReplenishmentRequests]') AND type in (N'U'))
    DROP TABLE tbl_ReplenishmentRequests;
IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[tbl_InventoryItems]') AND type in (N'U'))
    DROP TABLE tbl_InventoryItems;
IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[tbl_Inventory]') AND type in (N'U'))
    DROP TABLE tbl_Inventory;
IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[tbl_PriceHistory]') AND type in (N'U'))
    DROP TABLE tbl_PriceHistory;
IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[tbl_StockMovements]') AND type in (N'U'))
    DROP TABLE tbl_StockMovements;
IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[tbl_DeviceImages]') AND type in (N'U'))
    DROP TABLE tbl_DeviceImages;
IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[tbl_Stock]') AND type in (N'U'))
    DROP TABLE tbl_Stock;
IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[tbl_Devices]') AND type in (N'U'))
    DROP TABLE tbl_Devices;
IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[tbl_Contracts]') AND type in (N'U'))
    DROP TABLE tbl_Contracts;
IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[tbl_Users]') AND type in (N'U'))
    DROP TABLE tbl_Users;
PRINT '✅ Таблицы удалены';
GO

-- 3. УДАЛЕНИЕ ФУНКЦИЙ
IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[fn_GenerateReplenishmentNumber]') AND type in (N'FN', N'IF', N'TF'))
    DROP FUNCTION fn_GenerateReplenishmentNumber;
IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[fn_GenerateShipmentNumber]') AND type in (N'FN', N'IF', N'TF'))
    DROP FUNCTION fn_GenerateShipmentNumber;
IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[fn_GenerateContractNumber]') AND type in (N'FN', N'IF', N'TF'))
    DROP FUNCTION fn_GenerateContractNumber;
IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[fn_GenerateInventoryNumber]') AND type in (N'FN', N'IF', N'TF'))
    DROP FUNCTION fn_GenerateInventoryNumber;
IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[fn_GetAvailableQuantity]') AND type in (N'FN', N'IF', N'TF'))
    DROP FUNCTION fn_GetAvailableQuantity;
IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[fn_IsDeviceIdUnique]') AND type in (N'FN', N'IF', N'TF'))
    DROP FUNCTION fn_IsDeviceIdUnique;
IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[fn_CalculateShipmentStatus]') AND type in (N'FN', N'IF', N'TF'))
    DROP FUNCTION fn_CalculateShipmentStatus;
IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[fn_FormatDateForReport]') AND type in (N'FN', N'IF', N'TF'))
    DROP FUNCTION fn_FormatDateForReport;
IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[fn_GenerateTN2Number]') AND type in (N'FN', N'IF', N'TF'))
    DROP FUNCTION fn_GenerateTN2Number;
IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[fn_GenerateTTN1Number]') AND type in (N'FN', N'IF', N'TF'))
    DROP FUNCTION fn_GenerateTTN1Number;
PRINT '✅ Функции удалены';
GO

-- 4. УДАЛЕНИЕ ПРЕДСТАВЛЕНИЙ
IF EXISTS (SELECT * FROM sys.views WHERE name = 'vw_DeviceDetails')
    DROP VIEW vw_DeviceDetails;
IF EXISTS (SELECT * FROM sys.views WHERE name = 'vw_ReplenishmentRequests')
    DROP VIEW vw_ReplenishmentRequests;
IF EXISTS (SELECT * FROM sys.views WHERE name = 'vw_ShipmentRequests')
    DROP VIEW vw_ShipmentRequests;
IF EXISTS (SELECT * FROM sys.views WHERE name = 'vw_ContractDetails')
    DROP VIEW vw_ContractDetails;
IF EXISTS (SELECT * FROM sys.views WHERE name = 'vw_StockMovements')
    DROP VIEW vw_StockMovements;
IF EXISTS (SELECT * FROM sys.views WHERE name = 'vw_CategoryStats')
    DROP VIEW vw_CategoryStats;
IF EXISTS (SELECT * FROM sys.views WHERE name = 'vw_StockStats')
    DROP VIEW vw_StockStats;
PRINT '✅ Представления удалены';
GO

-- 5. УДАЛЕНИЕ ТРИГГЕРОВ
IF EXISTS (SELECT * FROM sys.triggers WHERE name = 'trg_Devices_UpdateTimestamp')
    DROP TRIGGER trg_Devices_UpdateTimestamp;
IF EXISTS (SELECT * FROM sys.triggers WHERE name = 'trg_Devices_PriceHistory')
    DROP TRIGGER trg_Devices_PriceHistory;
IF EXISTS (SELECT * FROM sys.triggers WHERE name = 'trg_ShipmentRequestItems_UpdateRequestStatus')
    DROP TRIGGER trg_ShipmentRequestItems_UpdateRequestStatus;
GO

-- 6. УДАЛЕНИЕ ХРАНИМЫХ ПРОЦЕДУР
IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_AuthenticateUser')
    DROP PROCEDURE sp_AuthenticateUser;
IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_GetUserPermissions')
    DROP PROCEDURE sp_GetUserPermissions;
IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_GetUsers')
    DROP PROCEDURE sp_GetUsers;
IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_CreateUser')
    DROP PROCEDURE sp_CreateUser;
IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_UpdateUser')
    DROP PROCEDURE sp_UpdateUser;
IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_ResetPassword')
    DROP PROCEDURE sp_ResetPassword;
IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_DeleteUser')
    DROP PROCEDURE sp_DeleteUser;
IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_GetDevices')
    DROP PROCEDURE sp_GetDevices;
IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_CreateDevice')
    DROP PROCEDURE sp_CreateDevice;
IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_UpdateDevice')
    DROP PROCEDURE sp_UpdateDevice;
IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_DeleteDevice')
    DROP PROCEDURE sp_DeleteDevice;
IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_GetCategories')
    DROP PROCEDURE sp_GetCategories;
IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_SearchDevices')
    DROP PROCEDURE sp_SearchDevices;
IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_GetDevicesNeedingRestock')
    DROP PROCEDURE sp_GetDevicesNeedingRestock;
IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_CreateReplenishmentRequest')
    DROP PROCEDURE sp_CreateReplenishmentRequest;
IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_GetReplenishmentRequests')
    DROP PROCEDURE sp_GetReplenishmentRequests;
IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_ApproveReplenishment')
    DROP PROCEDURE sp_ApproveReplenishment;
IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_RejectReplenishment')
    DROP PROCEDURE sp_RejectReplenishment;
IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_DeleteReplenishmentRequest')
    DROP PROCEDURE sp_DeleteReplenishmentRequest;
IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_CreateShipmentRequest')
    DROP PROCEDURE sp_CreateShipmentRequest;
IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_GetShipmentRequests')
    DROP PROCEDURE sp_GetShipmentRequests;
IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_GetShipmentRequestDetails')
    DROP PROCEDURE sp_GetShipmentRequestDetails;
IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_ProcessShipmentRequest')
    DROP PROCEDURE sp_ProcessShipmentRequest;
IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_CompleteShipmentRequest')
    DROP PROCEDURE sp_CompleteShipmentRequest;
IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_UpdateShipmentRequest')
    DROP PROCEDURE sp_UpdateShipmentRequest;
IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_DeleteShipmentRequest')
    DROP PROCEDURE sp_DeleteShipmentRequest;
IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_GetDashboardStats')
    DROP PROCEDURE sp_GetDashboardStats;
IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_GetDeviceStats')
    DROP PROCEDURE sp_GetDeviceStats;
IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_GetStockReport')
    DROP PROCEDURE sp_GetStockReport;
IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_GetOrdersReport')
    DROP PROCEDURE sp_GetOrdersReport;
IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_GetSalesReport')
    DROP PROCEDURE sp_GetSalesReport;
IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_GetPriceList')
    DROP PROCEDURE sp_GetPriceList;
IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_CreateInventory')
    DROP PROCEDURE sp_CreateInventory;
IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_GetInventories')
    DROP PROCEDURE sp_GetInventories;
IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_GetInventoryDetails')
    DROP PROCEDURE sp_GetInventoryDetails;
IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_UpdateInventoryItem')
    DROP PROCEDURE sp_UpdateInventoryItem;
IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_CompleteInventory')
    DROP PROCEDURE sp_CompleteInventory;
IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_DeleteInventory')
    DROP PROCEDURE sp_DeleteInventory;
IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_GetShipmentDocuments')
    DROP PROCEDURE sp_GetShipmentDocuments;
IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_GetReplenishmentDocuments')
    DROP PROCEDURE sp_GetReplenishmentDocuments;
IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_GetInventoryDiscrepancies')
    DROP PROCEDURE sp_GetInventoryDiscrepancies;
PRINT '✅ Хранимые процедуры удалены';
GO

-- Таблица пользователей
CREATE TABLE tbl_Users (
    id INT PRIMARY KEY IDENTITY(1,1),
    email NVARCHAR(100) UNIQUE NOT NULL,
    password_hash NVARCHAR(100) NOT NULL,
    last_name NVARCHAR(50) NOT NULL,
    first_name NVARCHAR(50) NOT NULL,
    middle_name NVARCHAR(50) NULL,
    role NVARCHAR(50) DEFAULT 'employee',
    phone NVARCHAR(13) NULL,
    created_at DATE DEFAULT CAST(GETDATE() AS DATE),
    created_by INT,
    last_login DATE NULL,
    is_active BIT DEFAULT 1,
	is_deleted BIT NOT NULL DEFAULT 0
);

CREATE TABLE tbl_Devices (
    id INT PRIMARY KEY IDENTITY(1,1),
    unique_id NVARCHAR(30) UNIQUE NOT NULL,
    name NVARCHAR(150) NOT NULL,
    category NVARCHAR(50) NULL,
    description NVARCHAR(MAX),
    manufacturer NVARCHAR(100) DEFAULT 'НПУП «АТОМТЕХ»',
    model NVARCHAR(50) NULL,
    specifications NVARCHAR(MAX),
    price DECIMAL(18,2) DEFAULT 0,
    created_by INT NULL,
    created_at DATE DEFAULT CAST(GETDATE() AS DATE),
    updated_at DATE NULL,
    updated_by INT NULL,
    status NVARCHAR(50) DEFAULT 'active',
	is_deleted BIT NOT NULL DEFAULT 0

);

CREATE TABLE tbl_PriceHistory (
    id INT PRIMARY KEY IDENTITY(1,1),
    device_id INT NOT NULL,
    old_price DECIMAL(18,2),
    new_price DECIMAL(18,2),
    changed_by INT NULL,
    changed_at DATE DEFAULT CAST(GETDATE() AS DATE)
);

CREATE TABLE tbl_Stock (
    id INT PRIMARY KEY IDENTITY(1,1),
    device_id INT UNIQUE NOT NULL,
    quantity INT DEFAULT 0,
    min_quantity INT DEFAULT 5,
    max_quantity INT,
    location NVARCHAR(50) NULL,
    shelf NVARCHAR(50) NULL,
    notes NVARCHAR(500),
    last_updated DATE DEFAULT CAST(GETDATE() AS DATE),
    last_updated_by INT NULL
);

CREATE TABLE tbl_StockMovements (
    id INT PRIMARY KEY IDENTITY(1,1),
    device_id INT NOT NULL,
    movement_type NVARCHAR(50) NOT NULL,
    quantity_change INT NOT NULL,
    previous_quantity INT,
    new_quantity INT,
    movement_date DATE DEFAULT CAST(GETDATE() AS DATE),
    performed_by INT NULL,
    notes NVARCHAR(500),
    request_id INT NULL,
    request_type NVARCHAR(50) NULL,
    supplier_name NVARCHAR(100) NULL,
    document_number NVARCHAR(100)
);

CREATE TABLE tbl_DeviceImages (
    id INT PRIMARY KEY IDENTITY(1,1),
    device_id INT NOT NULL,
    image_data VARBINARY(MAX) NULL,
    pdf_data VARBINARY(MAX) NULL,
    image_thumbnail VARBINARY(MAX),
    image_name NVARCHAR(100) NULL,
    image_type NVARCHAR(50) DEFAULT 'gallery',
    file_extension NVARCHAR(5) NULL,
    description NVARCHAR(500),
    sort_order INT DEFAULT 0,
    uploaded_by INT NULL,
    uploaded_at DATE DEFAULT CAST(GETDATE() AS DATE),
    is_active BIT DEFAULT 1
);

CREATE TABLE tbl_ReplenishmentRequests (
    id INT PRIMARY KEY IDENTITY(1,1),
    request_number NVARCHAR(50) UNIQUE NOT NULL,
    device_id INT NOT NULL,
    quantity_requested INT NOT NULL,
    reason NVARCHAR(500),
    status NVARCHAR(50) DEFAULT 'pending',
    created_by INT NULL,
    created_at DATE DEFAULT CAST(GETDATE() AS DATE),
    approved_by INT NULL,
    approved_at DATE NULL,
    completed_at DATE NULL,
    notes NVARCHAR(MAX),
    is_hidden_from_employee BIT DEFAULT 0,
    fulfilled_quantity INT DEFAULT 0,
    remaining_quantity INT DEFAULT 0,
    last_fulfilled_at DATE NULL
);

CREATE TABLE tbl_ShipmentRequests (
    id INT PRIMARY KEY IDENTITY(1,1),
    request_number NVARCHAR(50) UNIQUE NOT NULL,
    
    -- Данные клиента
    customer_name NVARCHAR(150) NOT NULL,
    customer_contact NVARCHAR(100) NULL,
    customer_address NVARCHAR(200) NULL,
    customer_unp NVARCHAR(20) NULL,
    customer_phone NVARCHAR(20) NULL,
    customer_director NVARCHAR(255) NULL,
    
    -- Данные заявки
    required_date DATE NULL,
    status NVARCHAR(50) DEFAULT 'new',
    contract_number NVARCHAR(50) NULL,
    contract_data NVARCHAR(MAX) NULL,
    notes NVARCHAR(MAX) NULL,
    
    -- Данные автомобиля (для ТТН-1)
    need_vehicle BIT DEFAULT 1,
    vehicle_number NVARCHAR(50) NULL,
    trailer_number NVARCHAR(50) NULL,
    waybill_number_ttn NVARCHAR(50) NULL,
    
    -- Данные водителя (раздельно)
    driver_last_name NVARCHAR(50) NULL,
    driver_first_name NVARCHAR(50) NULL,
    driver_middle_name NVARCHAR(50) NULL,
    driver_license NVARCHAR(50) NULL,
    
    shipping_date DATE NULL,
    power_of_attorney NVARCHAR(100) NULL,
    
    -- Сформированные документы
    waybill_number NVARCHAR(50) NULL,
    ttn_number NVARCHAR(50) NULL,
    
    -- НОМЕР И СЕРИЯ ТИПОГРАФСКОГО БЛАНКА
    document_series NVARCHAR(2) NULL,        
    document_number_blank NVARCHAR(7) NULL,  
    
    -- Кто создал и обработал
    created_by INT NULL,
    created_at DATE DEFAULT CAST(GETDATE() AS DATE),
    processed_by INT NULL,
    processed_at DATE NULL,
    completed_by INT NULL,
    completed_at DATE NULL,
    assigned_to INT NULL
);
GO
-- Добавляем комментарии к новым полям (для документации)
IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('tbl_ShipmentRequests') AND name = 'trailer_number')
    EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'Номер прицепа (госномер)', @level0type = N'SCHEMA', @level0name = N'dbo', @level1type = N'TABLE', @level1name = N'tbl_ShipmentRequests', @level2type = N'COLUMN', @level2name = N'trailer_number';

IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('tbl_ShipmentRequests') AND name = 'waybill_number_ttn')
    EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'Номер путевого листа для ТТН-1', @level0type = N'SCHEMA', @level0name = N'dbo', @level1type = N'TABLE', @level1name = N'tbl_ShipmentRequests', @level2type = N'COLUMN', @level2name = N'waybill_number_ttn';

IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('tbl_ShipmentRequests') AND name = 'power_of_attorney')
    EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'Доверенность (номер, дата)', @level0type = N'SCHEMA', @level0name = N'dbo', @level1type = N'TABLE', @level1name = N'tbl_ShipmentRequests', @level2type = N'COLUMN', @level2name = N'power_of_attorney';

-- Таблица для позиций заявки на отгрузку
CREATE TABLE tbl_ShipmentRequestItems (
    id INT PRIMARY KEY IDENTITY(1,1),
    request_id INT NOT NULL,
    device_id INT NOT NULL,
    quantity_requested INT NOT NULL,
    quantity_shipped INT DEFAULT 0,
    price_per_unit DECIMAL(18,2),
    status NVARCHAR(50) DEFAULT 'pending',
    notes NVARCHAR(500)
);
PRINT '✅ Таблица tbl_ShipmentRequestItems создана';
CREATE TABLE tbl_Contracts (
    id INT PRIMARY KEY IDENTITY(1,1),
    contract_number NVARCHAR(50) UNIQUE NOT NULL,
    request_id INT NOT NULL,
    contract_date DATE DEFAULT CAST(GETDATE() AS DATE),
    valid_until DATE,
    status NVARCHAR(50) DEFAULT 'active',
    contract_data NVARCHAR(MAX),
    pdf_data VARBINARY(MAX),
    created_by INT NULL,
    created_at DATE DEFAULT CAST(GETDATE() AS DATE),
    updated_at DATE NULL,
    signed_by_customer BIT DEFAULT 0,
    signed_by_manager BIT DEFAULT 0,
    signed_at DATE NULL,
    notes NVARCHAR(MAX),
    seller_legal_address NVARCHAR(500) NULL,
    seller_bank_account NVARCHAR(50) NULL,
    seller_bank_name NVARCHAR(255) NULL,
    seller_bank_code NVARCHAR(20) NULL,
    buyer_legal_address NVARCHAR(500) NULL,
    buyer_bank_account NVARCHAR(50) NULL,
    buyer_bank_name NVARCHAR(255) NULL,
    buyer_bank_code NVARCHAR(20) NULL
);

CREATE TABLE tbl_Inventory (
    id INT PRIMARY KEY IDENTITY(1,1),
    inventory_number NVARCHAR(50) UNIQUE NOT NULL,
    inventory_date DATE NOT NULL,
    status NVARCHAR(50) DEFAULT 'draft',
    notes NVARCHAR(MAX),
    created_by INT NULL,
    created_at DATE DEFAULT CAST(GETDATE() AS DATE),
    completed_at DATE NULL,
    completed_by INT NULL,
    order_number NVARCHAR(50) NULL,
    order_date DATE NULL,
    commission_chairman NVARCHAR(255) NULL,
    commission_members NVARCHAR(MAX) NULL,
    inventory_start_date DATE NULL,
    inventory_end_date DATE NULL,
    responsible_person NVARCHAR(255) NULL
);


-- Таблица для позиций инвентаризации
CREATE TABLE tbl_InventoryItems (
    id INT PRIMARY KEY IDENTITY(1,1),
    inventory_id INT NOT NULL,
    device_id INT NOT NULL,
    book_quantity INT NOT NULL,
    actual_quantity INT NOT NULL,
    difference AS (actual_quantity - book_quantity) PERSISTED,
    notes NVARCHAR(500)
);

PRINT '✅ Таблица tbl_InventoryItems создана';



IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[tbl_Notifications]') AND type in (N'U'))
BEGIN
CREATE TABLE tbl_Notifications (
    id INT PRIMARY KEY IDENTITY(1,1),
    user_id INT NOT NULL,
    type NVARCHAR(50) NOT NULL,
    title NVARCHAR(100) NOT NULL,        
    message NVARCHAR(MAX) NOT NULL,
    link NVARCHAR(200) NULL,             
    is_read BIT DEFAULT 0,
    created_at DATE DEFAULT CAST(GETDATE() AS DATE), 
    read_at DATE NULL                   
);
END

IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[tbl_RackPlacement]') AND type in (N'U'))
BEGIN
    CREATE TABLE tbl_RackPlacement (
    id INT PRIMARY KEY IDENTITY(1,1),
    rack_name NVARCHAR(50) NOT NULL,      -- A1, B2 и т.д.
    cell_level INT NOT NULL,               -- уровень (1-3)
    cell_column INT NOT NULL,              -- колонка (1-3)
    device_id INT NOT NULL,                -- ID прибора
    quantity INT NOT NULL DEFAULT 0,       -- количество в этой ячейке
    max_quantity INT NOT NULL DEFAULT 10,  -- максимальное количество (10)
    placed_at DATE DEFAULT CAST(GETDATE() AS DATE),
    last_updated DATE DEFAULT CAST(GETDATE() AS DATE),
    updated_by INT NULL,
    CONSTRAINT FK_RackPlacement_Device FOREIGN KEY (device_id) REFERENCES tbl_Devices(id) ON DELETE CASCADE,
    CONSTRAINT FK_RackPlacement_User FOREIGN KEY (updated_by) REFERENCES tbl_Users(id),
    CONSTRAINT CHK_RackPlacement_Quantity CHECK (quantity >= 0 AND quantity <= 10),
    CONSTRAINT CHK_RackPlacement_Level CHECK (cell_level BETWEEN 1 AND 3),
    CONSTRAINT CHK_RackPlacement_Column CHECK (cell_column BETWEEN 1 AND 3)
);
END
ELSE
BEGIN
    PRINT 'ℹ️ Таблица tbl_RackPlacement уже существует';
END
GO


IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[tbl_PlacementHistory]') AND type in (N'U'))
BEGIN
   CREATE TABLE tbl_PlacementHistory (
    id INT PRIMARY KEY IDENTITY(1,1),
    device_id INT NOT NULL,
    device_name NVARCHAR(150) NOT NULL,
    action_type NVARCHAR(50) NOT NULL,    -- 'placed', 'removed', 'moved', 'stock_in', 'stock_out'
    rack_name NVARCHAR(50),
    cell_level INT,
    cell_column INT,
    quantity_change INT NOT NULL,
    new_quantity INT NOT NULL,
    notes NVARCHAR(500),
    performed_by INT NULL,
    performed_at DATE DEFAULT CAST(GETDATE() AS DATE),
    CONSTRAINT FK_PlacementHistory_Device FOREIGN KEY (device_id) REFERENCES tbl_Devices(id) ON DELETE CASCADE,
    CONSTRAINT FK_PlacementHistory_User FOREIGN KEY (performed_by) REFERENCES tbl_Users(id),
    CONSTRAINT CHK_PlacementHistory_ActionType CHECK (action_type IN ('placed', 'removed', 'moved', 'stock_in', 'stock_out')),
    CONSTRAINT CHK_PlacementHistory_QuantityChange CHECK (quantity_change != 0)
);
    PRINT '✅ Таблица tbl_PlacementHistory создана';
END
ELSE
BEGIN
    PRINT 'ℹ️ Таблица tbl_PlacementHistory уже существует';
END
GO



-- 1. Связи с tbl_Users
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_tbl_Users_CreatedBy')
    ALTER TABLE tbl_Users ADD CONSTRAINT FK_tbl_Users_CreatedBy FOREIGN KEY (created_by) REFERENCES tbl_Users(id);
PRINT '  ✅ FK_tbl_Users_CreatedBy добавлен';

IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_tbl_Devices_CreatedBy')
    ALTER TABLE tbl_Devices ADD CONSTRAINT FK_tbl_Devices_CreatedBy FOREIGN KEY (created_by) REFERENCES tbl_Users(id);
PRINT '  ✅ FK_tbl_Devices_CreatedBy добавлен';

IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_tbl_Devices_UpdatedBy')
    ALTER TABLE tbl_Devices ADD CONSTRAINT FK_tbl_Devices_UpdatedBy FOREIGN KEY (updated_by) REFERENCES tbl_Users(id);
PRINT '  ✅ FK_tbl_Devices_UpdatedBy добавлен';

-- Дополнительные ограничения для tbl_Users
IF NOT EXISTS (SELECT * FROM sys.check_constraints WHERE name = 'CHK_Email_Length')
    ALTER TABLE tbl_Users ADD CONSTRAINT CHK_Email_Length CHECK (LEN(email) <= 100);
IF NOT EXISTS (SELECT * FROM sys.check_constraints WHERE name = 'CHK_LastName_Length')
    ALTER TABLE tbl_Users ADD CONSTRAINT CHK_LastName_Length CHECK (LEN(last_name) <= 50);
IF NOT EXISTS (SELECT * FROM sys.check_constraints WHERE name = 'CHK_FirstName_Length')
    ALTER TABLE tbl_Users ADD CONSTRAINT CHK_FirstName_Length CHECK (LEN(first_name) <= 50);
IF NOT EXISTS (SELECT * FROM sys.check_constraints WHERE name = 'CHK_MiddleName_Length')
    ALTER TABLE tbl_Users ADD CONSTRAINT CHK_MiddleName_Length CHECK (LEN(middle_name) <= 50);
IF NOT EXISTS (SELECT * FROM sys.check_constraints WHERE name = 'CHK_Password_Length')
    ALTER TABLE tbl_Users ADD CONSTRAINT CHK_Password_Length CHECK (LEN(password_hash) <= 100);

-- 2. Связи с tbl_PriceHistory
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_tbl_PriceHistory_Device')
    ALTER TABLE tbl_PriceHistory ADD CONSTRAINT FK_tbl_PriceHistory_Device FOREIGN KEY (device_id) REFERENCES tbl_Devices(id);
PRINT '  ✅ FK_tbl_PriceHistory_Device добавлен';

IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_tbl_PriceHistory_User')
    ALTER TABLE tbl_PriceHistory ADD CONSTRAINT FK_tbl_PriceHistory_User FOREIGN KEY (changed_by) REFERENCES tbl_Users(id);
PRINT '  ✅ FK_tbl_PriceHistory_User добавлен';

-- 3. Связи с tbl_Stock
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_tbl_Stock_DeviceId')
    ALTER TABLE tbl_Stock ADD CONSTRAINT FK_tbl_Stock_DeviceId FOREIGN KEY (device_id) REFERENCES tbl_Devices(id) ON DELETE CASCADE;
PRINT '  ✅ FK_tbl_Stock_DeviceId добавлен';

IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_tbl_Stock_LastUpdatedBy')
    ALTER TABLE tbl_Stock ADD CONSTRAINT FK_tbl_Stock_LastUpdatedBy FOREIGN KEY (last_updated_by) REFERENCES tbl_Users(id);
PRINT '  ✅ FK_tbl_Stock_LastUpdatedBy добавлен';

-- 4. Связи с tbl_StockMovements
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_tbl_StockMovements_DeviceId')
    ALTER TABLE tbl_StockMovements ADD CONSTRAINT FK_tbl_StockMovements_DeviceId FOREIGN KEY (device_id) REFERENCES tbl_Devices(id);
PRINT '  ✅ FK_tbl_StockMovements_DeviceId добавлен';

IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_tbl_StockMovements_PerformedBy')
    ALTER TABLE tbl_StockMovements ADD CONSTRAINT FK_tbl_StockMovements_PerformedBy FOREIGN KEY (performed_by) REFERENCES tbl_Users(id);
PRINT '  ✅ FK_tbl_StockMovements_PerformedBy добавлен';

-- 5. Связи с tbl_DeviceImages
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_tbl_DeviceImages_Device')
    ALTER TABLE tbl_DeviceImages ADD CONSTRAINT FK_tbl_DeviceImages_Device FOREIGN KEY (device_id) REFERENCES tbl_Devices(id) ON DELETE CASCADE;
PRINT '  ✅ FK_tbl_DeviceImages_Device добавлен';

IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_tbl_DeviceImages_User')
    ALTER TABLE tbl_DeviceImages ADD CONSTRAINT FK_tbl_DeviceImages_User FOREIGN KEY (uploaded_by) REFERENCES tbl_Users(id);
PRINT '  ✅ FK_tbl_DeviceImages_User добавлен';

-- 6. Связи с tbl_ReplenishmentRequests
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_tbl_ReplenishmentRequests_Device')
    ALTER TABLE tbl_ReplenishmentRequests ADD CONSTRAINT FK_tbl_ReplenishmentRequests_Device FOREIGN KEY (device_id) REFERENCES tbl_Devices(id);
PRINT '  ✅ FK_tbl_ReplenishmentRequests_Device добавлен';

IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_tbl_ReplenishmentRequests_CreatedBy')
    ALTER TABLE tbl_ReplenishmentRequests ADD CONSTRAINT FK_tbl_ReplenishmentRequests_CreatedBy FOREIGN KEY (created_by) REFERENCES tbl_Users(id);
PRINT '  ✅ FK_tbl_ReplenishmentRequests_CreatedBy добавлен';

IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_tbl_ReplenishmentRequests_ApprovedBy')
    ALTER TABLE tbl_ReplenishmentRequests ADD CONSTRAINT FK_tbl_ReplenishmentRequests_ApprovedBy FOREIGN KEY (approved_by) REFERENCES tbl_Users(id);
PRINT '  ✅ FK_tbl_ReplenishmentRequests_ApprovedBy добавлен';

-- 7. Связи с tbl_ShipmentRequests
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_tbl_ShipmentRequests_CreatedBy')
    ALTER TABLE tbl_ShipmentRequests ADD CONSTRAINT FK_tbl_ShipmentRequests_CreatedBy FOREIGN KEY (created_by) REFERENCES tbl_Users(id);
PRINT '  ✅ FK_tbl_ShipmentRequests_CreatedBy добавлен';

IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_tbl_ShipmentRequests_ProcessedBy')
    ALTER TABLE tbl_ShipmentRequests ADD CONSTRAINT FK_tbl_ShipmentRequests_ProcessedBy FOREIGN KEY (processed_by) REFERENCES tbl_Users(id);
PRINT '  ✅ FK_tbl_ShipmentRequests_ProcessedBy добавлен';

IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_tbl_ShipmentRequests_CompletedBy')
    ALTER TABLE tbl_ShipmentRequests ADD CONSTRAINT FK_tbl_ShipmentRequests_CompletedBy FOREIGN KEY (completed_by) REFERENCES tbl_Users(id);
PRINT '  ✅ FK_tbl_ShipmentRequests_CompletedBy добавлен';

-- tbl_ReplenishmentRequests
-- Сначала удаляем старое ограничение, если оно существует
IF EXISTS (SELECT * FROM sys.check_constraints WHERE name = 'CHK_ReplenishmentStatus')
    ALTER TABLE tbl_ReplenishmentRequests DROP CONSTRAINT CHK_ReplenishmentStatus;

-- Создаем новое с правильными статусами
ALTER TABLE tbl_ReplenishmentRequests ADD CONSTRAINT CHK_ReplenishmentStatus 
    CHECK (status IN ('pending', 'processing', 'completed', 'rejected'));
PRINT '  ✅ CHK_ReplenishmentStatus добавлен';



-- Добавляем проверку, что остаток не может быть отрицательным
ALTER TABLE tbl_ReplenishmentRequests ADD CONSTRAINT CHK_RemainingQuantity CHECK (remaining_quantity >= 0);
PRINT '  ✅ CHK_RemainingQuantity добавлен';

-- 8. Связи с tbl_ShipmentRequestItems
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_tbl_ShipmentRequestItems_Request')
    ALTER TABLE tbl_ShipmentRequestItems ADD CONSTRAINT FK_tbl_ShipmentRequestItems_Request FOREIGN KEY (request_id) REFERENCES tbl_ShipmentRequests(id) ON DELETE CASCADE;
PRINT '  ✅ FK_tbl_ShipmentRequestItems_Request добавлен';

IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_tbl_ShipmentRequestItems_Device')
    ALTER TABLE tbl_ShipmentRequestItems ADD CONSTRAINT FK_tbl_ShipmentRequestItems_Device FOREIGN KEY (device_id) REFERENCES tbl_Devices(id);
PRINT '  ✅ FK_tbl_ShipmentRequestItems_Device добавлен';

-- 9. Связи с tbl_Contracts
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_tbl_Contracts_Request')
    ALTER TABLE tbl_Contracts ADD CONSTRAINT FK_tbl_Contracts_Request FOREIGN KEY (request_id) REFERENCES tbl_ShipmentRequests(id);
PRINT '  ✅ FK_tbl_Contracts_Request добавлен';

IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_tbl_Contracts_CreatedBy')
    ALTER TABLE tbl_Contracts ADD CONSTRAINT FK_tbl_Contracts_CreatedBy FOREIGN KEY (created_by) REFERENCES tbl_Users(id);
PRINT '  ✅ FK_tbl_Contracts_CreatedBy добавлен';

-- 10. Связи с tbl_Inventory
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_tbl_Inventory_CreatedBy')
    ALTER TABLE tbl_Inventory ADD CONSTRAINT FK_tbl_Inventory_CreatedBy FOREIGN KEY (created_by) REFERENCES tbl_Users(id);
PRINT '  ✅ FK_tbl_Inventory_CreatedBy добавлен';

IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_tbl_Inventory_CompletedBy')
    ALTER TABLE tbl_Inventory ADD CONSTRAINT FK_tbl_Inventory_CompletedBy FOREIGN KEY (completed_by) REFERENCES tbl_Users(id);
PRINT '  ✅ FK_tbl_Inventory_CompletedBy добавлен';

-- 11. Связи с tbl_InventoryItems
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_tbl_InventoryItems_Inventory')
    ALTER TABLE tbl_InventoryItems ADD CONSTRAINT FK_tbl_InventoryItems_Inventory FOREIGN KEY (inventory_id) REFERENCES tbl_Inventory(id) ON DELETE CASCADE;
PRINT '  ✅ FK_tbl_InventoryItems_Inventory добавлен';

IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_tbl_InventoryItems_Device')
    ALTER TABLE tbl_InventoryItems ADD CONSTRAINT FK_tbl_InventoryItems_Device FOREIGN KEY (device_id) REFERENCES tbl_Devices(id);
PRINT '  ✅ FK_tbl_InventoryItems_Device добавлен';

-- НОВЫЙ ВНЕШНИЙ КЛЮЧ ДЛЯ assigned_to
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_tbl_ShipmentRequests_AssignedTo')
    ALTER TABLE tbl_ShipmentRequests ADD CONSTRAINT FK_tbl_ShipmentRequests_AssignedTo FOREIGN KEY (assigned_to) REFERENCES tbl_Users(id);
PRINT '  ✅ FK_tbl_ShipmentRequests_AssignedTo добавлен';

IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_tbl_Notifications_User')
BEGIN
    ALTER TABLE tbl_Notifications 
    ADD CONSTRAINT FK_tbl_Notifications_User 
    FOREIGN KEY (user_id) REFERENCES tbl_Users(id) ON DELETE CASCADE;
    PRINT '✅ FK_tbl_Notifications_User добавлен';
END
GO

PRINT '✅ Все внешние ключи добавлены';
GO



-- tbl_Users
IF NOT EXISTS (SELECT * FROM sys.check_constraints WHERE name = 'CHK_UserRole')
    ALTER TABLE tbl_Users ADD CONSTRAINT CHK_UserRole CHECK (role IN ('admin', 'manager', 'employee'));
PRINT '  ✅ CHK_UserRole добавлен';

-- tbl_Devices
IF NOT EXISTS (SELECT * FROM sys.check_constraints WHERE name = 'CHK_DeviceStatus')
    ALTER TABLE tbl_Devices ADD CONSTRAINT CHK_DeviceStatus CHECK (status IN ('active', 'archived'));
PRINT '  ✅ CHK_DeviceStatus добавлен';

IF NOT EXISTS (SELECT * FROM sys.check_constraints WHERE name = 'CHK_PricePositive')
    ALTER TABLE tbl_Devices ADD CONSTRAINT CHK_PricePositive CHECK (price >= 0);
PRINT '  ✅ CHK_PricePositive добавлен';

-- tbl_Stock
IF NOT EXISTS (SELECT * FROM sys.check_constraints WHERE name = 'CHK_StockQuantity')
    ALTER TABLE tbl_Stock ADD CONSTRAINT CHK_StockQuantity CHECK (quantity >= 0);
PRINT '  ✅ CHK_StockQuantity добавлен';

IF NOT EXISTS (SELECT * FROM sys.check_constraints WHERE name = 'CHK_MinQuantity')
    ALTER TABLE tbl_Stock ADD CONSTRAINT CHK_MinQuantity CHECK (min_quantity >= 0);
PRINT '  ✅ CHK_MinQuantity добавлен';

-- tbl_DeviceImages
IF NOT EXISTS (SELECT * FROM sys.check_constraints WHERE name = 'CHK_ImageType')
    ALTER TABLE tbl_DeviceImages ADD CONSTRAINT CHK_ImageType CHECK (image_type IN ('main', 'gallery', 'prospect', 'prospect_pdf'));
PRINT '  ✅ CHK_ImageType добавлен';



IF NOT EXISTS (SELECT * FROM sys.check_constraints WHERE name = 'CHK_QuantityRequested')
    ALTER TABLE tbl_ReplenishmentRequests ADD CONSTRAINT CHK_QuantityRequested CHECK (quantity_requested > 0);
PRINT '  ✅ CHK_QuantityRequested добавлен';

-- tbl_ShipmentRequests
IF NOT EXISTS (SELECT * FROM sys.check_constraints WHERE name = 'CHK_ShipmentStatus')
    ALTER TABLE tbl_ShipmentRequests ADD CONSTRAINT CHK_ShipmentStatus CHECK (status IN ('new', 'processing', 'partial', 'shipped', 'completed', 'cancelled'));
PRINT '  ✅ CHK_ShipmentStatus добавлен';

IF NOT EXISTS (SELECT * FROM sys.check_constraints WHERE name = 'CHK_CustomerUnp')
    ALTER TABLE tbl_ShipmentRequests ADD CONSTRAINT CHK_CustomerUnp CHECK (customer_unp IS NULL OR LEN(customer_unp) = 9);
PRINT '  ✅ CHK_CustomerUnp добавлен';

-- tbl_ShipmentRequestItems
IF NOT EXISTS (SELECT * FROM sys.check_constraints WHERE name = 'CHK_ShipmentItemStatus')
    ALTER TABLE tbl_ShipmentRequestItems ADD CONSTRAINT CHK_ShipmentItemStatus CHECK (status IN ('pending', 'partial', 'shipped', 'cancelled'));
PRINT '  ✅ CHK_ShipmentItemStatus добавлен';

IF NOT EXISTS (SELECT * FROM sys.check_constraints WHERE name = 'CHK_ItemQuantity')
    ALTER TABLE tbl_ShipmentRequestItems ADD CONSTRAINT CHK_ItemQuantity CHECK (quantity_requested > 0);
PRINT '  ✅ CHK_ItemQuantity добавлен';

IF NOT EXISTS (SELECT * FROM sys.check_constraints WHERE name = 'CHK_QuantityShipped')
    ALTER TABLE tbl_ShipmentRequestItems ADD CONSTRAINT CHK_QuantityShipped CHECK (quantity_shipped >= 0);
PRINT '  ✅ CHK_QuantityShipped добавлен';

IF NOT EXISTS (SELECT * FROM sys.check_constraints WHERE name = 'CHK_Price')
    ALTER TABLE tbl_ShipmentRequestItems ADD CONSTRAINT CHK_Price CHECK (price_per_unit >= 0);
PRINT '  ✅ CHK_Price добавлен';

-- tbl_Contracts
IF NOT EXISTS (SELECT * FROM sys.check_constraints WHERE name = 'CHK_ContractStatus')
    ALTER TABLE tbl_Contracts ADD CONSTRAINT CHK_ContractStatus CHECK (status IN ('draft', 'active', 'completed', 'cancelled'));
PRINT '  ✅ CHK_ContractStatus добавлен';

-- tbl_Inventory
IF NOT EXISTS (SELECT * FROM sys.check_constraints WHERE name = 'CHK_InventoryStatus')
    ALTER TABLE tbl_Inventory ADD CONSTRAINT CHK_InventoryStatus CHECK (status IN ('draft', 'in_progress', 'completed'));
PRINT '  ✅ CHK_InventoryStatus добавлен';

-- tbl_InventoryItems
IF NOT EXISTS (SELECT * FROM sys.check_constraints WHERE name = 'CHK_ActualQuantity')
    ALTER TABLE tbl_InventoryItems ADD CONSTRAINT CHK_ActualQuantity CHECK (actual_quantity >= 0);
PRINT '  ✅ CHK_ActualQuantity добавлен';



PRINT '✅ Все CHECK-ограничения добавлены';
GO


IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_tbl_Notifications_UserId')
    CREATE INDEX IX_tbl_Notifications_UserId ON tbl_Notifications(user_id);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_tbl_Notifications_IsRead')
    CREATE INDEX IX_tbl_Notifications_IsRead ON tbl_Notifications(is_read);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_tbl_Notifications_CreatedAt')
    CREATE INDEX IX_tbl_Notifications_CreatedAt ON tbl_Notifications(created_at);
PRINT '✅ Индексы для уведомлений созданы';
GO

-- Индекс для tbl_RackPlacement
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_RackPlacement_Device' AND object_id = OBJECT_ID('tbl_RackPlacement'))
BEGIN
    CREATE INDEX IX_RackPlacement_Device ON tbl_RackPlacement(device_id);
    PRINT '✅ Индекс IX_RackPlacement_Device создан';
END

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_RackPlacement_Rack' AND object_id = OBJECT_ID('tbl_RackPlacement'))
BEGIN
    CREATE INDEX IX_RackPlacement_Rack ON tbl_RackPlacement(rack_name);
    PRINT '✅ Индекс IX_RackPlacement_Rack создан';
END

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_RackPlacement_Location' AND object_id = OBJECT_ID('tbl_RackPlacement'))
BEGIN
    CREATE INDEX IX_RackPlacement_Location ON tbl_RackPlacement(rack_name, cell_level, cell_column);
    PRINT '✅ Индекс IX_RackPlacement_Location создан';
END

-- Индексы для tbl_PlacementHistory
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_PlacementHistory_Device' AND object_id = OBJECT_ID('tbl_PlacementHistory'))
BEGIN
    CREATE INDEX IX_PlacementHistory_Device ON tbl_PlacementHistory(device_id);
    PRINT '✅ Индекс IX_PlacementHistory_Device создан';
END

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_PlacementHistory_Date' AND object_id = OBJECT_ID('tbl_PlacementHistory'))
BEGIN
    CREATE INDEX IX_PlacementHistory_Date ON tbl_PlacementHistory(performed_at DESC);
    PRINT '✅ Индекс IX_PlacementHistory_Date создан';
END

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_PlacementHistory_Action' AND object_id = OBJECT_ID('tbl_PlacementHistory'))
BEGIN
    CREATE INDEX IX_PlacementHistory_Action ON tbl_PlacementHistory(action_type);
    PRINT '✅ Индекс IX_PlacementHistory_Action создан';
END
GO


-- Функция для генерации номера заявки на пополнение
CREATE OR ALTER FUNCTION fn_GenerateReplenishmentNumber()
RETURNS NVARCHAR(50)
AS
BEGIN
    DECLARE @Number NVARCHAR(50);
    DECLARE @DateStr NVARCHAR(8) = CONVERT(NVARCHAR(8), GETDATE(), 112); -- ГГГГММДД
    DECLARE @Seq INT;
    
    SELECT @Seq = ISNULL(MAX(CAST(RIGHT(request_number, 4) AS INT)), 0) + 1
    FROM tbl_ReplenishmentRequests
    WHERE request_number LIKE 'ЗП-' + @DateStr + '%';
    
    SET @Number = 'ЗП-' + @DateStr + '-' + RIGHT('0000' + CAST(ISNULL(@Seq, 1) AS NVARCHAR), 4);
    
    RETURN @Number;
END
GO

-- Функция для генерации номера заявки на отгрузку
CREATE OR ALTER FUNCTION fn_GenerateShipmentNumber()
RETURNS NVARCHAR(50)
AS
BEGIN
    DECLARE @Number NVARCHAR(50);
    DECLARE @DateStr NVARCHAR(8) = CONVERT(NVARCHAR(8), GETDATE(), 112); -- ГГГГММДД
    DECLARE @Seq INT;
    
    SELECT @Seq = ISNULL(MAX(CAST(RIGHT(request_number, 4) AS INT)), 0) + 1
    FROM tbl_ShipmentRequests
    WHERE request_number LIKE 'ОС-' + @DateStr + '%';
    
    SET @Number = 'ОС-' + @DateStr + '-' + RIGHT('0000' + CAST(ISNULL(@Seq, 1) AS NVARCHAR), 4);
    
    RETURN @Number;
END
GO

-- Функция для генерации номера договора
CREATE FUNCTION fn_GenerateContractNumber()
RETURNS NVARCHAR(50)
AS
BEGIN
    DECLARE @Number NVARCHAR(50);
    DECLARE @Year INT = YEAR(GETDATE());
    DECLARE @Seq INT;
    
    SELECT @Seq = ISNULL(MAX(CAST(RIGHT(contract_number, 4) AS INT)), 0) + 1
    FROM tbl_Contracts
    WHERE contract_number LIKE 'ДОГ-' + CAST(@Year AS NVARCHAR) + '%';
    
    SET @Number = 'ДОГ-' + CAST(@Year AS NVARCHAR) + '-' +
                  RIGHT('0000' + CAST(ISNULL(@Seq, 1) AS NVARCHAR), 4);
    
    RETURN @Number;
END
GO

-- Функция для генерации номера инвентаризации
CREATE FUNCTION fn_GenerateInventoryNumber()
RETURNS NVARCHAR(50)
AS
BEGIN
    DECLARE @Number NVARCHAR(50);
    DECLARE @Year INT = YEAR(GETDATE());
    DECLARE @Seq INT;
    
    SELECT @Seq = ISNULL(MAX(CAST(RIGHT(inventory_number, 4) AS INT)), 0) + 1
    FROM tbl_Inventory
    WHERE inventory_number LIKE 'INV-' + CAST(@Year AS NVARCHAR) + '%';
    
    IF @Seq IS NULL SET @Seq = 1;
    
    SET @Number = 'INV-' + CAST(@Year AS NVARCHAR) + '-' +
                  RIGHT('0000' + CAST(@Seq AS NVARCHAR), 4);
    
    RETURN @Number;
END
GO

-- Функция расчета доступного количества
CREATE FUNCTION fn_GetAvailableQuantity(@DeviceId INT)
RETURNS INT
AS
BEGIN
    DECLARE @Quantity INT;
    
    SELECT @Quantity = ISNULL(quantity, 0)
    FROM tbl_Stock
    WHERE device_id = @DeviceId;
    
    RETURN @Quantity;
END
GO

-- Функция проверки уникальности ID прибора
CREATE FUNCTION fn_IsDeviceIdUnique(@UniqueId NVARCHAR(100), @DeviceId INT = NULL)
RETURNS BIT
AS
BEGIN
    DECLARE @Result BIT = 1;
    
    IF EXISTS (
        SELECT 1 FROM tbl_Devices 
        WHERE unique_id = @UniqueId 
            AND status = 'active'
            AND (@DeviceId IS NULL OR id != @DeviceId)
    )
        SET @Result = 0;
    
    RETURN @Result;
END
GO

-- Функция расчета статуса заявки на отгрузку
CREATE FUNCTION fn_CalculateShipmentStatus(@RequestId INT)
RETURNS NVARCHAR(50)
AS
BEGIN
    DECLARE @Status NVARCHAR(50);
    DECLARE @TotalRequested INT;
    DECLARE @TotalShipped INT;
    
    SELECT 
        @TotalRequested = ISNULL(SUM(quantity_requested), 0),
        @TotalShipped = ISNULL(SUM(quantity_shipped), 0)
    FROM tbl_ShipmentRequestItems
    WHERE request_id = @RequestId;
    
    IF @TotalShipped = 0 AND @TotalRequested > 0
        SET @Status = 'new';
    ELSE IF @TotalShipped > 0 AND @TotalShipped < @TotalRequested
        SET @Status = 'partial';
    ELSE IF @TotalShipped = @TotalRequested AND @TotalRequested > 0
        SET @Status = 'shipped';
    ELSE
        SET @Status = 'processing';
    
    RETURN @Status;
END
GO

-- Функция форматирования даты для отчетов
CREATE FUNCTION fn_FormatDateForReport(@Date DATETIME, @Format NVARCHAR(10))
RETURNS NVARCHAR(50)
AS
BEGIN
    DECLARE @Result NVARCHAR(50);
    
    SET @Result = CASE @Format
        WHEN 'day' THEN CONVERT(NVARCHAR, @Date, 104)
        WHEN 'week' THEN 'Неделя ' + CAST(DATEPART(WEEK, @Date) AS NVARCHAR) + ', ' + CAST(YEAR(@Date) AS NVARCHAR)
        WHEN 'month' THEN DATENAME(MONTH, @Date) + ' ' + CAST(YEAR(@Date) AS NVARCHAR)
        WHEN 'year' THEN CAST(YEAR(@Date) AS NVARCHAR)
        ELSE CONVERT(NVARCHAR, @Date, 104)
    END;
    
    RETURN @Result;
END
GO

-- Удаляем старую функцию
IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[fn_GenerateTN2Number]') AND type in (N'FN', N'IF', N'TF'))
    DROP FUNCTION fn_GenerateTN2Number;
GO

-- Создаем новую функцию для генерации номера ТН-2
CREATE FUNCTION fn_GenerateTN2Number(@RequestId INT)
RETURNS NVARCHAR(50)
AS
BEGIN
    DECLARE @Number NVARCHAR(50);
    DECLARE @Series NVARCHAR(2);
    DECLARE @Seq INT;
    DECLARE @Today DATE = CAST(GETDATE() AS DATE);
    
    -- Генерируем серию из двух случайных букв (А-Я, исключая Ё)
    -- Используем хэш от RequestId и текущей даты для детерминированной генерации
    DECLARE @Hash INT = (@RequestId * 7 + DATEPART(DAYOFYEAR, @Today) * 13) % 676;
    DECLARE @FirstLetter INT = @Hash / 26;
    DECLARE @SecondLetter INT = @Hash % 26;
    
    -- Буквы русского алфавита (без Ё)
    DECLARE @Letters NVARCHAR(32) = 'АБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ';
    SET @Series = SUBSTRING(@Letters, @FirstLetter + 1, 1) + 
                  SUBSTRING(@Letters, @SecondLetter + 1, 1);
    
    -- Получаем следующий номер в последовательности для этой серии
    SELECT @Seq = ISNULL(MAX(CAST(RIGHT(document_number, 7) AS INT)), 0) + 1
    FROM tbl_StockMovements
    WHERE request_type = 'shipment' 
      AND document_number LIKE 'Серия ' + @Series + ' №%'
      AND CAST(movement_date AS DATE) = @Today;
    
    IF @Seq IS NULL SET @Seq = 1;
    
    -- Формируем номер: Серия AA №0000001
    SET @Number = 'Серия ' + @Series + ' №' + RIGHT('0000000' + CAST(@Seq AS NVARCHAR), 7);
    
    RETURN @Number;
END
GO

-- Удаляем старую функцию
IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[fn_GenerateTTN1Number]') AND type in (N'FN', N'IF', N'TF'))
    DROP FUNCTION fn_GenerateTTN1Number;
GO

-- Создаем новую функцию для генерации номера ТТН-1
CREATE FUNCTION fn_GenerateTTN1Number(@RequestId INT)
RETURNS NVARCHAR(50)
AS
BEGIN
    DECLARE @Number NVARCHAR(50);
    DECLARE @Series NVARCHAR(2);
    DECLARE @Seq INT;
    DECLARE @Today DATE = CAST(GETDATE() AS DATE);
    
    -- Генерируем серию из двух случайных букв (А-Я, исключая Ё)
    -- Используем хэш от RequestId и текущей даты
    DECLARE @Hash INT = (@RequestId * 11 + DATEPART(DAYOFYEAR, @Today) * 17 + 100) % 676;
    DECLARE @FirstLetter INT = @Hash / 26;
    DECLARE @SecondLetter INT = @Hash % 26;
    
    -- Буквы русского алфавита (без Ё)
    DECLARE @Letters NVARCHAR(32) = 'АБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ';
    SET @Series = SUBSTRING(@Letters, @FirstLetter + 1, 1) + 
                  SUBSTRING(@Letters, @SecondLetter + 1, 1);
    
    -- Получаем следующий номер в последовательности для этой серии
    SELECT @Seq = ISNULL(MAX(CAST(RIGHT(document_number, 7) AS INT)), 0) + 1
    FROM tbl_StockMovements
    WHERE request_type = 'shipment' 
      AND document_number LIKE 'Серия ' + @Series + ' №%'
      AND CAST(movement_date AS DATE) = @Today;
    
    IF @Seq IS NULL SET @Seq = 1;
    
    -- Формируем номер: Серия AA №0000001
    SET @Number = 'Серия ' + @Series + ' №' + RIGHT('0000000' + CAST(@Seq AS NVARCHAR), 7);
    
    RETURN @Number;
END
GO


DROP VIEW IF EXISTS vw_DeviceDetails;
GO

CREATE VIEW vw_DeviceDetails
AS
SELECT 
    d.id,
    d.unique_id,
    d.name,
    d.category,
    d.description,
    d.manufacturer,
    d.model,
    d.specifications,
    d.price,
    d.created_at,
    d.updated_at,
    d.status,
    CONCAT(u1.last_name, ' ', u1.first_name, ISNULL(' ' + u1.middle_name, '')) as created_by_name,
    CONCAT(u2.last_name, ' ', u2.first_name, ISNULL(' ' + u2.middle_name, '')) as updated_by_name,
    ISNULL(s.quantity, 0) as quantity,
    ISNULL(s.min_quantity, 5) as min_quantity,
    s.max_quantity,
    s.location,
    s.shelf,
    s.notes as stock_notes,
    s.last_updated,
    CASE 
        WHEN ISNULL(s.quantity, 0) = 0 THEN 'Нет в наличии'
        WHEN ISNULL(s.quantity, 0) <= ISNULL(s.min_quantity, 5) THEN 'Мало на складе'
        ELSE 'В наличии'
    END as stock_status,
    (SELECT COUNT(*) FROM tbl_DeviceImages di WHERE di.device_id = d.id AND di.is_active = 1) as images_count,
    (SELECT COUNT(*) FROM tbl_DeviceImages di WHERE di.device_id = d.id AND di.image_type = 'main' AND di.is_active = 1) as has_main_image,
    (SELECT COUNT(*) FROM tbl_DeviceImages di WHERE di.device_id = d.id AND di.image_type = 'prospect' AND di.is_active = 1) as has_prospect_image,
    (SELECT COUNT(*) FROM tbl_DeviceImages di WHERE di.device_id = d.id AND di.image_type = 'prospect_pdf' AND di.is_active = 1) as has_prospect_pdf
FROM tbl_Devices d
LEFT JOIN tbl_Users u1 ON d.created_by = u1.id
LEFT JOIN tbl_Users u2 ON d.updated_by = u2.id
LEFT JOIN tbl_Stock s ON d.id = s.device_id
WHERE d.status = 'active' AND d.is_deleted = 0;
GO


-- 1. Удаляем старое представление
IF EXISTS (SELECT * FROM sys.views WHERE name = 'vw_ReplenishmentRequests')
    DROP VIEW vw_ReplenishmentRequests;
GO

-- 2. Создаем представление ЗАНОВО с полем is_hidden_from_employee
CREATE VIEW vw_ReplenishmentRequests
AS
SELECT 
    r.id,
    r.request_number,
    r.device_id,
    d.unique_id as device_unique_id,
    d.name as device_name,
    d.category as device_category,
    r.quantity_requested,
    ISNULL(r.fulfilled_quantity, 0) as fulfilled_quantity,
    ISNULL(r.remaining_quantity, r.quantity_requested - ISNULL(r.fulfilled_quantity, 0)) as remaining_quantity,
    r.reason,
    r.status,
    r.is_hidden_from_employee,
    CONCAT(u1.last_name, ' ', u1.first_name, ISNULL(' ' + u1.middle_name, '')) as created_by_name,
    r.created_at,
    CONCAT(u2.last_name, ' ', u2.first_name, ISNULL(' ' + u2.middle_name, '')) as approved_by_name,
    r.approved_at,
    r.completed_at,
    r.notes,
    r.last_fulfilled_at
FROM tbl_ReplenishmentRequests r
JOIN tbl_Devices d ON r.device_id = d.id
LEFT JOIN tbl_Users u1 ON r.created_by = u1.id
LEFT JOIN tbl_Users u2 ON r.approved_by = u2.id;
GO

-- Представление для заявок на отгрузку
DROP VIEW IF EXISTS vw_ShipmentRequests;
GO
DROP VIEW IF EXISTS vw_ShipmentRequests;
GO

CREATE VIEW vw_ShipmentRequests
AS
SELECT 
    s.id,
    s.request_number,
    s.customer_name,
    s.customer_contact,
    s.customer_address,
    s.customer_unp,
    s.required_date,
    s.status,
    s.contract_number,
    s.need_vehicle,
    s.vehicle_number,
    s.trailer_number,
    s.waybill_number_ttn,
    CONCAT(s.driver_last_name, ' ', s.driver_first_name, ISNULL(' ' + s.driver_middle_name, '')) as driver_name,
    s.driver_license,
    s.shipping_date,
    s.waybill_number,
    s.ttn_number,
    CONCAT(u1.last_name, ' ', u1.first_name, ISNULL(' ' + u1.middle_name, '')) as created_by_name,
    s.created_at,
    CONCAT(u2.last_name, ' ', u2.first_name, ISNULL(' ' + u2.middle_name, '')) as processed_by_name,
    s.processed_at,
    CONCAT(u3.last_name, ' ', u3.first_name, ISNULL(' ' + u3.middle_name, '')) as completed_by_name,
    s.completed_at,
    s.power_of_attorney,
    s.notes,
    COUNT(i.id) as items_count,
    SUM(i.quantity_requested) as total_quantity,
    SUM(i.quantity_shipped) as shipped_quantity,
    SUM(i.quantity_requested * i.price_per_unit) as total_amount,
    SUM(i.quantity_shipped * i.price_per_unit) as shipped_amount,
    dbo.fn_CalculateShipmentStatus(s.id) as calculated_status
FROM tbl_ShipmentRequests s
LEFT JOIN tbl_Users u1 ON s.created_by = u1.id
LEFT JOIN tbl_Users u2 ON s.processed_by = u2.id
LEFT JOIN tbl_Users u3 ON s.completed_by = u3.id
LEFT JOIN tbl_ShipmentRequestItems i ON s.id = i.request_id
GROUP BY 
    s.id, s.request_number, s.customer_name, s.customer_contact, s.customer_address,
    s.customer_unp, s.required_date, s.status, s.contract_number, s.need_vehicle,
    s.vehicle_number, s.trailer_number, s.waybill_number_ttn,
    s.driver_last_name, s.driver_first_name, s.driver_middle_name, s.driver_license,
    s.shipping_date, s.waybill_number, s.ttn_number,
    u1.last_name, u1.first_name, u1.middle_name, s.created_at,
    u2.last_name, u2.first_name, u2.middle_name, s.processed_at,
    u3.last_name, u3.first_name, u3.middle_name, s.completed_at,
    s.power_of_attorney, s.notes;
GO
-- Представление для договоров
CREATE VIEW vw_ContractDetails
AS
SELECT 
    c.id,
    c.contract_number,
    c.request_id,
    s.request_number,
    s.customer_name,
    s.customer_unp,
    s.customer_address,
    s.customer_contact,
    c.contract_date,
    c.valid_until,
    c.status,
CONCAT(u1.last_name, ' ', u1.first_name, ISNULL(' ' + u1.middle_name, '')) as created_by_name,
c.created_at,
    c.signed_by_customer,
    c.signed_by_manager,
    c.signed_at,
    c.notes,
    c.contract_data,
    -- НОВЫЕ ПОЛЯ РЕКВИЗИТОВ
    c.seller_legal_address,
    c.seller_bank_account,
    c.seller_bank_name,
    c.seller_bank_code,
    c.buyer_legal_address,
    c.buyer_bank_account,
    c.buyer_bank_name,
    c.buyer_bank_code,
    ISNULL(JSON_VALUE(c.contract_data, '$.total_amount'), 0) as order_amount
FROM tbl_Contracts c
JOIN tbl_ShipmentRequests s ON c.request_id = s.id
LEFT JOIN tbl_Users u1 ON c.created_by = u1.id;
GO

-- Представление для истории движений
CREATE VIEW vw_StockMovements
AS
SELECT 
    sm.id,
    sm.movement_date,
    d.unique_id,
    d.name,
    d.category,
    sm.movement_type,
    sm.quantity_change,
    sm.previous_quantity,
    sm.new_quantity,
CONCAT(u.last_name, ' ', u.first_name, ISNULL(' ' + u.middle_name, '')) as performed_by_name,
sm.notes,
    sm.request_id,
    sm.request_type,
    CASE 
        WHEN sm.request_type = 'replenishment' THEN 'Заявка на пополнение'
        WHEN sm.request_type = 'shipment' THEN 'Заявка на отгрузку'
        ELSE '-'
    END as request_info
FROM tbl_StockMovements sm
JOIN tbl_Devices d ON sm.device_id = d.id
LEFT JOIN tbl_Users u ON sm.performed_by = u.id;
GO

-- Представление для статистики по категориям
CREATE VIEW vw_CategoryStats
AS
SELECT 
    ISNULL(d.category, 'Без категории') as category,
    COUNT(*) as device_count,
    SUM(ISNULL(s.quantity, 0)) as total_quantity,
    SUM(CASE WHEN ISNULL(s.quantity, 0) = 0 THEN 1 ELSE 0 END) as out_of_stock_count,
    AVG(d.price) as avg_price,
    MIN(d.price) as min_price,
    MAX(d.price) as max_price
FROM tbl_Devices d
LEFT JOIN tbl_Stock s ON d.id = s.device_id
WHERE d.status = 'active'
GROUP BY d.category;
GO

-- Представление для статистики по складу
CREATE VIEW vw_StockStats
AS
SELECT 
    COUNT(*) as total_in_stock,
    SUM(quantity) as total_quantity,
    SUM(CASE WHEN quantity <= min_quantity THEN 1 ELSE 0 END) as needing_restock,
    SUM(CASE WHEN quantity = 0 THEN 1 ELSE 0 END) as out_of_stock,
    AVG(quantity) as avg_quantity
FROM tbl_Stock;
GO




CREATE OR ALTER TRIGGER trg_Stock_UpdateLocation
ON tbl_Stock
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    
    IF UPDATE(location) OR UPDATE(shelf)
    BEGIN
        INSERT INTO tbl_StockMovements (
            device_id, movement_type, quantity_change, previous_quantity, new_quantity,
            performed_by, notes, movement_date
        )
        SELECT 
            i.device_id,
            'перемещение',
            0,
            d.quantity,
            i.quantity,
            i.last_updated_by,
            CONCAT('Перемещение в ', i.location, ISNULL(CONCAT(' / Полка ', i.shelf), '')),
            CAST(GETDATE() AS DATE)
        FROM inserted i
        INNER JOIN deleted d ON i.device_id = d.device_id
        WHERE ISNULL(i.location, '') != ISNULL(d.location, '')
           OR ISNULL(i.shelf, '') != ISNULL(d.shelf, '')
    END
END
GO

-- Триггер для автоматического обновления updated_at в Devices
CREATE OR ALTER TRIGGER trg_Devices_UpdateTimestamp
ON tbl_Devices
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE d 
    SET updated_at = CAST(GETDATE() AS DATE)
    FROM tbl_Devices d
    INNER JOIN inserted i ON d.id = i.id;
END
GO
 
CREATE OR ALTER TRIGGER trg_Devices_PriceHistory
ON tbl_Devices
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    
    INSERT INTO tbl_PriceHistory (device_id, old_price, new_price, changed_by, changed_at)
    SELECT 
        i.id,
        d.price,
        i.price,
        i.updated_by,
        CAST(GETDATE() AS DATE)
    FROM inserted i
    INNER JOIN deleted d ON i.id = d.id
    WHERE i.price != d.price;
END
GO
 
-- Триггер для автоматического обновления статуса заявки при изменении позиций
CREATE TRIGGER trg_ShipmentRequestItems_UpdateRequestStatus
ON tbl_ShipmentRequestItems
AFTER INSERT, UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @RequestId INT;
    
    SELECT TOP 1 @RequestId = request_id FROM inserted;
    
    IF @RequestId IS NULL
        SELECT TOP 1 @RequestId = request_id FROM deleted;
    
    IF @RequestId IS NOT NULL
    BEGIN
        UPDATE tbl_ShipmentRequests
        SET status = dbo.fn_CalculateShipmentStatus(@RequestId)
        WHERE id = @RequestId;
    END
END
GO


-- Сначала удаляем старый триггер, если существует
IF EXISTS (SELECT * FROM sys.triggers WHERE name = 'trg_Stock_UpdatePlacement' AND parent_class_desc = 'OBJECT_OR_COLUMN')
BEGIN
    DROP TRIGGER trg_Stock_UpdatePlacement;
    PRINT '✅ Старый триггер trg_Stock_UpdatePlacement удален';
END
GO

CREATE OR ALTER TRIGGER trg_Stock_UpdatePlacement
ON tbl_Stock
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    
    IF TRIGGER_NESTLEVEL() > 1 RETURN;
    
    IF UPDATE(quantity)
    BEGIN
        DECLARE @DeviceId INT, @OldQty INT, @NewQty INT;
        DECLARE @RackName NVARCHAR(50), @Level INT, @Column INT, @CellQty INT;
        DECLARE @Difference INT, @RemoveQty INT, @NewCellQty INT;
        
        DECLARE stock_cursor CURSOR LOCAL FAST_FORWARD FOR
        SELECT i.device_id, d.quantity as old_qty, i.quantity as new_qty
        FROM inserted i
        INNER JOIN deleted d ON i.device_id = d.device_id
        WHERE i.quantity < d.quantity;
        
        OPEN stock_cursor;
        FETCH NEXT FROM stock_cursor INTO @DeviceId, @OldQty, @NewQty;
        
        WHILE @@FETCH_STATUS = 0
        BEGIN
            SET @Difference = @OldQty - @NewQty;
            
            WHILE @Difference > 0
            BEGIN
                SELECT TOP 1 
                    @RackName = rack_name, 
                    @Level = cell_level, 
                    @Column = cell_column, 
                    @CellQty = quantity
                FROM tbl_RackPlacement
                WHERE device_id = @DeviceId AND quantity > 0
                ORDER BY cell_level DESC, cell_column DESC;
                
                IF @RackName IS NULL BREAK;
                
                SET @RemoveQty = CASE WHEN @CellQty >= @Difference THEN @Difference ELSE @CellQty END;
                SET @NewCellQty = @CellQty - @RemoveQty;
                
                IF @NewCellQty = 0
                BEGIN
                    DELETE FROM tbl_RackPlacement 
                    WHERE rack_name = @RackName AND cell_level = @Level AND cell_column = @Column;
                END
                ELSE
                BEGIN
                    UPDATE tbl_RackPlacement 
                    SET quantity = @NewCellQty, last_updated = CAST(GETDATE() AS DATE)
                    WHERE rack_name = @RackName AND cell_level = @Level AND cell_column = @Column;
                END
                
                -- Записываем историю списания
                INSERT INTO tbl_PlacementHistory 
                    (device_id, device_name, action_type, rack_name, cell_level, cell_column, quantity_change, new_quantity, notes, performed_at)
                SELECT 
                    d.id, LEFT(d.name, 150), 'removed', @RackName, @Level, @Column, -@RemoveQty, @NewCellQty, 
                    CONCAT('Автоматическое списание при отгрузке. Удалено: ', @RemoveQty, ' шт.'),
                    CAST(GETDATE() AS DATE)
                FROM tbl_Devices d WHERE d.id = @DeviceId;
                
                SET @Difference = @Difference - @RemoveQty;
            END
            
            FETCH NEXT FROM stock_cursor INTO @DeviceId, @OldQty, @NewQty;
        END
        
        CLOSE stock_cursor;
        DEALLOCATE stock_cursor;
    END
END
GO


-- Процедура аутентификации
CREATE OR ALTER PROCEDURE sp_AuthenticateUser
    @Email NVARCHAR(100),
    @Password NVARCHAR(100)
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @UserId INT;
    DECLARE @FullName NVARCHAR(255);
    DECLARE @LastName NVARCHAR(50);
    DECLARE @FirstName NVARCHAR(50);
    DECLARE @MiddleName NVARCHAR(50);
    DECLARE @UserRole NVARCHAR(50);
    DECLARE @StoredPassword NVARCHAR(100);
    
    SELECT 
        @UserId = id,
        @LastName = last_name,
        @FirstName = first_name,
        @MiddleName = middle_name,
        @UserRole = role,
        @StoredPassword = password_hash
    FROM tbl_Users 
    WHERE email = @Email AND is_active = 1;
    
    IF @UserId IS NULL
    BEGIN
        SELECT 
            NULL AS UserId,
            NULL AS FullName,
            NULL AS Role,
            'Пользователь не найден' AS ErrorMessage;
        RETURN;
    END
    
    SET @FullName = CONCAT(@LastName, ' ', @FirstName, ISNULL(' ' + @MiddleName, ''));
    
    IF @StoredPassword = @Password
    BEGIN
        UPDATE tbl_Users SET last_login = GETDATE() WHERE id = @UserId;
        
        SELECT 
            @UserId AS UserId,
            @FullName AS FullName,
            @UserRole AS Role,
            NULL AS ErrorMessage;
    END
    ELSE
    BEGIN
        SELECT 
            NULL AS UserId,
            NULL AS FullName,
            NULL AS Role,
            'Неверный пароль' AS ErrorMessage;
    END
END
GO

-- Процедура получения прав пользователя
CREATE PROCEDURE sp_GetUserPermissions
    @UserId INT
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @UserRole NVARCHAR(50);
    
    SELECT @UserRole = role FROM tbl_Users WHERE id = @UserId;
    
    SELECT 
        @UserRole as role,
        CASE WHEN @UserRole = 'admin' THEN 1 ELSE 0 END as can_manage_users,
        CASE WHEN @UserRole = 'manager' THEN 1 ELSE 0 END as can_create_shipment_requests,
        CASE WHEN @UserRole IN ('admin', 'manager', 'employee') THEN 1 ELSE 0 END as can_view_shipment_requests,
        CASE WHEN @UserRole IN ('employee', 'admin') THEN 1 ELSE 0 END as can_process_shipment_requests,
        CASE WHEN @UserRole = 'employee' THEN 1 ELSE 0 END as can_create_replenishment_requests,
        CASE WHEN @UserRole = 'admin' THEN 1 ELSE 0 END as can_approve_replenishment_requests,
        CASE WHEN @UserRole IN ('admin', 'employee') THEN 1 ELSE 0 END as can_view_replenishment_requests,
        CASE WHEN @UserRole IN ('admin', 'manager') THEN 1 ELSE 0 END as can_view_contracts;
END
GO

-- Процедура получения списка пользователей
CREATE OR ALTER PROCEDURE sp_GetUsers
    @IncludeInactive BIT = 0
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT 
        id, 
        email, 
        last_name,
        first_name,
        middle_name,
        CONCAT(last_name, ' ', first_name, ISNULL(' ' + middle_name, '')) as full_name,
        role, 
        phone, 
        created_at, 
        last_login, 
        is_active
    FROM tbl_Users
    WHERE (@IncludeInactive = 1 OR is_active = 1)
    ORDER BY created_at DESC;
END
GO

-- Процедура создания пользователя
CREATE OR ALTER PROCEDURE sp_CreateUser
    @Email NVARCHAR(100),
    @Password NVARCHAR(100),
    @LastName NVARCHAR(50),
    @FirstName NVARCHAR(50),
    @MiddleName NVARCHAR(50) = NULL,
    @Role NVARCHAR(50),
    @Phone NVARCHAR(20) = NULL,
    @CreatedBy INT
AS
BEGIN
    SET NOCOUNT ON;
    
    BEGIN TRY
        BEGIN TRANSACTION;
        
        IF EXISTS (SELECT 1 FROM tbl_Users WHERE email = @Email)
        BEGIN
            SELECT 0 AS Success, 'Пользователь с таким email уже существует' AS Message;
            ROLLBACK TRANSACTION;
            RETURN;
        END
        
        INSERT INTO tbl_Users (
            email, password_hash, last_name, first_name, middle_name,
            role, phone, created_by, created_at, is_active
        )
        VALUES (
            @Email, @Password, @LastName, @FirstName, @MiddleName,
            @Role, @Phone, @CreatedBy, GETDATE(), 1
        );
        
        COMMIT TRANSACTION;
        
        SELECT 1 AS Success, 'Пользователь успешно создан' AS Message;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        SELECT 0 AS Success, ERROR_MESSAGE() AS Message;
    END CATCH
END
GO

-- Процедура обновления пользователя
CREATE OR ALTER PROCEDURE sp_UpdateUser
    @UserId INT,
    @LastName NVARCHAR(50),
    @FirstName NVARCHAR(50),
    @MiddleName NVARCHAR(50) = NULL,
    @Role NVARCHAR(50),
    @Phone NVARCHAR(20) = NULL,
    @IsActive BIT
AS
BEGIN
    SET NOCOUNT ON;
    
    BEGIN TRY
        UPDATE tbl_Users 
        SET last_name = @LastName,
            first_name = @FirstName,
            middle_name = @MiddleName,
            role = @Role,
            phone = @Phone,
            is_active = @IsActive
        WHERE id = @UserId;
        
        SELECT 1 AS Success, 'Пользователь обновлен' AS Message;
    END TRY
    BEGIN CATCH
        SELECT 0 AS Success, ERROR_MESSAGE() AS Message;
    END CATCH
END
GO

-- Процедура сброса пароля
CREATE PROCEDURE sp_ResetPassword
    @UserId INT,
    @NewPassword NVARCHAR(255)
AS
BEGIN
    SET NOCOUNT ON;
    
    BEGIN TRY
        UPDATE tbl_Users 
        SET password_hash = @NewPassword
        WHERE id = @UserId;
        
        SELECT 1 AS Success, 'Пароль успешно сброшен' AS Message;
    END TRY
    BEGIN CATCH
        SELECT 0 AS Success, ERROR_MESSAGE() AS Message;
    END CATCH
END
GO

-- Процедура удаления пользователя
CREATE PROCEDURE sp_DeleteUser
    @UserId INT,
    @CurrentUserId INT
AS
BEGIN
    SET NOCOUNT ON;
    
    BEGIN TRY
        BEGIN TRANSACTION;
        
        IF @UserId = @CurrentUserId
        BEGIN
            SELECT 0 AS Success, 'Нельзя удалить свою учетную запись' AS Message;
            ROLLBACK TRANSACTION;
            RETURN;
        END
        
        UPDATE tbl_Devices SET created_by = NULL WHERE created_by = @UserId;
        UPDATE tbl_Devices SET updated_by = NULL WHERE updated_by = @UserId;
        UPDATE tbl_Stock SET last_updated_by = NULL WHERE last_updated_by = @UserId;
        UPDATE tbl_StockMovements SET performed_by = NULL WHERE performed_by = @UserId;
        UPDATE tbl_ShipmentRequests SET created_by = NULL WHERE created_by = @UserId;
        UPDATE tbl_ShipmentRequests SET processed_by = NULL WHERE processed_by = @UserId;
        UPDATE tbl_ShipmentRequests SET completed_by = NULL WHERE completed_by = @UserId;
        UPDATE tbl_ReplenishmentRequests SET created_by = NULL WHERE created_by = @UserId;
        UPDATE tbl_ReplenishmentRequests SET approved_by = NULL WHERE approved_by = @UserId;
        UPDATE tbl_Contracts SET created_by = NULL WHERE created_by = @UserId;
        UPDATE tbl_Inventory SET created_by = NULL WHERE created_by = @UserId;
        UPDATE tbl_Inventory SET completed_by = NULL WHERE completed_by = @UserId;
        UPDATE tbl_DeviceImages SET uploaded_by = NULL WHERE uploaded_by = @UserId;
        
        DELETE FROM tbl_Users WHERE id = @UserId;
        
        COMMIT TRANSACTION;
        
        SELECT 1 AS Success, 'Пользователь полностью удален' AS Message;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;
        
        SELECT 0 AS Success, ERROR_MESSAGE() AS Message;
    END CATCH
END
GO

-- Процедура получения приборов с фильтрацией
CREATE OR ALTER PROCEDURE sp_GetDevices
    @SearchTerm NVARCHAR(255) = NULL,
    @Category NVARCHAR(100) = NULL,
    @Status NVARCHAR(50) = NULL,
    @MinPrice DECIMAL(18,2) = NULL,
    @MaxPrice DECIMAL(18,2) = NULL,
    @PageNumber INT = 1,
    @PageSize INT = 50,
    @SortBy NVARCHAR(50) = 'name',
    @SortOrder NVARCHAR(4) = 'ASC'
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @Offset INT = (@PageNumber - 1) * @PageSize;
    
    SELECT 
        d.id,
        d.unique_id,
        d.name,
        d.category,
        d.description,
        d.manufacturer,
        d.model,
        d.specifications,
        d.price,
        d.created_at,
        CONCAT(u.last_name, ' ', u.first_name, ISNULL(' ' + u.middle_name, '')) as created_by_name,
        ISNULL(s.quantity, 0) as quantity,
        ISNULL(s.min_quantity, 5) as min_quantity,
        s.max_quantity,
        s.location,
        s.shelf,
        s.notes as stock_notes,
        s.last_updated,
        CASE 
            WHEN ISNULL(s.quantity, 0) = 0 THEN 'Нет в наличии'
            WHEN ISNULL(s.quantity, 0) <= ISNULL(s.min_quantity, 5) THEN 'Мало на складе'
            ELSE 'В наличии'
        END as stock_status,
        (SELECT COUNT(*) FROM tbl_DeviceImages di WHERE di.device_id = d.id AND di.is_active = 1) as images_count,
        COUNT(*) OVER() as total_count
    FROM tbl_Devices d
    LEFT JOIN tbl_Users u ON d.created_by = u.id
    LEFT JOIN tbl_Stock s ON d.id = s.device_id
    WHERE d.status = 'active'
        AND (@SearchTerm IS NULL OR 
             d.unique_id LIKE '%' + @SearchTerm + '%' OR 
             d.name LIKE '%' + @SearchTerm + '%' OR
             d.model LIKE '%' + @SearchTerm + '%')
        AND (@Category IS NULL OR @Category = 'all' OR d.category = @Category)
        AND (@MinPrice IS NULL OR d.price >= @MinPrice)
        AND (@MaxPrice IS NULL OR d.price <= @MaxPrice)
        AND (
            @Status IS NULL OR @Status = 'all' OR
            (@Status = 'in_stock' AND ISNULL(s.quantity, 0) > ISNULL(s.min_quantity, 5)) OR
            (@Status = 'low_stock' AND ISNULL(s.quantity, 0) > 0 AND ISNULL(s.quantity, 0) <= ISNULL(s.min_quantity, 5)) OR
            (@Status = 'out_of_stock' AND ISNULL(s.quantity, 0) = 0)
        )
    ORDER BY 
        CASE WHEN @SortBy = 'name' AND @SortOrder = 'ASC' THEN d.name END ASC,
        CASE WHEN @SortBy = 'name' AND @SortOrder = 'DESC' THEN d.name END DESC,
        CASE WHEN @SortBy = 'price' AND @SortOrder = 'ASC' THEN d.price END ASC,
        CASE WHEN @SortBy = 'price' AND @SortOrder = 'DESC' THEN d.price END DESC,
        CASE WHEN @SortBy = 'quantity' AND @SortOrder = 'ASC' THEN s.quantity END ASC,
        CASE WHEN @SortBy = 'quantity' AND @SortOrder = 'DESC' THEN s.quantity END DESC,
        CASE WHEN @SortBy = 'created_at' AND @SortOrder = 'ASC' THEN d.created_at END ASC,
        CASE WHEN @SortBy = 'created_at' AND @SortOrder = 'DESC' THEN d.created_at END DESC,
        d.id
    OFFSET @Offset ROWS
    FETCH NEXT @PageSize ROWS ONLY;
END
GO

-- Процедура создания прибора
CREATE PROCEDURE sp_CreateDevice
    @UniqueId NVARCHAR(100),
    @Name NVARCHAR(255),
    @Category NVARCHAR(100) = NULL,
    @Description NVARCHAR(MAX) = NULL,
    @Manufacturer NVARCHAR(255) = NULL,
    @Model NVARCHAR(100) = NULL,
    @Price DECIMAL(18,2) = 0,
    @Specifications NVARCHAR(MAX) = NULL,
    @Quantity INT = 0,
    @MinQuantity INT = 5,
    @Location NVARCHAR(100) = NULL,
    @Shelf NVARCHAR(50) = NULL,
    @StockNotes NVARCHAR(500) = NULL,
    @CreatedBy INT
AS
BEGIN
    SET NOCOUNT ON;
    
    BEGIN TRY
        BEGIN TRANSACTION;
        
        IF dbo.fn_IsDeviceIdUnique(@UniqueId, NULL) = 0
        BEGIN
            SELECT 0 AS Success, 'Прибор с таким уникальным ID уже существует' AS Message;
            ROLLBACK TRANSACTION;
            RETURN;
        END
        
        DECLARE @DeviceId INT;
        
        INSERT INTO tbl_Devices (
            unique_id, name, category, description, manufacturer, model, 
            price, specifications, created_by, created_at, status
        )
        VALUES (
            @UniqueId, @Name, @Category, @Description, ISNULL(@Manufacturer, 'НПУП «АТОМТЕХ»'), 
            @Model, @Price, @Specifications, @CreatedBy, GETDATE(), 'active'
        );
        
        SET @DeviceId = SCOPE_IDENTITY();
        
        INSERT INTO tbl_Stock (device_id, quantity, min_quantity, location, shelf, notes, last_updated_by, last_updated)
        VALUES (@DeviceId, @Quantity, @MinQuantity, @Location, @Shelf, @StockNotes, @CreatedBy, GETDATE());
        
        IF @Quantity > 0
        BEGIN
            INSERT INTO tbl_StockMovements (
                device_id, movement_type, quantity_change, previous_quantity, 
                new_quantity, performed_by, notes, movement_date
            )
            VALUES (
                @DeviceId, 'поступление', @Quantity, 0, @Quantity, 
                @CreatedBy, 'Первоначальное поступление', GETDATE()
            );
        END
        
        COMMIT TRANSACTION;
        
        SELECT 1 AS Success, 'Прибор успешно добавлен' AS Message, @DeviceId AS DeviceId;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;
        
        SELECT 0 AS Success, ERROR_MESSAGE() AS Message, NULL AS DeviceId;
    END CATCH
END
GO

-- Процедура обновления прибора
CREATE PROCEDURE sp_UpdateDevice
    @DeviceId INT,
    @UniqueId NVARCHAR(100),
    @Name NVARCHAR(255),
    @Category NVARCHAR(100) = NULL,
    @Description NVARCHAR(MAX) = NULL,
    @Manufacturer NVARCHAR(255) = NULL,
    @Model NVARCHAR(100) = NULL,
    @Price DECIMAL(18,2) = 0,
    @Specifications NVARCHAR(MAX) = NULL,
    @Quantity INT = NULL,
    @MinQuantity INT = NULL,
    @Location NVARCHAR(100) = NULL,
    @Shelf NVARCHAR(50) = NULL,
    @StockNotes NVARCHAR(500) = NULL,
    @UpdatedBy INT
AS
BEGIN
    SET NOCOUNT ON;
    
    BEGIN TRY
        BEGIN TRANSACTION;
        
        IF dbo.fn_IsDeviceIdUnique(@UniqueId, @DeviceId) = 0
        BEGIN
            SELECT 0 AS Success, 'Прибор с таким уникальным ID уже существует' AS Message;
            ROLLBACK TRANSACTION;
            RETURN;
        END
        
        UPDATE tbl_Devices 
        SET unique_id = @UniqueId,
            name = @Name,
            category = @Category,
            description = @Description,
            manufacturer = ISNULL(@Manufacturer, 'НПУП «АТОМТЕХ»'),
            model = @Model,
            price = @Price,
            specifications = @Specifications,
            updated_by = @UpdatedBy
        WHERE id = @DeviceId;
        
        IF EXISTS (SELECT 1 FROM tbl_Stock WHERE device_id = @DeviceId)
        BEGIN
            UPDATE tbl_Stock 
            SET 
                quantity = ISNULL(@Quantity, quantity),
                min_quantity = ISNULL(@MinQuantity, min_quantity),
                location = @Location,
                shelf = @Shelf,
                notes = @StockNotes,
                last_updated = GETDATE(),
                last_updated_by = @UpdatedBy
            WHERE device_id = @DeviceId;
        END
        ELSE IF @Quantity IS NOT NULL
        BEGIN
            INSERT INTO tbl_Stock (device_id, quantity, min_quantity, location, shelf, notes, last_updated_by, last_updated)
            VALUES (@DeviceId, @Quantity, ISNULL(@MinQuantity, 5), @Location, @Shelf, @StockNotes, @UpdatedBy, GETDATE());
        END
        
        COMMIT TRANSACTION;
        
        SELECT 1 AS Success, 'Прибор успешно обновлен' AS Message;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;
        
        SELECT 0 AS Success, ERROR_MESSAGE() AS Message;
    END CATCH
END
GO

-- Процедура удаления прибора
CREATE PROCEDURE sp_DeleteDevice
    @DeviceId INT
AS
BEGIN
    SET NOCOUNT ON;
    
    BEGIN TRY
        BEGIN TRANSACTION;
        
        IF EXISTS (
            SELECT 1 FROM tbl_ShipmentRequestItems i
            JOIN tbl_ShipmentRequests sr ON i.request_id = sr.id
            WHERE i.device_id = @DeviceId AND sr.status IN ('new', 'processing', 'partial')
        )
        BEGIN
            SELECT 0 AS Success, 'Нельзя удалить прибор, по которому есть активные заявки' AS Message;
            ROLLBACK TRANSACTION;
            RETURN;
        END
        
        DELETE FROM tbl_DeviceImages WHERE device_id = @DeviceId;
        DELETE FROM tbl_StockMovements WHERE device_id = @DeviceId;
        DELETE FROM tbl_Stock WHERE device_id = @DeviceId;
        DELETE FROM tbl_ShipmentRequestItems WHERE device_id = @DeviceId;
        DELETE FROM tbl_ReplenishmentRequests WHERE device_id = @DeviceId;
        DELETE FROM tbl_InventoryItems WHERE device_id = @DeviceId;
        DELETE FROM tbl_PriceHistory WHERE device_id = @DeviceId;
        
        DELETE FROM tbl_Devices WHERE id = @DeviceId;
        
        COMMIT TRANSACTION;
        
        SELECT 1 AS Success, 'Прибор полностью удален из базы данных' AS Message;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;
        
        SELECT 0 AS Success, ERROR_MESSAGE() AS Message;
    END CATCH
END
GO

-- Процедура получения категорий
CREATE PROCEDURE sp_GetCategories
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT DISTINCT category 
    FROM tbl_Devices 
    WHERE status = 'active' AND category IS NOT NULL 
    ORDER BY category;
END
GO

-- Процедура поиска приборов
CREATE PROCEDURE sp_SearchDevices
    @Query NVARCHAR(255),
    @Limit INT = 20
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT TOP (@Limit)
        d.id, d.unique_id, d.name, d.category, d.manufacturer, d.model, d.price,
        ISNULL(s.quantity, 0) as quantity,
        CASE 
            WHEN ISNULL(s.quantity, 0) = 0 THEN 'Нет в наличии'
            WHEN ISNULL(s.quantity, 0) <= ISNULL(s.min_quantity, 5) THEN 'Мало на складе'
            ELSE 'В наличии'
        END as stock_status
    FROM tbl_Devices d
    LEFT JOIN tbl_Stock s ON d.id = s.device_id
    WHERE d.status = 'active'
        AND (d.unique_id LIKE '%' + @Query + '%' 
             OR d.name LIKE '%' + @Query + '%' 
             OR d.model LIKE '%' + @Query + '%')
    ORDER BY 
        CASE 
            WHEN d.unique_id LIKE @Query + '%' THEN 1
            WHEN d.name LIKE @Query + '%' THEN 2
            ELSE 3
        END;
END
GO

-- Процедура получения приборов, требующих пополнения
CREATE PROCEDURE sp_GetDevicesNeedingRestock
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT 
        d.id,
        d.unique_id,
        d.name,
        ISNULL(d.category, '') as category,
        ISNULL(d.manufacturer, '') as manufacturer,
        ISNULL(d.model, '') as model,
        ISNULL(s.quantity, 0) as quantity,
        ISNULL(s.min_quantity, 5) as min_quantity,
        ISNULL(s.location, '') as location,
        ISNULL(s.shelf, '') as shelf,
        (ISNULL(s.min_quantity, 5) - ISNULL(s.quantity, 0)) as shortage,
        CASE 
            WHEN ISNULL(s.quantity, 0) = 0 THEN 'Срочно'
            ELSE 'В наличии'
        END as priority
    FROM tbl_Devices d
    LEFT JOIN tbl_Stock s ON d.id = s.device_id
    WHERE d.status = 'active'
        AND ISNULL(s.quantity, 0) <= ISNULL(s.min_quantity, 5)
    ORDER BY shortage DESC;
END
GO

CREATE OR ALTER PROCEDURE sp_CreateReplenishmentRequest
    @DeviceId INT,
    @Quantity INT,
    @Reason NVARCHAR(500) = NULL,
    @CreatedBy INT,
    @Notes NVARCHAR(MAX) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    BEGIN TRY
        BEGIN TRANSACTION;
        
        DECLARE @RequestNumber NVARCHAR(50) = dbo.fn_GenerateReplenishmentNumber();
        
        INSERT INTO tbl_ReplenishmentRequests (
            request_number, 
            device_id, 
            quantity_requested, 
            reason, 
            created_by, 
            notes, 
            status, 
            created_at,
            fulfilled_quantity,
            remaining_quantity,
            is_hidden_from_employee
        ) VALUES (
            @RequestNumber, 
            @DeviceId, 
            @Quantity, 
            @Reason,
            @CreatedBy, 
            @Notes, 
            'pending', 
            GETDATE(),
            0,                    -- fulfilled_quantity = 0
            @Quantity,            -- remaining_quantity = quantity_requested
            0                     -- is_hidden_from_employee = 0
        );
        
        DECLARE @RequestId INT = SCOPE_IDENTITY();
        
        COMMIT TRANSACTION;
        
        SELECT 
            @RequestId AS RequestId,
            @RequestNumber AS RequestNumber,
            'Заявка на пополнение создана' AS Message,
            1 AS Success;
            
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;
            
        SELECT 
            NULL AS RequestId,
            NULL AS RequestNumber,
            ERROR_MESSAGE() AS Message,
            0 AS Success;
    END CATCH
END
GO

CREATE OR ALTER PROCEDURE sp_GetReplenishmentRequests
    @Status NVARCHAR(50) = NULL,
    @UserId INT = NULL,
    @UserRole NVARCHAR(50) = NULL,
    @PageNumber INT = 1,
    @PageSize INT = 50
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @Offset INT = (@PageNumber - 1) * @PageSize;
    
    SELECT 
        r.id,
        r.request_number,
        r.device_id,
        d.unique_id as device_unique_id,
        d.name as device_name,
        d.category as device_category,
        r.quantity_requested,
        r.reason,
        r.status,
        r.is_hidden_from_employee,
        CONCAT(u1.last_name, ' ', u1.first_name, ISNULL(' ' + u1.middle_name, '')) as created_by_name,
        r.created_at,
        CONCAT(u2.last_name, ' ', u2.first_name, ISNULL(' ' + u2.middle_name, '')) as approved_by_name,
        r.approved_at,
        r.completed_at,
        r.notes
    FROM tbl_ReplenishmentRequests r
    JOIN tbl_Devices d ON r.device_id = d.id
    LEFT JOIN tbl_Users u1 ON r.created_by = u1.id
    LEFT JOIN tbl_Users u2 ON r.approved_by = u2.id
    WHERE (@Status IS NULL OR r.status = @Status)
        AND (
            @UserRole = 'admin'
            OR
            (@UserRole = 'employee' AND r.created_by = @UserId AND r.is_hidden_from_employee = 0)
        )
    ORDER BY r.created_at DESC
    OFFSET @Offset ROWS
    FETCH NEXT @PageSize ROWS ONLY;
END
GO

CREATE OR ALTER PROCEDURE sp_PartialFulfillReplenishment
    @RequestId INT,
    @ActualQuantity INT,
    @Notes NVARCHAR(500) = NULL,
    @PerformedBy INT
AS
BEGIN
    SET NOCOUNT ON;
    
    BEGIN TRY
        BEGIN TRANSACTION;
        
        -- Получаем данные заявки
        DECLARE @DeviceId INT, @RequestedQuantity INT, @CurrentFulfilled INT, 
                @CurrentStatus NVARCHAR(50), @NewStatus NVARCHAR(50);
        
        SELECT 
            @DeviceId = device_id,
            @RequestedQuantity = quantity_requested,
            @CurrentFulfilled = ISNULL(fulfilled_quantity, 0),
            @CurrentStatus = status
        FROM tbl_ReplenishmentRequests
        WHERE id = @RequestId;
        
        IF @DeviceId IS NULL
        BEGIN
            SELECT 0 AS Success, 'Заявка не найдена' AS Message;
            ROLLBACK TRANSACTION;
            RETURN;
        END
        
        IF @CurrentStatus NOT IN ('pending', 'processing')
        BEGIN
            SELECT 0 AS Success, 'Заявка уже выполнена или отклонена' AS Message;
            ROLLBACK TRANSACTION;
            RETURN;
        END
        
        -- Проверяем, что фактическое количество не превышает остаток
        DECLARE @Remaining INT = @RequestedQuantity - @CurrentFulfilled;
        
        IF @ActualQuantity > @Remaining
        BEGIN
            SELECT 0 AS Success, 
                   CONCAT('Фактическое количество (', @ActualQuantity, 
                          ') превышает остаток к поставке (', @Remaining, ').') AS Message;
            ROLLBACK TRANSACTION;
            RETURN;
        END
        
        IF @ActualQuantity <= 0
        BEGIN
            SELECT 0 AS Success, 'Фактическое количество должно быть больше 0' AS Message;
            ROLLBACK TRANSACTION;
            RETURN;
        END
        
        -- Обновляем выполненные количества
        DECLARE @NewFulfilled INT = @CurrentFulfilled + @ActualQuantity;
        DECLARE @NewRemaining INT = @RequestedQuantity - @NewFulfilled;
        
        -- Определяем новый статус
        IF @NewRemaining = 0
            SET @NewStatus = 'completed';
        ELSE
            SET @NewStatus = 'processing';
        
        -- Обновляем заявку
        UPDATE tbl_ReplenishmentRequests 
        SET fulfilled_quantity = @NewFulfilled,
            remaining_quantity = @NewRemaining,
            status = @NewStatus,
            last_fulfilled_at = CAST(GETDATE() AS DATE),
            approved_by = CASE WHEN @CurrentStatus = 'pending' THEN @PerformedBy ELSE approved_by END,
            approved_at = CASE WHEN @CurrentStatus = 'pending' THEN CAST(GETDATE() AS DATE) ELSE approved_at END
        WHERE id = @RequestId;
        
        -- Получаем текущее количество на складе
        DECLARE @CurrentStock INT;
        SELECT @CurrentStock = ISNULL(quantity, 0) FROM tbl_Stock WHERE device_id = @DeviceId;
        DECLARE @NewStock INT = @CurrentStock + @ActualQuantity;
        
        -- Обновляем склад
        IF EXISTS (SELECT 1 FROM tbl_Stock WHERE device_id = @DeviceId)
        BEGIN
            UPDATE tbl_Stock 
            SET quantity = @NewStock,
                last_updated = CAST(GETDATE() AS DATE),
                last_updated_by = @PerformedBy
            WHERE device_id = @DeviceId;
        END
        ELSE
        BEGIN
            INSERT INTO tbl_Stock (device_id, quantity, min_quantity, last_updated_by, last_updated)
            VALUES (@DeviceId, @ActualQuantity, 5, @PerformedBy, CAST(GETDATE() AS DATE));
        END
        
        -- Генерируем УНИКАЛЬНЫЙ номер ТТН-1 для КАЖДОЙ поставки
        DECLARE @DeliveryNumber INT;
        SELECT @DeliveryNumber = ISNULL(COUNT(*), 0) + 1
        FROM tbl_StockMovements
        WHERE request_id = @RequestId 
          AND request_type = 'replenishment'
          AND document_number IS NOT NULL;
        
        -- Формируем номер: ТТН-ПОП-{ID_ЗАЯВКИ}-{НОМЕР_ПОСТАВКИ}
        DECLARE @TtnNumber NVARCHAR(50) = 'ТТН-ПОП-' + 
                                          CAST(@RequestId AS NVARCHAR) + '-' + 
                                          RIGHT('00' + CAST(@DeliveryNumber AS NVARCHAR), 2);
        
        -- Записываем движение с УНИКАЛЬНЫМ ТТН-1
        INSERT INTO tbl_StockMovements (
            device_id, movement_type, quantity_change, previous_quantity, new_quantity,
            performed_by, notes, movement_date, request_id, request_type, document_number
        ) VALUES (
            @DeviceId, 'поступление по заявке', @ActualQuantity, @CurrentStock, @NewStock,
            @PerformedBy, CONCAT('Поступление по заявке на пополнение. Фактически поступило: ', @ActualQuantity, ' шт. ', ISNULL(@Notes, '')), 
            CAST(GETDATE() AS DATE), @RequestId, 'replenishment', @TtnNumber
        );
        
        -- Если заявка полностью выполнена, добавляем completed_at
        IF @NewStatus = 'completed'
        BEGIN
            UPDATE tbl_ReplenishmentRequests 
            SET completed_at = CAST(GETDATE() AS DATE)
            WHERE id = @RequestId;
        END
        
        COMMIT TRANSACTION;
        
        SELECT 
            1 AS Success,
            CONCAT('Выполнено ', @ActualQuantity, ' шт. Осталось: ', @NewRemaining, ' шт.') AS Message,
            @TtnNumber AS TtnNumber,
            @DeliveryNumber AS DeliveryNumber,
            @NewFulfilled AS FulfilledQuantity,
            @NewRemaining AS RemainingQuantity,
            @NewStatus AS Status;
        
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;
        
        SELECT 
            0 AS Success, 
            ERROR_MESSAGE() AS Message,
            NULL AS TtnNumber,
            NULL AS DeliveryNumber,
            NULL AS FulfilledQuantity,
            NULL AS RemainingQuantity,
            NULL AS Status;
    END CATCH
END
GO

-- Удаляем текущую процедуру
IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_AssignShipmentRequest')
    DROP PROCEDURE sp_AssignShipmentRequest;
GO

-- Процедура назначения сотрудника на заявку
CREATE OR ALTER PROCEDURE sp_AssignShipmentRequest
    @RequestId INT,
    @AssignedTo INT,
    @AssignedBy INT
AS
BEGIN
    SET NOCOUNT ON;
    
    BEGIN TRY
        BEGIN TRANSACTION;
        
        -- Проверяем, что заявка существует и имеет статус 'new'
        IF NOT EXISTS (SELECT 1 FROM tbl_ShipmentRequests WHERE id = @RequestId AND status = 'new')
        BEGIN
            SELECT 0 AS Success, 'Заявка не найдена или уже обрабатывается' AS Message;
            ROLLBACK TRANSACTION;
            RETURN;
        END
        
        -- Проверяем, что сотрудник существует и имеет роль employee
        IF NOT EXISTS (SELECT 1 FROM tbl_Users WHERE id = @AssignedTo AND role = 'employee' AND is_active = 1)
        BEGIN
            SELECT 0 AS Success, 'Сотрудник не найден или неактивен' AS Message;
            ROLLBACK TRANSACTION;
            RETURN;
        END
        
        -- Назначаем сотрудника
        UPDATE tbl_ShipmentRequests 
        SET assigned_to = @AssignedTo,
            status = 'processing',
            processed_by = @AssignedBy,
            processed_at = GETDATE()
        WHERE id = @RequestId;
        
        -- Получаем данные для уведомления
        DECLARE @RequestNumber NVARCHAR(50), @CustomerName NVARCHAR(255);
        SELECT @RequestNumber = request_number, @CustomerName = customer_name
        FROM tbl_ShipmentRequests
        WHERE id = @RequestId;
        
        COMMIT TRANSACTION;
        
        SELECT 
            1 AS Success, 
            'Сотрудник назначен на заявку' AS Message,
            @RequestNumber AS RequestNumber,
            @CustomerName AS CustomerName;
        
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;
        
        SELECT 0 AS Success, ERROR_MESSAGE() AS Message, NULL AS RequestNumber, NULL AS CustomerName;
    END CATCH
END
GO

-- Удаляем текущую процедуру
IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_ApproveReplenishment')
    DROP PROCEDURE sp_ApproveReplenishment;
GO

CREATE OR ALTER PROCEDURE sp_ApproveReplenishment
    @RequestId INT,
    @ApprovedBy INT
AS
BEGIN
    SET NOCOUNT ON;
    
    BEGIN TRY
        BEGIN TRANSACTION;
        
        -- Получаем данные заявки
        DECLARE @DeviceId INT, @Quantity INT, @CurrentQty INT, @NewQty INT;
        DECLARE @TnNumber NVARCHAR(50), @TtnNumber NVARCHAR(50);
        
        SELECT @DeviceId = device_id, @Quantity = quantity_requested
        FROM tbl_ReplenishmentRequests
        WHERE id = @RequestId AND status = 'pending';
        
        IF @DeviceId IS NULL
        BEGIN
            SELECT 0 AS Success, 'Заявка не найдена или уже обработана' AS Message;
            ROLLBACK TRANSACTION;
            RETURN;
        END
        
        -- Обновляем статус заявки (используем 'processing' вместо 'approved')
        UPDATE tbl_ReplenishmentRequests 
        SET status = 'processing', 
            approved_by = @ApprovedBy, 
            approved_at = CAST(GETDATE() AS DATE),
            fulfilled_quantity = @Quantity,
            remaining_quantity = 0,
            last_fulfilled_at = CAST(GETDATE() AS DATE)
        WHERE id = @RequestId;
        
        -- Получаем текущее количество на складе
        SELECT @CurrentQty = ISNULL(quantity, 0) FROM tbl_Stock WHERE device_id = @DeviceId;
        SET @NewQty = @CurrentQty + @Quantity;
        
        -- Обновляем склад
        IF EXISTS (SELECT 1 FROM tbl_Stock WHERE device_id = @DeviceId)
        BEGIN
            UPDATE tbl_Stock 
            SET quantity = @NewQty,
                last_updated = CAST(GETDATE() AS DATE),
                last_updated_by = @ApprovedBy
            WHERE device_id = @DeviceId;
        END
        ELSE
        BEGIN
            INSERT INTO tbl_Stock (device_id, quantity, min_quantity, last_updated_by, last_updated)
            VALUES (@DeviceId, @Quantity, 5, @ApprovedBy, CAST(GETDATE() AS DATE));
        END
        
        -- Генерируем номера документов
        SET @TnNumber = dbo.fn_GenerateTN2Number(@RequestId);
        SET @TtnNumber = dbo.fn_GenerateTTN1Number(@RequestId);
        
        -- Записываем движение с ТН-2
        INSERT INTO tbl_StockMovements (
            device_id, movement_type, quantity_change, previous_quantity, new_quantity,
            performed_by, notes, movement_date, request_id, request_type, document_number
        ) VALUES (
            @DeviceId, 'поступление по заявке', @Quantity, @CurrentQty, @NewQty,
            @ApprovedBy, 'Поступление по заявке на пополнение (ТН-2)', CAST(GETDATE() AS DATE),
            @RequestId, 'replenishment', @TnNumber
        );
        
        -- Записываем движение с ТТН-1
        INSERT INTO tbl_StockMovements (
            device_id, movement_type, quantity_change, previous_quantity, new_quantity,
            performed_by, notes, movement_date, request_id, request_type, document_number
        ) VALUES (
            @DeviceId, 'поступление по заявке', @Quantity, @CurrentQty, @NewQty,
            @ApprovedBy, 'Поступление по заявке на пополнение (ТТН-1)', CAST(GETDATE() AS DATE),
            @RequestId, 'replenishment', @TtnNumber
        );
        
        -- Обновляем статус заявки на completed
        UPDATE tbl_ReplenishmentRequests 
        SET status = 'completed', completed_at = CAST(GETDATE() AS DATE)
        WHERE id = @RequestId;
        
        COMMIT TRANSACTION;
        
        SELECT 
            1 AS Success, 
            'Заявка подтверждена, товар добавлен на склад' AS Message,
            @TnNumber AS TnNumber,
            @TtnNumber AS TtnNumber;
        
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;
        
        SELECT 0 AS Success, ERROR_MESSAGE() AS Message, NULL AS TnNumber, NULL AS TtnNumber;
    END CATCH
END
GO

CREATE OR ALTER PROCEDURE sp_RejectReplenishment
    @RequestId INT,
    @ApprovedBy INT
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @CreatedBy INT;
    
    SELECT @CreatedBy = created_by 
    FROM tbl_ReplenishmentRequests 
    WHERE id = @RequestId AND status = 'pending';
    
    UPDATE tbl_ReplenishmentRequests 
    SET status = 'rejected',
        approved_by = @ApprovedBy,
        approved_at = CAST(GETDATE() AS DATE),
        is_hidden_from_employee = 1
    WHERE id = @RequestId AND status = 'pending';
    
    IF @@ROWCOUNT = 0
    BEGIN
        SELECT 0 AS Success, 'Заявка не найдена или уже обработана' AS Message, NULL AS CreatedBy;
        RETURN;
    END
    
    SELECT 1 AS Success, 'Заявка отклонена' AS Message, @CreatedBy AS CreatedBy;
END
GO

-- Процедура удаления заявки на пополнение
CREATE PROCEDURE sp_DeleteReplenishmentRequest
    @RequestId INT
AS
BEGIN
    SET NOCOUNT ON;
    
    BEGIN TRY
        BEGIN TRANSACTION;
        
        DECLARE @Status NVARCHAR(50);
        SELECT @Status = status FROM tbl_ReplenishmentRequests WHERE id = @RequestId;
        
        IF @Status IS NULL
        BEGIN
            SELECT 0 AS Success, 'Заявка не найдена' AS Message;
            ROLLBACK TRANSACTION;
            RETURN;
        END
        
        IF @Status NOT IN ('completed', 'rejected')
        BEGIN
            SELECT 0 AS Success, 'Можно удалять только выполненные или отклоненные заявки' AS Message;
            ROLLBACK TRANSACTION;
            RETURN;
        END
        
        DELETE FROM tbl_ReplenishmentRequests WHERE id = @RequestId;
        
        COMMIT TRANSACTION;
        
        SELECT 1 AS Success, 'Заявка успешно удалена' AS Message;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;
        
        SELECT 0 AS Success, ERROR_MESSAGE() AS Message;
    END CATCH
END
GO

-- Удаляем старую процедуру
IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_CreateShipmentRequest')
    DROP PROCEDURE sp_CreateShipmentRequest;
GO

CREATE OR ALTER PROCEDURE sp_CreateShipmentRequest
    @CustomerName NVARCHAR(150),
    @CustomerContact NVARCHAR(100) = NULL,
    @CustomerAddress NVARCHAR(200) = NULL,
    @CustomerUnp NVARCHAR(20) = NULL,
    @CustomerPhone NVARCHAR(20) = NULL,
    @CustomerDirector NVARCHAR(255) = NULL,
    @RequiredDate DATE = NULL,
    @Notes NVARCHAR(MAX) = NULL,
    @CreatedBy INT,
    @NeedVehicle BIT = 1,
    @VehicleNumber NVARCHAR(50) = NULL,
    @TrailerNumber NVARCHAR(50) = NULL,
    @WaybillNumberTTN NVARCHAR(50) = NULL,
    @DriverLastName NVARCHAR(50) = NULL,
    @DriverFirstName NVARCHAR(50) = NULL,
    @DriverMiddleName NVARCHAR(50) = NULL,
    @DriverLicense NVARCHAR(50) = NULL,
    @ShippingDate DATE = NULL,
    @PowerOfAttorney NVARCHAR(100) = NULL,
    @BuyerLegalAddress NVARCHAR(500) = NULL,
    @BuyerBankAccount NVARCHAR(50) = NULL,
    @BuyerBankName NVARCHAR(255) = NULL,
    @BuyerBankCode NVARCHAR(20) = NULL,
    @DocumentSeries NVARCHAR(2) = NULL,
    @DocumentNumberBlank NVARCHAR(7) = NULL,
    @Items NVARCHAR(MAX)
AS
BEGIN
    SET NOCOUNT ON;
    
    BEGIN TRY
        BEGIN TRANSACTION;
        
        DECLARE @RequestNumber NVARCHAR(50) = dbo.fn_GenerateShipmentNumber();
        DECLARE @RequestId INT;
        
        -- 1. Вставляем заявку с новыми полями
        INSERT INTO tbl_ShipmentRequests (
            request_number, customer_name, customer_contact, customer_address, customer_unp,
            customer_phone, customer_director, required_date, notes, need_vehicle, 
            vehicle_number, trailer_number, waybill_number_ttn,
            driver_last_name, driver_first_name, driver_middle_name, driver_license,
            shipping_date, power_of_attorney, created_by, created_at, status,
            document_series, document_number_blank
        )
        VALUES (
            @RequestNumber, @CustomerName, @CustomerContact, @CustomerAddress, @CustomerUnp,
            @CustomerPhone, @CustomerDirector, @RequiredDate, @Notes, @NeedVehicle,
            @VehicleNumber, @TrailerNumber, @WaybillNumberTTN,
            @DriverLastName, @DriverFirstName, @DriverMiddleName, @DriverLicense,
            @ShippingDate, @PowerOfAttorney, @CreatedBy, CAST(GETDATE() AS DATE), 'new',
            @DocumentSeries, @DocumentNumberBlank
        );
        
        -- 2. Получаем ID созданной заявки
        SET @RequestId = SCOPE_IDENTITY();
        
        -- 3. Вставляем позиции
        INSERT INTO tbl_ShipmentRequestItems (request_id, device_id, quantity_requested, price_per_unit, status)
        SELECT 
            @RequestId,
            JSON_VALUE(value, '$.deviceId'),
            JSON_VALUE(value, '$.quantity'),
            JSON_VALUE(value, '$.price'),
            'pending'
        FROM OPENJSON(@Items);
        
        -- 4. Создаем договор
        DECLARE @ContractNumber NVARCHAR(50) = dbo.fn_GenerateContractNumber();
        DECLARE @TotalAmount DECIMAL(18,2);
        
        SELECT @TotalAmount = SUM(quantity_requested * price_per_unit)
        FROM tbl_ShipmentRequestItems
        WHERE request_id = @RequestId;
        
        -- Реквизиты поставщика
        DECLARE @SellerLegalAddress NVARCHAR(500) = 'г. Минск, ул. Гикало, д. 5';
        DECLARE @SellerBankAccount NVARCHAR(50) = 'BY13BELA30120000000000000000';
        DECLARE @SellerBankName NVARCHAR(255) = 'ОАО "АСБ Беларусбанк"';
        DECLARE @SellerBankCode NVARCHAR(20) = 'BAPBBY2X';
        
        -- Формируем JSON с данными договора
        DECLARE @ContractData NVARCHAR(MAX) = (
            SELECT 
                @ContractNumber AS number,
                FORMAT(CAST(GETDATE() AS DATE), 'dd.MM.yyyy') AS date,
                @RequestNumber AS request_number,
                @CustomerName AS customer_name,
                ISNULL(@CustomerUnp, '') AS customer_unp,
                ISNULL(@CustomerAddress, '') AS customer_address,
                ISNULL(@CustomerPhone, '') AS customer_phone,
                ISNULL(@CustomerDirector, '') AS customer_director,
                @TotalAmount AS total_amount
            FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
        );
        
        INSERT INTO tbl_Contracts (
            contract_number, request_id, contract_data, created_by, created_at, status,
            seller_legal_address, seller_bank_account, seller_bank_name, seller_bank_code,
            buyer_legal_address, buyer_bank_account, buyer_bank_name, buyer_bank_code
        )
        VALUES (
            @ContractNumber, @RequestId, @ContractData, @CreatedBy, CAST(GETDATE() AS DATE), 'active',
            @SellerLegalAddress, @SellerBankAccount, @SellerBankName, @SellerBankCode,
            @BuyerLegalAddress, @BuyerBankAccount, @BuyerBankName, @BuyerBankCode
        );
        
        -- 5. Обновляем номер договора в заявке
        UPDATE tbl_ShipmentRequests 
        SET contract_number = @ContractNumber 
        WHERE id = @RequestId;
        
        COMMIT TRANSACTION;
        
        SELECT 
            @RequestId AS RequestId,
            @RequestNumber AS RequestNumber,
            @ContractNumber AS ContractNumber,
            'Заявка на отгрузку создана' AS Message,
            1 AS Success;
            
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;
            
        SELECT 
            NULL AS RequestId,
            NULL AS RequestNumber,
            NULL AS ContractNumber,
            ERROR_MESSAGE() AS Message,
            0 AS Success;
    END CATCH
END
GO

CREATE OR ALTER PROCEDURE sp_GetShipmentRequests
    @Status NVARCHAR(50) = NULL,
    @UserId INT = NULL,
    @UserRole NVARCHAR(50) = NULL,
    @PageNumber INT = 1,
    @PageSize INT = 50
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @Offset INT = (@PageNumber - 1) * @PageSize;
    
    SELECT 
        s.id,
        s.request_number,
        s.customer_name,
        s.customer_contact,
        s.customer_address,
        s.customer_unp,
        s.required_date,
        s.status,
        s.contract_number,
        s.need_vehicle,
        s.vehicle_number,
        s.trailer_number,
        s.waybill_number_ttn,
        CONCAT(s.driver_last_name, ' ', s.driver_first_name, ISNULL(' ' + s.driver_middle_name, '')) as driver_name,
        s.driver_license,
        s.shipping_date,
        s.waybill_number,
        s.ttn_number,
        CONCAT(u1.last_name, ' ', u1.first_name, ISNULL(' ' + u1.middle_name, '')) as created_by_name,
        s.created_at,
        CONCAT(u2.last_name, ' ', u2.first_name, ISNULL(' ' + u2.middle_name, '')) as processed_by_name,
        s.processed_at,
        CONCAT(u3.last_name, ' ', u3.first_name, ISNULL(' ' + u3.middle_name, '')) as completed_by_name,
        s.completed_at,
        s.power_of_attorney,
        CONCAT(u4.last_name, ' ', u4.first_name, ISNULL(' ' + u4.middle_name, '')) as assigned_to_name,
        s.assigned_to,
        s.notes,
        COUNT(i.id) as items_count,
        ISNULL(SUM(i.quantity_requested), 0) as total_quantity,
        ISNULL(SUM(i.quantity_shipped), 0) as shipped_quantity,
        ISNULL(SUM(i.quantity_requested * i.price_per_unit), 0) as total_amount,
        ISNULL(SUM(i.quantity_shipped * i.price_per_unit), 0) as shipped_amount,
        COUNT(*) OVER() as total_count
    FROM tbl_ShipmentRequests s
    LEFT JOIN tbl_Users u1 ON s.created_by = u1.id
    LEFT JOIN tbl_Users u2 ON s.processed_by = u2.id
    LEFT JOIN tbl_Users u3 ON s.completed_by = u3.id
    LEFT JOIN tbl_Users u4 ON s.assigned_to = u4.id
    LEFT JOIN tbl_ShipmentRequestItems i ON s.id = i.request_id
    WHERE 1=1
        AND (
            @UserRole = 'admin'
            OR
            (@UserRole = 'manager' AND s.created_by = @UserId)
            OR
            (@UserRole = 'employee' AND s.assigned_to = @UserId)
        )
        AND (@Status IS NULL OR s.status = @Status)
    GROUP BY 
        s.id, s.request_number, s.customer_name, s.customer_contact, s.customer_address,
        s.customer_unp, s.required_date, s.status, s.contract_number, s.need_vehicle,
        s.vehicle_number, s.trailer_number, s.waybill_number_ttn,
        s.driver_last_name, s.driver_first_name, s.driver_middle_name, s.driver_license,
        s.shipping_date, s.waybill_number, s.ttn_number,
        u1.last_name, u1.first_name, u1.middle_name, s.created_at,
        u2.last_name, u2.first_name, u2.middle_name, s.processed_at,
        u3.last_name, u3.first_name, u3.middle_name, s.completed_at,
        u4.last_name, u4.first_name, u4.middle_name, s.assigned_to,
        s.power_of_attorney, s.notes
    ORDER BY 
        CASE 
            WHEN s.status = 'new' THEN 1
            WHEN s.status = 'processing' THEN 2
            WHEN s.status = 'partial' THEN 3
            ELSE 4
        END,
        s.created_at DESC
    OFFSET @Offset ROWS
    FETCH NEXT @PageSize ROWS ONLY;
END
GO

-- Процедура получения деталей заявки на отгрузку
CREATE PROCEDURE sp_GetShipmentRequestDetails
    @RequestId INT
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT * FROM vw_ShipmentRequests WHERE id = @RequestId;
    
    SELECT 
        i.*, d.unique_id, d.name as device_name, d.category, d.price
    FROM tbl_ShipmentRequestItems i
    JOIN tbl_Devices d ON i.device_id = d.id
    WHERE i.request_id = @RequestId
    ORDER BY d.name;
END
GO

-- Процедура начала обработки заявки
CREATE PROCEDURE sp_ProcessShipmentRequest
    @RequestId INT,
    @ProcessedBy INT
AS
BEGIN
    SET NOCOUNT ON;
    
    UPDATE tbl_ShipmentRequests 
    SET status = 'processing',
        processed_by = @ProcessedBy,
        processed_at = GETDATE()
    WHERE id = @RequestId AND status = 'new';
    
    IF @@ROWCOUNT = 0
    BEGIN
        SELECT 0 AS Success, 'Заявка не найдена или уже обрабатывается' AS Message;
        RETURN;
    END
    
    SELECT 1 AS Success, 'Заявка принята в обработку' AS Message;
END
GO

CREATE OR ALTER PROCEDURE sp_CompleteShipmentRequest
    @RequestId INT,
    @CompletedBy INT
AS
BEGIN
    SET NOCOUNT ON;
    
    BEGIN TRY
        BEGIN TRANSACTION;
        
        -- Получаем данные заявки
        DECLARE @CurrentStatus NVARCHAR(50), @CustomerName NVARCHAR(255), 
                @CustomerUnp NVARCHAR(20), @CustomerAddress NVARCHAR(500),
                @VehicleNumber NVARCHAR(50), @NeedVehicle BIT;
                
        SELECT 
            @CurrentStatus = status,
            @CustomerName = customer_name,
            @CustomerUnp = customer_unp,
            @CustomerAddress = customer_address,
            @VehicleNumber = ISNULL(vehicle_number, ''),
            @NeedVehicle = ISNULL(need_vehicle, 0)
        FROM tbl_ShipmentRequests 
        WHERE id = @RequestId;
        
        IF @CurrentStatus IS NULL
        BEGIN
            SELECT 0 AS Success, 'Заявка не найдена' AS Message, NULL AS Status;
            ROLLBACK TRANSACTION;
            RETURN;
        END
        
        IF @CurrentStatus NOT IN ('processing', 'partial')
        BEGIN
            SELECT 0 AS Success, 'Заявка должна быть в статусе "processing" или "partial"' AS Message, @CurrentStatus AS Status;
            ROLLBACK TRANSACTION;
            RETURN;
        END
        
        -- Создаем временную таблицу для позиций
        CREATE TABLE #Items (
            id INT,
            device_id INT,
            device_name NVARCHAR(255),
            device_model NVARCHAR(100),
            unique_id NVARCHAR(100),
            quantity_requested INT,
            quantity_shipped INT,
            price_per_unit DECIMAL(18,2)
        );
        
        INSERT INTO #Items
        SELECT 
            i.id,
            i.device_id,
            d.name,
            d.model,
            d.unique_id,
            i.quantity_requested,
            ISNULL(i.quantity_shipped, 0),
            i.price_per_unit
        FROM tbl_ShipmentRequestItems i
        JOIN tbl_Devices d ON i.device_id = d.id
        WHERE i.request_id = @RequestId;
        
        DECLARE @AnyShipped BIT = 0;
        DECLARE @AllShipped BIT = 1;
        
        DECLARE @ItemId INT, @DeviceId INT, @QuantityRequested INT, 
                @CurrentShipped INT, @Price DECIMAL(18,2), @DeviceName NVARCHAR(255),
                @DeviceModel NVARCHAR(100), @UniqueId NVARCHAR(100),
                @AvailableQuantity INT;
        
        DECLARE item_cursor CURSOR FOR 
        SELECT id, device_id, device_name, device_model, unique_id, 
               quantity_requested, quantity_shipped, price_per_unit 
        FROM #Items;
        
        OPEN item_cursor;
        FETCH NEXT FROM item_cursor INTO @ItemId, @DeviceId, @DeviceName, @DeviceModel, 
                                          @UniqueId, @QuantityRequested, @CurrentShipped, @Price;
        
        WHILE @@FETCH_STATUS = 0
        BEGIN
            -- Получаем доступное количество
            SELECT @AvailableQuantity = ISNULL(quantity, 0) 
            FROM tbl_Stock 
            WHERE device_id = @DeviceId;
            
            DECLARE @RemainingToShip INT = @QuantityRequested - @CurrentShipped;
            DECLARE @QuantityToShip INT = CASE 
                WHEN @AvailableQuantity >= @RemainingToShip THEN @RemainingToShip
                ELSE @AvailableQuantity
            END;
            
            IF @QuantityToShip > 0
            BEGIN
                DECLARE @CurrentQty INT;
                SELECT @CurrentQty = quantity FROM tbl_Stock WHERE device_id = @DeviceId;
                
                -- Обновляем склад
                UPDATE tbl_Stock 
                SET quantity = quantity - @QuantityToShip,
                    last_updated = CAST(GETDATE() AS DATE),
                    last_updated_by = @CompletedBy
                WHERE device_id = @DeviceId;
                
                -- Записываем движение
                INSERT INTO tbl_StockMovements (
                    device_id, movement_type, quantity_change,
                    previous_quantity, new_quantity, performed_by,
                    notes, movement_date, request_id, request_type
                ) VALUES (
                    @DeviceId, 'отгрузка по заявке', -@QuantityToShip,
                    @CurrentQty, @CurrentQty - @QuantityToShip, @CompletedBy,
                    'Отгрузка по заявке', CAST(GETDATE() AS DATE), @RequestId, 'shipment'
                );
                
                -- Обновляем позицию
                DECLARE @NewShipped INT = @CurrentShipped + @QuantityToShip;
                DECLARE @NewStatus NVARCHAR(50);
                
                IF @NewShipped >= @QuantityRequested
                    SET @NewStatus = 'shipped';
                ELSE
                    SET @NewStatus = 'partial';
                
                UPDATE tbl_ShipmentRequestItems 
                SET quantity_shipped = @NewShipped,
                    status = @NewStatus
                WHERE id = @ItemId;
                
                SET @AnyShipped = 1;
                
                IF @NewShipped < @QuantityRequested
                    SET @AllShipped = 0;
            END
            ELSE
            BEGIN
                SET @AllShipped = 0;
            END
            
            FETCH NEXT FROM item_cursor INTO @ItemId, @DeviceId, @DeviceName, @DeviceModel, 
                                              @UniqueId, @QuantityRequested, @CurrentShipped, @Price;
        END
        
        CLOSE item_cursor;
        DEALLOCATE item_cursor;
        
        DECLARE @NewRequestStatus NVARCHAR(50);
        
        IF @AnyShipped = 0
            SET @NewRequestStatus = 'processing';
        ELSE IF @AllShipped = 1
            SET @NewRequestStatus = 'shipped';
        ELSE
            SET @NewRequestStatus = 'partial';
        
        -- Генерация документов
DECLARE @TnNumber NVARCHAR(50) = NULL;
DECLARE @TtnNumber NVARCHAR(50) = NULL;

IF @AnyShipped = 1
BEGIN
    IF @NeedVehicle = 1
    BEGIN
        SET @TtnNumber = dbo.fn_GenerateTTN1Number(@RequestId);
        SET @TnNumber = NULL;
    END
    ELSE
    BEGIN
        SET @TnNumber = dbo.fn_GenerateTN2Number(@RequestId);
        SET @TtnNumber = NULL;
    END
END
        
        -- Обновляем заявку
        UPDATE tbl_ShipmentRequests 
        SET status = @NewRequestStatus,
            completed_by = CASE WHEN @AllShipped = 1 THEN @CompletedBy ELSE NULL END,
            completed_at = CASE WHEN @AllShipped = 1 THEN CAST(GETDATE() AS DATE) ELSE NULL END,
            waybill_number = @TnNumber,
            ttn_number = @TtnNumber
        WHERE id = @RequestId;
        
        DROP TABLE #Items;
        
        COMMIT TRANSACTION;
        
        SELECT 
            1 AS Success,
            CASE 
                WHEN @AllShipped = 1 THEN 
                    CASE 
                        WHEN @NeedVehicle = 1 THEN 'Отгрузка выполнена полностью. Сформирован ТТН-1.'
                        ELSE 'Отгрузка выполнена полностью. Сформирован ТН-2.'
                    END
                WHEN @AnyShipped = 1 THEN 
                    CASE 
                        WHEN @NeedVehicle = 1 THEN 'Отгрузка выполнена частично. Сформирован ТТН-1 на отгруженные позиции.'
                        ELSE 'Отгрузка выполнена частично. Сформирован ТН-2 на отгруженные позиции.'
                    END
                ELSE 'Недостаточно товара на складе'
            END AS Message,
            @NewRequestStatus AS Status,
            @TnNumber AS TnNumber,
            @TtnNumber AS TtnNumber;
            
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;
            
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        SELECT 0 AS Success, @ErrorMessage AS Message, NULL AS Status, NULL AS TnNumber, NULL AS TtnNumber;
    END CATCH
END
GO


CREATE OR ALTER PROCEDURE sp_UpdateShipmentRequest
    @RequestId INT,
    @CustomerName NVARCHAR(150),
    @CustomerContact NVARCHAR(100) = NULL,
    @CustomerAddress NVARCHAR(200) = NULL,
    @CustomerUnp NVARCHAR(20) = NULL,
    @RequiredDate DATE = NULL,
    @Notes NVARCHAR(MAX) = NULL,
    @NeedVehicle BIT = 1,
    @VehicleNumber NVARCHAR(50) = NULL,
    @DriverLastName NVARCHAR(50) = NULL,
    @DriverFirstName NVARCHAR(50) = NULL,
    @DriverMiddleName NVARCHAR(50) = NULL,
    @DriverLicense NVARCHAR(50) = NULL,
    @ShippingDate DATE = NULL,
    @Items NVARCHAR(MAX)
AS
BEGIN
    SET NOCOUNT ON;
    
    BEGIN TRY
        BEGIN TRANSACTION;
        
        DECLARE @CurrentStatus NVARCHAR(50), @CreatedBy INT;
        SELECT @CurrentStatus = status, @CreatedBy = created_by 
        FROM tbl_ShipmentRequests WHERE id = @RequestId;
        
        IF @CurrentStatus != 'new'
        BEGIN
            SELECT 0 AS Success, 'Нельзя редактировать заявку в статусе ' + @CurrentStatus AS Message;
            ROLLBACK TRANSACTION;
            RETURN;
        END
        
        UPDATE tbl_ShipmentRequests 
        SET customer_name = @CustomerName,
            customer_contact = @CustomerContact,
            customer_address = @CustomerAddress,
            customer_unp = @CustomerUnp,
            required_date = @RequiredDate,
            notes = @Notes,
            need_vehicle = @NeedVehicle,
            vehicle_number = @VehicleNumber,
            driver_last_name = @DriverLastName,
            driver_first_name = @DriverFirstName,
            driver_middle_name = @DriverMiddleName,
            driver_license = @DriverLicense,
            shipping_date = @ShippingDate
        WHERE id = @RequestId;
        
        DELETE FROM tbl_ShipmentRequestItems WHERE request_id = @RequestId;
        
        INSERT INTO tbl_ShipmentRequestItems (request_id, device_id, quantity_requested, price_per_unit, status)
        SELECT 
            @RequestId,
            JSON_VALUE(value, '$.deviceId'),
            JSON_VALUE(value, '$.quantity'),
            JSON_VALUE(value, '$.price'),
            'pending'
        FROM OPENJSON(@Items);
        
        -- Обновляем договор
        DECLARE @TotalAmount DECIMAL(18,2);
        SELECT @TotalAmount = SUM(quantity_requested * price_per_unit)
        FROM tbl_ShipmentRequestItems
        WHERE request_id = @RequestId;
        
        DECLARE @ContractData NVARCHAR(MAX);
        SELECT @ContractData = contract_data FROM tbl_Contracts WHERE request_id = @RequestId;
        
        IF @ContractData IS NOT NULL
        BEGIN
            SET @ContractData = JSON_MODIFY(@ContractData, '$.total_amount', @TotalAmount);
            SET @ContractData = JSON_MODIFY(@ContractData, '$.customer_name', @CustomerName);
            SET @ContractData = JSON_MODIFY(@ContractData, '$.customer_unp', @CustomerUnp);
            SET @ContractData = JSON_MODIFY(@ContractData, '$.customer_address', @CustomerAddress);
            
            UPDATE tbl_Contracts 
            SET contract_data = @ContractData
            WHERE request_id = @RequestId;
        END
        
        COMMIT TRANSACTION;
        
        SELECT 1 AS Success, 'Заявка успешно обновлена' AS Message;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;
        
        SELECT 0 AS Success, ERROR_MESSAGE() AS Message;
    END CATCH
END
GO

-- Процедура удаления заявки на отгрузку
CREATE PROCEDURE sp_DeleteShipmentRequest
    @RequestId INT,
    @UserId INT
AS
BEGIN
    SET NOCOUNT ON;
    
    BEGIN TRY
        BEGIN TRANSACTION;
        
        DECLARE @Status NVARCHAR(50), @CreatedBy INT;
        SELECT @Status = status, @CreatedBy = created_by 
        FROM tbl_ShipmentRequests WHERE id = @RequestId;
        
        IF @Status IS NULL
        BEGIN
            SELECT 0 AS Success, 'Заявка не найдена' AS Message;
            ROLLBACK TRANSACTION;
            RETURN;
        END
        
        IF @Status != 'new'
        BEGIN
            SELECT 0 AS Success, 'Можно удалять только новые заявки' AS Message;
            ROLLBACK TRANSACTION;
            RETURN;
        END
        
        IF @CreatedBy != @UserId
        BEGIN
            SELECT 0 AS Success, 'Вы можете удалять только свои заявки' AS Message;
            ROLLBACK TRANSACTION;
            RETURN;
        END
        
        IF EXISTS (SELECT 1 FROM tbl_ShipmentRequestItems WHERE request_id = @RequestId AND quantity_shipped > 0)
        BEGIN
            SELECT 0 AS Success, 'Нельзя удалить заявку, по которой уже были отгрузки' AS Message;
            ROLLBACK TRANSACTION;
            RETURN;
        END
        
        DELETE FROM tbl_Contracts WHERE request_id = @RequestId;
        DELETE FROM tbl_ShipmentRequestItems WHERE request_id = @RequestId;
        DELETE FROM tbl_ShipmentRequests WHERE id = @RequestId;
        
        COMMIT TRANSACTION;
        
        SELECT 1 AS Success, 'Заявка успешно удалена' AS Message;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;
        
        SELECT 0 AS Success, ERROR_MESSAGE() AS Message;
    END CATCH
END
GO

CREATE OR ALTER PROCEDURE sp_CreateInventory
    @InventoryDate DATE,
    @OrderNumber NVARCHAR(50) = NULL,
    @OrderDate DATE = NULL,
    @CommissionChairman NVARCHAR(255) = NULL,
    @CommissionMembers NVARCHAR(MAX) = NULL,
    @InventoryStartDate DATE = NULL,
    @InventoryEndDate DATE = NULL,
    @ResponsiblePerson NVARCHAR(255) = NULL,
    @Notes NVARCHAR(MAX) = NULL,
    @CreatedBy INT
AS
BEGIN
    SET NOCOUNT ON;
    
    BEGIN TRY
        BEGIN TRANSACTION;
        
        -- Проверяем дату
        IF @InventoryDate > CAST(GETDATE() AS DATE)
        BEGIN
            SELECT 0 AS Success, NULL AS InventoryId, NULL AS InventoryNumber, 'Дата инвентаризации не может быть в будущем' AS Message;
            ROLLBACK TRANSACTION;
            RETURN;
        END
        
        -- Генерируем номер
        DECLARE @InventoryNumber NVARCHAR(50);
        DECLARE @Year INT = YEAR(GETDATE());
        DECLARE @Seq INT;
        
        SELECT @Seq = ISNULL(MAX(CAST(RIGHT(inventory_number, 4) AS INT)), 0) + 1
        FROM tbl_Inventory
        WHERE inventory_number LIKE 'INV-' + CAST(@Year AS NVARCHAR) + '%';
        
        SET @InventoryNumber = 'INV-' + CAST(@Year AS NVARCHAR) + '-' +
                              RIGHT('0000' + CAST(ISNULL(@Seq, 1) AS NVARCHAR), 4);
        
        -- Вставляем инвентаризацию
        INSERT INTO tbl_Inventory (
            inventory_number, inventory_date, 
            order_number, order_date,
            commission_chairman, commission_members, 
            inventory_start_date, inventory_end_date,
            responsible_person,
            notes, created_by, created_at, status
        )
        VALUES (
            @InventoryNumber, @InventoryDate,
            @OrderNumber, @OrderDate,
            @CommissionChairman, @CommissionMembers,
            @InventoryStartDate, @InventoryEndDate,
            @ResponsiblePerson,
            @Notes, @CreatedBy, CAST(GETDATE() AS DATE), 'draft'
        );
        
        DECLARE @InventoryId INT = SCOPE_IDENTITY();
        
        -- Добавляем позиции
        INSERT INTO tbl_InventoryItems (inventory_id, device_id, book_quantity, actual_quantity)
        SELECT @InventoryId, d.id, ISNULL(s.quantity, 0), 0
        FROM tbl_Devices d
        LEFT JOIN tbl_Stock s ON d.id = s.device_id
        WHERE d.status = 'active';
        
        IF @@ROWCOUNT = 0
        BEGIN
            IF EXISTS (SELECT 1 FROM tbl_Devices)
            BEGIN
                INSERT INTO tbl_InventoryItems (inventory_id, device_id, book_quantity, actual_quantity)
                SELECT TOP 1 @InventoryId, id, 0, 0
                FROM tbl_Devices;
            END
            ELSE
            BEGIN
                INSERT INTO tbl_Devices (unique_id, name, status, created_by, created_at)
                VALUES ('TEST-001', 'Тестовый прибор', 'active', @CreatedBy, CAST(GETDATE() AS DATE));
                
                DECLARE @TestDeviceId INT = SCOPE_IDENTITY();
                
                INSERT INTO tbl_InventoryItems (inventory_id, device_id, book_quantity, actual_quantity)
                VALUES (@InventoryId, @TestDeviceId, 0, 0);
            END
        END
        
        COMMIT TRANSACTION;
        
        SELECT 
            1 AS Success,
            @InventoryId AS InventoryId,
            @InventoryNumber AS InventoryNumber,
            'Инвентаризация создана' AS Message;
            
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;
        
        SELECT 
            0 AS Success,
            NULL AS InventoryId,
            NULL AS InventoryNumber,
            ERROR_MESSAGE() AS Message;
    END CATCH
END
GO


-- Процедура получения списка инвентаризаций (ОБНОВЛЕННАЯ)
CREATE OR ALTER PROCEDURE sp_GetInventories
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT 
        i.id,
        i.inventory_number,
        i.inventory_date,
        i.status,
        CASE i.status
            WHEN 'draft' THEN 'Черновик'
            WHEN 'in_progress' THEN 'В процессе'
            WHEN 'completed' THEN 'Завершена'
        END as status_name,
        i.order_number,
        i.order_date,
        i.commission_chairman,
        i.responsible_person,
        i.notes,
CONCAT(u1.last_name, ' ', u1.first_name, ISNULL(' ' + u1.middle_name, '')) as created_by_name,
        i.created_at,
CONCAT(u2.last_name, ' ', u2.first_name, ISNULL(' ' + u2.middle_name, '')) as completed_by_name,
        i.completed_at,
        (SELECT COUNT(*) FROM tbl_InventoryItems WHERE inventory_id = i.id) as items_count,
        (SELECT COUNT(*) FROM tbl_InventoryItems WHERE inventory_id = i.id AND actual_quantity != book_quantity) as discrepancies_count
    FROM tbl_Inventory i
    LEFT JOIN tbl_Users u1 ON i.created_by = u1.id
    LEFT JOIN tbl_Users u2 ON i.completed_by = u2.id
    ORDER BY i.created_at DESC;
END
GO

-- Новая процедура для получения данных инвентаризации (для экспорта документов)
CREATE OR ALTER PROCEDURE sp_GetInventoryForExport
    @InventoryId INT
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Данные инвентаризации
    SELECT 
        i.id,
        i.inventory_number,
        i.inventory_date,
        i.order_number,
        i.order_date,
        i.commission_chairman,
        i.commission_members,
        i.inventory_start_date,
        i.inventory_end_date,
        i.responsible_person,
        i.notes,
        i.status,
CONCAT(u1.last_name, ' ', u1.first_name, ISNULL(' ' + u1.middle_name, '')) as created_by_name,
CONCAT(u2.last_name, ' ', u2.first_name, ISNULL(' ' + u2.middle_name, '')) as completed_by_name,
        i.completed_at,
        FORMAT(i.inventory_date, 'dd.MM.yyyy') as inventory_date_formatted,
        FORMAT(i.order_date, 'dd.MM.yyyy') as order_date_formatted,
        FORMAT(i.inventory_start_date, 'dd.MM.yyyy') as start_date_formatted,
        FORMAT(i.inventory_end_date, 'dd.MM.yyyy') as end_date_formatted,
        FORMAT(i.completed_at, 'dd.MM.yyyy') as completed_at_formatted
    FROM tbl_Inventory i
    LEFT JOIN tbl_Users u1 ON i.created_by = u1.id
    LEFT JOIN tbl_Users u2 ON i.completed_by = u2.id
    WHERE i.id = @InventoryId;
    
    -- Позиции с расчётом сумм
    SELECT 
        ROW_NUMBER() OVER (ORDER BY d.name) as row_num,
        d.id as device_id,
        d.unique_id,
        d.name,
        d.category,
        d.model,
        d.price,
        ii.book_quantity,
        ii.actual_quantity,
        ii.difference,
        ABS(ii.difference) * d.price as difference_value,
        ii.notes
    FROM tbl_InventoryItems ii
    JOIN tbl_Devices d ON ii.device_id = d.id
    WHERE ii.inventory_id = @InventoryId
    ORDER BY d.name;
END
GO

-- Процедура получения деталей инвентаризации (ОБНОВЛЕННАЯ)
CREATE OR ALTER PROCEDURE sp_GetInventoryDetails
    @InventoryId INT
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT 
        i.*,
        CASE i.status
            WHEN 'draft' THEN 'Черновик'
            WHEN 'in_progress' THEN 'В процессе'
            WHEN 'completed' THEN 'Завершена'
        END as status_name,
        CONCAT(u1.last_name, ' ', u1.first_name, ISNULL(' ' + u1.middle_name, '')) as created_by_name,
        CONCAT(u2.last_name, ' ', u2.first_name, ISNULL(' ' + u2.middle_name, '')) as completed_by_name
    FROM tbl_Inventory i
    LEFT JOIN tbl_Users u1 ON i.created_by = u1.id
    LEFT JOIN tbl_Users u2 ON i.completed_by = u2.id
    WHERE i.id = @InventoryId;
    
    SELECT 
        ii.id,
        ii.device_id,
        ii.book_quantity,
        ii.actual_quantity,
        ii.difference,
        ii.notes,
        d.unique_id,
        d.name,
        d.category,
        d.model,
        d.price
    FROM tbl_InventoryItems ii
    JOIN tbl_Devices d ON ii.device_id = d.id
    WHERE ii.inventory_id = @InventoryId
    ORDER BY d.name;
END
GO


-- Процедура обновления элемента инвентаризации (без изменений, но для полноты)
CREATE OR ALTER PROCEDURE sp_UpdateInventoryItem
    @ItemId INT,
    @ActualQuantity INT,
    @Notes NVARCHAR(500) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    UPDATE tbl_InventoryItems
    SET actual_quantity = @ActualQuantity,
        notes = @Notes
    WHERE id = @ItemId;
    
    SELECT 1 AS Success, 'Количество обновлено' AS Message;
END
GO

-- Процедура получения расхождений инвентаризации
CREATE OR ALTER PROCEDURE sp_GetInventoryDiscrepancies
    @InventoryId INT
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT 
        ii.id,
        ii.device_id,
        d.unique_id,
        d.name,
        d.category,
        d.model,
        d.price,
        ii.book_quantity,
        ii.actual_quantity,
        ii.difference,
        CASE 
            WHEN ii.difference > 0 THEN 'surplus'
            WHEN ii.difference < 0 THEN 'shortage'
            ELSE 'none'
        END as discrepancy_type,
        ABS(ii.difference) as discrepancy_quantity,
        d.price * ABS(ii.difference) as discrepancy_value,
        ii.notes
    FROM tbl_InventoryItems ii
    JOIN tbl_Devices d ON ii.device_id = d.id
    WHERE ii.inventory_id = @InventoryId 
      AND ii.actual_quantity != ii.book_quantity
    ORDER BY discrepancy_type, ABS(ii.difference) DESC;
END
GO

-- Процедура завершения инвентаризации (НЕ меняет склад)
CREATE OR ALTER PROCEDURE sp_CompleteInventory
    @InventoryId INT,
    @CompletedBy INT
AS
BEGIN
    SET NOCOUNT ON;
    
    BEGIN TRY
        BEGIN TRANSACTION;
        
        -- Проверяем, что инвентаризация существует и не завершена
        IF NOT EXISTS (SELECT 1 FROM tbl_Inventory WHERE id = @InventoryId AND status IN ('draft', 'in_progress'))
        BEGIN
            SELECT 0 AS Success, 'Инвентаризация не найдена или уже завершена' AS Message, 
                   0 AS DiscrepanciesCount, 0 AS SurplusCount, 0 AS ShortageCount;
            ROLLBACK TRANSACTION;
            RETURN;
        END
        
        -- Заполняем дату окончания, если не указана
        UPDATE tbl_Inventory 
        SET inventory_end_date = ISNULL(inventory_end_date, CAST(GETDATE() AS DATE))
        WHERE id = @InventoryId;
        
        -- Получаем статистику по расхождениям
        DECLARE @DiscrepanciesCount INT, @SurplusCount INT, @ShortageCount INT;
        
        SELECT 
            @DiscrepanciesCount = COUNT(*),
            @SurplusCount = SUM(CASE WHEN actual_quantity > book_quantity THEN 1 ELSE 0 END),
            @ShortageCount = SUM(CASE WHEN actual_quantity < book_quantity THEN 1 ELSE 0 END)
        FROM tbl_InventoryItems
        WHERE inventory_id = @InventoryId AND actual_quantity != book_quantity;
        
        -- Завершаем инвентаризацию
        UPDATE tbl_Inventory 
        SET status = 'completed',
            completed_at = CAST(GETDATE() AS DATE),
            completed_by = @CompletedBy
        WHERE id = @InventoryId;
        
        COMMIT TRANSACTION;
        
        SELECT 
            1 AS Success,
            'Инвентаризация завершена. Склад не корректировался.' AS Message,
            ISNULL(@DiscrepanciesCount, 0) AS DiscrepanciesCount,
            ISNULL(@SurplusCount, 0) AS SurplusCount,
            ISNULL(@ShortageCount, 0) AS ShortageCount;
        
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;
        
        SELECT 
            0 AS Success, 
            ERROR_MESSAGE() AS Message, 
            0 AS DiscrepanciesCount, 
            0 AS SurplusCount, 
            0 AS ShortageCount;
    END CATCH
END
GO


CREATE OR ALTER PROCEDURE sp_GetInventoryDiscrepancies
    @InventoryId INT
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT 
        ii.id,
        ii.device_id,
        d.unique_id,
        d.name,
        d.category,
        d.model,
        d.price,
        ii.book_quantity,
        ii.actual_quantity,
        ii.difference,
        CASE 
            WHEN ii.difference > 0 THEN 'surplus'
            WHEN ii.difference < 0 THEN 'shortage'
            ELSE 'none'
        END as discrepancy_type,
        ABS(ii.difference) as discrepancy_quantity,
        d.price * ABS(ii.difference) as discrepancy_value,
        ii.notes
    FROM tbl_InventoryItems ii
    JOIN tbl_Devices d ON ii.device_id = d.id
    WHERE ii.inventory_id = @InventoryId 
      AND ii.actual_quantity != ii.book_quantity
    ORDER BY discrepancy_type, ABS(ii.difference) DESC;
END
GO

-- Процедура удаления инвентаризации
CREATE PROCEDURE sp_DeleteInventory
    @InventoryId INT
AS
BEGIN
    SET NOCOUNT ON;
    
    BEGIN TRY
        BEGIN TRANSACTION;
        
        DELETE FROM tbl_InventoryItems WHERE inventory_id = @InventoryId;
        DELETE FROM tbl_Inventory WHERE id = @InventoryId;
        
        COMMIT TRANSACTION;
        
        SELECT 1 AS Success, 'Инвентаризация удалена' AS Message;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;
        
        SELECT 0 AS Success, ERROR_MESSAGE() AS Message;
    END CATCH
END
GO



-- Процедура получения статистики для дашборда
CREATE PROCEDURE sp_GetDashboardStats
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT 
        ISNULL(COUNT(*), 0) as total_devices,
        ISNULL(SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END), 0) as active_devices,
        ISNULL(SUM(CASE WHEN status = 'archived' THEN 1 ELSE 0 END), 0) as archived_devices
    FROM tbl_Devices;
    
    SELECT 
        ISNULL(COUNT(*), 0) as total_in_stock,
        ISNULL(SUM(quantity), 0) as total_quantity,
        ISNULL(SUM(CASE WHEN quantity <= min_quantity THEN 1 ELSE 0 END), 0) as needing_restock
    FROM tbl_Stock;
    
    SELECT 
        ISNULL(COUNT(*), 0) as total,
        ISNULL(SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END), 0) as pending,
        ISNULL(SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END), 0) as approved,
        ISNULL(SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END), 0) as completed,
        ISNULL(SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END), 0) as rejected
    FROM tbl_ReplenishmentRequests;
    
    SELECT 
        ISNULL(COUNT(*), 0) as total,
        ISNULL(SUM(CASE WHEN status = 'new' THEN 1 ELSE 0 END), 0) as new,
        ISNULL(SUM(CASE WHEN status = 'processing' THEN 1 ELSE 0 END), 0) as processing,
        ISNULL(SUM(CASE WHEN status = 'partial' THEN 1 ELSE 0 END), 0) as partial,
        ISNULL(SUM(CASE WHEN status = 'shipped' THEN 1 ELSE 0 END), 0) as shipped,
        ISNULL(SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END), 0) as completed,
        ISNULL(SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END), 0) as cancelled
    FROM tbl_ShipmentRequests;
END
GO

-- Процедура получения статистики по приборам
CREATE PROCEDURE sp_GetDeviceStats
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT 
        ISNULL(COUNT(*), 0) as total,
        ISNULL(SUM(CASE WHEN ISNULL(s.quantity, 0) > ISNULL(s.min_quantity, 5) THEN 1 ELSE 0 END), 0) as in_stock,
        ISNULL(SUM(CASE WHEN ISNULL(s.quantity, 0) <= ISNULL(s.min_quantity, 5) AND ISNULL(s.quantity, 0) > 0 THEN 1 ELSE 0 END), 0) as low_stock,
        ISNULL(SUM(CASE WHEN ISNULL(s.quantity, 0) = 0 THEN 1 ELSE 0 END), 0) as out_of_stock,
        ISNULL(SUM(ISNULL(s.quantity, 0)), 0) as total_quantity,
        ISNULL(SUM(CASE WHEN ISNULL(s.quantity, 0) <= ISNULL(s.min_quantity, 5) THEN 1 ELSE 0 END), 0) as needs_restock
    FROM tbl_Devices d
    LEFT JOIN tbl_Stock s ON d.id = s.device_id
    WHERE d.status = 'active';
    
    SELECT 
        ISNULL(d.category, 'Без категории') as category,
        COUNT(*) as device_count,
        ISNULL(SUM(ISNULL(s.quantity, 0)), 0) as total_quantity,
        ISNULL(SUM(CASE WHEN ISNULL(s.quantity, 0) = 0 THEN 1 ELSE 0 END), 0) as out_of_stock_count
    FROM tbl_Devices d
    LEFT JOIN tbl_Stock s ON d.id = s.device_id
    WHERE d.status = 'active'
    GROUP BY d.category
    ORDER BY device_count DESC;
    
    SELECT TOP 10
        sm.movement_date,
        d.unique_id,
        d.name,
        d.category,
        sm.movement_type,
        sm.quantity_change,
        sm.previous_quantity,
        sm.new_quantity,
ISNULL(CONCAT(u.last_name, ' ', u.first_name, ISNULL(' ' + u.middle_name, '')), 'Система') as performed_by_name
FROM tbl_StockMovements sm
    JOIN tbl_Devices d ON sm.device_id = d.id
    LEFT JOIN tbl_Users u ON sm.performed_by = u.id
    ORDER BY sm.movement_date DESC;
END
GO

-- Процедура получения отчета по складу
CREATE PROCEDURE sp_GetStockReport
    @Category NVARCHAR(100) = NULL,
    @Status NVARCHAR(50) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT 
        d.id,
        d.unique_id,
        d.name,
        d.category,
        d.manufacturer,
        d.model,
        d.price,
        ISNULL(s.quantity, 0) as quantity,
        ISNULL(s.min_quantity, 5) as min_quantity,
        s.location,
        s.shelf,
        CASE 
            WHEN ISNULL(s.quantity, 0) = 0 THEN 'Нет в наличии'
            WHEN ISNULL(s.quantity, 0) <= ISNULL(s.min_quantity, 5) THEN 'Мало на складе'
            ELSE 'В наличии'
        END as stock_status,
        (ISNULL(s.min_quantity, 5) - ISNULL(s.quantity, 0)) as shortage
    FROM tbl_Devices d
    LEFT JOIN tbl_Stock s ON d.id = s.device_id
    WHERE d.status = 'active'
        AND (@Category IS NULL OR @Category = 'all' OR d.category = @Category)
        AND (
            @Status IS NULL OR @Status = 'all' OR
            (@Status = 'in_stock' AND ISNULL(s.quantity, 0) > ISNULL(s.min_quantity, 5)) OR
            (@Status = 'low_stock' AND ISNULL(s.quantity, 0) > 0 AND ISNULL(s.quantity, 0) <= ISNULL(s.min_quantity, 5)) OR
            (@Status = 'out_of_stock' AND ISNULL(s.quantity, 0) = 0)
        )
    ORDER BY d.category, d.name;
END
GO

-- Процедура получения отчета по заказам
CREATE PROCEDURE sp_GetOrdersReport
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @Today DATE = CAST(GETDATE() AS DATE);
    DECLARE @Tomorrow DATE = DATEADD(DAY, 1, @Today);
    
    SELECT 
        sr.id,
        sr.request_number,
        sr.customer_name,
        sr.customer_unp,
        sr.created_at,
        sr.status,
        COUNT(sri.id) as items_count,
        ISNULL(SUM(sri.quantity_requested), 0) as total_quantity,
        ISNULL(SUM(sri.quantity_requested * sri.price_per_unit), 0) as total_amount
    FROM tbl_ShipmentRequests sr
    LEFT JOIN tbl_ShipmentRequestItems sri ON sr.id = sri.request_id
    WHERE CAST(sr.created_at AS DATE) = @Today
    GROUP BY sr.id, sr.request_number, sr.customer_name, sr.customer_unp, 
             sr.created_at, sr.status
    ORDER BY sr.created_at DESC;
    
    SELECT 
        sr.id,
        sr.request_number,
        sr.customer_name,
        sr.customer_unp,
        sr.required_date,
        sr.status,
        COUNT(sri.id) as items_count,
        ISNULL(SUM(sri.quantity_requested), 0) as total_quantity,
        ISNULL(SUM(sri.quantity_requested * sri.price_per_unit), 0) as total_amount
    FROM tbl_ShipmentRequests sr
    LEFT JOIN tbl_ShipmentRequestItems sri ON sr.id = sri.request_id
    WHERE sr.required_date = @Tomorrow AND sr.status NOT IN ('cancelled', 'completed')
    GROUP BY sr.id, sr.request_number, sr.customer_name, sr.customer_unp, 
             sr.required_date, sr.status
    ORDER BY sr.customer_name;
    
    SELECT 
        ISNULL((SELECT COUNT(*) FROM tbl_ShipmentRequests WHERE CAST(created_at AS DATE) = @Today), 0) as today_orders_count,
        ISNULL((SELECT ISNULL(SUM(sri.quantity_requested), 0) 
         FROM tbl_ShipmentRequests sr
         JOIN tbl_ShipmentRequestItems sri ON sr.id = sri.request_id
         WHERE CAST(sr.created_at AS DATE) = @Today), 0) as today_total_quantity,
        ISNULL((SELECT ISNULL(SUM(sri.quantity_requested * sri.price_per_unit), 0)
         FROM tbl_ShipmentRequests sr
         JOIN tbl_ShipmentRequestItems sri ON sr.id = sri.request_id
         WHERE CAST(sr.created_at AS DATE) = @Today), 0) as today_total_amount,
        ISNULL((SELECT COUNT(*) FROM tbl_ShipmentRequests WHERE required_date = @Tomorrow AND status NOT IN ('cancelled', 'completed')), 0) as tomorrow_orders_count,
        ISNULL((SELECT ISNULL(SUM(sri.quantity_requested), 0)
         FROM tbl_ShipmentRequests sr
         JOIN tbl_ShipmentRequestItems sri ON sr.id = sri.request_id
         WHERE sr.required_date = @Tomorrow AND sr.status NOT IN ('cancelled', 'completed')), 0) as tomorrow_total_quantity,
        ISNULL((SELECT ISNULL(SUM(sri.quantity_requested * sri.price_per_unit), 0)
         FROM tbl_ShipmentRequests sr
         JOIN tbl_ShipmentRequestItems sri ON sr.id = sri.request_id
         WHERE sr.required_date = @Tomorrow AND sr.status NOT IN ('cancelled', 'completed')), 0) as tomorrow_total_amount;
END
GO

-- Процедура получения отчета по продажам
CREATE PROCEDURE sp_GetSalesReport
    @StartDate DATE,
    @EndDate DATE,
    @GroupBy NVARCHAR(10) = 'day'
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT 
        sr.id,
        sr.request_number,
        sr.customer_name,
        sr.customer_unp,
        sr.completed_at as date,
        COUNT(sri.id) as items_count,
        ISNULL(SUM(sri.quantity_shipped), 0) as total_quantity,
        ISNULL(SUM(sri.quantity_shipped * sri.price_per_unit), 0) as total_amount
    FROM tbl_ShipmentRequests sr
    JOIN tbl_ShipmentRequestItems sri ON sr.id = sri.request_id
    WHERE sr.status IN ('shipped', 'completed')
        AND sr.completed_at >= @StartDate
        AND sr.completed_at < DATEADD(DAY, 1, @EndDate)
    GROUP BY sr.id, sr.request_number, sr.customer_name, sr.customer_unp, sr.completed_at
    ORDER BY sr.completed_at DESC;
    
    SELECT 
        CASE @GroupBy
            WHEN 'day' THEN CONVERT(NVARCHAR(10), MIN(sr.completed_at), 120)
            WHEN 'week' THEN CONVERT(NVARCHAR(7), DATEADD(DAY, 1 - DATEPART(WEEKDAY, MIN(sr.completed_at)), MIN(sr.completed_at)), 120)
            WHEN 'month' THEN CONVERT(NVARCHAR(7), MIN(sr.completed_at), 120)
            WHEN 'year' THEN CONVERT(NVARCHAR(4), YEAR(MIN(sr.completed_at)))
            ELSE CONVERT(NVARCHAR(10), MIN(sr.completed_at), 120)
        END as period_id,
        CASE @GroupBy
            WHEN 'day' THEN CONVERT(NVARCHAR, MIN(sr.completed_at), 104)
            WHEN 'week' THEN 'Неделя ' + CAST(DATEPART(WEEK, MIN(sr.completed_at)) AS NVARCHAR) + 
                          ', ' + CAST(YEAR(MIN(sr.completed_at)) AS NVARCHAR)
            WHEN 'month' THEN DATENAME(MONTH, MIN(sr.completed_at)) + ' ' + 
                          CAST(YEAR(MIN(sr.completed_at)) AS NVARCHAR)
            WHEN 'year' THEN CAST(YEAR(MIN(sr.completed_at)) AS NVARCHAR)
            ELSE CONVERT(NVARCHAR, MIN(sr.completed_at), 104)
        END as period_name,
        COUNT(DISTINCT sr.id) as orders_count,
        ISNULL(SUM(sri.quantity_shipped), 0) as total_quantity,
        ISNULL(SUM(sri.quantity_shipped * sri.price_per_unit), 0) as total_amount
    FROM tbl_ShipmentRequests sr
    JOIN tbl_ShipmentRequestItems sri ON sr.id = sri.request_id
    WHERE sr.status IN ('shipped', 'completed')
        AND sr.completed_at >= @StartDate
        AND sr.completed_at < DATEADD(DAY, 1, @EndDate)
    GROUP BY 
        CASE @GroupBy
            WHEN 'day' THEN CONVERT(NVARCHAR(10), sr.completed_at, 120)
            WHEN 'week' THEN CONVERT(NVARCHAR(7), DATEADD(DAY, 1 - DATEPART(WEEKDAY, sr.completed_at), sr.completed_at), 120)
            WHEN 'month' THEN CONVERT(NVARCHAR(7), sr.completed_at, 120)
            WHEN 'year' THEN CONVERT(NVARCHAR(4), YEAR(sr.completed_at))
            ELSE CONVERT(NVARCHAR(10), sr.completed_at, 120)
        END
    ORDER BY MIN(sr.completed_at);
    
    SELECT 
        ISNULL(COUNT(DISTINCT sr.id), 0) as total_orders,
        ISNULL(SUM(sri.quantity_shipped), 0) as total_quantity,
        ISNULL(SUM(sri.quantity_shipped * sri.price_per_unit), 0) as total_amount
    FROM tbl_ShipmentRequests sr
    JOIN tbl_ShipmentRequestItems sri ON sr.id = sri.request_id
    WHERE sr.status IN ('shipped', 'completed')
        AND sr.completed_at >= @StartDate
        AND sr.completed_at < DATEADD(DAY, 1, @EndDate);
END
GO

-- Процедура получения прайс-листа
CREATE PROCEDURE sp_GetPriceList
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT 
        d.unique_id,
        d.name,
        d.category,
        d.manufacturer,
        d.model,
        d.price
    FROM tbl_Devices d
    WHERE d.status = 'active' AND d.price > 0
    ORDER BY d.category, d.name;
END
GO

-- Процедура получения документов заявки
CREATE PROCEDURE sp_GetShipmentDocuments
    @RequestId INT
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT 
        request_number,
        waybill_number as document_number,
        'Товарная накладная (ТН-2)' as document_name,
        waybill_number as number,
        completed_at as document_date
    FROM tbl_ShipmentRequests
    WHERE id = @RequestId AND waybill_number IS NOT NULL
    
    UNION ALL
    
    SELECT 
        request_number,
        ttn_number as document_number,
        'Товарно-транспортная накладная (ТТН-1)' as document_name,
        ttn_number as number,
        completed_at as document_date
    FROM tbl_ShipmentRequests
    WHERE id = @RequestId AND ttn_number IS NOT NULL;
END
GO

-- Процедура получения документов пополнения
CREATE PROCEDURE sp_GetReplenishmentDocuments
    @RequestId INT
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT 
        sm.document_number,
        sm.movement_date as document_date,
        'Документ поступления' as document_name,
        sm.notes as description
    FROM tbl_StockMovements sm
    WHERE sm.request_id = @RequestId 
      AND sm.request_type = 'replenishment'
      AND sm.document_number IS NOT NULL;
END
GO


IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_PlaceDeviceOnRack')
    DROP PROCEDURE sp_PlaceDeviceOnRack;
GO

CREATE PROCEDURE sp_PlaceDeviceOnRack
    @DeviceId INT,
    @RackName NVARCHAR(50),
    @Quantity INT,
    @UserId INT
AS
BEGIN
    SET NOCOUNT ON;
    
    BEGIN TRY
        BEGIN TRANSACTION;
        
        -- Проверяем, что прибор существует
        IF NOT EXISTS (SELECT 1 FROM tbl_Devices WHERE id = @DeviceId AND status = 'active')
        BEGIN
            RAISERROR('Прибор не найден', 16, 1);
            RETURN;
        END
        
        -- Проверяем, что количество не превышает доступное
        DECLARE @TotalQuantity INT, @PlacedQuantity INT;
        
        SELECT @TotalQuantity = ISNULL(s.quantity, 0)
        FROM tbl_Stock s
        WHERE s.device_id = @DeviceId;
        
        SELECT @PlacedQuantity = ISNULL(SUM(quantity), 0)
        FROM tbl_RackPlacement
        WHERE device_id = @DeviceId;
        
        IF @Quantity > (@TotalQuantity - @PlacedQuantity)
        BEGIN
            RAISERROR('Недостаточно доступного количества для размещения', 16, 1);
            RETURN;
        END
        
        -- Объявляем переменные
        DECLARE @Remaining INT = @Quantity;
        DECLARE @Level INT, @Column INT, @CellQty INT, @AddQty INT;
        DECLARE @DeviceName NVARCHAR(255);
        
        SELECT @DeviceName = name FROM tbl_Devices WHERE id = @DeviceId;
        
        -- Временная таблица для хранения доступных ячеек
        CREATE TABLE #AvailableCells (
            cell_level INT,
            cell_column INT,
            current_quantity INT
        );
        
        WHILE @Remaining > 0
        BEGIN
            -- Очищаем временную таблицу
            DELETE FROM #AvailableCells;
            
            -- Заполняем ячейки с этим же прибором
            INSERT INTO #AvailableCells (cell_level, cell_column, current_quantity)
            SELECT cell_level, cell_column, quantity
            FROM tbl_RackPlacement
            WHERE rack_name = @RackName 
                AND device_id = @DeviceId 
                AND quantity < 10
            ORDER BY cell_level, cell_column;
            
            -- Если нет ячеек с этим прибором, добавляем пустые
            IF NOT EXISTS (SELECT 1 FROM #AvailableCells)
            BEGIN
                INSERT INTO #AvailableCells (cell_level, cell_column, current_quantity)
                SELECT lvl, col, 0
                FROM (
                    VALUES (1,1), (1,2), (1,3), (2,1), (2,2), (2,3), (3,1), (3,2), (3,3)
                ) AS cells(lvl, col)
                WHERE NOT EXISTS (
                    SELECT 1 FROM tbl_RackPlacement 
                    WHERE rack_name = @RackName AND cell_level = lvl AND cell_column = col
                )
                ORDER BY lvl, col;
            END
            
            -- Берем первую доступную ячейку
            SELECT TOP 1 
                @Level = cell_level,
                @Column = cell_column,
                @CellQty = current_quantity
            FROM #AvailableCells
            ORDER BY cell_level, cell_column;
            
            IF @Level IS NULL
            BEGIN
                RAISERROR('Нет свободных ячеек в стеллаже %s', 16, 1, @RackName);
                BREAK;
            END
            
            SET @AddQty = CASE WHEN @Remaining > (10 - @CellQty) THEN (10 - @CellQty) ELSE @Remaining END;
            
            IF @CellQty = 0
            BEGIN
                INSERT INTO tbl_RackPlacement (rack_name, cell_level, cell_column, device_id, quantity, updated_by, placed_at, last_updated)
                VALUES (@RackName, @Level, @Column, @DeviceId, @AddQty, @UserId, GETDATE(), GETDATE());
            END
            ELSE
            BEGIN
                UPDATE tbl_RackPlacement 
                SET quantity = @CellQty + @AddQty, last_updated = GETDATE(), updated_by = @UserId
                WHERE rack_name = @RackName AND cell_level = @Level AND cell_column = @Column;
            END
            
           -- Записываем историю размещения
INSERT INTO tbl_PlacementHistory 
    (device_id, device_name, action_type, rack_name, cell_level, cell_column, quantity_change, new_quantity, notes, performed_by, performed_at)
VALUES 
    (@DeviceId, LEFT(@DeviceName, 150), 'placed', @RackName, @Level, @Column, @AddQty, @CellQty + @AddQty, 
     CONCAT('Размещено в стеллаже ', @RackName, ' (уровень ', @Level, ', колонка ', @Column, ')'), 
     @UserId, CAST(GETDATE() AS DATE));
            
            SET @Remaining = @Remaining - @AddQty;
            SET @Level = NULL;
            SET @Column = NULL;
        END
        
        DROP TABLE #AvailableCells;
        
        COMMIT TRANSACTION;
        
        SELECT 1 AS Success, 'Прибор успешно размещен' AS Message;
        
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        IF EXISTS (SELECT 1 FROM tempdb.sys.tables WHERE name LIKE '#AvailableCells%')
            DROP TABLE #AvailableCells;
        SELECT 0 AS Success, ERROR_MESSAGE() AS Message;
    END CATCH
END
GO

PRINT '✅ Процедура sp_PlaceDeviceOnRack успешно создана';

IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[fn_GetUnplacedDevices]') AND type in (N'FN', N'IF', N'TF'))
    DROP FUNCTION fn_GetUnplacedDevices;
GO

CREATE FUNCTION fn_GetUnplacedDevices()
RETURNS TABLE
AS
RETURN
(
    SELECT 
        d.id,
        d.unique_id,
        d.name,
        d.category,
        d.price,
        ISNULL(s.quantity, 0) as total_quantity,
        ISNULL((
            SELECT SUM(rp.quantity) 
            FROM tbl_RackPlacement rp 
            WHERE rp.device_id = d.id
        ), 0) as placed_quantity
    FROM tbl_Devices d
    JOIN tbl_Stock s ON d.id = s.device_id
    WHERE d.status = 'active' 
        AND ISNULL(s.quantity, 0) > 0
        AND ISNULL(s.quantity, 0) > ISNULL((
            SELECT SUM(rp.quantity) 
            FROM tbl_RackPlacement rp 
            WHERE rp.device_id = d.id
        ), 0)
);
GO



IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_tbl_Users_Email')
    CREATE INDEX IX_tbl_Users_Email ON tbl_Users(email);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_tbl_Users_Role')
    CREATE INDEX IX_tbl_Users_Role ON tbl_Users(role);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_tbl_Users_IsActive')
    CREATE INDEX IX_tbl_Users_IsActive ON tbl_Users(is_active);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_tbl_Devices_UniqueId')
    CREATE INDEX IX_tbl_Devices_UniqueId ON tbl_Devices(unique_id);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_tbl_Devices_Category')
    CREATE INDEX IX_tbl_Devices_Category ON tbl_Devices(category);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_tbl_Devices_Status')
    CREATE INDEX IX_tbl_Devices_Status ON tbl_Devices(status);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_tbl_Devices_Price')
    CREATE INDEX IX_tbl_Devices_Price ON tbl_Devices(price);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_tbl_Stock_DeviceId')
    CREATE INDEX IX_tbl_Stock_DeviceId ON tbl_Stock(device_id);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_tbl_Stock_Location')
    CREATE INDEX IX_tbl_Stock_Location ON tbl_Stock(location);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_tbl_Stock_Quantity')
    CREATE INDEX IX_tbl_Stock_Quantity ON tbl_Stock(quantity, min_quantity);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_tbl_StockMovements_DeviceId')
    CREATE INDEX IX_tbl_StockMovements_DeviceId ON tbl_StockMovements(device_id);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_tbl_StockMovements_Date')
    CREATE INDEX IX_tbl_StockMovements_Date ON tbl_StockMovements(movement_date);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_tbl_StockMovements_Type')
    CREATE INDEX IX_tbl_StockMovements_Type ON tbl_StockMovements(movement_type);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_tbl_StockMovements_RequestId')
    CREATE INDEX IX_tbl_StockMovements_RequestId ON tbl_StockMovements(request_id, request_type);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_tbl_DeviceImages_DeviceId')
    CREATE INDEX IX_tbl_DeviceImages_DeviceId ON tbl_DeviceImages(device_id);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_tbl_DeviceImages_Type')
    CREATE INDEX IX_tbl_DeviceImages_Type ON tbl_DeviceImages(image_type);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_tbl_ReplenishmentRequests_Status')
    CREATE INDEX IX_tbl_ReplenishmentRequests_Status ON tbl_ReplenishmentRequests(status);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_tbl_ReplenishmentRequests_CreatedBy')
    CREATE INDEX IX_tbl_ReplenishmentRequests_CreatedBy ON tbl_ReplenishmentRequests(created_by);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_tbl_ReplenishmentRequests_Device')
    CREATE INDEX IX_tbl_ReplenishmentRequests_Device ON tbl_ReplenishmentRequests(device_id);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_tbl_ShipmentRequests_Status')
    CREATE INDEX IX_tbl_ShipmentRequests_Status ON tbl_ShipmentRequests(status);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_tbl_ShipmentRequests_CreatedBy')
    CREATE INDEX IX_tbl_ShipmentRequests_CreatedBy ON tbl_ShipmentRequests(created_by);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_tbl_ShipmentRequests_RequestNumber')
    CREATE INDEX IX_tbl_ShipmentRequests_RequestNumber ON tbl_ShipmentRequests(request_number);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_tbl_ShipmentRequests_Customer')
    CREATE INDEX IX_tbl_ShipmentRequests_Customer ON tbl_ShipmentRequests(customer_name, customer_unp);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_tbl_ShipmentRequests_RequiredDate')
    CREATE INDEX IX_tbl_ShipmentRequests_RequiredDate ON tbl_ShipmentRequests(required_date);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_tbl_ShipmentRequestItems_RequestId')
    CREATE INDEX IX_tbl_ShipmentRequestItems_RequestId ON tbl_ShipmentRequestItems(request_id);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_tbl_ShipmentRequestItems_DeviceId')
    CREATE INDEX IX_tbl_ShipmentRequestItems_DeviceId ON tbl_ShipmentRequestItems(device_id);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_tbl_ShipmentRequestItems_Status')
    CREATE INDEX IX_tbl_ShipmentRequestItems_Status ON tbl_ShipmentRequestItems(status);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_tbl_Contracts_RequestId')
    CREATE INDEX IX_tbl_Contracts_RequestId ON tbl_Contracts(request_id);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_tbl_Contracts_ContractNumber')
    CREATE INDEX IX_tbl_Contracts_ContractNumber ON tbl_Contracts(contract_number);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_tbl_Contracts_Status')
    CREATE INDEX IX_tbl_Contracts_Status ON tbl_Contracts(status);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_tbl_Inventory_Number')
    CREATE INDEX IX_tbl_Inventory_Number ON tbl_Inventory(inventory_number);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_tbl_Inventory_Date')
    CREATE INDEX IX_tbl_Inventory_Date ON tbl_Inventory(inventory_date);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_tbl_Inventory_Status')
    CREATE INDEX IX_tbl_Inventory_Status ON tbl_Inventory(status);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_tbl_InventoryItems_Inventory')
    CREATE INDEX IX_tbl_InventoryItems_Inventory ON tbl_InventoryItems(inventory_id);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_tbl_InventoryItems_Device')
    CREATE INDEX IX_tbl_InventoryItems_Device ON tbl_InventoryItems(device_id);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_tbl_PriceHistory_Device')
    CREATE INDEX IX_tbl_PriceHistory_Device ON tbl_PriceHistory(device_id);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_tbl_PriceHistory_ChangedAt')
    CREATE INDEX IX_tbl_PriceHistory_ChangedAt ON tbl_PriceHistory(changed_at);


PRINT '✅ Индексы созданы';
GO


-- ОЧИСТКА
DELETE FROM tbl_PlacementHistory;
DELETE FROM tbl_RackPlacement;
DELETE FROM tbl_StockMovements;
DELETE FROM tbl_Stock;
DELETE FROM tbl_Devices;

-- 1. ПОЛЬЗОВАТЕЛИ
INSERT INTO tbl_Users (email, password_hash, last_name, first_name, middle_name, role, phone, created_at, is_active)
VALUES 
    ('admin@atomtech.by', 'admin123', 'Администратор', 'Системы', NULL, 'admin', NULL, CAST(GETDATE() AS DATE), 1),
    ('manager@atomtech.by', 'manager123', 'Иванов', 'Иван', 'Иванович', 'manager', '+375291234567', CAST(GETDATE() AS DATE), 1),
    ('employee@atomtech.by', 'employee123', 'Петров', 'Петр', 'Петрович', 'employee', '+375293334455', CAST(GETDATE() AS DATE), 1);

DECLARE @AdminId INT = (SELECT id FROM tbl_Users WHERE email = 'admin@atomtech.by');

-- 2. ПРИБОРЫ (15 штук)
INSERT INTO tbl_Devices (unique_id, name, category, description, manufacturer, model, price, created_by, created_at, status)
VALUES 
    ('DOS-001', 'Дозиметр ДКС-01', 'Дозиметры', 'Бытовой дозиметр', 'НПУП «АТОМТЕХ»', 'ДКС-01', 450.00, @AdminId, GETDATE(), 'active'),
    ('DOS-002', 'Дозиметр ДКС-02', 'Дозиметры', 'Профессиональный дозиметр', 'НПУП «АТОМТЕХ»', 'ДКС-02', 1250.00, @AdminId, GETDATE(), 'active'),
    ('DOS-003', 'Дозиметр ДКС-03', 'Дозиметры', 'Карманный дозиметр', 'НПУП «АТОМТЕХ»', 'ДКС-03', 890.00, @AdminId, GETDATE(), 'active'),
    ('DOS-004', 'Дозиметр МКС-01', 'Дозиметры', 'Многофункциональный дозиметр', 'НПУП «АТОМТЕХ»', 'МКС-01', 3200.00, @AdminId, GETDATE(), 'active'),
    ('DOS-005', 'Дозиметр РАД-01', 'Дозиметры', 'Радиометр-дозиметр', 'НПУП «АТОМТЕХ»', 'РАД-01', 2100.00, @AdminId, GETDATE(), 'active'),
    ('SPE-001', 'Спектрометр СКС-50', 'Спектрометры', 'Сцинтилляционный спектрометр', 'НПУП «АТОМТЕХ»', 'СКС-50', 24500.00, @AdminId, GETDATE(), 'active'),
    ('SPE-002', 'Спектрометр СКС-100', 'Спектрометры', 'Портативный спектрометр', 'НПУП «АТОМТЕХ»', 'СКС-100', 18900.00, @AdminId, GETDATE(), 'active'),
    ('SPE-003', 'Спектрометр БС-02', 'Спектрометры', 'Бета-спектрометр', 'НПУП «АТОМТЕХ»', 'БС-02', 28700.00, @AdminId, GETDATE(), 'active'),
    ('IND-001', 'Индикатор ИР-01', 'Индикаторы', 'Портативный индикатор', 'НПУП «АТОМТЕХ»', 'ИР-01', 180.00, @AdminId, GETDATE(), 'active'),
    ('IND-002', 'Индикатор РИ-02', 'Индикаторы', 'Радиационный индикатор', 'НПУП «АТОМТЕХ»', 'РИ-02', 145.00, @AdminId, GETDATE(), 'active'),
    ('IND-003', 'Индикатор СБ-02', 'Индикаторы', 'Сигнализатор безопасности', 'НПУП «АТОМТЕХ»', 'СБ-02', 320.00, @AdminId, GETDATE(), 'active'),
    ('IND-004', 'Индикатор СБ-03', 'Индикаторы', 'Сигнализатор с вибрацией', 'НПУП «АТОМТЕХ»', 'СБ-03', 450.00, @AdminId, GETDATE(), 'active'),
    ('RAD-001', 'Радиометр РКС-10', 'Радиометры', 'Универсальный радиометр', 'НПУП «АТОМТЕХ»', 'РКС-10', 12500.00, @AdminId, GETDATE(), 'active'),
    ('RAD-002', 'Радиометр РС-05', 'Радиометры', 'Спектрометрический радиометр', 'НПУП «АТОМТЕХ»', 'РС-05', 19800.00, @AdminId, GETDATE(), 'active'),
    ('DET-001', 'Детектор ГД-10', 'Детекторы', 'Газоразрядный детектор', 'НПУП «АТОМТЕХ»', 'ГД-10', 8900.00, @AdminId, GETDATE(), 'active');

-- 3. СКЛАД (все приборы с количеством 0)
INSERT INTO tbl_Stock (device_id, quantity, min_quantity, location, shelf, notes, last_updated_by, last_updated)
SELECT 
    id, 0, 5, NULL, NULL, 'Нет в наличии', @AdminId, GETDATE()
FROM tbl_Devices;

-- Обновляем статусы для корректности (если есть старые данные)
UPDATE tbl_ReplenishmentRequests 
SET status = 'processing' 
WHERE status = 'approved';

UPDATE tbl_ReplenishmentRequests 
SET fulfilled_quantity = quantity_requested,
    remaining_quantity = 0
WHERE status = 'completed' AND (fulfilled_quantity = 0 OR fulfilled_quantity IS NULL);

UPDATE tbl_ReplenishmentRequests 
SET remaining_quantity = quantity_requested - ISNULL(fulfilled_quantity, 0)
WHERE status IN ('pending', 'processing');


