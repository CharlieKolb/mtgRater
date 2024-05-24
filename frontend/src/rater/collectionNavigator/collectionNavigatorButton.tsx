
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

function letterToColor(letter: string) {
    switch (letter) {
        case "W": return "#fefff8";
        case "U": return "#3277a7";
        case "B": return "#393736";
        case "R": return "#da3946";
        case "G": return "#38614c";
        case "C": return "#94908e";
    }
    return "#000000";
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
    colors.sort();
    // Workaround to support non-lands with generic mana cost, e.g. Sol Ring
    if (colors.length === 0 && "type_line" in cardInfo && !cardInfo.type_line.match("Land")) {
        colors = ["C"];
    }
    switch (colors.length) {
        case 0: return null;
        case 1: return letterToColor(colors[0]);
        case 2: return `linear-gradient(135deg, ${letterToColor(colors[0])} 50%, ${letterToColor(colors[1])} 50%)`
        case 3: return `conic-gradient(from 180deg, ${letterToColor(colors[0])} 33.3%, ${letterToColor(colors[1])} 33.3%, ${letterToColor(colors[1])} 66.6%, ${letterToColor(colors[2])} 66.6%)`;
        case 4: return `conic-gradient(from 180deg, ${letterToColor(colors[0])} 25%, ${letterToColor(colors[1])} 25%, ${letterToColor(colors[1])} 50%, ${letterToColor(colors[2])} 50%, ${letterToColor(colors[2])} 75%, ${letterToColor(colors[3])} 75%)`;
        default: return "#c0ac39";
    }
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
            // border="1px solid #333" // Disabled as it makes two-color buggy
            boxShadow="0px 0px 0px 2px rgba(0, 0, 0, 0.2)"
            overflow="hidden"
            color="transparent"
            sx={{
                float: "left",
                background: colorCode,
            }}
        />}
        <ui.ListItemText primary={title} />
    </ui.ListItemButton >);
}
    // , (x, y) => { console.log("Memo check Button"); return Object.is(x, y); }
);

