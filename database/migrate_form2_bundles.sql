-- Run once on existing DBs that already have Conversation (adds Form 2 bundle tables).
USE skill_exchange_db;

CREATE TABLE IF NOT EXISTS ConversationBundleReadiness (
    ConversationID INT         NOT NULL,
    BundleKey      VARCHAR(255) NOT NULL,
    Student1Ready  TINYINT      NOT NULL DEFAULT 0,
    Student2Ready  TINYINT      NOT NULL DEFAULT 0,
    PRIMARY KEY (ConversationID, BundleKey),
    CONSTRAINT fk_cbr_conv FOREIGN KEY (ConversationID)
        REFERENCES Conversation(ConversationID) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS Form2SessionDraft (
    ConversationID INT         NOT NULL,
    BundleKey      VARCHAR(255) NOT NULL,
    RequestID      INT         NOT NULL,
    Venue          VARCHAR(512) NOT NULL DEFAULT '',
    ScheduledStart DATETIME    NULL,
    ScheduledEnd   DATETIME    NULL,
    MeetingType    VARCHAR(20)  NOT NULL DEFAULT 'physical',
    Platform       VARCHAR(64)  NULL,
    MeetingLink    VARCHAR(1024) NULL,
    MeetingPassword VARCHAR(256) NULL,
    AgreedPrice    DECIMAL(12, 2) NULL,
    UpdatedAt      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (ConversationID, BundleKey, RequestID),
    CONSTRAINT fk_f2d_conv FOREIGN KEY (ConversationID)
        REFERENCES Conversation(ConversationID) ON DELETE CASCADE,
    CONSTRAINT fk_f2d_req FOREIGN KEY (RequestID)
        REFERENCES RequestedSkill(RequestID) ON DELETE CASCADE
);
