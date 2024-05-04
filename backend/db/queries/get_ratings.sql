SELECT set_code,
    card_code,
    rated_1,
    rated_2,
    rated_3,
    rated_4,
    rated_5
FROM ratings
WHERE collection_id = $1
ORDER BY {set_order_stmt} length(ratings.card_code), ratings.card_code;