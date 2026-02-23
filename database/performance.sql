USE skill_exchange_db;
-- SECTION 1: WITHOUT INDEXES — EXPLAIN 

-- 1. EXPLAIN WITHOUT INDEX: Offers by SkillID
EXPLAIN SELECT o.OfferID, o.StudentID, o.IsPaid, o.PricePerHour
FROM OfferedSkill o
WHERE o.SkillID = 1;
-- RESULT: id=1, select_type=SIMPLE, table=o, type=ref, key=fk_offer_skill, key_len=4, ref=const, rows=1, filtered=100.00, Extra=NULL
-- WHAT IT MEANS: The database uses the foreign key index on SkillID to find offers for that skill. It only looks at about one row, so it is still fast even without the extra performance index.

-- 2. EXPLAIN WITHOUT INDEX: Open requests
EXPLAIN SELECT RequestID, StudentID, PreferredTime, PreferredMode
FROM RequestedSkill
WHERE SkillID = 5 AND Status = 'open';
-- RESULT: id=1, select_type=SIMPLE, table=RequestedSkill, type=ref, key=fk_request_skill, key_len=4, ref=const, rows=4, filtered=33.33, Extra=Using where
-- WHAT IT MEANS: The database uses the foreign key index on SkillID to find requests (about 4 rows), then applies the Status filter; only about a third of those pass (filtered=33.33).

-- 3. EXPLAIN WITHOUT INDEX: Completed exchanges
EXPLAIN SELECT ExchangeID, OfferID, RequestID, ExchangeType, CreatedAt
FROM Exchange
WHERE Status = 'completed'
ORDER BY CreatedAt DESC
LIMIT 20;
-- RESULT: id=1, select_type=SIMPLE, table=Exchange, type=ALL, possible_keys=NULL, key=NULL, rows=120, filtered=25.00, Extra=Using where; Using filesort
-- WHAT IT MEANS: No index is used. The database scans the whole Exchange table (120 rows), then filters by Status (about 25% pass) and does an extra sort for ORDER BY. With an index on Status (or Status + CreatedAt) we avoid the full scan and filesort.

-- 4. EXPLAIN WITHOUT INDEX: Reviews for reviewee
EXPLAIN SELECT ReviewID, ExchangeID, ReviewerID, Rating, Feedback
FROM Review
WHERE RevieweeID = 22;
-- RESULT: id=1, select_type=SIMPLE, table=Review, type=ref, key=fk_reviewee, key_len=4, ref=const, rows=1, filtered=100.00, Extra=NULL
-- WHAT IT MEANS: The database uses the foreign key index on RevieweeID to find reviews for that person. It expects only one row, so the query is very fast.

-- 5. EXPLAIN WITHOUT INDEX: Messages in conversation
EXPLAIN SELECT MessageID, SenderID, LEFT(Content, 50) AS ContentPreview, CreatedAt
FROM Message
WHERE ConversationID = 1
ORDER BY CreatedAt;
-- RESULT: id=1, select_type=SIMPLE, table=Message, type=ref, key=fk_msg_conv, key_len=4, ref=const, rows=1, filtered=100.00, Extra=Using filesort
-- WHAT IT MEANS: The database uses the foreign key index on ConversationID to get messages for that conversation, but it has to do an extra sort for ORDER BY CreatedAt. With an index on (ConversationID, CreatedAt) that extra sort can be avoided.

-- 6. EXPLAIN WITHOUT INDEX: JOIN Exchanges + skill + offerer
EXPLAIN
SELECT e.ExchangeID, sk.SkillName, u.FullName AS OffererName, e.Status
FROM Exchange e
JOIN OfferedSkill os ON os.OfferID = e.OfferID
JOIN Skill sk ON sk.SkillID = os.SkillID
JOIN Student s ON s.StudentID = os.StudentID
JOIN User u ON u.UserID = s.StudentID
WHERE e.Status = 'completed'
LIMIT 20;
-- RESULT (Section 1) — join order sk -> os -> e -> s -> u: sk: type=ALL, key=NULL, rows=30; os: type=ref, key=fk_offer_skill, ref=sk.SkillID, rows=1; e: type=ref, key=fk_exch_offer, ref=os.OfferID, rows=1, filtered=25.00, Extra=Using where; s: type=eq_ref, key=PRIMARY, ref=os.StudentID, rows=1, Extra=Using index; u: type=eq_ref, key=PRIMARY, ref=os.StudentID, rows=1
-- WHAT IT MEANS: The query starts from Skill (full scan, 30 rows). For each skill it finds OfferedSkill via the index, then Exchange via fk_exch_offer (and filters by Status, so about 25% pass), then one Student and one User by primary key. The weak spot is the full scan on Skill and the filter on Exchange; indexes help the later lookups.

