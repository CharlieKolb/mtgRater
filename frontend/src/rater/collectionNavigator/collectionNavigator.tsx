import React, { useEffect, useState } from 'react';

import * as ui from '@mui/material';

import { Collection } from '../../server/backend';

import { ScryfallCard } from "@scryfall/api-types";
import { CollectionNavigatorSegment } from './collectionNavigatorSegment';

export type CollectionNavigatorProps = {
    collection: Collection;
    targetIndex: number;
    onItemClick: (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => void,
    onImgOverride: (img: string | undefined) => void;

}

export default function CollectionNavigator(props: CollectionNavigatorProps) {
    const collection = props.collection;
    const [cardDetails, setCardDetails] = useState<Map<string, ScryfallCard.Any>>(new Map());

    useEffect(() => {
        (async () => {
            setCardDetails(await collection.cardDetails);
        })();
    }, [collection])

    function buildList() {
        let firstCardOfSet = collection.ratings.map((x, i) => [x, i] as const).filter(([x, i]) => x.set_code !== collection.ratings.at(i - 1)?.set_code).map(x => x[1]);
        if (firstCardOfSet.length === 0) firstCardOfSet = [0];

        let res = [];
        for (let i = 0; i < firstCardOfSet.length; i++) {
            const startIndex = firstCardOfSet[i];
            const endIndex = (firstCardOfSet[i + 1] - 1) || (collection.ratings.length - 1);
            let firstCard = collection.ratings[startIndex];
            res.push((
                <li key={`section-${firstCard.set_code}`}>
                    <ul>
                        <CollectionNavigatorSegment
                            cardDetails={cardDetails}
                            startIndex={startIndex}
                            endIndex={endIndex}
                            headerName={firstCard.set_code.toUpperCase()}
                            {...props}
                        />
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
                height: "100vh",
                position: "relative",
                display: { xs: "none", md: "block" },
                // display: "flex", // @TODO(ckolb): this happens to create a really cool "by segment" mode that should be expanded upon
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