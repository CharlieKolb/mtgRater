import React, { useEffect, useState } from 'react';

import * as ui from '@mui/material';
import * as icons from '@mui/icons-material';



import { CardRating, Distribution, Rating } from "../server/backend";

export type RatingBarProps = {
    title: string;
    rating: Rating;
    reveal: boolean;
    onRatingChanged: (rating: CardRating | null) => void;
}

function toDistribution({ rated_1, rated_2, rated_3, rated_4, rated_5 }: Rating): Distribution {
    return [
        rated_1, rated_2, rated_3, rated_4, rated_5,
    ];
}

export default function RatingBar({ title, reveal, rating, onRatingChanged }: RatingBarProps) {
    const distribution = toDistribution(rating);
    const [ratingValue, setRatingValue] = useState<CardRating | null>(rating.localRating);


    function handleRatingChange(value: string) {
        let res: CardRating | null = null;
        switch (value) {
            case "1": res = 1; break;
            case "2": res = 2; break;
            case "3": res = 3; break;
            case "4": res = 4; break;
            case "5": res = 5; break;
            default: console.log(`Received unexpected rating ${value}`); return;
        }

        setRatingValue(res);
        onRatingChanged(res);
    }

    useEffect(() => {
        setRatingValue(rating.localRating);
    }, [rating])

    const makeDistributionBox = (index: number) => {
        const totalVotes = distribution.reduce((v, n) => v + n); // Start with 1 to avoid div by 0
        const diameter = Math.max(2.5, (distribution[index] / Math.max(1, totalVotes)) * 70);
        const shapeStyles = { width: diameter, height: diameter };
        const shapeCircleStyles = { borderRadius: '50%' };

        return (<ui.Grid key={index} item gridRow="1">
            < ui.Box
                key={index}
                bgcolor={ratingValue === index + 1 ? "secondary.main" : "primary.main"
                }
                sx={{ /*"fontSize": Math.min(diameter - 3, 25) + "px",*/
                    ...shapeStyles, ...shapeCircleStyles
                }
                } />
        </ui.Grid >);
    }


    return (
        <ui.Grid container item justifyContent="center">
            {/* <ui.Container sx={{
                // position: "relative",
                // width: "100%"
            }}> */}
            {/* <ui.Grid item>
                <ui.Typography sx={{
                    // position: "absolute",
                    // left: "20%",
                    // bottom: "0%",
                }}>{title}</ui.Typography>
            </ui.Grid> */}
            {reveal ?
                <ui.Grid container item
                    display="grid"
                    alignItems="center"
                    justifyItems="center"
                    gridAutoColumns="1fr"
                    minHeight={75}
                    maxHeight={75}
                    maxWidth={370}
                    spacing={0}>
                    {makeDistributionBox(0)}
                    {makeDistributionBox(1)}
                    {makeDistributionBox(2)}
                    {makeDistributionBox(3)}
                    {makeDistributionBox(4)}
                </ui.Grid > :
                <ui.Grid item minHeight={75} maxHeight={75}>
                    <ui.FormControl>
                        <ui.RadioGroup
                            row
                            name="row-radio-buttons-group"
                            onChange={(e, v) => handleRatingChange(v)}
                        >
                            <ui.FormControlLabel key="1" value="1" control={<ui.Radio />} label="1" labelPlacement="bottom" />
                            <ui.FormControlLabel key="2" value="2" control={<ui.Radio />} label="2" labelPlacement="bottom" />
                            <ui.FormControlLabel key="3" value="3" control={<ui.Radio />} label="3" labelPlacement="bottom" />
                            <ui.FormControlLabel key="4" value="4" control={<ui.Radio />} label="4" labelPlacement="bottom" />
                            <ui.FormControlLabel key="5" value="5" control={<ui.Radio />} label="5" labelPlacement="bottom" />
                        </ui.RadioGroup>
                    </ui.FormControl>

                </ui.Grid>
            }
            {/* </ui.Container> */}
        </ui.Grid >);
}