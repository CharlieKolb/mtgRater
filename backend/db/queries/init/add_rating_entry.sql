-- probably don't use this and instead have one insert statement with VALUES (...),(...),(...) etc
INSERT INTO ratings(format_id, card_id, rated_1, rated_2, rated_3, rated_4, rated_5)
VALUES($1, $2, 0, 0, 0, 0, 0)