-- 7. EXPLAIN WITHOUT INDEX: JOIN Reviews + names
EXPLAIN
SELECT r.ReviewID, r.Rating, reviewee_user.FullName AS RevieweeName, reviewer_user.FullName AS ReviewerName
FROM Review r
JOIN Student reviewee ON reviewee.StudentID = r.RevieweeID
JOIN User reviewee_user ON reviewee_user.UserID = reviewee.StudentID
JOIN Student reviewer ON reviewer.StudentID = r.ReviewerID
JOIN User reviewer_user ON reviewer_user.UserID = reviewer.StudentID
WHERE r.RevieweeID = 22;
-- RESULT: id=1, table=NULL, type=NULL, possible_keys=NULL, key=NULL, ref=NULL, rows=NULL, filtered=NULL, Extra=no matching row in const table
-- (Occurs when RevieweeID=22 has no matching row in the const lookup; optimizer short-circuits.)
-- WHAT IT MEANS: The optimizer figured out that for RevieweeID = 22 there is no matching row (e.g. that student does not exist or has no reviews), so it does not bother reading any table. You get an empty result very quickly.

-- 8. EXPLAIN WITHOUT INDEX: JOIN Sessions + exchange + skill
EXPLAIN
SELECT se.SessionID, e.ExchangeType, sk.SkillName, se.ScheduledStartTime, se.Status
FROM Session se
JOIN Exchange e ON e.ExchangeID = se.ExchangeID
JOIN OfferedSkill os ON os.OfferID = e.OfferID
JOIN Skill sk ON sk.SkillID = os.SkillID
WHERE se.Status = 'completed'
ORDER BY se.ScheduledStartTime DESC
LIMIT 15;
-- RESULT: join order se -> e -> os -> sk: se: type=ref, key=idx_session_status, key_len=1, ref=const, rows=1, Extra=Using index condition; Using filesort; e: type=eq_ref, key=PRIMARY, ref=se.ExchangeID, rows=1; os: type=eq_ref, key=PRIMARY, ref=e.OfferID, rows=1; sk: type=eq_ref, key=PRIMARY, ref=os.SkillID, rows=1
-- WHAT IT MEANS: The database starts from Session using the index on Status to get completed sessions, then does an extra sort for ORDER BY ScheduledStartTime. For each session it finds one Exchange, one OfferedSkill, and one Skill by primary key. The filesort is the part that could be improved with a better index.

-- 9. EXPLAIN WITHOUT INDEX: JOIN Messages + sender
EXPLAIN
SELECT m.MessageID, m.CreatedAt, LEFT(m.Content, 40) AS ContentPreview, u.FullName AS SenderName
FROM Message m
JOIN Student s ON s.StudentID = m.SenderID
JOIN User u ON u.UserID = s.StudentID
WHERE m.ConversationID = 1
ORDER BY m.CreatedAt;
-- RESULT: — join order m -> s -> u: m: type=ref, key=fk_msg_conv, key_len=4, ref=const, rows=1, Extra=Using filesort; s: type=eq_ref, key=PRIMARY, ref=m.SenderID, rows=1, Extra=Using index; u: type=eq_ref, key=PRIMARY, ref=m.SenderID, rows=1
-- WHAT IT MEANS: Messages for the conversation are found using the foreign key index, but the database does an extra sort for ORDER BY CreatedAt. For each message it then finds the sender’s Student and User row by primary key. An index on (ConversationID, CreatedAt) would avoid the filesort.

-- 10. EXPLAIN WITHOUT INDEX: JOIN Open requests + skill + name
EXPLAIN
SELECT rs.RequestID, sk.SkillName, rs.PreferredTime, rs.PreferredMode, u.FullName AS RequesterName
FROM RequestedSkill rs
JOIN Skill sk ON sk.SkillID = rs.SkillID
JOIN Student s ON s.StudentID = rs.StudentID
JOIN User u ON u.UserID = s.StudentID
WHERE rs.Status = 'open'
ORDER BY rs.RequestID
LIMIT 25;
-- RESULT:— join order rs -> sk -> s -> u: rs: type=index, key=PRIMARY, possible_keys=fk_request_student,fk_request_skill, key_len=4, rows=1, filtered=100.00, Extra=Using where; sk: type=eq_ref, key=PRIMARY, ref=rs.SkillID, rows=1; s: type=eq_ref, key=PRIMARY, ref=rs.StudentID, rows=1, Extra=Using index; u: type=eq_ref, key=PRIMARY, ref=rs.StudentID, rows=1
-- WHAT IT MEANS: The database walks the RequestedSkill table (using the primary key order) and filters by Status = 'open'. For each matching request it finds the Skill, Student, and User by primary key. With an index on (SkillID, Status) or (Status), finding open requests would be faster without scanning the whole table.

-- SECTION 2: WITHOUT INDEXES — EXPLAIN ANALYZE

-- 1. EXPLAIN ANALYZE WITHOUT INDEX: Offers by SkillID
EXPLAIN ANALYZE SELECT o.OfferID, o.StudentID, o.IsPaid, o.PricePerHour
FROM OfferedSkill o
WHERE o.SkillID = 1;
-- RESULT: -> Index lookup on o using fk_offer_skill (SkillID=1)  (cost=1.15 rows=4) (actual time=0.0526..0.0694 rows=4 loops=1)
-- WHAT IT MEANS: The database uses the index on SkillID to look up offers. It took about 0.07 ms and found 4 rows for SkillID=1.

