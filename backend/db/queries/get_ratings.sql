SELECT set_code,
    card_code,
    format_id,
    rated_1,
    rated_2,
    rated_3,
    rated_4,
    rated_5
FROM ratings
WHERE collection_id = $1
ORDER BY {set_order_stmt} length(card_code), card_code, format_id;