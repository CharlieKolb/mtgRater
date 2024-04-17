import React, { useEffect, useState } from 'react';
import SetData from './setData';

import * as ui from '@mui/material';
import * as icons from '@mui/icons-material';

import MockBackend, { Distribution } from "../mock/backend";

export type CardProps = {
    setCode: string; // e.g. "neo", "dmu", "bro", not "BRO"
    language: string; // e.g. "en", "jp"
}

// ID to avoid stale update
let handleCardChangedId = 1;
let fetchDistributionId = 1;

function makeUrl({ setCode, language }: Readonly<CardProps>, cardNumber: number) {
    return `https://api.scryfall.com/cards/${setCode}/${cardNumber + 1}/${language}`;
}

export default function Card(props: CardProps) {
    const [cardNumber, setCardNumber] = useState(0);
    const [source, setSource] = useState("https://backs.scryfall.io/large/d/3/d3335a33-505d-422a-a03c-5dd9b1388046.jpg?1665006244")
    const [ratingValue, setRatingValue] = useState<number | null>(null);
    const [enableRatings, setEnableRatings] = useState<boolean>(true);
    const [enableDistribution, setEnableDistribution] = useState<boolean>(false);
    const [distribution, setDistribution] = useState<Distribution>([0, 0, 0, 0, 0]);

    function commitCardRating(num: number, rating: number | null): Promise<Distribution> {
        return MockBackend.registerRating(props.setCode, num, rating);
    }


    // The existence of this function is a good sign this functionality should likely be moved out to a component that is remade here instead.
    function handleCardChanged(newNumber: number) {
        const updateId = ++handleCardChangedId;
        commitCardRating(cardNumber, ratingValue); // don't care about visualizing the result since we're about to change card

        setDistribution([0, 0, 0, 0, 0]);
        setEnableDistribution(false);
        setRatingValue(null);
        setEnableRatings(false); // @TODO(ckolb) we should probably prefetch a list/range of cards the user has already rated so we can avoid loading this in the moment - in fact we might as well prefetch and update all ratings, it won't be a lot of data and can be optimized to 3 bits if need be


        MockBackend.getDistribution(props.setCode, newNumber).then(d => {
            if (handleCardChangedId === updateId) {
                setDistribution(d);
            }
        });


        setCardNumber(newNumber);
    }

    function handleNextCard() {
        handleCardChanged((SetData[props.setCode].length + cardNumber + 1) % SetData[props.setCode].length);
    }

    function handlePreviousCard() {
        handleCardChanged((SetData[props.setCode].length + cardNumber - 1) % SetData[props.setCode].length);
    }

    function handleRating(value: string | number | null) {
        if (value === null) {
            console.log(`cleared rating for card ${cardNumber} in set ${props.setCode}`)
            // this is where the backend goes
            return;
        }
        if (typeof value === "string") {
            value = Number.parseInt(value);
        }
        if (!Number.isInteger(value)) {
            console.error(`handleRating received non-int value ${value}`)
            return;
        }

        if (value < 1 || value > 5) {
            console.error(`handleRating received out of range value ${value}`)
            return;
        }


        console.log(`reporting rating ${value} for card ${cardNumber} in set ${props.setCode}`)
        setRatingValue(value)
    }

    // change image and fetch ratings
    useEffect(() => {
        let ignore = false;
        let updateId = ++fetchDistributionId;
        MockBackend.getDistribution(props.setCode, cardNumber).then(d => {
            if (fetchDistributionId === updateId) {
                setDistribution(d);
            }
        });


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
        <ui.Stack alignItems="center">

            <ui.Stack direction="row" alignItems="center" spacing={4}>
                <ui.IconButton aria-label="arrowBack" color="primary" onClick={handlePreviousCard}>
                    <icons.ArrowBackIos />
                </ui.IconButton>
                <ui.Stack alignItems="center">
                    {source.match(cardNumber.toString()) ? <img className="card" alt="loading..." src={source} /> : <ui.Skeleton variant="rectangular" />}
                    {enableDistribution ?
                        <ui.Stack
                            direction="row"
                            aria-labelledby="demo-row-radio-buttons-group-label"
                            aria-disabled={!enableRatings}
                        >
                            <ui.ListItem color={ratingValue === 1 ? "primary" : "secondary"}>{distribution[0]}</ui.ListItem>
                            <ui.ListItem color={ratingValue === 2 ? "secondary" : "primary"}>{distribution[1]}</ui.ListItem>
                            <ui.ListItem color={ratingValue === 3 ? "primary" : "secondary"}>{distribution[2]}</ui.ListItem>
                            <ui.ListItem color={ratingValue === 4 ? "primary" : "secondary"}>{distribution[3]}</ui.ListItem>
                            <ui.ListItem color={ratingValue === 5 ? "primary" : "secondary"}>{distribution[4]}</ui.ListItem>
                        </ui.Stack > :
                        <ui.Stack>
                            <ui.FormControl>
                                <ui.RadioGroup
                                    row
                                    aria-labelledby="demo-row-radio-buttons-group-label"
                                    name="row-radio-buttons-group"
                                    aria-disabled={!enableRatings}
                                    value={ratingValue}
                                    onChange={(e, v) => handleRating(v)}
                                >
                                    <ui.FormControlLabel value="1" control={<ui.Radio />} label="1" labelPlacement="bottom" />
                                    <ui.FormControlLabel value="2" control={<ui.Radio />} label="2" labelPlacement="bottom" />
                                    <ui.FormControlLabel value="3" control={<ui.Radio />} label="3" labelPlacement="bottom" />
                                    <ui.FormControlLabel value="4" control={<ui.Radio />} label="4" labelPlacement="bottom" />
                                    <ui.FormControlLabel value="5" control={<ui.Radio />} label="5" labelPlacement="bottom" />
                                </ui.RadioGroup>
                            </ui.FormControl>

                        </ui.Stack>}
                </ui.Stack >
                <ui.IconButton aria-label="arrowForward" color="primary" onClick={handleNextCard}>
                    <icons.ArrowForwardIos />
                </ui.IconButton>
            </ui.Stack >
            <ui.Button aria-label='Reveal' hidden={enableDistribution} onClick={() => setEnableDistribution(true)}>
                Reveal
            </ui.Button>
        </ui.Stack >
    )
}
