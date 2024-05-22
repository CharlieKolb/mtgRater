import React, { useCallback, useEffect, useState } from 'react';

import * as ui from '@mui/material';
import * as icons from '@mui/icons-material';

import Backend, { CardRating, Ratings, CollectionInfo, makeRatingsKey, EMPTY_RATING, makeFormatStorageKey, Format, LocalRating } from '../server/backend';
import RatingBar from './ratingBar';
import CollectionNavigator from './collectionNavigator/collectionNavigator';
import { resolveImage } from '../util/scryfallUtil';
import { useDebounce } from 'use-debounce';

import globals from "../globals";
import CollectionExportButton from './collectionExportButton';
import { ProgramStore } from '../util/programStore';

export type RaterProps = {
    collection: CollectionInfo,
    ratings: Ratings;
    language: string; // e.g. "en", "jp"
    backend: Backend;
    formats: Format[];
}


export default function CollectionRater(props: RaterProps) {

    const { collection, ratings, formats } = props;
    const [index, setIndex] = useState(0);
    const card = collection.list[index];
    const rating = ratings.ratings[makeRatingsKey(card)] as CardRating | undefined;

    const [imageSource, setImageSource] = useState("")
    const [imageBacksideSource, setImageBacksideSource] = useState<string | undefined>(undefined)
    const [indexOverride, setIndexOverride] = useState<number | undefined>(undefined);
    const [debouncedIndexOverride] = useDebounce<number | undefined>(indexOverride, globals.navigatorHoverDebounce);
    const overriddenRatingByFormat = (f: string) => debouncedIndexOverride !== undefined && ratings.ratings[makeRatingsKey(collection.list[debouncedIndexOverride])].rating_by_format[f];

    const [showMobileNavigator, setShowMobileNavigator] = useState(false);

    const [activeFormats, setActiveFormats] = useState(formats.filter(x => x.enabled).map(x => x.title).sort());

    useEffect(() => {
        setIndex(0);
    }, [ratings, collection]);


    const handleCardChanged = useCallback((newIndex: number) => {
        setIndex(newIndex);
    }, []);

    function handleNextCard() {
        setIndex((index + 1) % collection.list.length);
    }

    function handlePreviousCard() {
        setIndex((index - 1 + collection.list.length) % collection.list.length);
    }

    function reportRating(formatId: string, localRating: LocalRating) {
        if (localRating === null) {
            return;
        }

        props.backend.postRating({
            cardCode: card.cardCode,
            setCode: card.setCode,
            formatId,
            collectionId: collection.metadata.id,
            rating: localRating,
        });
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
            <ui.Stack direction="column" alignItems="center" alignContent="center" spacing={{ xs: 0, md: 2 }} minWidth="80%" flexGrow={3}>
                <ui.Stack direction={{ xs: "column", md: "row" }} alignItems="center" justifyContent="center" maxWidth="100%" minWidth="70%" spacing={{ xs: 0, md: 2 }}>
                    <ui.IconButton color="primary" onClick={handlePreviousCard} sx={{ display: { xs: "none", md: "block" } }}>
                        <icons.ArrowBackIosNew />
                    </ui.IconButton>
                    <ui.Box sx={{ position: "relative", }}>
                        <img className="card" alt="loading..." src={(debouncedIndexOverride !== undefined && resolveImage(collection.list[debouncedIndexOverride])[0]) || imageSource} style={{ maxWidth: "100%", borderRadius: "4.75% / 3.5%" }} />
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
                        rating={overriddenRatingByFormat(x) || rating?.rating_by_format[x] || EMPTY_RATING}
                        reportRating={(localRating, formatId) => reportRating(formatId, localRating)}
                        handleDelete={(e) => {
                            ProgramStore.setItem(makeFormatStorageKey(x), "false");
                            const format = formats.find(y => y.title === x);
                            if (format) format.enabled = false;
                            setActiveFormats(activeFormats.filter(y => y !== x));
                        }} />
                )
                }
                <ui.Stack direction="row" alignItems="center" justifyContent="center" alignSelf={isDesktop ? "center" : "stretch"}>
                    {!isDesktop &&
                        <React.Fragment>
                            <ui.Button fullWidth variant="outlined" onClick={(e) => setShowMobileNavigator(!showMobileNavigator)}>Browse</ui.Button>
                            <ui.Drawer
                                anchor="right"
                                open={showMobileNavigator}
                                onClose={() => setShowMobileNavigator(!showMobileNavigator)}
                            >
                                <ui.Stack direction="column" width="300px">
                                    <CollectionExportButton formats={formats} collectionInfo={collection} ratings={ratings} />
                                    <CollectionNavigator
                                        ratings={ratings}
                                        collection={collection}
                                        targetIndex={index}
                                        onItemClick={(e) => {
                                            handleNavigationClick(e);
                                            setShowMobileNavigator(false);
                                        }}
                                        onIndexOverride={setIndexOverride} />
                                </ui.Stack>
                            </ui.Drawer>
                        </React.Fragment>}
                    <ui.Button fullWidth={!isDesktop} variant="outlined" onClick={handleNextCard}>
                        Next
                    </ui.Button>
                </ui.Stack>
                <ui.Grid container direction="row" justifyContent="center" width={{ xs: "100%", md: "70%" }} spacing={1} >
                    {formats.filter(x => activeFormats.find(y => y === x.title) === undefined).sort((a, b) => a.title.localeCompare(b.title)).map(x =>
                        <ui.Grid item gridRow="1"><ui.Chip key={x.title} variant="outlined" label={x.title} sx={{ textTransform: 'capitalize' }} icon={<icons.Add fontSize='small' />} onClick={() => {
                            ProgramStore.setItem(makeFormatStorageKey(x.title), "true");
                            x.enabled = true;
                            setActiveFormats([x.title, ...activeFormats].sort());

                        }} /></ui.Grid>
                    )}
                </ui.Grid>
            </ui.Stack >
            {isDesktop && <ui.Divider orientation="vertical" flexItem />}
            {isDesktop && <CollectionNavigator ratings={ratings} collection={collection} targetIndex={index} onItemClick={handleNavigationClick} onIndexOverride={setIndexOverride} />}
        </ui.Stack >
    )
}
