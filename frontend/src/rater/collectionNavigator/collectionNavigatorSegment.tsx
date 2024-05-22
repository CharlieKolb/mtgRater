
import React from 'react';

import * as ui from '@mui/material';
import { CollectionInfo, makeRatingsKey, Ratings } from '../../server/backend';
import { ScryfallCard } from '@scryfall/api-types';
import { CollectionNavigatorButton } from './collectionNavigatorButton';


export type CollectionNavigatorSegmentProps = {
    collection: CollectionInfo;
    ratings: Ratings;
    cardDetails: Record<string, ScryfallCard.Any>,
    headerName: string;
    targetIndex: number;
    startIndex: number;
    endIndex: number;
    onItemClick: (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => void;
    onIndexOverride: (idx: number | undefined) => void;
}

function range(start: number, end_inclusive: number) {
    let arr = [];
    while (start <= end_inclusive) {
        arr.push(start++);
    }
    return arr;
}


export const CollectionNavigatorSegment = React.memo<CollectionNavigatorSegmentProps>(({ collection, ratings, headerName, targetIndex, startIndex, endIndex, cardDetails, onItemClick, onIndexOverride }: CollectionNavigatorSegmentProps) => {

    return <div><ui.ListSubheader>{headerName}</ui.ListSubheader>
        {
            range(startIndex, endIndex).map(i => {
                const card = collection.list[i];
                const cardInfo = cardDetails[card.setCode + card.cardCode];

                return (<CollectionNavigatorButton
                    key={`item-${card.setCode}-${card.cardCode}`}

                    index={i}
                    autoFocus={targetIndex === i}
                    selected={targetIndex === i}
                    rating={ratings.ratings[makeRatingsKey(card)]}
                    onItemClick={onItemClick}
                    onIndexOverride={onIndexOverride}
                    cardInfo={cardInfo}
                />);
            })
        }</div>;
});

