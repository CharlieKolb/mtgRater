import React, { useCallback, useEffect, useState } from 'react';

import * as ui from '@mui/material';
import * as icons from '@mui/icons-material';

import Backend, { CardRating, Ratings, RatingByFormat, CollectionInfo, makeRatingsKey, Rating, EMPTY_RATING, hasAtLeastOneLocalRating, makeFormatStorageKey, Format } from '../server/backend';
import RatingBar from './ratingBar';
import CollectionNavigator from './collectionNavigator/collectionNavigator';
import { resolveImage } from '../util/scryfall_util';
import { useDebounce } from 'use-debounce';

import globals from "../globals";
import { title } from 'process';
import CollectionExportButton from './collectionExportButton';

export type RaterProps = {
    collection: CollectionInfo,
    ratings: Ratings;
    language: string; // e.g. "en", "jp"
    backend: Backend;
    formats: Format[];
}




function reportRating({ backend, collection }: RaterProps, card: CardRating) {
    for (const [key, rating] of Object.entries(card.rating_by_format)) {
        if (rating.localRating === null) {
            continue;
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
            collectionId: collection.metadata.id,
            rating: rating.localRating,
        });

    }
}



export default function CollectionRater(props: RaterProps) {

    const { collection, ratings, formats } = props;
    const [index, setIndex] = useState(0);
    const card = collection.list[index];
    const rating = ratings.ratings[makeRatingsKey(card)] as CardRating | undefined;

    const [imageSource, setImageSource] = useState("")
    const [imageBacksideSource, setImageBacksideSource] = useState<string | undefined>(undefined)
    const [imgOverride, setImgOverride] = useState<string | undefined>(undefined);
    const [debouncedImgOverride] = useDebounce<string | undefined>(imgOverride, globals.navigatorHoverDebounce);

    const [submitted, setSubmitted] = useState(hasAtLeastOneLocalRating(rating));

    const [showMobileNavigator, setShowMobileNavigator] = useState(false);

    const [activeFormats, setActiveFormats] = useState(formats.filter(x => x.enabled).map(x => x.title).sort());

    useEffect(() => {
        setIndex(0);
    }, [ratings, collection]);


    const handleCardChanged = useCallback((newIndex: number) => {
        if (!submitted && rating) {
            // If the card has no local rating yet it means nothing submitted the chosen value to the backend yet
            reportRating(props, rating);
        }
        // set submitted here rather than reactive on new index to avoid rendering issue in child component
        // should either remove clearing feature or have explicit localstorage "cleared" state for each collection/set/card combo regardless of specific value
        setSubmitted(hasAtLeastOneLocalRating(ratings.ratings[makeRatingsKey(collection.list[newIndex])]));
        setIndex(newIndex);
    }, [props, rating, submitted, setIndex]);

    function handleNextCard() {
        handleCardChanged((index + 1) % collection.list.length);
    }

    function handlePreviousCard() {
        handleCardChanged((index - 1 + collection.list.length) % collection.list.length);
    }


    // change image and rating distribution
    useEffect(() => {
        let n = collection.list.length;
        // preload next/prev image to warm cache
        for (const i of [-1, 1]) {
            const img = resolveImage(collection.list[(index + i + n) % n])[0];
            (new Image()).src = img;
        }

        const currentImgs = resolveImage(card);
        setImageSource(currentImgs[0]);
        setImageBacksideSource(currentImgs[1]); // usually undefined
    }, [card, collection, ratings, index])

    const handleNavigationClick = useCallback((e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
        handleCardChanged(Number.parseInt(e.currentTarget.getAttribute("data-valueindex") || "0"));
    }, [handleCardChanged]);

    const theme = ui.useTheme();
    const isDesktop = ui.useMediaQuery(theme.breakpoints.up('md'));


    return (
        <ui.Stack direction="row" alignItems="center" justifyContent="center" width="100%" maxWidth="100%">
            <ui.Stack direction="column" alignItems="center" alignContent="center" spacing={{ xs: 1, md: 1 }} flexGrow={3}>
                <ui.Stack direction={{ xs: "column", md: "row" }} alignItems="center" justifyContent="center" width="100%" maxWidth="100%" minWidth="70%" spacing={{ xs: 0, md: 2 }}>
                    <ui.IconButton color="primary" onClick={handlePreviousCard} sx={{ display: { xs: "none", md: "block" } }}>
                        <icons.ArrowBackIosNew />
                    </ui.IconButton>
                    <ui.Box sx={{ position: "relative", }}>
                        <img className="card" alt="loading..." src={debouncedImgOverride || imageSource} style={{ maxWidth: "100%", borderRadius: "4.75% / 3.5%" }} />
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
                {ratings && activeFormats.map(x =>
                    <RatingBar
                        key={x}
                        title={x}
                        reveal={submitted}
                        rating={rating?.rating_by_format[x] || EMPTY_RATING}
                        onRatingChanged={(v) => {
                            ratings.ratings[makeRatingsKey(card)].rating_by_format[x].localRating = v;
                        }}
                        handleDelete={(e) => {
                            localStorage.setItem(makeFormatStorageKey(x), "false");
                            const format = formats.find(y => y.title === x);
                            if (format) format.enabled = false;
                            setActiveFormats(activeFormats.filter(y => y !== x));
                        }} />
                )
                }
                <ui.Stack direction="row" alignItems="center" justifyItems="stretch" alignSelf={isDesktop ? "center" : "stretch"}>
                    {!isDesktop &&
                        <React.Fragment>
                            <ui.Button fullWidth variant="outlined" onClick={(e) => setShowMobileNavigator(!showMobileNavigator)}>Browse</ui.Button>
                            <ui.Drawer
                                anchor="right"
                                open={showMobileNavigator}
                                onClose={() => setShowMobileNavigator(!showMobileNavigator)}
                            >
                                <ui.Stack direction="column" width="250px">
                                    <CollectionExportButton formats={formats} collectionInfo={collection} ratings={ratings} />
                                    <CollectionNavigator
                                        ratings={ratings}
                                        collection={collection}
                                        targetIndex={index}
                                        onItemClick={(e) => {
                                            handleNavigationClick(e);
                                            setShowMobileNavigator(false);
                                        }}
                                        onImgOverride={setImgOverride} />
                                </ui.Stack>
                            </ui.Drawer>
                        </React.Fragment>}
                    <ui.Button fullWidth={!isDesktop} variant="outlined" onClick={() => {
                        if (!submitted) {
                            if (rating) reportRating(props, rating);
                            setIndex(index); // hack to refresh local value in ratingBar
                            setSubmitted(true);
                        } else {
                            handleNextCard();
                        }
                    }}>
                        {submitted ? "Next" : "Reveal"}
                    </ui.Button>
                </ui.Stack>
                <ui.Stack direction="row" justifyContent="flex-start" width={{ xs: "80%", md: "40%" }} spacing={1}>
                    {formats.filter(x => activeFormats.find(y => y === x.title) === undefined).map(x =>
                        <ui.Chip key={x.title} variant="outlined" label={x.title} sx={{ textTransform: 'capitalize' }} icon={<icons.Add fontSize='small' />} onClick={() => {
                            localStorage.setItem(makeFormatStorageKey(x.title), "true");
                            x.enabled = true;
                            setActiveFormats([x.title, ...activeFormats].sort());

                        }} />
                    )}
                </ui.Stack>
            </ui.Stack >
            {isDesktop && <ui.Divider orientation="vertical" flexItem />}
            {isDesktop && <CollectionNavigator ratings={ratings} collection={collection} targetIndex={index} onItemClick={handleNavigationClick} onImgOverride={setImgOverride} />}
        </ui.Stack >
    )
}
