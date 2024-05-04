import React, { useEffect, useState } from 'react';

import * as ui from '@mui/material';
import * as icons from '@mui/icons-material';

import Backend, { RatingSchema, RatingsPostRequest, Collection, CardRating, Distribution } from '../server/backend';

export type RaterProps = {
    collection: Collection;
    language: string; // e.g. "en", "jp"
    backend: Backend;
}

function toDistribution({ rated_1, rated_2, rated_3, rated_4, rated_5 }: RatingSchema): Distribution {
    return [
        rated_1, rated_2, rated_3, rated_4, rated_5,
    ];
}


function makeUrl(collection: Collection, index: number, language: string) {
    const { set_code, card_code } = collection.ratings[index];

    return `https://api.scryfall.com/cards/${set_code}/${card_code}/${language}`;
}

export default function CollectionRater({ collection, language, backend }: RaterProps) {
    const collectionId = collection.collection_id;
    const [index, setIndex] = useState(0);
    const card = collection.ratings[index];

    const [imageSource, setImageSource] = useState("")
    const [imageBacksideSource, setImageBacksideSource] = useState<string | undefined>(undefined)
    const [ratingValue, setRatingValue] = useState<CardRating | null>(card.localRating);

    const [distribution, setDistribution] = useState<Distribution>([0, 0, 0, 0, 0]);
    const [loadingImage, setLoadingImage] = useState(true);
    const [hasLocalRating, setHasLocalRating] = useState(card.localRating !== null);

    useEffect(() => {
        setIndex(0);
    }, [collection])


    function handleViewChanged() {
        const localRating = collection.ratings[index].localRating;
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
        handleCardChanged((index + 1) % collection.ratings.length);
    }

    function handlePreviousCard() {
        handleCardChanged((index - 1 + collection.ratings.length) % collection.ratings.length);
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
            collectionId,
            rating: ratingValue,
        });
        card.localRating = ratingValue;
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
        const card = collection.ratings[index];
        console.log(`card is ${JSON.stringify(card)}`)
        setDistribution(toDistribution(card));
        handleViewChanged();

        // set image
        const url = makeUrl(collection, index, language);
        const prevUrl = makeUrl(collection, (index - 1 + collection.ratings.length) % collection.ratings.length, language);
        const nextUrl = makeUrl(collection, (index + 1) % collection.ratings.length, language);
        async function resolveImage(url: string): Promise<string[]> {
            // console.log(`Fetching image ${url}`);
            const response = await fetch(url);
            type ScryfallCardResponse = {
                card_faces?: { image_uris: { normal: string } }[];
                image_uris?: { normal: string };
            }
            const responseJson = await response.json() as ScryfallCardResponse;
            if (!ignore) {
                if (responseJson['card_faces']) {
                    return responseJson['card_faces'].map(x => x['image_uris']['normal']);
                }
                else if (responseJson["image_uris"]) {
                    return [responseJson['image_uris']['normal']]
                }
                console.error("Scryfall object had neither card_faces nor image_uris");
                return [""];
            }
            return Promise.reject("Outdated");
        }
        let prevImage = new Image();
        let nextImage = new Image();
        resolveImage(url).then((x) => {
            setImageSource(x[0]);
            setImageBacksideSource(x[1]);
        });
        resolveImage(prevUrl).then(s => prevImage.src = s[0]);
        resolveImage(nextUrl).then(s => nextImage.src = s[0]);

        return () => {
            ignore = true;
        }
    }, [collection, index])

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
                    <ui.Container sx={{ position: "relative", width: "100%" }}>
                        {loadingImage ?
                            <ui.Skeleton variant="rectangular">
                                <img className="card" alt="loading..." src={imageSource} />
                            </ui.Skeleton> : null}
                        <img className="card" alt="loading..." src={imageSource} onLoad={() => setLoadingImage(false)} />
                        {imageBacksideSource &&
                            <ui.IconButton
                                color="inherit"
                                onClick={(e) => {
                                    setImageSource(imageBacksideSource);
                                    setImageBacksideSource(imageSource);
                                }}
                                sx={{
                                    fontSize: 80,
                                    top: "15%",
                                    right: '12%',
                                    position: "absolute",
                                    zIndex: 'tooltip',
                                    color: "action",
                                    opacity: "65%",
                                    backgroundColor: "black",
                                    height: "9%",
                                    width: "9%",
                                    ":hover": {
                                        backgroundColor: "black",
                                    },
                                    '.MuiTouchRipple-ripple .MuiTouchRipple-child': {
                                        borderRadius: 0,
                                        backgroundColor: 'transparent',
                                        color: 'transparent',
                                    },
                                }}>
                                <icons.ChangeCircle sx={{ fontSize: 80 }} />
                            </ui.IconButton>
                        }
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
