UPDATE ratings
SET $1 = $1 + 1
WHERE collection_id = $2 AND card_id = $3