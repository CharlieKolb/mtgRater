UPDATE ratings
SET {0} = {0} + 1
WHERE format_id = $2 AND card_code = $3 AND set_code = $4