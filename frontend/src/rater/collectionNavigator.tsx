import React, { useEffect, useState } from 'react';

import * as ui from '@mui/material';
import * as icons from '@mui/icons-material';

import Backend, { Card, RatingsPostRequest, Collection, CardRating, Distribution, Rating, setLocalStorageRating } from '../server/backend';
import RatingBar from './ratingBar';

import { ScryfallCard } from "@scryfall/api-types";
import { cp } from 'fs';

export type CollectionNavigatorProps = {
    collection: Collection;
    targetIndex: number;
    onItemClick: (index: number) => void,
}

function range(start: number, end_inclusive: number) {
    let arr = [];
    while (start <= end_inclusive) {
        arr.push(start++);
    }
    return arr;
}

export default function CollectionNavigator({ collection, targetIndex, onItemClick }: CollectionNavigatorProps) {

    const [cardDetails, setCardDetails] = useState<Map<string, ScryfallCard.Any>>(new Map());

    useEffect(() => {
        (async () => {
            setCardDetails(await collection.cardDetails);
        })();
    }, [collection])

    function buildList() {
        let firstCardOfSet = collection.ratings.map((x, i) => [x, i] as const).filter(([x, i]) => x.set_code !== collection.ratings.at(i - 1)?.set_code).map(x => x[1]);

        let res: any[] = [];
        for (let i = 0; i < firstCardOfSet.length; i++) {
            const startIndex = firstCardOfSet[i];
            const endIndex = (firstCardOfSet[i + 1] - 1) || (collection.ratings.length - 1);

            let firstCard = collection.ratings[startIndex];
            res.push((
                <li key={`section-${firstCard.set_code.toUpperCase()}`}>
                    <ul>
                        <ui.ListSubheader>{firstCard.set_code.toUpperCase()}</ui.ListSubheader>
                        {range(startIndex, endIndex).map(i => {
                            const card = collection.ratings[i];
                            const cardInfo = cardDetails.get(card.set_code + card.card_code);

                            return (<ui.ListItemButton
                                key={`item-${card.set_code.toUpperCase()}-${card.set_code}${card.card_code}`}
                                autoFocus={targetIndex === i}
                                selected={targetIndex === i}
                                onClick={() => { onItemClick(i); }}>
                                <ui.ListItemText primary={`${cardInfo?.name}`} />
                            </ui.ListItemButton >);
                        })}
                    </ul>
                </li>
            ));
        }
        return res;
    }

    return (
        <ui.List
            sx={{
                justifyItems: "right",
                // flexGrow: 1,
                height: "100vh",
                position: "relative",
                marginTop: -5,
                maxWidth: 360,
                bgcolor: 'background.paper',
                overflow: 'auto',
                '& ul': { padding: 0 },

                '&& .Mui-selected, && .Mui-selected:hover': {
                    bgcolor: 'grey',
                    '&, & .MuiListItemIcon-root': {
                        // color: 'pink',
                    },
                },
                // hover states
                '& .MuiListItemButton-root:hover': {
                    // bgcolor: 'primary',
                    '&, & .MuiListItemIcon-root': {
                        // color: 'yellow',
                    },
                },
            }}
            subheader={<li />}
        >
            {buildList()}

        </ui.List>
    );
}