-- 2. EXPLAIN ANALYZE WITHOUT INDEX: Open requests
EXPLAIN ANALYZE SELECT RequestID, StudentID, PreferredTime, PreferredMode
FROM RequestedSkill
WHERE SkillID = 5 AND Status = 'open';
-- RESULT (Section 2): -> Filter: (requestedskill.Status = 'open')  (cost=0.883 rows=1.33) (actual time=0.0616..0.0635 rows=3 loops=1)
--     -> Index lookup on RequestedSkill using fk_request_skill (SkillID=5)  (cost=0.883 rows=4) (actual time=0.0543..0.0567 rows=4 loops=1)
-- WHAT IT MEANS: The database looks up rows by SkillID=5 using the index (4 rows), then filters by Status='open'; 3 rows pass. It took about 0.06 ms.

-- 3. EXPLAIN ANALYZE WITHOUT INDEX: Completed exchanges
EXPLAIN ANALYZE SELECT ExchangeID, OfferID, RequestID, ExchangeType, CreatedAt
FROM Exchange
WHERE Status = 'completed'
ORDER BY CreatedAt DESC
LIMIT 20;
-- RESULT (Section 2): -> Limit: 20 row(s)  (cost=12.2 rows=20) (actual time=15.4..15.4 rows=20 loops=1)
--     -> Sort: exchange.CreatedAt DESC, limit input to 20 row(s) per chunk  (cost=12.2 rows=120) (actual time=15.4..15.4 rows=20 loops=1)
--         -> Filter: (exchange.Status = 'completed')  (cost=12.2 rows=120) (actual time=0.0509..0.106 rows=110 loops=1)
--             -> Table scan on Exchange  (cost=12.2 rows=120) (actual time=0.0453..0.0846 rows=120 loops=1)
-- WHAT IT MEANS: With no index on Status, the database does a full table scan on Exchange (120 rows), filters by Status (110 completed), then sorts by CreatedAt DESC and returns 20 rows. Total time about 15.4 ms; the table scan and filesort are the cost.

-- 4. EXPLAIN ANALYZE WITHOUT INDEX: Reviews for reviewee 
EXPLAIN ANALYZE SELECT ReviewID, ExchangeID, ReviewerID, Rating, Feedback
FROM Review
WHERE RevieweeID = 22;
-- RESULT (Section 2): -> Index lookup on Review using fk_reviewee (RevieweeID=22)  (cost=0.35 rows=1) (actual time=0.161..0.168 rows=1 loops=1)
-- WHAT IT MEANS: The database uses the index on RevieweeID to find reviews for that person. It took about 0.16 ms and returned 1 row.

-- 5. EXPLAIN ANALYZE WITHOUT INDEX: Messages in conversation 
EXPLAIN ANALYZE SELECT MessageID, SenderID, LEFT(Content, 50) AS ContentPreview, CreatedAt
FROM Message
WHERE ConversationID = 1
ORDER BY CreatedAt;
-- RESULT (Section 2): -> Sort: message.CreatedAt  (cost=0.35 rows=1) (actual time=0.0925..0.0931 rows=1 loops=1)
--     -> Index lookup on Message using fk_msg_conv (ConversationID=1)  (cost=0.35 rows=1) (actual time=0.0388..0.043 rows=1 loops=1)
-- WHAT IT MEANS: The database finds messages for conversation 1 using the index (1 row), then sorts by CreatedAt. Total about 0.09 ms. An index on (ConversationID, CreatedAt) would avoid the sort.

-- 6. EXPLAIN ANALYZE WITHOUT INDEX: JOIN Exchanges + skill + offerer

EXPLAIN ANALYZE
SELECT e.ExchangeID, sk.SkillName, u.FullName AS OffererName, e.Status
FROM Exchange e
JOIN OfferedSkill os ON os.OfferID = e.OfferID
JOIN Skill sk ON sk.SkillID = os.SkillID
JOIN Student s ON s.StudentID = os.StudentID
JOIN User u ON u.UserID = s.StudentID
WHERE e.Status = 'completed'
LIMIT 20;
-- RESULT (Section 2): -> Limit: 20 row(s)  (cost=29.5 rows=7.5) (actual time=0.161..0.331 rows=20 loops=1)
--     -> Nested loop inner join  (cost=29.5 rows=7.5) (actual time=0.16..0.329 rows=20 loops=1)
--         -> Nested loop inner join  (cost=26.9 rows=7.5) ... -> Table scan on sk  (cost=3.25 rows=30) (actual time=0.0353..0.0367 rows=5 loops=1)
--         -> Index lookup on os using fk_offer_skill (SkillID=sk.SkillID)  (cost=0.253 rows=1) (actual time=0.0231..0.0241 rows=4 loops=5)
--         -> Filter: (e.Status = 'completed')  -> Index lookup on e using fk_exch_offer (OfferID=os.OfferID)  (cost=0.251 rows=1) (actual time=0.00386..0.00447 rows=1 loops=20)
--         -> Single-row covering index lookup on s using PRIMARY (StudentID=os.StudentID)  -> Single-row index lookup on u using PRIMARY (UserID=os.StudentID)
-- WHAT IT MEANS: The query starts with a table scan on Skill (5 rows drive the loop), then uses indexes to join OfferedSkill, Exchange (filter Status='completed'), Student, and User. It returns 20 rows in about 0.33 ms. The full scan on Skill is the weak spot for larger data.

