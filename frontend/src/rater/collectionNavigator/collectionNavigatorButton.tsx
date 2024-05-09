
import React, { useEffect, useState } from 'react';

import * as ui from '@mui/material';


export type CollectionNavigatorButtonProps = {
    autoFocus: boolean;
    selected: boolean;
    index: number;
    text: string;
    onItemClick: React.MouseEventHandler<HTMLDivElement> | undefined;

}

export const CollectionNavigatorButton = React.memo<CollectionNavigatorButtonProps>(({ text, autoFocus, selected, index, onItemClick }: CollectionNavigatorButtonProps) => {
    return (<ui.ListItemButton
        data-valueindex={index}
        autoFocus={autoFocus}
        selected={selected}
        onClick={onItemClick}>
        <ui.ListItemText primary={text} />
    </ui.ListItemButton >);
}
    // , (x, y) => { console.log("Memo check Button"); return Object.is(x, y); }
);

