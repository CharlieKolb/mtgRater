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

function toDistribution({ rated_1, rated_2, rated_3, rated_4, rated_5 }: RatingSchema): Distribution {
    return [
        rated_1, rated_2, rated_3, rated_4, rated_5,
    ];
}


function makeUrl(format: Format, index: number, language: string) {
    const { set_code, card_code } = format.ratings[index];

    return `https://api.scryfall.com/cards/${set_code}/${card_code}/${language}`;
}



export default function FormatRater({ format, language, backend }: RaterProps) {
    const formatId = format.format_id;
    const [index, setIndex] = useState(0);
    const card = format.ratings[index];

    const [imageSource, setImageSource] = useState("")
    const [ratingValue, setRatingValue] = useState<CardRating | null>(card.localRating);

    const [distribution, setDistribution] = useState<Distribution>([0, 0, 0, 0, 0]);
    const [loadingImage, setLoadingImage] = useState(true);
    const [hasLocalRating, setHasLocalRating] = useState(card.localRating !== null);

    function handleViewChanged() {
        const localRating = format.ratings[index].localRating;
        setRatingValue(localRating);
        setHasLocalRating(localRating !== null);
        // if we have a preexisting value we want to display the previous value
    }

    function handleCardChanged(newIndex: number) {
        if (!hasLocalRating) {
            // If the card has no local rating yet it means nothing submitted the chosen value to the backend yet
            reportRating();
        }

        setIndex(newIndex);
    }

    function handleNextCard() {
        handleCardChanged((index + 1) % format.ratings.length);
    }

    function handlePreviousCard() {
        handleCardChanged((index - 1 + format.ratings.length) % format.ratings.length);
    }

    function reportRating() {
        if (ratingValue === null) {
            return;
        }

        // We increment locally mostly to avoid showing no votes for the number the user chose just now
        switch (ratingValue) {
            case 1: card.rated_1 += 1; break;
            case 2: card.rated_2 += 1; break;
            case 3: card.rated_3 += 1; break;
            case 4: card.rated_4 += 1; break;
            case 5: card.rated_5 += 1; break;
        }
        backend.postRating({
            cardCode: card.card_code,
            setCode: card.set_code,
            formatId,
            rating: ratingValue,
        });
        setHasLocalRating(true);
    }

    function handleRatingChange(v: string) {
        switch (v) {
            case "1": setRatingValue(1); break;
            case "2": setRatingValue(2); break;
            case "3": setRatingValue(3); break;
            case "4": setRatingValue(4); break;
            case "5": setRatingValue(5); break;
            default: console.log(`Received unexpected rating ${v}`);
        }
    }

    // change image and rating distribution
    useEffect(() => {
        let ignore = false;

        // set distribution
        const card = format.ratings[index];
        console.log(`card is ${JSON.stringify(card)}`)
        setDistribution(toDistribution(card));
        handleViewChanged();

        // set image
        const url = makeUrl(format, index, language);
        const prevUrl = makeUrl(format, (index - 1 + format.ratings.length) % format.ratings.length, language);
        const nextUrl = makeUrl(format, (index + 1) % format.ratings.length, language);
        async function resolveImage(url: string): Promise<string> {
            // console.log(`Fetching image ${url}`);
            const response = await fetch(url);
            const responseJson = await response.json();
            if (!ignore) {
                return responseJson['image_uris']['normal']
            }
            return Promise.reject("Outdated");
        }
        let prevImage = new Image();
        let nextImage = new Image();
        resolveImage(url).then((x) => {
            setImageSource(x);
        });
        resolveImage(prevUrl).then(s => prevImage.src = s);
        resolveImage(nextUrl).then(s => nextImage.src = s);

        return () => {
            ignore = true;
        }
    }, [format, index])

    const makeDistributionBox = (index: number) => {
        const totalVotes = distribution.reduce((v, n) => v + n, 0)
        const diameter = Math.max(2.5, (distribution[index] / totalVotes) * 75);
        const shapeStyles = { width: diameter, height: diameter };
        const shapeCircleStyles = { borderRadius: '50%' };

        return <ui.Box display="flex"
            justifyContent="center"
            alignItems="center"
            bgcolor={ratingValue === index + 1 ? "secondary.main" : "primary.main"}
            sx={{ /*"fontSize": Math.min(diameter - 3, 25) + "px",*/ ...shapeStyles, ...shapeCircleStyles }}>
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
                        {loadingImage ?
                            <ui.Skeleton variant="rectangular">
                                <img className="card" alt="loading..." src={imageSource} />
                            </ui.Skeleton> : null}
                        <img className="card" alt="loading..." src={imageSource} onLoad={() => setLoadingImage(false)} />

                    </ui.Container>
                    {hasLocalRating ?
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
                                    onChange={(e, v) => handleRatingChange(v)}
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
            <ui.Button aria-label='Reveal' hidden={card.localRating !== null} onClick={() => {
                reportRating();
                setDistribution(toDistribution(card));
            }}>
                Reveal
            </ui.Button>
        </ui.Stack >
    )
}
