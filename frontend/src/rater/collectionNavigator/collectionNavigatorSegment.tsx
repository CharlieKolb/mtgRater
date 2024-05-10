
import React, { useEffect, useState } from 'react';

import * as ui from '@mui/material';
import { Collection } from '../../server/backend';
import { ScryfallCard } from '@scryfall/api-types';
import { CollectionNavigatorButton } from './collectionNavigatorButton';


export type CollectionNavigatorSegmentProps = {
    collection: Collection;
    cardDetails: Map<string, ScryfallCard.Any>,
    headerName: string;
    targetIndex: number;
    startIndex: number;
    endIndex: number;
    onItemClick: (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => void;
}

function range(start: number, end_inclusive: number) {
    let arr = [];
    while (start <= end_inclusive) {
        arr.push(start++);
    }
    return arr;
}


export const CollectionNavigatorSegment = React.memo<CollectionNavigatorSegmentProps>(({ collection, headerName, targetIndex, startIndex, endIndex, cardDetails, onItemClick }: CollectionNavigatorSegmentProps) => {

    return <div><ui.ListSubheader>{headerName}</ui.ListSubheader>
        {
            range(startIndex, endIndex).map(i => {
                const card = collection.ratings[i];
                const cardInfo = cardDetails.get(card.set_code + card.card_code);

                return (<CollectionNavigatorButton
                    key={`item-${card.set_code}-${card.card_code}`}

                    index={i}
                    autoFocus={targetIndex === i}
                    selected={targetIndex === i}
                    onItemClick={onItemClick}
                    cardInfo={cardInfo}
                />);
            })
        }</div>;
});

