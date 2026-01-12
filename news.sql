-- News Management Table Schema

-- Table to store news items
CREATE TABLE tblNewsItems (
    NewsItemID INT IDENTITY(1,1) PRIMARY KEY,
    Title NVARCHAR(200) NOT NULL,
    Description NVARCHAR(500),
    PDFBlobID NVARCHAR(100) NOT NULL,  -- Azure Blob Storage ID
    PDFFileName NVARCHAR(255) NOT NULL,
    DisplayOrder INT DEFAULT 0,
    IsActive BIT DEFAULT 1,
    CreatedByUserID INT,
    CreatedDate DATETIME DEFAULT GETDATE(),
    ModifiedDate DATETIME DEFAULT GETDATE(),
    PublishDate DATETIME DEFAULT GETDATE()
);

-- Index for active news items ordered by publish date
CREATE INDEX IX_NewsItems_Active_PublishDate 
ON tblNewsItems(IsActive, PublishDate DESC);

-- View for website display (only active news, ordered by publish date)
CREATE VIEW vwNewsItemsWEB AS
SELECT 
    NewsItemID,
    Title,
    Description,
    PDFBlobID,
    PDFFileName,
    PublishDate
FROM tblNewsItems
WHERE IsActive = 1
ORDER BY PublishDate DESC;