-- 7. EXPLAIN ANALYZE WITHOUT INDEX: JOIN Reviews + names
EXPLAIN ANALYZE
SELECT r.ReviewID, r.Rating, reviewee_user.FullName AS RevieweeName, reviewer_user.FullName AS ReviewerName
FROM Review r
JOIN Student reviewee ON reviewee.StudentID = r.RevieweeID
JOIN User reviewee_user ON reviewee_user.UserID = reviewee.StudentID
JOIN Student reviewer ON reviewer.StudentID = r.ReviewerID
JOIN User reviewer_user ON reviewer_user.UserID = reviewer.StudentID
WHERE r.RevieweeID = 22;
-- RESULT (Section 2): -> Nested loop inner join  (cost=1.05 rows=1) (actual time=0.0393..0.0416 rows=1 loops=1)
--     -> Nested loop inner join  (cost=0.7 rows=1) (actual time=0.0261..0.0282 rows=1 loops=1)
--         -> Index lookup on r using fk_reviewee (RevieweeID=22)  (cost=0.35 rows=1) (actual time=0.0147..0.0166 rows=1 loops=1)
--         -> Single-row covering index lookup on reviewer using PRIMARY (StudentID=r.ReviewerID)  (cost=0.35 rows=1) (actual time=0.0101..0.0101 rows=1 loops=1)
--     -> Single-row index lookup on reviewer_user using PRIMARY (UserID=r.ReviewerID)  (cost=0.35 rows=1) (actual time=0.0124..0.0125 rows=1 loops=1)
-- WHAT IT MEANS: The database finds the review by RevieweeID=22 via the index, then looks up the reviewer’s Student and User rows by primary key. It returned 1 row in about 0.04 ms.

-- 8. EXPLAIN ANALYZE WITHOUT INDEX: JOIN Sessions + exchange + skill 
EXPLAIN ANALYZE
SELECT se.SessionID, e.ExchangeType, sk.SkillName, se.ScheduledStartTime, se.Status
FROM Session se
JOIN Exchange e ON e.ExchangeID = se.ExchangeID
JOIN OfferedSkill os ON os.OfferID = e.OfferID
JOIN Skill sk ON sk.SkillID = os.SkillID
WHERE se.Status = 'completed'
ORDER BY se.ScheduledStartTime DESC
LIMIT 15;
-- RESULT (Section 2): -> Limit: 15 row(s)  (actual time=1.44..1.44 rows=15 loops=1)
--     -> Sort: se.ScheduledStartTime DESC, limit input to 15 row(s) per chunk  (actual time=1.44..1.44 rows=15 loops=1)
--         -> Stream results  (cost=34.8 rows=28.7) (actual time=0.0955..1.36 rows=115 loops=1)
--             -> Nested loop inner join: Table scan on sk -> Covering index lookup on os using fk_offer_skill -> Index lookup on e using fk_exch_offer
--                 -> Filter: (se.Status = 'completed')  -> Index lookup on se using idx_session_exch (ExchangeID=e.ExchangeID)
-- WHAT IT MEANS: The query scans Skill, joins OfferedSkill, Exchange, and Session (filter Status='completed'), then sorts by ScheduledStartTime DESC and returns 15 rows. Total time about 1.44 ms; the sort drives the cost.

-- 9. EXPLAIN ANALYZE WITHOUT INDEX: JOIN Messages + sender
EXPLAIN ANALYZE
SELECT m.MessageID, m.CreatedAt, LEFT(m.Content, 40) AS ContentPreview, u.FullName AS SenderName
FROM Message m
JOIN Student s ON s.StudentID = m.SenderID
JOIN User u ON u.UserID = s.StudentID
WHERE m.ConversationID = 1
ORDER BY m.CreatedAt;
-- RESULT (Section 2): -> Nested loop inner join  (cost=1.05 rows=1) (actual time=0.0788..0.0791 rows=1 loops=1)
--     -> Nested loop inner join  (cost=0.7 rows=1) (actual time=0.0713..0.0715 rows=1 loops=1)
--         -> Sort: m.CreatedAt  (cost=0.35 rows=1) (actual time=0.0581..0.0581 rows=1 loops=1)
--             -> Index lookup on m using fk_msg_conv (ConversationID=1)  (cost=0.35 rows=1) (actual time=0.0259..0.0316 rows=1 loops=1)
--         -> Single-row covering index lookup on s using PRIMARY (StudentID=m.SenderID)  -> Single-row index lookup on u using PRIMARY (UserID=m.SenderID)
-- WHAT IT MEANS: The database finds the message for conversation 1 via the index, sorts by CreatedAt, then looks up the sender’s Student and User. It returned 1 row in about 0.08 ms. An index on (ConversationID, CreatedAt) would avoid the sort.

-- 10. EXPLAIN ANALYZE WITHOUT INDEX: JOIN Open requests + skill + name 
EXPLAIN ANALYZE
SELECT rs.RequestID, sk.SkillName, rs.PreferredTime, rs.PreferredMode, u.FullName AS RequesterName
FROM RequestedSkill rs
JOIN Skill sk ON sk.SkillID = rs.SkillID
JOIN Student s ON s.StudentID = rs.StudentID
JOIN User u ON u.UserID = s.StudentID
WHERE rs.Status = 'open'
ORDER BY rs.RequestID
LIMIT 25;
-- RESULT (Section 2): -> Limit: 25 row(s)  (actual time=1.04..1.04 rows=25 loops=1)
--     -> Sort: rs.RequestID, limit input to 25 row(s) per chunk  (actual time=1.03..1.04 rows=25 loops=1)
--         -> Stream results  (cost=20.8 rows=10) (actual time=0.153..0.978 rows=87 loops=1)
--             -> Nested loop inner join: Table scan on sk -> Filter: (rs.Status = 'open') -> Index lookup on rs using fk_request_skill (SkillID=sk.SkillID)
--                 -> Single-row covering index lookup on s using PRIMARY (StudentID=rs.StudentID)  -> Single-row index lookup on u using PRIMARY (UserID=rs.StudentID)
-- WHAT IT MEANS: The query scans Skill, finds RequestedSkill by index and filters by Status='open', then joins Student and User. It returns 25 rows in about 1.04 ms. The table scan on Skill and the filter on Status drive the cost; an index on (SkillID, Status) would help.

