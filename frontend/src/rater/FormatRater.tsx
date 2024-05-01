import React, { useEffect, useState } from 'react';
import SetData from './setData';

import * as ui from '@mui/material';
import * as icons from '@mui/icons-material';

import MockBackend, { Distribution } from "../mock/backend";
import Backend, { RatingSchema, RatingsPostRequest, Format, CardRating } from '../server/backend';

export type RaterProps = {
    format: Format;
    language: string; // e.g. "en", "jp"
    backend: Backend;
}


// ID to avoid stale update
let handleCardChangedId = 1;
let fetchDistributionId = 1;

function makeUrl(format: Format, index: number, language: string) {
    const { set_code, card_code } = format.ratings[index];

    return `https://api.scryfall.com/cards/${set_code}/${card_code}/${language}`;
}

function keyFromRatingSchema(schema: RatingSchema): string {
    return schema.set_code + schema.card_code;
}

function increment_locally(card: RatingSchema, rating: CardRating) {
    switch (rating) {
        case 1: card.rated_1 += 1; break;
        case 2: card.rated_2 += 1; break;
        case 3: card.rated_3 += 1; break;
        case 4: card.rated_4 += 1; break;
        case 5: card.rated_5 += 1; break;
    }
}

export default function FormatRater({ format, language, backend }: RaterProps) {
    const format_id = format.format_id;
    const [index, setIndex] = useState(0);

    const [imageSource, setImageSource] = useState("")
    const [ratingValue, setRatingValue] = useState<CardRating | null>(null);

    const [enableDistribution, setEnableDistribution] = useState(false);
    const [distribution, setDistribution] = useState<Distribution>([0, 0, 0, 0, 0]);
    const [loadingRatings, setLoadingRatings] = useState(true);

    function commitCardRating(rating: CardRating): Promise<Response> {
        if (format == null) {
            console.log()
        }
        const card = format.ratings[index];

        // We increment locally mostly to avoid showing no votes for the number the user chose just now
        increment_locally(card, rating);

        return backend.postRating({
            cardCode: card.card_code,
            setCode: card.set_code,
            formatId: format_id,
            rating,
        });
    }


    // The existence of this function is a good sign this functionality should likely be moved out to a component that is remade here instead.
    function handleCardChanged(newIndex: number) {
        if (ratingValue != null) {
            commitCardRating(ratingValue); // fire and forget
        }

        setEnableDistribution(false);
        setRatingValue(null);
        setIndex(newIndex);
    }

    function handleNextCard() {
        handleCardChanged((index + 1) % format.ratings.length);
    }

    function handlePreviousCard() {
        handleCardChanged((index - 1) % format.ratings.length);
    }

    function handleRating(value: string | number | null) {
        if (value === null) {
            return;
        }
        if (typeof value === "string") {
            value = Number.parseInt(value);
        }
        if (!Number.isInteger(value)) {
            console.error(`handleRating received non-int value ${value}`)
            return;
        }

        if (1 <= value && value <= 5) {
            console.log(`reporting rating ${value} for ${Object.assign({ card_code: 0, set_code: 0 }, format.ratings[index])}`)
            setRatingValue(value as CardRating);
        } else {
            console.error(`handleRating received out of range value ${value}`)
            return;
        }

    }

    let prevImage = new Image();
    let nextImage = new Image();


    // change image and fetch ratings
    useEffect(() => {
        let ignore = false;

        const url = makeUrl(format, index, language);
        const prevUrl = makeUrl(format, (index - 1) % format.ratings.length, language);
        const nextUrl = makeUrl(format, (index + 1) % format.ratings.length, language);
        async function resolveImage(url: string): Promise<string> {
            const response = await fetch(url);
            const responseJson = await response.json();
            if (!ignore) {
                return responseJson['image_uris']['normal']
            }
            return Promise.reject("Outdated");
        }
        resolveImage(url).then(setImageSource);
        resolveImage(prevUrl).then(s => prevImage.src = s);
        resolveImage(nextUrl).then(s => nextImage.src = s);

        return () => {
            ignore = true;
        }
    }, [format, index])

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
                    <ui.Container sx={{ "display": "inline-block" }}>
                        {imageSource.match(`${format.ratings[index].set_code}/${format.ratings[index].card_code}`) ?
                            <img className="card" alt="loading..." src={imageSource} /> :
                            <ui.Skeleton variant="rectangular">
                                <img className="card" alt="loading..." src={imageSource} />
                            </ui.Skeleton>}
                    </ui.Container>
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
