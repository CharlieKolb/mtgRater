import * as ui from '@mui/material';
import * as icons from '@mui/icons-material';

import { CollectionInfo, Format, makeRatingsKey, Ratings } from '../server/backend';


export type CollectionExportButtonProps = {
    formats: Format[],
    collectionInfo: CollectionInfo,
    ratings: Ratings,
}

// Export name last to reduce impact of spaces in card names when copy pasting instead of properly importing
function doDownload(props: CollectionExportButtonProps) {
    const formats = props.formats.filter(x => x.enabled);
    // bit awkward to support empty formats map in the middle without comma madness
    const lines = [["set", "collector_number", ...formats.map(x => `rating_${x.title}`), "name"].join(",") + "\n"];

    for (const x of props.collectionInfo.list) {
        const rating = props.ratings.ratings[makeRatingsKey(x)];

        const formatRatings = formats.map(y => rating?.rating_by_format[y.title]?.localRating?.toString() || "")
        lines.push([x.setCode, x.cardCode].concat(formatRatings).concat([`"${x.scryfallCard.name}"`]).join(",") + "\n")
    }



    const blob = new Blob(lines, { type: "text/csv;charset=utf8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.download = `ratings_${props.collectionInfo.metadata.id}.csv`;
    link.href = url;
    link.click();
}

export default function CollectionExportButton(props: CollectionExportButtonProps) {
    return (
        <ui.Button variant="contained" onClick={() => doDownload(props)} endIcon={<icons.Download />}>CSV</ui.Button>);
}