-- SECTION 3: CREATE INDEXES

    -- Creating indexes 

CREATE INDEX idx_offer_student_skill ON OfferedSkill(StudentID, SkillID);
CREATE INDEX idx_offer_skill ON OfferedSkill(SkillID);

CREATE INDEX idx_request_skill_status ON RequestedSkill(SkillID, Status);
CREATE INDEX idx_request_student ON RequestedSkill(StudentID);

CREATE INDEX idx_exch_status_created ON Exchange(Status, CreatedAt);
CREATE INDEX idx_exch_offer ON Exchange(OfferID);
CREATE INDEX idx_exch_request ON Exchange(RequestID);

CREATE INDEX idx_review_reviewee ON Review(RevieweeID);
CREATE INDEX idx_review_reviewer ON Review(ReviewerID);
CREATE INDEX idx_review_exchange ON Review(ExchangeID);

CREATE INDEX idx_msg_conv_time ON Message(ConversationID, CreatedAt);
CREATE INDEX idx_message_sender ON Message(SenderID);

-- SECTION 4: WITH INDEXES — EXPLAIN (same 10 queries)

-- 1. EXPLAIN WITH INDEX: Offers by SkillID 
EXPLAIN SELECT o.OfferID, o.StudentID, o.IsPaid, o.PricePerHour
FROM OfferedSkill o
WHERE o.SkillID = 1;
-- RESULT (Section 4): id=1, SIMPLE, table=o, type=ref, key=idx_offer_skill, key_len=4, ref=const, rows=4, filtered=100.00, Extra=NULL
-- WHAT IT MEANS: The performance index idx_offer_skill is used; about 4 rows are read for SkillID=1. No filesort or full scan.

-- 2. EXPLAIN WITH INDEX: Open requests 
EXPLAIN SELECT RequestID, StudentID, PreferredTime, PreferredMode
FROM RequestedSkill
WHERE SkillID = 5 AND Status = 'open';
-- RESULT (Section 4): id=1, SIMPLE, table=RequestedSkill, type=ref, key=idx_request_skill_status, key_len=5, ref=const,const, rows=3, filtered=100.00, Extra=Using index condition
-- WHAT IT MEANS: The composite index (SkillID, Status) is used for both the lookup and the Status filter; about 3 rows match. Very efficient.

-- 3. EXPLAIN WITH INDEX: Completed exchanges 
EXPLAIN SELECT ExchangeID, OfferID, RequestID, ExchangeType, CreatedAt
FROM Exchange
WHERE Status = 'completed'
ORDER BY CreatedAt DESC
LIMIT 20;
-- RESULT (Section 4): id=1, SIMPLE, table=Exchange, type=ref, key=idx_exch_status_created, key_len=1, ref=const, rows=110, filtered=100.00, Extra=Using where; Backward index scan
-- WHAT IT MEANS: The index on (Status, CreatedAt) is used: Status filters to completed, and the backward scan returns rows in CreatedAt DESC order, so no filesort is needed.

-- 4. EXPLAIN WITH INDEX: Reviews for reviewee 
EXPLAIN SELECT ReviewID, ExchangeID, ReviewerID, Rating, Feedback
FROM Review
WHERE RevieweeID = 22;
-- RESULT (Section 4): id=1, SIMPLE, table=Review, type=ref, key=idx_review_reviewee, key_len=4, ref=const, rows=1, filtered=100.00, Extra=NULL
-- WHAT IT MEANS: The index on RevieweeID is used; one row is read. Same as the FK index but with an explicit performance index.

-- 5. EXPLAIN WITH INDEX: Messages in conversation 
EXPLAIN SELECT MessageID, SenderID, LEFT(Content, 50) AS ContentPreview, CreatedAt
FROM Message
WHERE ConversationID = 1
ORDER BY CreatedAt;
-- RESULT (Section 4): id=1, SIMPLE, table=Message, type=ref, key=idx_msg_conv_time, key_len=4, ref=const, rows=1, filtered=100.00, Extra=NULL
-- WHAT IT MEANS: The composite index (ConversationID, CreatedAt) is used, so both the filter and ORDER BY are satisfied by the index; no filesort.

