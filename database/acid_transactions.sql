USE skill_exchange_db;
-- 1. ATOMICITY — Transaction Scenario 1: Match Request and Create Exchange + Session

DELIMITER $$
DROP PROCEDURE IF EXISTS sp_match_request_create_exchange_session$$
CREATE PROCEDURE sp_match_request_create_exchange_session(
    IN p_OfferID        INT,
    IN p_RequestID     INT,
    IN p_ConversationID INT,
    IN p_ScheduledStart DATETIME,
    IN p_ScheduledEnd   DATETIME,
    IN p_Venue          VARCHAR(200),
    OUT p_ExchangeID    INT,
    OUT p_SessionID     INT,
    OUT p_ok            TINYINT,
    OUT p_message       VARCHAR(200)
)
proc_match: BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SET p_ok = 0;
        SET p_message = 'Transaction rolled back due to error.';
        RESIGNAL;
    END;

    SET p_ok = 0;
    SET p_message = '';
    SET p_ExchangeID = NULL;
    SET p_SessionID  = NULL;

    -- Validate: request must exist and be open
    IF NOT EXISTS (SELECT 1 FROM RequestedSkill WHERE RequestID = p_RequestID AND Status = 'open') THEN
        SET p_message = 'Request not found or not open.';
        LEAVE proc_match;
    END IF;

    START TRANSACTION;

    -- Step 1: Create exchange
    INSERT INTO Exchange (OfferID, RequestID, ConversationID, ExchangeType, Status)
    VALUES (p_OfferID, p_RequestID, p_ConversationID, 'Exchange', 'pending');
    SET p_ExchangeID = LAST_INSERT_ID();

    -- Step 2: Create session for that exchange
    INSERT INTO Session (ExchangeID, ScheduledStartTime, ScheduledEndTime, Venue, Status)
    VALUES (p_ExchangeID, p_ScheduledStart, p_ScheduledEnd, p_Venue, 'scheduled');
    SET p_SessionID = LAST_INSERT_ID();

    -- Step 3: Mark request as matched
    UPDATE RequestedSkill SET Status = 'matched' WHERE RequestID = p_RequestID;

    COMMIT;
    SET p_ok = 1;
    SET p_message = 'Exchange and session created; request marked matched.';
END proc_match$$

DELIMITER ;
-- RequestID 1 = Student 22 wants SkillID 4 (Calculus), Status 'open'
-- OfferID 4   = Student 25 offers SkillID 4 (Calculus)
-- ConversationID 3 = conversation between students 22 and 25
USE skill_exchange_db;
-- Match request 1 (Ahmed wants Calculus) with offer 4 (student 25 offers Calculus), using conversation 3 (22–25)
CALL sp_match_request_create_exchange_session(
    4,                              -- OfferID (offer for SkillID 4 = Calculus)
    1,                              -- RequestID (open request for Calculus)
    3,                              -- ConversationID (between students 22 and 25)
    '2025-03-15 10:00:00',          -- ScheduledStart
    '2025-03-15 11:00:00',          -- ScheduledEnd
    'ITU Lab 1',                    -- Venue
    @exId, @sessId, @ok, @msg
);

SELECT @exId AS new_ExchangeID, @sessId AS new_SessionID, @ok AS success, @msg AS message;
-- New exchange and session
SELECT * FROM Exchange ORDER BY ExchangeID DESC LIMIT 1;
SELECT * FROM Session  ORDER BY SessionID  DESC LIMIT 1;
-- Request 1 should be matched
SELECT RequestID, StudentID, SkillID, Status FROM RequestedSkill WHERE RequestID = 1;



-- 2. ATOMICITY — Transaction Scenario 2: Paid exchange with payment record
DELIMITER $$

DROP PROCEDURE IF EXISTS sp_create_paid_exchange_with_payment$$

