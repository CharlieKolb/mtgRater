import React, { useEffect, useState } from 'react';

import * as ui from '@mui/material';
import * as icons from '@mui/icons-material';

import Backend, { Card, RatingsPostRequest, Collection, CardRating, Distribution, Rating, setLocalStorageRating } from '../server/backend';
import RatingBar from './ratingBar';

import { ScryfallCard } from "@scryfall/api-types";

export type CollectionNavigatorProps = {
    collection: Collection;
}

type ScryfallResponse = {
    has_more: boolean;
    data: [ScryfallCard.Any];
    next_page?: string;
}



export default function CollectionNavigator({ collection }: CollectionNavigatorProps) {
    return (
        <ui.List
            sx={{
                justifyItems: "right",
                flexGrow: 1,
                maxWidth: 360,
                bgcolor: 'background.paper',
                overflow: 'auto',
                '& ul': { padding: 0 },
            }}
            subheader={<li />}
        >
            {[0, 1, 2, 3, 4].map((sectionId) => (
                <li key={`section-${sectionId}`}>
                    <ul>
                        <ui.ListSubheader>{`I'm sticky ${sectionId}`}</ui.ListSubheader>
                        {[0, 1, 2].map((item) => (
                            <ui.ListItem key={`item-${sectionId}-${item}`}>
                                <ui.ListItemText primary={`Item ${item}`} />
                            </ui.ListItem>
                        ))}
                    </ul>
                </li>
            ))}
        </ui.List>
    );
}