-- 6. EXPLAIN WITH INDEX: JOIN Exchanges + skill + offerer 
EXPLAIN
SELECT e.ExchangeID, sk.SkillName, u.FullName AS OffererName, e.Status
FROM Exchange e
JOIN OfferedSkill os ON os.OfferID = e.OfferID
JOIN Skill sk ON sk.SkillID = os.SkillID
JOIN Student s ON s.StudentID = os.StudentID
JOIN User u ON u.UserID = s.StudentID
WHERE e.Status = 'completed'
LIMIT 20;
-- RESULT (Section 4): join order sk -> os -> e -> s -> u. sk: type=ALL, key=NULL, rows=30; os: type=ref, key=idx_offer_skill, ref=sk.SkillID, rows=4; e: type=ref, key=idx_exch_offer, ref=os.OfferID, rows=1, filtered=91.67, Extra=Using where; s: type=eq_ref, key=PRIMARY, Extra=Using index; u: type=eq_ref, key=PRIMARY
-- WHAT IT MEANS: Starts with full scan on Skill (30 rows). OfferedSkill uses idx_offer_skill, Exchange uses idx_exch_offer with Status filter; Student and User use primary key (s covering). Indexes improve the joins; the only weak spot is the initial scan on Skill.

-- 7. EXPLAIN WITH INDEX: JOIN Reviews + names 
EXPLAIN
SELECT r.ReviewID, r.Rating, reviewee_user.FullName AS RevieweeName, reviewer_user.FullName AS ReviewerName
FROM Review r
JOIN Student reviewee ON reviewee.StudentID = r.RevieweeID
JOIN User reviewee_user ON reviewee_user.UserID = reviewee.StudentID
JOIN Student reviewer ON reviewer.StudentID = r.ReviewerID
JOIN User reviewer_user ON reviewer_user.UserID = reviewer.StudentID
WHERE r.RevieweeID = 22;
-- RESULT (Section 4): join order reviewee -> reviewee_user -> r -> reviewer -> reviewer_user. reviewee/reviewee_user: type=const, key=PRIMARY, rows=1 (reviewee Extra=Using index); r: type=ref, key=idx_review_reviewee, ref=const, rows=1; reviewer: type=eq_ref, key=PRIMARY, ref=r.ReviewerID, Extra=Using index; reviewer_user: type=eq_ref, key=PRIMARY
-- WHAT IT MEANS: Reviewee and reviewee_user are const lookups; Review uses idx_review_reviewee; reviewer and reviewer_user use primary key (reviewer covering). All steps use indexes efficiently.

-- 8. EXPLAIN WITH INDEX: JOIN Sessions + exchange + skill
EXPLAIN
SELECT se.SessionID, e.ExchangeType, sk.SkillName, se.ScheduledStartTime, se.Status
FROM Session se
JOIN Exchange e ON e.ExchangeID = se.ExchangeID
JOIN OfferedSkill os ON os.OfferID = e.OfferID
JOIN Skill sk ON sk.SkillID = os.SkillID
WHERE se.Status = 'completed'
ORDER BY se.ScheduledStartTime DESC
LIMIT 15;
-- RESULT (Section 4): join order se -> e -> os -> sk. se: type=ref, key=idx_session_status, key_len=1, ref=const, rows=115, Extra=Using index condition; Using filesort; e: type=eq_ref, key=PRIMARY, ref=se.ExchangeID; os: type=eq_ref, key=PRIMARY, ref=e.OfferID; sk: type=eq_ref, key=PRIMARY, ref=os.SkillID
-- WHAT IT MEANS: Session is found via idx_session_status (115 completed rows); then one row each from Exchange, OfferedSkill, and Skill by primary key. The filesort is for ORDER BY ScheduledStartTime DESC; an index including that column could remove it.

-- 9. EXPLAIN WITH INDEX: JOIN Messages + sender 
EXPLAIN
SELECT m.MessageID, m.CreatedAt, LEFT(m.Content, 40) AS ContentPreview, u.FullName AS SenderName
FROM Message m
JOIN Student s ON s.StudentID = m.SenderID
JOIN User u ON u.UserID = s.StudentID
WHERE m.ConversationID = 1
ORDER BY m.CreatedAt;
-- RESULT (Section 4): join order m -> s -> u. m: type=ref, key=idx_msg_conv_time, key_len=4, ref=const, rows=1; s: type=eq_ref, key=PRIMARY, ref=m.SenderID, Extra=Using index; u: type=eq_ref, key=PRIMARY, ref=m.SenderID
-- WHAT IT MEANS: Message is found via idx_msg_conv_time (ConversationID, CreatedAt), so order is already correct and no filesort. Student and User are single-row lookups by primary key (Student covering).

-- 10. EXPLAIN WITH INDEX: JOIN Open requests + skill + name 
EXPLAIN
SELECT rs.RequestID, sk.SkillName, rs.PreferredTime, rs.PreferredMode, u.FullName AS RequesterName
FROM RequestedSkill rs
JOIN Skill sk ON sk.SkillID = rs.SkillID
JOIN Student s ON s.StudentID = rs.StudentID
JOIN User u ON u.UserID = s.StudentID
WHERE rs.Status = 'open'
ORDER BY rs.RequestID
LIMIT 25;
-- RESULT (Section 4): join order rs -> sk -> s -> u. rs: type=index, key=PRIMARY, rows=25, filtered=33.33, Extra=Using where; sk: type=eq_ref, key=PRIMARY, ref=rs.SkillID; s: type=eq_ref, key=PRIMARY, ref=rs.StudentID, Extra=Using index; u: type=eq_ref, key=PRIMARY, ref=rs.StudentID
-- WHAT IT MEANS: Optimizer chose an index scan on RequestedSkill (PRIMARY) and filters by Status='open'; about a third pass. Then Skill, Student, and User are single-row lookups. idx_request_skill_status could be used for a more direct filter; here the plan still scans by primary key.

