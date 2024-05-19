
import React from 'react';

import * as ui from '@mui/material';
import { CollectionInfo, Ratings } from '../../server/backend';
import { ScryfallCard } from '@scryfall/api-types';
import { CollectionNavigatorButton } from './collectionNavigatorButton';


export type CollectionNavigatorSegmentProps = {
    collection: CollectionInfo;
    cardDetails: Map<string, ScryfallCard.Any>,
    headerName: string;
    targetIndex: number;
    startIndex: number;
    endIndex: number;
    onItemClick: (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => void;
    onImgOverride: (img: string | undefined) => void;
}

function range(start: number, end_inclusive: number) {
    let arr = [];
    while (start <= end_inclusive) {
        arr.push(start++);
    }
    return arr;
}


export const CollectionNavigatorSegment = React.memo<CollectionNavigatorSegmentProps>(({ collection, headerName, targetIndex, startIndex, endIndex, cardDetails, onItemClick, onImgOverride }: CollectionNavigatorSegmentProps) => {

    return <div><ui.ListSubheader>{headerName}</ui.ListSubheader>
        {
            range(startIndex, endIndex).map(i => {
                const card = collection.list[i];
                const cardInfo = cardDetails.get(card.setCode + card.cardCode);

                return (<CollectionNavigatorButton
                    key={`item-${card.setCode}-${card.cardCode}`}

                    index={i}
                    autoFocus={targetIndex === i}
                    selected={targetIndex === i}
                    onItemClick={onItemClick}
                    onImgOverride={onImgOverride}
                    cardInfo={cardInfo}
                />);
            })
        }</div>;
});

