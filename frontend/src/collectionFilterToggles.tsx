import * as React from 'react';
import * as icons from "@mui/icons-material"
import * as ui from "@mui/material"
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import { CollectionInfo } from './server/backend';

export type CollectionFilterTogglesProps = {
    handleFilterUpdate: (x: FilterConfig) => void;
}

export type FilterConfig = {
    colors: {
        white: boolean,
        blue: boolean,
        black: boolean,
        red: boolean,
        green: boolean,
        colorless: boolean,
    },
    rarities: {
        common: boolean,
        uncommon: boolean,
        rare: boolean,
        mythic: boolean,
    }
};

export function configToId(filterConfig: FilterConfig) {
    let output = "";
    output += (filterConfig.rarities.common) ? "T" : "F";
    output += (filterConfig.rarities.uncommon) ? "T" : "F";
    output += (filterConfig.rarities.rare) ? "T" : "F";
    output += (filterConfig.rarities.mythic) ? "T" : "F";

    output += (filterConfig.colors.white) ? "T" : "F";
    output += (filterConfig.colors.blue) ? "T" : "F";
    output += (filterConfig.colors.black) ? "T" : "F";
    output += (filterConfig.colors.red) ? "T" : "F";
    output += (filterConfig.colors.green) ? "T" : "F";
    output += (filterConfig.colors.colorless) ? "T" : "F";

    return output;
}

export function filterCollectionInfo(collectionInfo: CollectionInfo, filterConfig: FilterConfig) {
    const newList = [];
    for (const card of collectionInfo.list) {
        const sfc = card.scryfallCard;
        if (sfc.rarity === "common" && !filterConfig.rarities.common) continue;
        if (sfc.rarity === "uncommon" && !filterConfig.rarities.uncommon) continue;
        if (sfc.rarity === "rare" && !filterConfig.rarities.rare) continue;
        if (sfc.rarity === "mythic" && !filterConfig.rarities.mythic) continue;

        if (!filterConfig.colors.white && sfc.color_identity.includes("W")) continue;
        if (!filterConfig.colors.blue && sfc.color_identity.includes("U")) continue;
        if (!filterConfig.colors.black && sfc.color_identity.includes("B")) continue;
        if (!filterConfig.colors.red && sfc.color_identity.includes("R")) continue;
        if (!filterConfig.colors.green && sfc.color_identity.includes("G")) continue;
        if (!filterConfig.colors.colorless && (sfc.color_identity.includes("C") || sfc.color_identity.length === 0)) continue;

        newList.push(card)
    }

    return Object.assign({}, collectionInfo, { list: newList });
}


export default function CollectionFilterToggles(props: CollectionFilterTogglesProps) {
    const [rarities, setRarities] = React.useState(['common', 'uncommon', 'rare', 'mythic']);
    const [colors, setColors] = React.useState(['white', 'blue', 'black', 'red', 'green', 'colorless']);

    React.useEffect(() => {
        props.handleFilterUpdate({
            colors: {
                white: colors.find(x => x === "white") !== undefined,
                blue: colors.find(x => x === "blue") !== undefined,
                black: colors.find(x => x === "black") !== undefined,
                red: colors.find(x => x === "red") !== undefined,
                green: colors.find(x => x === "green") !== undefined,
                colorless: colors.find(x => x === "colorless") !== undefined,
            },
            rarities: {
                common: rarities.find(x => x === "common") !== undefined,
                uncommon: rarities.find(x => x === "uncommon") !== undefined,
                rare: rarities.find(x => x === "rare") !== undefined,
                mythic: rarities.find(x => x === "mythic") !== undefined,

            }
        })
    }, [rarities, colors])

    return (
        <ui.Stack
            direction="column"
        >
            <ui.ToggleButtonGroup
                orientation='vertical'
                value={rarities}
                onChange={(_, x) => setRarities(x)}
            >
                <ui.ToggleButton value="common">Common</ui.ToggleButton>
                <ui.ToggleButton value="uncommon">Uncommon</ui.ToggleButton>
                <ui.ToggleButton value="rare">Rare</ui.ToggleButton>
                <ui.ToggleButton value="mythic">Mythic</ui.ToggleButton>
            </ui.ToggleButtonGroup >
            <ui.Divider flexItem orientation="vertical" sx={{ mx: 0.5, my: 1 }} />
            <ui.ToggleButtonGroup
                orientation='vertical'
                value={colors}
                onChange={(_, x) => setColors(x)}
            >
                <ui.ToggleButton value="white">White</ui.ToggleButton>
                <ui.ToggleButton value="blue">Blue</ui.ToggleButton>
                <ui.ToggleButton value="black">Black</ui.ToggleButton>
                <ui.ToggleButton value="red">Red</ui.ToggleButton>
                <ui.ToggleButton value="green">Green</ui.ToggleButton>
                <ui.ToggleButton value="colorless">Colorless</ui.ToggleButton>
            </ui.ToggleButtonGroup >
        </ui.Stack >
    );
}