-- SECTION 5: WITH INDEXES — EXPLAIN ANALYZE (all 10 queries)

-- 1. EXPLAIN ANALYZE WITH INDEX: Offers by SkillID 
EXPLAIN ANALYZE SELECT o.OfferID, o.StudentID, o.IsPaid, o.PricePerHour
FROM OfferedSkill o
WHERE o.SkillID = 1;
-- RESULT (Section 5): -> Index lookup on o using idx_offer_skill (SkillID=1)  (cost=1.15 rows=4) (actual time=0.0327..0.0348 rows=4 loops=1)
-- WHAT IT MEANS: The performance index is used; 4 rows found in about 0.03 ms.

-- 2. EXPLAIN ANALYZE WITH INDEX: Open requests 
EXPLAIN ANALYZE SELECT RequestID, StudentID, PreferredTime, PreferredMode
FROM RequestedSkill
WHERE SkillID = 5 AND Status = 'open';
-- RESULT (Section 5): -> Index lookup on RequestedSkill using idx_request_skill_status (SkillID=5, Status='open'), with index condition  (cost=1.05 rows=3) (actual time=0.0358..0.0372 rows=3 loops=1)
-- WHAT IT MEANS: The composite index satisfies both SkillID and Status; 3 rows returned in about 0.04 ms.

-- 3. EXPLAIN ANALYZE WITH INDEX: Completed exchanges 
EXPLAIN ANALYZE SELECT ExchangeID, OfferID, RequestID, ExchangeType, CreatedAt
FROM Exchange
WHERE Status = 'completed'
ORDER BY CreatedAt DESC
LIMIT 20;
-- RESULT (Section 5): -> Limit: 20 row(s)  (cost=11.8 rows=20) (actual time=0.0641..0.0718 rows=20 loops=1)
--     -> Filter: (exchange.Status = 'completed')  (cost=11.8 rows=110) (actual time=0.063..0.07 rows=20 loops=1)
--         -> Index lookup on Exchange using idx_exch_status_created (Status='completed') (reverse)  (cost=11.8 rows=110) (actual time=0.061..0.0653 rows=20 loops=1)
-- WHAT IT MEANS: The index is scanned in reverse for CreatedAt DESC; no table scan and no filesort. 20 rows in about 0.07 ms (vs ~15 ms without index).

-- 4. EXPLAIN ANALYZE WITH INDEX: Reviews for reviewee 
EXPLAIN ANALYZE SELECT ReviewID, ExchangeID, ReviewerID, Rating, Feedback
FROM Review
WHERE RevieweeID = 22;
-- RESULT (Section 5): -> Index lookup on Review using idx_review_reviewee (RevieweeID=22)  (cost=0.35 rows=1) (actual time=0.0345..0.0391 rows=1 loops=1)
-- WHAT IT MEANS: Direct index lookup; 1 row in about 0.04 ms.

-- 5. EXPLAIN ANALYZE WITH INDEX: Messages in conversation 
EXPLAIN ANALYZE SELECT MessageID, SenderID, LEFT(Content, 50) AS ContentPreview, CreatedAt
FROM Message
WHERE ConversationID = 1
ORDER BY CreatedAt;
-- RESULT (Section 5): -> Index lookup on Message using idx_msg_conv_time (ConversationID=1)  (cost=0.35 rows=1) (actual time=0.0387..0.0438 rows=1 loops=1)
-- WHAT IT MEANS: The composite index (ConversationID, CreatedAt) is used; no filesort. 1 row in about 0.04 ms.

-- 6. EXPLAIN ANALYZE WITH INDEX: JOIN Exchanges + skill + offerer 
EXPLAIN ANALYZE
SELECT e.ExchangeID, sk.SkillName, u.FullName AS OffererName, e.Status
FROM Exchange e
JOIN OfferedSkill os ON os.OfferID = e.OfferID
JOIN Skill sk ON sk.SkillID = os.SkillID
JOIN Student s ON s.StudentID = os.StudentID
JOIN User u ON u.UserID = s.StudentID
WHERE e.Status = 'completed'
LIMIT 20;
-- RESULT (Section 5): -> Limit: 20 row(s)  (cost=157 rows=20) (actual time=0.0843..0.23 rows=20 loops=1)
--     -> Nested loop inner join: Table scan on sk -> Index lookup on os using idx_offer_skill -> Filter (e.Status='completed') -> Index lookup on e using idx_exch_offer -> Single-row covering lookup on s -> Single-row lookup on u
-- WHAT IT MEANS: Same join shape as without indexes (sk scan, then os, e, s, u), but e uses idx_exch_offer. Returns 20 rows in about 0.23 ms.