CREATE PROCEDURE sp_create_paid_exchange_with_payment(
    IN p_ExchangeID    INT,
    IN p_Price         DECIMAL(10,2),
    IN p_Currency      CHAR(3),
    IN p_PaymentMethod VARCHAR(100),
    OUT p_ok           TINYINT,
    OUT p_message      VARCHAR(200)
)
proc_paid: BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SET p_ok = 0;
        SET p_message = 'Transaction rolled back: paid exchange and payment not created.';
        RESIGNAL;
    END;

    SET p_ok = 0;
    SET p_message = '';

    IF p_Price IS NULL OR p_Price <= 0 THEN
        SET p_message = 'Price must be positive.';
        LEAVE proc_paid;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM Exchange WHERE ExchangeID = p_ExchangeID) THEN
        SET p_message = 'Exchange not found.';
        LEAVE proc_paid;
    END IF;

    START TRANSACTION;

    -- Step 1: Mark exchange as paid (required by trigger trg_payment_validate on Payment)
    UPDATE Exchange SET ExchangeType = 'paid' WHERE ExchangeID = p_ExchangeID;

    -- Step 2: Record paid exchange
    INSERT INTO PaidExchange (ExchangeID, Price, Currency)
    VALUES (p_ExchangeID, p_Price, p_Currency);

    -- Step 3: Record payment (same amount, completed)
    INSERT INTO Payment (ExchangeID, Amount, PaymentStatus, PaymentMethod, PaidAt)
    VALUES (p_ExchangeID, p_Price, 'completed', p_PaymentMethod, NOW());

    COMMIT;
    SET p_ok = 1;
    SET p_message = 'Paid exchange and payment recorded.';
END proc_paid$$

DELIMITER ;

-- Record a paid exchange and its payment for ExchangeID 111 
CALL sp_create_paid_exchange_with_payment(
    111,                -- ExchangeID (must exist; 111–120 are free and have no PaidExchange in seed)
    750.00,             -- Price (PKR)
    'PKR',              -- Currency
    'JazCash',         -- PaymentMethod
    @ok, @msg
);

SELECT @ok AS success, @msg AS message;
SELECT * FROM PaidExchange WHERE ExchangeID = 111;
SELECT * FROM Payment WHERE ExchangeID = 111;

-- 3. ISOLATION — Level and FOR UPDATE 
-- (Set / check isolation level (REPEATABLE READ = no dirty reads)
--   SET SESSION TRANSACTION ISOLATION LEVEL REPEATABLE READ;
--   SELECT @@transaction_isolation;   -- shows REPEATABLE-READ
--
--  Procedure that matches a request USING FOR UPDATE so only one transaction
--     can match a given open request (prevents lost update / double-match).

DELIMITER $$

DROP PROCEDURE IF EXISTS sp_match_request_with_lock$$

CREATE PROCEDURE sp_match_request_with_lock(
    IN p_OfferID         INT,
    IN p_RequestID       INT,
    IN p_ConversationID  INT,
    IN p_ScheduledStart  DATETIME,
    IN p_ScheduledEnd    DATETIME,
    IN p_Venue           VARCHAR(200),
    OUT p_ExchangeID     INT,
    OUT p_SessionID      INT,
    OUT p_ok             TINYINT,
    OUT p_message        VARCHAR(200)
)
proc_lock: BEGIN
    DECLARE v_found TINYINT DEFAULT 0;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SET p_ok = 0;
        SET p_message = 'Transaction rolled back due to error.';
        RESIGNAL;
    END;

    SET p_ok = 0;
    SET p_message = '';
    SET p_ExchangeID = NULL;
    SET p_SessionID  = NULL;

    START TRANSACTION;

    -- Lock the request row so no other transaction can match it until we COMMIT/ROLLBACK
    SELECT COUNT(*) INTO v_found
    FROM RequestedSkill
    WHERE RequestID = p_RequestID AND Status = 'open'
    FOR UPDATE;

    IF v_found = 0 THEN
        ROLLBACK;
        SET p_message = 'Request not found or not open.';
        LEAVE proc_lock;
    END IF;

    -- Step 1: Create exchange
    INSERT INTO Exchange (OfferID, RequestID, ConversationID, ExchangeType, Status)
    VALUES (p_OfferID, p_RequestID, p_ConversationID, 'Exchange', 'pending');
    SET p_ExchangeID = LAST_INSERT_ID();

    -- Step 2: Create session
    INSERT INTO Session (ExchangeID, ScheduledStartTime, ScheduledEndTime, Venue, Status)
    VALUES (p_ExchangeID, p_ScheduledStart, p_ScheduledEnd, p_Venue, 'scheduled');
    SET p_SessionID = LAST_INSERT_ID();

    -- Step 3: Mark request as matched
    UPDATE RequestedSkill SET Status = 'matched' WHERE RequestID = p_RequestID;

    COMMIT;
    SET p_ok = 1;
    SET p_message = 'Exchange and session created; request marked matched (with row lock).';
END proc_lock$$

DELIMITER ;

CALL sp_match_request_with_lock(5, 3, 3, '2025-03-20 10:00:00', '2025-03-20 11:00:00', 'Lab 2', @exId, @sessId, @ok, @msg);
SELECT @exId, @sessId, @ok, @msg;