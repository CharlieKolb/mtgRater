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
    const [source, setSource] = useState("")
    const [ratingValue, setRatingValue] = useState<number | null>(null);
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
        // @TODO(ckolb) we should prefetch and update all existing ratings for the user + set, it won't be a lot of data and can be optimized to 3 bits per card if need be
        setRatingValue(null);


        MockBackend.getDistribution(props.setCode, newNumber).then(d => {
            if (handleCardChangedId === updateId) {
                setDistribution(d);
            }
        });


        setCardNumber(newNumber);
    }

    const getNextCardNumber = () => ((SetData[props.setCode].length + cardNumber + 1) % SetData[props.setCode].length);
    const getPreviousCardNumber = () => ((SetData[props.setCode].length + cardNumber - 1) % SetData[props.setCode].length);

    function handleNextCard() {
        handleCardChanged(getNextCardNumber());
    }

    function handlePreviousCard() {
        handleCardChanged(getPreviousCardNumber());
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

    let prevImage = new Image();
    let nextImage = new Image();


    // change image and fetch ratings
    useEffect(() => {
        let ignore = false;
        let updateId = ++fetchDistributionId;
        MockBackend.getDistribution(props.setCode, cardNumber).then(d => {
            if (fetchDistributionId === updateId) {
                setDistribution(d);
            }
        });


        const url = makeUrl(props, cardNumber);
        const prevUrl = makeUrl(props, getPreviousCardNumber());
        const nextUrl = makeUrl(props, getNextCardNumber());
        async function resolveImage(url: string): Promise<string> {
            const response = await fetch(url);
            const responseJson = await response.json();
            if (!ignore) {
                return responseJson['image_uris']['normal']
            }
            return Promise.reject("Outdated");
        }
        resolveImage(url).then(setSource);
        resolveImage(prevUrl).then(s => prevImage.src = s);
        resolveImage(nextUrl).then(s => nextImage.src = s);

        return () => {
            ignore = true;
        }
    }, [cardNumber, props])

    const makeDistributionBox = (index: number) => {
        const totalVotes = distribution.reduce((v, n) => v + n, 0)
        const diameter = distribution[index] / totalVotes * 100;
        const shapeStyles = { width: diameter, height: diameter };
        const shapeCircleStyles = { borderRadius: '50%' };

        return <ui.Box display="flex"
            justifyContent="center"
            alignItems="center"
            bgcolor={ratingValue === index + 1 ? "secondary.main" : "primary.main"}
            sx={{ "fontSize": Math.min(diameter - 3, 25) + "px", ...shapeStyles, ...shapeCircleStyles }}>
            {/* <ui.Typography >{distribution[index]}</ui.Typography> */}
        </ui.Box >
    }

    return (
        <ui.Stack alignItems="center">

            <ui.Stack direction="row" alignItems="center" spacing={4}>
                <ui.IconButton aria-label="arrowBack" color="primary" onClick={handlePreviousCard}>
                    <icons.ArrowBackIos />
                </ui.IconButton>
                <ui.Stack alignItems="center">
                    {source.match(cardNumber.toString()) ? <img className="card" alt="loading..." src={source} /> : <ui.Skeleton variant="rectangular" width={635 * 0.5} height={889 * 0.5} />}
                    {enableDistribution ?
                        <ui.Stack
                            direction="row"
                            alignItems="center"
                            minHeight={80} // hardcoded to fit with the alternate component so the rest of the tree doesn't move when we swap them - there's probably a better way
                            spacing={6}
                        >
                            {makeDistributionBox(0)}
                            {makeDistributionBox(1)}
                            {makeDistributionBox(2)}
                            {makeDistributionBox(3)}
                            {makeDistributionBox(4)}
                        </ui.Stack > :
                        <ui.Stack minHeight={80}>
                            <ui.FormControl>
                                <ui.RadioGroup
                                    row
                                    name="row-radio-buttons-group"
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
