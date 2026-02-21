DROP TABLE IF EXISTS EvaluationAnswer;
DROP TABLE IF EXISTS SkillEvaluation;
DROP TABLE IF EXISTS QuestionOption;
DROP TABLE IF EXISTS SkillQuestion;
DROP TABLE IF EXISTS Portfolio;
DROP TABLE IF EXISTS Review;
DROP TABLE IF EXISTS Message;
DROP TABLE IF EXISTS Conversation;
DROP TABLE IF EXISTS VideoSession;
DROP TABLE IF EXISTS Payment;
DROP TABLE IF EXISTS Session;
DROP TABLE IF EXISTS PaidExchange;
DROP TABLE IF EXISTS Exchange;
DROP TABLE IF EXISTS OfferTimeSlot;
DROP TABLE IF EXISTS RequestedSkill;
DROP TABLE IF EXISTS OfferedSkill;
DROP TABLE IF EXISTS Skill;
DROP TABLE IF EXISTS SkillCategory;
DROP TABLE IF EXISTS Admin;
DROP TABLE IF EXISTS Student;
DROP TABLE IF EXISTS User;
DROP TABLE IF EXISTS University;

DROP VIEW IF EXISTS vw_StudentProfile;
DROP VIEW IF EXISTS vw_ExchangeSummary;
DROP VIEW IF EXISTS vw_SkillLeaderboard;
CREATE TABLE University (
    UniversityID   INT          NOT NULL AUTO_INCREMENT,
    UniversityName VARCHAR(200) NOT NULL,
    Address        VARCHAR(300),
    ContactEmail   VARCHAR(255),
    CreatedAt      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (UniversityID),
    UNIQUE KEY uq_university_email (ContactEmail)
);
CREATE TABLE User (
    UserID       INT          NOT NULL AUTO_INCREMENT,
    Email        VARCHAR(255) NOT NULL,
    PasswordHash VARCHAR(255) NOT NULL,
    FullName     VARCHAR(200) NOT NULL,
    PhoneNumber  VARCHAR(30),
    CreatedAt    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    LastLogin    DATETIME,
    PRIMARY KEY (UserID),
    UNIQUE KEY uq_user_email (Email)
);
CREATE TABLE Student (
    StudentID        INT        NOT NULL,
    UniversityID     INT        NOT NULL,
    ReputationPoints INT        NOT NULL DEFAULT 0,
    Bio              TEXT,
    IsAdminVerified  TINYINT(1) NOT NULL DEFAULT 0,
    CreatedAt        DATETIME   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (StudentID),
    CONSTRAINT fk_student_user FOREIGN KEY (StudentID)
        REFERENCES User(UserID) ON DELETE CASCADE,
    CONSTRAINT fk_student_university FOREIGN KEY (UniversityID)
        REFERENCES University(UniversityID)
);
CREATE TABLE Admin (
    AdminID      INT         NOT NULL,
    UniversityID INT         NOT NULL,
    AdminLevel   VARCHAR(50) NOT NULL DEFAULT 'standard',
    CreatedAt    DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (AdminID),
    CONSTRAINT fk_admin_user FOREIGN KEY (AdminID)
        REFERENCES User(UserID) ON DELETE CASCADE,
    CONSTRAINT fk_admin_university FOREIGN KEY (UniversityID)
        REFERENCES University(UniversityID)
);
CREATE TABLE SkillCategory (
    CategoryID   INT          NOT NULL AUTO_INCREMENT,
    CategoryName VARCHAR(150) NOT NULL,
    Description  TEXT,
    CreatedAt    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (CategoryID),
    UNIQUE KEY uq_category_name (CategoryName)
);
CREATE TABLE Skill (
    SkillID         INT          NOT NULL AUTO_INCREMENT,
    CategoryID      INT          NOT NULL,
    SkillName       VARCHAR(150) NOT NULL,
    Description     TEXT,
    DifficultyLevel ENUM('beginner','intermediate','advanced') DEFAULT 'beginner',
    CreatedAt       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (SkillID),
    CONSTRAINT fk_skill_category FOREIGN KEY (CategoryID)
        REFERENCES SkillCategory(CategoryID)
);
CREATE TABLE OfferedSkill (
    OfferID      INT             NOT NULL AUTO_INCREMENT,
    StudentID    INT             NOT NULL,
    SkillID      INT             NOT NULL,
    IsPaid       TINYINT(1)      NOT NULL DEFAULT 0,
    PricePerHour DECIMAL(10,2)   DEFAULT NULL,
    Description  TEXT,
    CreatedAt    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (OfferID),
    CONSTRAINT fk_offer_student FOREIGN KEY (StudentID)
        REFERENCES Student(StudentID) ON DELETE CASCADE,
    CONSTRAINT fk_offer_skill FOREIGN KEY (SkillID)
        REFERENCES Skill(SkillID),
    CONSTRAINT chk_price CHECK (PricePerHour IS NULL OR PricePerHour >= 0)
);
CREATE TABLE RequestedSkill (
    RequestID     INT         NOT NULL AUTO_INCREMENT,
    StudentID     INT         NOT NULL,
    SkillID       INT         NOT NULL,
    Description   TEXT,
    PreferredTime VARCHAR(100),
    PreferredMode ENUM('online','in-person','both') DEFAULT 'both',
    Status        ENUM('open','matched','closed') NOT NULL DEFAULT 'open',
    CreatedAt     DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (RequestID),
    CONSTRAINT fk_request_student FOREIGN KEY (StudentID)
        REFERENCES Student(StudentID) ON DELETE CASCADE,
    CONSTRAINT fk_request_skill FOREIGN KEY (SkillID)
        REFERENCES Skill(SkillID)
);
CREATE TABLE OfferTimeSlot (
    TimeSlotID INT         NOT NULL AUTO_INCREMENT,
    OfferID    INT         NOT NULL,
    SlotStart  DATETIME    NOT NULL,
    SlotEnd    DATETIME    NOT NULL,
    Status     ENUM('available','booked','cancelled') NOT NULL DEFAULT 'available',
    CreatedAt  DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (TimeSlotID),
    UNIQUE KEY uq_offer_slot (OfferID, SlotStart),
    CONSTRAINT fk_slot_offer FOREIGN KEY (OfferID)
        REFERENCES OfferedSkill(OfferID) ON DELETE CASCADE,
    CONSTRAINT chk_slot_times CHECK (SlotEnd > SlotStart)
);
CREATE TABLE Conversation (
    ConversationID INT      NOT NULL AUTO_INCREMENT,
    Student1ID     INT      NOT NULL,
    Student2ID     INT      NOT NULL,
    CreatedAt      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (ConversationID),
    CONSTRAINT fk_conv_s1 FOREIGN KEY (Student1ID)
        REFERENCES Student(StudentID),
    CONSTRAINT fk_conv_s2 FOREIGN KEY (Student2ID)
        REFERENCES Student(StudentID),
    CONSTRAINT chk_diff_students CHECK (Student1ID <> Student2ID)
);
CREATE TABLE Exchange (
    ExchangeID     INT         NOT NULL AUTO_INCREMENT,
    OfferID        INT         NOT NULL,
    RequestID      INT,
    AdminID        INT,  
    ConversationID INT,
    ExchangeType   ENUM('free','paid') NOT NULL DEFAULT 'free',
    Status         ENUM('pending','active','completed','cancelled') NOT NULL DEFAULT 'pending',
    CreatedAt      DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (ExchangeID),
    CONSTRAINT fk_exch_offer FOREIGN KEY (OfferID)
        REFERENCES OfferedSkill(OfferID),
    CONSTRAINT fk_exch_request FOREIGN KEY (RequestID)
        REFERENCES RequestedSkill(RequestID),
    CONSTRAINT fk_exch_admin FOREIGN KEY (AdminID)
        REFERENCES Admin(AdminID),
    CONSTRAINT fk_exch_conv FOREIGN KEY (ConversationID)
        REFERENCES Conversation(ConversationID)
);
CREATE TABLE PaidExchange (
    ExchangeID INT           NOT NULL,
    Price      DECIMAL(10,2) NOT NULL,
    Currency   CHAR(3)       NOT NULL DEFAULT 'USD',
    PRIMARY KEY (ExchangeID),
    CONSTRAINT fk_paidexch FOREIGN KEY (ExchangeID)
        REFERENCES Exchange(ExchangeID) ON DELETE CASCADE,
    CONSTRAINT chk_paid_price CHECK (Price > 0)
);
CREATE TABLE Session (
    SessionID          INT         NOT NULL AUTO_INCREMENT,
    ExchangeID         INT         NOT NULL,
    ScheduledStartTime DATETIME    NOT NULL,
    ScheduledEndTime   DATETIME    NOT NULL,
    ActualStartTime    DATETIME,
    ActualEndTime      DATETIME,
    Venue              VARCHAR(200),
    Status             ENUM('scheduled','ongoing','completed','cancelled') NOT NULL DEFAULT 'scheduled',
    CreatedAt          DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (SessionID),
    CONSTRAINT fk_session_exch FOREIGN KEY (ExchangeID)
        REFERENCES Exchange(ExchangeID) ON DELETE CASCADE,
    CONSTRAINT chk_session_times CHECK (ScheduledEndTime > ScheduledStartTime)
);
CREATE TABLE VideoSession (
    VideoSessionID  INT         NOT NULL AUTO_INCREMENT,
    SessionID       INT         NOT NULL UNIQUE,
    MeetingLink     VARCHAR(500),
    MeetingPassword VARCHAR(100),
    Platform        VARCHAR(100),
    RecordingURL    VARCHAR(500),
    Status          ENUM('not-started','live','ended') NOT NULL DEFAULT 'not-started',
    CreatedAt       DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (VideoSessionID),
    CONSTRAINT fk_vsess_session FOREIGN KEY (SessionID)
        REFERENCES Session(SessionID) ON DELETE CASCADE
);
CREATE TABLE Payment (
    PaymentID     INT           NOT NULL AUTO_INCREMENT,
    ExchangeID    INT           NOT NULL,
    Amount        DECIMAL(10,2) NOT NULL,
    PaymentStatus ENUM('pending','completed','failed','refunded') NOT NULL DEFAULT 'pending',
    PaymentMethod VARCHAR(100),
    PaidAt        DATETIME,
    CreatedAt     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (PaymentID),
    CONSTRAINT fk_payment_exch FOREIGN KEY (ExchangeID)
        REFERENCES Exchange(ExchangeID) ON DELETE CASCADE,
    CONSTRAINT chk_payment_amount CHECK (Amount > 0)
);
CREATE TABLE Review (
    ReviewID   INT      NOT NULL AUTO_INCREMENT,
    ExchangeID INT,
    SessionID  INT,
    ReviewerID INT      NOT NULL,
    RevieweeID INT      NOT NULL,
    Rating     TINYINT  NOT NULL,
    Feedback   TEXT,
    CreatedAt  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (ReviewID),
    CONSTRAINT chk_rating         CHECK (Rating BETWEEN 1 AND 5),
    CONSTRAINT chk_review_diff    CHECK (ReviewerID <> RevieweeID),
    CONSTRAINT fk_review_exch     FOREIGN KEY (ExchangeID) REFERENCES Exchange(ExchangeID),
    CONSTRAINT fk_review_session  FOREIGN KEY (SessionID)  REFERENCES Session(SessionID),
    CONSTRAINT fk_reviewer        FOREIGN KEY (ReviewerID) REFERENCES Student(StudentID),
    CONSTRAINT fk_reviewee        FOREIGN KEY (RevieweeID) REFERENCES Student(StudentID)
);
CREATE TABLE Message (
    MessageID      INT        NOT NULL AUTO_INCREMENT,
    ConversationID INT        NOT NULL,
    SenderID       INT        NOT NULL,
    Content        TEXT       NOT NULL,
    IsRead         TINYINT(1) NOT NULL DEFAULT 0,
    CreatedAt      DATETIME   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (MessageID),
    CONSTRAINT fk_msg_conv   FOREIGN KEY (ConversationID)
        REFERENCES Conversation(ConversationID) ON DELETE CASCADE,
    CONSTRAINT fk_msg_sender FOREIGN KEY (SenderID)
        REFERENCES Student(StudentID)
);
CREATE TABLE SkillQuestion (
    QuestionID    INT      NOT NULL AUTO_INCREMENT,
    SkillID       INT      NOT NULL,
    QuestionText  TEXT     NOT NULL,
    CorrectAnswer TEXT,
    Points        INT      NOT NULL DEFAULT 1,
    CreatedAt     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (QuestionID),
    CONSTRAINT fk_question_skill FOREIGN KEY (SkillID)
        REFERENCES Skill(SkillID) ON DELETE CASCADE,
    CONSTRAINT chk_points CHECK (Points > 0)
);
CREATE TABLE QuestionOption (
    QuestionID INT        NOT NULL,
    OptionKey  CHAR(1)    NOT NULL,     -- 'A', 'B', 'C', 'D'
    OptionText TEXT       NOT NULL,
    IsCorrect  TINYINT(1) NOT NULL DEFAULT 0,
    PRIMARY KEY (QuestionID, OptionKey),             -- composite PK = partial key
    CONSTRAINT fk_option_question FOREIGN KEY (QuestionID)
        REFERENCES SkillQuestion(QuestionID) ON DELETE CASCADE
);
CREATE TABLE SkillEvaluation (
    EvaluationID  INT         NOT NULL AUTO_INCREMENT,
    StudentID     INT         NOT NULL,
    SkillID       INT         NOT NULL,
    AdminID       INT,
    StartedAt     DATETIME,
    SubmittedAt   DATETIME,
    Score         INT,
    TotalPossible INT,
    Status        ENUM('pending','in-progress','submitted','graded') NOT NULL DEFAULT 'pending',
    CreatedAt     DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (EvaluationID),
    CONSTRAINT fk_eval_student FOREIGN KEY (StudentID)
        REFERENCES Student(StudentID) ON DELETE CASCADE,
    CONSTRAINT fk_eval_skill   FOREIGN KEY (SkillID)
        REFERENCES Skill(SkillID),
    CONSTRAINT fk_eval_admin   FOREIGN KEY (AdminID)
        REFERENCES Admin(AdminID),
    CONSTRAINT chk_score CHECK (Score IS NULL OR (Score >= 0 AND Score <= TotalPossible))
);
CREATE TABLE EvaluationAnswer (
    EvaluationID INT  NOT NULL,
    QuestionID   INT  NOT NULL,
    StudentAnswer TEXT,
    PRIMARY KEY (EvaluationID, QuestionID),
    CONSTRAINT fk_ans_eval     FOREIGN KEY (EvaluationID)
        REFERENCES SkillEvaluation(EvaluationID) ON DELETE CASCADE,
    CONSTRAINT fk_ans_question FOREIGN KEY (QuestionID)
        REFERENCES SkillQuestion(QuestionID)
);
CREATE TABLE Portfolio (
    PortfolioID INT      NOT NULL AUTO_INCREMENT,
    StudentID   INT      NOT NULL,
    SkillID     INT      NOT NULL,
    Description TEXT,
    CreatedAt   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (PortfolioID),
    CONSTRAINT fk_portfolio_student FOREIGN KEY (StudentID)
        REFERENCES Student(StudentID) ON DELETE CASCADE,
    CONSTRAINT fk_portfolio_skill   FOREIGN KEY (SkillID)
        REFERENCES Skill(SkillID)
);
CREATE INDEX idx_user_created ON User(CreatedAt);
CREATE INDEX idx_student_university ON Student(UniversityID);
CREATE INDEX idx_student_reputation ON Student(ReputationPoints DESC);
CREATE INDEX idx_offer_student_skill ON OfferedSkill(StudentID, SkillID);
CREATE INDEX idx_offer_skill ON OfferedSkill(SkillID);
CREATE INDEX idx_request_skill_status ON RequestedSkill(SkillID, Status);
CREATE INDEX idx_request_student ON RequestedSkill(StudentID);
CREATE INDEX idx_slot_offer_status ON OfferTimeSlot(OfferID, Status);
CREATE INDEX idx_exch_status_created ON Exchange(Status, CreatedAt);
CREATE INDEX idx_exch_offer   ON Exchange(OfferID);
CREATE INDEX idx_exch_request ON Exchange(RequestID);
CREATE INDEX idx_session_exch ON Session(ExchangeID);
CREATE INDEX idx_session_time ON Session(ScheduledStartTime);
CREATE INDEX idx_payment_exch_status ON Payment(ExchangeID, PaymentStatus);
CREATE INDEX idx_review_reviewee ON Review(RevieweeID);
CREATE INDEX idx_review_reviewer ON Review(ReviewerID);
CREATE INDEX idx_msg_conv_time ON Message(ConversationID, CreatedAt);
CREATE INDEX idx_eval_student_skill ON SkillEvaluation(StudentID, SkillID);
CREATE INDEX idx_eval_status        ON SkillEvaluation(Status);
CREATE INDEX idx_portfolio_student ON Portfolio(StudentID);
CREATE INDEX idx_portfolio_skill   ON Portfolio(SkillID);
CREATE VIEW vw_StudentProfile AS
SELECT
    s.StudentID,
    u.FullName,
    u.Email,
    u.PhoneNumber,
    univ.UniversityName,
    s.ReputationPoints,
    s.Bio,
    s.IsAdminVerified,
    u.CreatedAt AS JoinedAt,
    u.LastLogin
