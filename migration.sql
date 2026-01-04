-- Migration script for adding authentication to Access database
-- This creates a new table to store user authentication data

-- =============================================
-- Table: tblFreelancerAuth
-- Purpose: Store authentication credentials and OAuth tokens
-- =============================================

CREATE TABLE tblFreelancerAuth (
    -- Primary Key
    AuthID COUNTER PRIMARY KEY,
    
    -- Foreign Key to Freelancer
    FreelancerID INTEGER NOT NULL,
    
    -- Authentication Fields
    Email VARCHAR(255) NOT NULL UNIQUE,
    PasswordHash VARCHAR(255), -- For credentials login (migration period)
    GoogleId VARCHAR(255) UNIQUE, -- Google OAuth identifier
    
    -- Account Status
    IsActive BIT DEFAULT 1,
    EmailVerified BIT DEFAULT 0,
    
    -- Security
    PasswordResetToken VARCHAR(255),
    PasswordResetExpiry DATETIME,
    
    -- Timestamps
    CreatedAt DATETIME DEFAULT NOW(),
    UpdatedAt DATETIME DEFAULT NOW(),
    LastLoginAt DATETIME,
    
    -- Constraints
    CONSTRAINT FK_Freelancer FOREIGN KEY (FreelancerID) 
        REFERENCES tblFreelancerWebsiteData(FreelancerID)
        ON DELETE CASCADE
);

-- =============================================
-- Indexes for Performance
-- =============================================

CREATE INDEX idx_email ON tblFreelancerAuth(Email);
CREATE INDEX idx_google_id ON tblFreelancerAuth(GoogleId);
CREATE INDEX idx_freelancer_id ON tblFreelancerAuth(FreelancerID);

-- =============================================
-- View: vwFreelancerAuth (for read-only web access)
-- =============================================

CREATE VIEW vwFreelancerAuthWEB AS
SELECT 
    auth.AuthID,
    auth.FreelancerID,
    auth.Email,
    auth.PasswordHash,
    auth.GoogleId,
    auth.IsActive,
    auth.EmailVerified,
    auth.LastLoginAt,
    f.DisplayName,
    f.Slug,
    f.PhotoBlobID
FROM tblFreelancerAuth auth
INNER JOIN tblFreelancerWebsiteData f ON auth.FreelancerID = f.FreelancerID
WHERE auth.IsActive = 1;

-- =============================================
-- Migration Script: Link existing WordPress users
-- =============================================

-- This script would need to be run with WordPress data
-- Example structure (adapt based on WordPress export):

/*
INSERT INTO tblFreelancerAuth (FreelancerID, Email, PasswordHash, IsActive, EmailVerified)
SELECT 
    f.FreelancerID,
    wp.user_email,
    wp.user_pass, -- WordPress password hash (will need rehashing)
    1,
    1
FROM tblFreelancerWebsiteData f
INNER JOIN wp_users wp ON f.Email = wp.user_email;
*/

-- =============================================
-- Sample Data for Testing (REMOVE IN PRODUCTION)
-- =============================================

-- Test user with hashed password (password: "test123")
-- INSERT INTO tblFreelancerAuth (FreelancerID, Email, PasswordHash, IsActive, EmailVerified)
-- VALUES (
--     1, 
--     'test@freelancers.com.au',
--     '$2a$10$YourHashedPasswordHere',
--     1,
--     1
-- );