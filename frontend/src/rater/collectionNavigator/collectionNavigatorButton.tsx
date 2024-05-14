
import React, { useEffect, useState } from 'react';

import * as ui from '@mui/material';
import { ScryfallCard, ScryfallColorLike, ScryfallColors } from '@scryfall/api-types';
import { resolveImageFromInfo } from '../../util/scryfall_util';


export type CollectionNavigatorButtonProps = {
    autoFocus: boolean;
    selected: boolean;
    index: number;
    cardInfo: ScryfallCard.Any | undefined;
    onItemClick: React.MouseEventHandler<HTMLDivElement> | undefined;
    onImgOverride: (img: string | undefined) => void;

}

function getColorIdentityCode(cardInfo: ScryfallCard.Any | undefined): string | null {
    if (cardInfo === undefined) return null;

    let colors: ScryfallColors | null = null;
    if ("colors" in cardInfo) {
        colors = cardInfo.colors;
    }
    else {
        colors = cardInfo.color_identity;
    }
    if (colors.length === 0 && "type_line" in cardInfo && cardInfo.type_line.match("Artifact")) {
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

export const CollectionNavigatorButton = React.memo<CollectionNavigatorButtonProps>(({ autoFocus, selected, index, cardInfo, onItemClick, onImgOverride }: CollectionNavigatorButtonProps) => {
    const colorCode = getColorIdentityCode(cardInfo);
    const title = cardInfo?.name || "";

    const [imageSource, setImageSource] = useState<string | undefined>(undefined);

    useEffect(() => {
        if (cardInfo) {
            resolveImageFromInfo(cardInfo).then((x) => setImageSource(x[0]))

        }
    }, [cardInfo])

    return (<ui.ListItemButton
        data-valueindex={index}
        autoFocus={autoFocus}
        selected={selected}
        onClick={onItemClick}
        onMouseEnter={() => onImgOverride(imageSource)}
        onMouseLeave={() => onImgOverride(undefined)}
        sx={{
            lineHeight: "1.7em",
            height: "1.7em",
            whiteSpace: "nowrap"
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