FROM Student s
JOIN User        u    ON u.UserID       = s.StudentID
JOIN University  univ ON univ.UniversityID = s.UniversityID;

CREATE VIEW vw_ExchangeSummary AS
SELECT
    e.ExchangeID,
    e.ExchangeType,
    e.Status                          AS ExchangeStatus,
    sk.SkillName,
    u_offerer.FullName                AS OffererName,
    u_requester.FullName              AS RequesterName,
    COUNT(DISTINCT se.SessionID)      AS TotalSessions,
    SUM(CASE WHEN se.Status = 'completed' THEN 1 ELSE 0 END) AS CompletedSessions,
    pay.PaymentStatus,
    pay.Amount                        AS PaymentAmount,
    e.CreatedAt
FROM Exchange e
JOIN OfferedSkill  os  ON os.OfferID   = e.OfferID
JOIN Skill         sk  ON sk.SkillID   = os.SkillID
JOIN Student       st_off ON st_off.StudentID = os.StudentID
JOIN User          u_offerer   ON u_offerer.UserID   = st_off.StudentID
LEFT JOIN RequestedSkill rs ON rs.RequestID = e.RequestID
LEFT JOIN Student        st_req ON st_req.StudentID = rs.StudentID
LEFT JOIN User           u_requester ON u_requester.UserID = st_req.StudentID
LEFT JOIN Session  se  ON se.ExchangeID = e.ExchangeID
LEFT JOIN Payment  pay ON pay.ExchangeID = e.ExchangeID
GROUP BY
    e.ExchangeID, e.ExchangeType, e.Status,
    sk.SkillName, u_offerer.FullName, u_requester.FullName,
    pay.PaymentStatus, pay.Amount, e.CreatedAt;
