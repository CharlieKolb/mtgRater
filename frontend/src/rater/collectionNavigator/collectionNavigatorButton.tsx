
import React from 'react';

import * as ui from '@mui/material';
import { ScryfallCard, ScryfallColorLike, ScryfallColors } from '@scryfall/api-types';
import { CardRating, hasAtLeastOneLocalRating } from '../../server/backend';


export type CollectionNavigatorButtonProps = {
    autoFocus: boolean;
    selected: boolean;
    index: number;
    cardInfo: ScryfallCard.Any | undefined;
    rating: CardRating;
    onItemClick: React.MouseEventHandler<HTMLDivElement> | undefined;
    onIndexOverride: (index: number | undefined) => void;

}

function getColorIdentityCode(cardInfo: ScryfallCard.Any | undefined): string | null {
    if (cardInfo === undefined) return null;

    let colors: ScryfallColors | null = null;
    if ("colors" in cardInfo && cardInfo.colors.length > 0) {
        colors = cardInfo.colors;
    }
    else if (cardInfo.mana_cost !== undefined) {
        // This affects e.g. devoid cards. Note that cards without mana cost, e.g. lands have `mana_cost=""`
        colors = Array.from(new Set(cardInfo.mana_cost.split("").filter(x => "WUBRG".match(x)))) as unknown as ScryfallColorLike[];
    }
    else {
        // mostly theoretical fallback
        colors = cardInfo.color_identity;
    }
    // Workaround to support non-lands with generic mana cost, e.g. Sol Ring
    if (colors.length === 0 && "type_line" in cardInfo && !cardInfo.type_line.match("Land")) {
        colors = ["C"];
    }

    if (colors.length === 0) return null;
    if (colors.length > 1) return "#c0ac39";

    switch (colors[0]) {
        case "W": return "#fefff8";
        case "U": return "#3277a7";
        case "B": return "#393736";
        case "R": return "#da3946";
        case "G": return "#38614c";
        case "C": return "#94908e";
    }


    return null
}

export const CollectionNavigatorButton = React.memo<CollectionNavigatorButtonProps>(({ rating, autoFocus, selected, index, cardInfo, onItemClick, onIndexOverride }: CollectionNavigatorButtonProps) => {
    const colorCode = getColorIdentityCode(cardInfo);
    const title = cardInfo?.name || "";

    return (<ui.ListItemButton
        data-valueindex={index}
        autoFocus={autoFocus}
        selected={selected}
        onClick={onItemClick}
        onMouseEnter={() => onIndexOverride(index)}
        onMouseLeave={() => onIndexOverride(undefined)}
        sx={{
            lineHeight: "1.7em",
            height: "1.7em",
            whiteSpace: "nowrap",
            minWidth: "50px",
            bgcolor: hasAtLeastOneLocalRating(rating) ? '#21252d' : 'theme.palette.background',
        }}>
        {cardInfo && colorCode && <ui.Box
            display="block"
            flexShrink="0"
            borderRadius="100%"
            width="15px"
            height="15px"
            margin="2px 7px 0 0"
            border="1px solid #333"
            boxShadow="0px 0px 0px 2px rgba(0, 0, 0, 0.2)"
            overflow="hidden"
            color="transparent"
            bgcolor={colorCode}
            sx={{
                float: "left",
            }}
        />}
        <ui.ListItemText primary={title} />
    </ui.ListItemButton >);
}
    // , (x, y) => { console.log("Memo check Button"); return Object.is(x, y); }
);

