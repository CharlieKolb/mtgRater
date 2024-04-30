UPDATE ratings
SET $1 = $1 + 1
WHERE format_id = $2 AND card_id = $3