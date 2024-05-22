import React from 'react';

import * as ui from '@mui/material';

import { CollectionInfo, Ratings } from '../../server/backend';

import { CollectionNavigatorSegment } from './collectionNavigatorSegment';

export type CollectionNavigatorProps = {
    collection: CollectionInfo;
    ratings: Ratings;
    targetIndex: number;
    onItemClick: (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => void,
    onIndexOverride: (idx: number | undefined) => void;

}

export default function CollectionNavigator(props: CollectionNavigatorProps) {
    const collection = props.collection;
    const cardDetails = props.collection.dict;

    function buildList() {
        let firstCardOfSet = collection.list.map((x, i) => [x, i] as const).filter(([x, i]) => x.setCode !== collection.list.at(i - 1)?.setCode).map(x => x[1]);
        if (firstCardOfSet.length === 0) firstCardOfSet = [0];

        let res = [];
        for (let i = 0; i < firstCardOfSet.length; i++) {
            const startIndex = firstCardOfSet[i];
            const endIndex = (firstCardOfSet[i + 1] - 1) || (collection.list.length - 1);
            let firstCard = collection.list[startIndex];
            res.push((
                <li key={`section-${firstCard.setCode}`}>
                    <ul>
                        <CollectionNavigatorSegment
                            cardDetails={cardDetails}
                            startIndex={startIndex}
                            endIndex={endIndex}
                            headerName={firstCard.setCode.toUpperCase()}
                            {...props}
                        />
                    </ul>
                </li>
            ));
        }
        return res;
    }

    const theme = ui.useTheme();
    const isDesktop = ui.useMediaQuery(theme.breakpoints.up('md'));


    return (
        <ui.List
            sx={{
                height: "100vh",
                position: "relative",
                // display: "flex", // @TODO(ckolb): this happens to create a really cool "by segment" mode that should be expanded upon
                bgcolor: 'background.paper',
                minWidth: isDesktop ? "22%" : "0",
                maxWidth: isDesktop ? "50%" : "100%",
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