-- 7. EXPLAIN ANALYZE WITH INDEX: JOIN Reviews + names 
EXPLAIN ANALYZE
SELECT r.ReviewID, r.Rating, reviewee_user.FullName AS RevieweeName, reviewer_user.FullName AS ReviewerName
FROM Review r
JOIN Student reviewee ON reviewee.StudentID = r.RevieweeID
JOIN User reviewee_user ON reviewee_user.UserID = reviewee.StudentID
JOIN Student reviewer ON reviewer.StudentID = r.ReviewerID
JOIN User reviewer_user ON reviewer_user.UserID = reviewer.StudentID
WHERE r.RevieweeID = 22;
-- RESULT (Section 5): -> Nested loop inner join  (cost=1.05 rows=1) (actual time=0.032..0.0346 rows=1 loops=1)
--     -> Index lookup on r using idx_review_reviewee (RevieweeID=22)  (cost=0.35 rows=1) (actual time=0.0158..0.018 rows=1 loops=1)
--     -> Single-row covering index lookup on reviewer using PRIMARY  -> Single-row index lookup on reviewer_user using PRIMARY
-- WHAT IT MEANS: Review found by idx_review_reviewee; then reviewer and reviewer_user by primary key. 1 row in about 0.03 ms.

-- 8. EXPLAIN ANALYZE WITH INDEX: JOIN Sessions + exchange + skill 
EXPLAIN ANALYZE
SELECT se.SessionID, e.ExchangeType, sk.SkillName, se.ScheduledStartTime, se.Status
FROM Session se
JOIN Exchange e ON e.ExchangeID = se.ExchangeID
JOIN OfferedSkill os ON os.OfferID = e.OfferID
JOIN Skill sk ON sk.SkillID = os.SkillID
WHERE se.Status = 'completed'
ORDER BY se.ScheduledStartTime DESC
LIMIT 15;
-- RESULT (Section 5): -> Limit: 15 row(s)  (cost=133 rows=15) (actual time=0.273..0.33 rows=15 loops=1)
--     -> Nested loop inner join  (cost=133 rows=115) (actual time=0.272..0.327 rows=15 loops=1)
--         -> Nested loop inner join  (cost=92.8 rows=115) (actual time=0.267..0.306 rows=15 loops=1)
--             -> Nested loop inner join  (cost=52.5 rows=115) (actual time=0.263..0.283 rows=15 loops=1)
--                 -> Sort: se.ScheduledStartTime DESC  (cost=12.2 rows=115) (actual time=0.253..0.254 rows=15 loops=1)
--                     -> Index lookup on se using idx_session_status (Status='completed'), with index condition  (cost=12.2 rows=115) (actual time=0.0713..0.207 rows=115 loops=1)
--                 -> Single-row index lookup on e using PRIMARY (ExchangeID=se.ExchangeID)
--             -> Single-row index lookup on os using PRIMARY (OfferID=e.OfferID)
--         -> Single-row index lookup on sk using PRIMARY (SkillID=os.SkillID)
-- WHAT IT MEANS: Completed sessions are found via idx_session_status (115 rows in ~0.2 ms), then sorted by ScheduledStartTime DESC. For the first 15 rows, Exchange, OfferedSkill, and Skill are looked up by primary key. Total about 0.33 ms; the filesort is the main cost after the index lookup.

-- 9. EXPLAIN ANALYZE WITH INDEX: JOIN Messages + sender 
EXPLAIN ANALYZE
SELECT m.MessageID, m.CreatedAt, LEFT(m.Content, 40) AS ContentPreview, u.FullName AS SenderName
FROM Message m
JOIN Student s ON s.StudentID = m.SenderID
JOIN User u ON u.UserID = s.StudentID
WHERE m.ConversationID = 1
ORDER BY m.CreatedAt;
-- RESULT (Section 5): -> Nested loop inner join  (cost=1.05 rows=1) (actual time=0.0352..0.0379 rows=1 loops=1)
--     -> Index lookup on m using idx_msg_conv_time (ConversationID=1)  (cost=0.35 rows=1) (actual time=0.0195..0.0219 rows=1 loops=1)
--     -> Single-row covering index lookup on s using PRIMARY  -> Single-row index lookup on u using PRIMARY
-- WHAT IT MEANS: Message found via idx_msg_conv_time (no filesort); then sender Student and User by primary key. 1 row in about 0.04 ms.

-- 10. EXPLAIN ANALYZE WITH INDEX: JOIN Open requests + skill + name 
EXPLAIN ANALYZE
SELECT rs.RequestID, sk.SkillName, rs.PreferredTime, rs.PreferredMode, u.FullName AS RequesterName
FROM RequestedSkill rs
JOIN Skill sk ON sk.SkillID = rs.SkillID
JOIN Student s ON s.StudentID = rs.StudentID
JOIN User u ON u.UserID = s.StudentID
WHERE rs.Status = 'open'
ORDER BY rs.RequestID
LIMIT 25;
-- RESULT (Section 5): -> Limit: 25 row(s)  (cost=34.4 rows=8.33) (actual time=0.058..0.224 rows=25 loops=1)
--     -> Nested loop inner join: Filter (rs.Status='open') -> Index scan on rs using PRIMARY  (cost=1.89 rows=25) (actual time=0.0281..0.0505 rows=38 loops=1)
--     -> Single-row index lookup on sk using PRIMARY  -> Single-row covering lookup on s  -> Single-row lookup on u
-- WHAT IT MEANS: Optimizer scans RequestedSkill by primary key and filters by Status; 38 rows scanned, 25 pass. Then Skill, Student, and User by primary key. 25 rows in about 0.22 ms (faster than without index due to smaller scan).

