import React, { Fragment, useEffect, useState } from 'react';
import SetData from './setData';

import * as ui from '@mui/material';
import * as icons from '@mui/icons-material';

export type CardProps = {
    setCode: string; // e.g. "neo", "dmu", "bro", not "BRO"
    language: string; // e.g. "en", "jp"
}

function makeUrl({ setCode, language }: Readonly<CardProps>, cardNumber: number) {
    return `https://api.scryfall.com/cards/${setCode}/${cardNumber + 1}/${language}`;
}

export default function Card(props: CardProps) {
    const [cardNumber, setCardNumber] = useState(0);
    const [source, setSource] = useState("https://backs.scryfall.io/large/d/3/d3335a33-505d-422a-a03c-5dd9b1388046.jpg?1665006244")
    const [ratingValue, setRatingValue] = useState<number | null>(null);
    function handleNextCard() {
        setCardNumber((SetData[props.setCode].length + cardNumber + 1) % SetData[props.setCode].length);
    }

    function handlePreviousCard() {
        setCardNumber((SetData[props.setCode].length + cardNumber - 1) % SetData[props.setCode].length);
    }

    function handleRating(value: string | number | null) {
        if (value == null) {
            console.log(`cleared rating for card ${cardNumber} in set ${props.setCode}`)
            // this is where the backend goes
            return;
        }
        if (typeof value === "string") {
            value = Number.parseInt(value);
        }
        if (!Number.isInteger(value)) {
            console.error(`handleRating received non-int value ${value}`)
        }

        if (value < 1 || value > 5) {
            console.error(`handleRating received out of range value ${value}`)
        }


        console.log(`reporting rating ${value} for card ${cardNumber} in set ${props.setCode}`)
        // this is where the backend goes
    }

    useEffect(() => {
        let ignore = false;

        async function resolveImage() {
            const url = makeUrl(props, cardNumber);
            console.log(`url is ${url}`);
            const response = await fetch(url);
            const responseJson = await response.json();
            if (!ignore) {
                setSource(responseJson['image_uris']['normal'])
            }
        }

        resolveImage();
        return () => {
            ignore = true;
        }
    }, [cardNumber, props])

    return (
        <ui.Stack direction="row" alignItems="center" spacing={4}>
            <ui.IconButton aria-label="arrowBack" color="primary" onClick={handlePreviousCard}>
                <icons.ArrowBackIos />
            </ui.IconButton>
            <ui.Stack alignItems="center">
                <img className="card" alt="loading..." src={source} />
                <ui.FormControl>
                    <ui.RadioGroup
                        row
                        aria-labelledby="demo-row-radio-buttons-group-label"
                        name="row-radio-buttons-group"
                        onChange={(e, v) => handleRating(v)}
                    >
                        <ui.FormControlLabel value="1" control={<ui.Radio />} label="1" labelPlacement="bottom" />
                        <ui.FormControlLabel value="2" control={<ui.Radio />} label="2" labelPlacement="bottom" />
                        <ui.FormControlLabel value="3" control={<ui.Radio />} label="3" labelPlacement="bottom" />
                        <ui.FormControlLabel value="4" control={<ui.Radio />} label="4" labelPlacement="bottom" />
                        <ui.FormControlLabel value="5" control={<ui.Radio />} label="5" labelPlacement="bottom" />
                    </ui.RadioGroup>
                </ui.FormControl>
            </ui.Stack>
            <ui.IconButton aria-label="arrowForward" color="primary" onClick={handleNextCard}>
                <icons.ArrowForwardIos />
            </ui.IconButton>
        </ui.Stack>
    )
}
