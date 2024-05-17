import React, { useCallback, useEffect, useState } from 'react';

import * as ui from '@mui/material';
import * as icons from '@mui/icons-material';

import Backend, { Card, Collection } from '../server/backend';
import RatingBar from './ratingBar';
import CollectionNavigator from './collectionNavigator/collectionNavigator';
import { resolveImage } from '../util/scryfall_util';
import { useDebounce } from 'use-debounce';

import globals from "../globals";

export type RaterProps = {
    collection: Collection;
    language: string; // e.g. "en", "jp"
    backend: Backend;
    formats: string[];
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
    const [imgOverride, setImgOverride] = useState<string | undefined>(undefined);
    const [debouncedImgOverride] = useDebounce<string | undefined>(imgOverride, globals.navigatorHoverDebounce);

    const [submitted, setSubmitted] = useState(hasAtLeastOneLocalRating(card));

    const [showMobileNavigator, setShowMobileNavigator] = useState(false);



    useEffect(() => {
        setIndex(0);
    }, [collection])


    function handleCardChanged(newIndex: number) {
        if (!submitted) {
            // If the card has no local rating yet it means nothing submitted the chosen value to the backend yet
            reportRating();
        }
        // set submitted here rather than reactive on new index to avoid rendering issue in child component
        // should either remove clearing feature or have explicit localstorage "cleared" state for each collection/set/card combo regardless of specific value
        setSubmitted(hasAtLeastOneLocalRating(collection.ratings[newIndex]));
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

        let prevImage = new Image();
        let nextImage = new Image();
        resolveImage(collection, card).then((x) => {
            if (!ignore) {
                setImageSource(x[0]);
                setImageBacksideSource(x[1]);
            }
        });
        resolveImage(collection, collection.ratings[(index + 1) % collection.ratings.length]).then(s => prevImage.src = s[0]);
        resolveImage(collection, collection.ratings[(index - 1 + collection.ratings.length) % collection.ratings.length]).then(s => nextImage.src = s[0]);

        return () => {
            ignore = true;
        }
    }, [collection, index])

    const handleNavigationClick = useCallback((e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
        handleCardChanged(Number.parseInt(e.currentTarget.getAttribute("data-valueindex") || "0"));
    }, [setIndex]);

    const theme = ui.useTheme();
    const isDesktop = ui.useMediaQuery(theme.breakpoints.up('md'));


    return (
        <ui.Stack direction="row" alignItems="center" justifyContent="center" width="100%" maxWidth="100%">
            <ui.Stack direction="column" alignItems="stretch" justifyContent="center" spacing={{ xs: 0, md: 1 }} flexGrow={3}>
                <ui.Stack direction={{ xs: "column", md: "row" }} alignItems="center" justifyContent="center" width="100%" maxWidth="100%" spacing={{ xs: 0, md: 2 }}>
                    <ui.IconButton color="primary" onClick={handlePreviousCard} sx={{ display: { xs: "none", md: "block" } }}>
                        <icons.ArrowBackIosNew />
                    </ui.IconButton>
                    <ui.Box sx={{ position: "relative", }}>
                        <img className="card" alt="loading..." src={debouncedImgOverride || imageSource} style={{ maxWidth: "100%" }} />
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
                    <ui.IconButton color="primary" onClick={handleNextCard} sx={{ display: { xs: "none", md: "block" } }}>
                        <icons.ArrowForwardIos />
                    </ui.IconButton>
                </ui.Stack >
                <ui.Stack direction="column" justifyContent="center" spacing={1}>
                    {formats.map(x =>
                        <RatingBar key={x} title={x} reveal={submitted} rating={card.rating_by_format[x]} onRatingChanged={(v) => card.rating_by_format[x].localRating = v} />
                    )
                    }
                </ui.Stack>
                <ui.Stack direction="row" alignItems="center" justifyItems="stretch" alignSelf={isDesktop ? "center" : "stretch"}>
                    {!isDesktop &&
                        <React.Fragment>
                            <ui.Button fullWidth onClick={(e) => setShowMobileNavigator(!showMobileNavigator)}>Browse</ui.Button>
                            <ui.Drawer
                                anchor="right"
                                open={showMobileNavigator}
                                onClose={() => setShowMobileNavigator(!showMobileNavigator)}
                            >
                                <CollectionNavigator
                                    collection={collection}
                                    targetIndex={index}
                                    onItemClick={(e) => {
                                        handleNavigationClick(e);
                                        setShowMobileNavigator(false);
                                    }}
                                    onImgOverride={setImgOverride} />
                            </ui.Drawer>
                        </React.Fragment>}
                    <ui.Button fullWidth={!isDesktop} onClick={() => {
                        if (!submitted) {
                            reportRating();
                            setIndex(index); // hack to refresh local value in ratingBar
                            setSubmitted(true);
                        } else {
                            handleNextCard();
                        }
                    }}>
                        {submitted ? "Next" : "Reveal"}
                    </ui.Button>
                </ui.Stack>
            </ui.Stack >
            <ui.Divider orientation="vertical" flexItem />
            {isDesktop && <CollectionNavigator collection={collection} targetIndex={index} onItemClick={handleNavigationClick} onImgOverride={setImgOverride} />}
        </ui.Stack >
    )
}
