import React, { useCallback, useEffect, useState } from 'react';

import * as ui from '@mui/material';
import * as icons from '@mui/icons-material';

import Backend, { Card, RatingsPostRequest, Collection, CardRating, Distribution, Rating, setLocalStorageRating } from '../server/backend';
import RatingBar from './ratingBar';
import { ScryfallCard, ScryfallCardFace } from '@scryfall/api-types';
import CollectionNavigator from './collectionNavigator/collectionNavigator';

export type RaterProps = {
    collection: Collection;
    language: string; // e.g. "en", "jp"
    backend: Backend;
    formats: string[];
}

const DEFAULT_IMAGE = "https://cards.scryfall.io/normal/front/5/a/5aa90ab6-2686-4462-8725-5d4370c05437.jpg?1663738897"


function makeUrl(collection: Collection, index: number, language: string) {
    const { set_code, card_code } = collection.ratings[index];

    return `https://api.scryfall.com/cards/${set_code}/${card_code}/${language}`;
}

function hasAtLeastOneLocalRating(card: Card) {
    return Object.values(card.rating_by_format).some(x => x.localRating !== null);
}


export default function CollectionRater({ collection, language, backend, formats }: RaterProps) {
    const collectionId = collection.collection_id;
    const [index, setIndex] = useState(0);
    const card = collection.ratings[index];
    const ratingsByFormat = card.rating_by_format;

    const [imageSource, setImageSource] = useState("")
    const [imageBacksideSource, setImageBacksideSource] = useState<string | undefined>(undefined)

    const [submitted, setSubmitted] = useState(hasAtLeastOneLocalRating(card));



    useEffect(() => {
        setIndex(0);
    }, [collection])


    function handleCardChanged(newIndex: number) {
        if (!submitted) {
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
        for (const [key, rating] of Object.entries(ratingsByFormat)) {
            if (rating.localRating === null) {
                break;
            }

            // We increment locally mostly to avoid showing no votes for the number the user chose just now
            switch (rating.localRating) {
                case 1: rating.rated_1 += 1; break;
                case 2: rating.rated_2 += 1; break;
                case 3: rating.rated_3 += 1; break;
                case 4: rating.rated_4 += 1; break;
                case 5: rating.rated_5 += 1; break;
            }
            backend.postRating({
                cardCode: card.card_code,
                setCode: card.set_code,
                formatId: key,
                collectionId,
                rating: rating.localRating,
            });

        }
    }


    // change image and rating distribution
    useEffect(() => {
        let ignore = false;

        // set distribution
        setSubmitted(hasAtLeastOneLocalRating(collection.ratings[index]));

        // set image
        const url = makeUrl(collection, index, language);
        const prevUrl = makeUrl(collection, (index - 1 + collection.ratings.length) % collection.ratings.length, language);
        const nextUrl = makeUrl(collection, (index + 1) % collection.ratings.length, language);
        async function resolveImage(url: string): Promise<string[]> {
            const cardDetail = (await collection.cardDetails).get(card.set_code + card.card_code);
            if (!ignore && cardDetail) {
                if ("image_uris" in cardDetail) {
                    return [cardDetail.image_uris?.normal || DEFAULT_IMAGE];
                }

                if ('card_faces' in cardDetail) {
                    return (cardDetail as ScryfallCard.AnyDoubleSidedSplit)['card_faces'].map(x => x.image_uris?.normal || DEFAULT_IMAGE);
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
    }, [index])

    const handleNavigationClick = useCallback((e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
        setIndex(Number.parseInt(e.currentTarget.getAttribute("data-valueindex") || "0"));
    }, [setIndex]);



    return (
        <ui.Stack direction="row" alignItems="center" justifyContent="center">
            <ui.Stack direction="column" alignItems="stretch" justifyContent="center" spacing={1} flexGrow={3}>
                <ui.Stack direction="row" alignItems="center" justifyContent="center" spacing={1}>
                    <ui.IconButton color="primary" onClick={handlePreviousCard}>
                        <icons.ArrowBackIos />
                    </ui.IconButton>
                    <ui.Box sx={{ position: "relative", }}>
                        <img className="card" alt="loading..." src={imageSource} />
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
                    </ui.Box>
                    <ui.IconButton color="primary" onClick={handleNextCard}>
                        <icons.ArrowForwardIos />
                    </ui.IconButton>
                </ui.Stack >
                <ui.Stack direction="column" justifyContent="center" spacing={1}>
                    {formats.map(x =>
                        <RatingBar key={x} title={x} reveal={submitted} rating={card.rating_by_format[x]} onRatingChanged={(v) => card.rating_by_format[x].localRating = v} />
                    )
                    }
                </ui.Stack>
                <ui.Box alignSelf="center">
                    <ui.Button onClick={() => {
                        if (submitted) {
                            for (const formatId of formats) {
                                setLocalStorageRating(collectionId, formatId, card.set_code, card.card_code, null);
                                collection.ratings[index].rating_by_format[formatId].localRating = null;
                            }
                            setSubmitted(false);
                        }
                        else {
                            reportRating();
                            setIndex(index); // hack to refresh local value in ratingBar
                            setSubmitted(true);
                        }
                    }}>
                        {submitted ? "Clear" : "Reveal"}
                    </ui.Button>
                </ui.Box>
            </ui.Stack >
            <CollectionNavigator collection={collection} targetIndex={index} onItemClick={handleNavigationClick} />
        </ui.Stack >
    )
}
