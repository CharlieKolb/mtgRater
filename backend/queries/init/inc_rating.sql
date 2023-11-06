UPDATE ratings
SET $1 = $1 + 1
WHERE set_code = $2 AND card_id = $3