CREATE VIEW vw_SkillLeaderboard AS
SELECT
    s.StudentID,
    u.FullName,
    univ.UniversityName,
    s.ReputationPoints,
    COUNT(DISTINCT os.OfferID)    AS SkillsOffered,
    COUNT(DISTINCT rs.RequestID)  AS SkillsRequested,
    ROUND(AVG(rv.Rating), 2)      AS AvgRating,
    COUNT(DISTINCT rv.ReviewID)   AS TotalReviews
FROM Student s
JOIN User           u    ON u.UserID       = s.StudentID
JOIN University     univ ON univ.UniversityID = s.UniversityID
LEFT JOIN OfferedSkill  os ON os.StudentID  = s.StudentID
LEFT JOIN RequestedSkill rs ON rs.StudentID = s.StudentID
LEFT JOIN Review        rv ON rv.RevieweeID = s.StudentID
GROUP BY s.StudentID, u.FullName, univ.UniversityName, s.ReputationPoints
ORDER BY s.ReputationPoints DESC;

DELIMITER $$
CREATE TRIGGER trg_payment_validate
BEFORE INSERT ON Payment
FOR EACH ROW
BEGIN
    DECLARE v_type VARCHAR(50);
    SELECT ExchangeType INTO v_type
    FROM Exchange WHERE ExchangeID = NEW.ExchangeID;

    IF v_type NOT IN ('paid') THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Cannot create payment for a non-paid exchange.';
    END IF;
END$$
CREATE TRIGGER trg_reputation_update
AFTER INSERT ON Review
FOR EACH ROW
BEGIN
    UPDATE Student
    SET ReputationPoints = ReputationPoints + NEW.Rating
    WHERE StudentID = NEW.RevieweeID;
END$$
CREATE TRIGGER trg_slot_no_double_book
BEFORE UPDATE ON OfferTimeSlot
FOR EACH ROW
BEGIN
    IF OLD.Status = 'booked' AND NEW.Status = 'booked' THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Time slot is already booked.';
    END IF;
END$$
CREATE TRIGGER trg_exchange_cancel_sessions
AFTER UPDATE ON Exchange
FOR EACH ROW
BEGIN
    IF NEW.Status = 'cancelled' AND OLD.Status <> 'cancelled' THEN
        UPDATE Session
        SET Status = 'cancelled'
        WHERE ExchangeID = NEW.ExchangeID
          AND Status IN ('scheduled', 'ongoing');
    END IF;
END$$
DELIMITER ;