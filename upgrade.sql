INSERT INTO checks2 (page, status, responseTime, checkedAt) 
SELECT p.rowid, c.status, c.responseTime, c.checkedAt 
FROM checks c 
JOIN pages p 
    ON c.key = p.key;
DROP TABLE checks;
VACUUM;
