import React, { useEffect, useState } from 'react';

import './App.css';
import Rater from './rater/collectionRater';
import { resolveImage } from './util/scryfall_util';

import * as ui from '@mui/material';

import { ThemeProvider } from "@mui/material/styles"
import theme from './theme'
import { CssBaseline } from '@mui/material/';


import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';
import Backend, { Ratings, Collections, CollectionMetadata, CollectionInfo } from './server/backend';

const backend = new Backend("/api");

function App() {
  const [collectionInfo, setCollectionInfo] = useState<CollectionInfo | null>(null);
  const [dropdownKey, setDropdownKey] = useState<string | null>(null);
  const [collections, setCollections] = useState<Collections | null>(null);

  // common use pattern will see these default values replaced long before they need to be displayed
  const [ratings, setRatings] = useState<Ratings | null>(null);

  const [raterLoading, setRaterLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const collections = await backend.getCollectionMetadata();
      console.log(`Fetched collections file: ${JSON.stringify(collections)}`);
      setCollections(collections);
      setDropdownKey(collections.latest);
    })();
  }, []);

  useEffect(() => {
    setRaterLoading(true);
    (async () => {
      if (collections === null) return;
      const new_collection_info = await backend.getCollectionInfo(collections.entries[dropdownKey + ""]);
      console.log(`Updated collection_info to ${JSON.stringify(new_collection_info)}`);
      (new Image()).src = resolveImage(new_collection_info.list[0])[0];
      setCollectionInfo(new_collection_info);
    })();
  }, [collections, dropdownKey, setRaterLoading]);

  useEffect(() => {
    let cancel = false;
    (async () => {
      if (collectionInfo === null) return;
      const ratings = await backend.getRatings(collectionInfo.metadata.id);
      console.log(`Updated ratings to ${JSON.stringify(ratings)}`);
      if (!cancel) {
        setRatings(ratings);
        setRaterLoading(false);
      }
    })();

    return () => {
      cancel = true;
    }
  }, [collectionInfo, setRatings, setRaterLoading]);


  const isDesktop = ui.useMediaQuery(theme.breakpoints.up('md'));


  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ui.Stack
        direction={{ xs: "column", md: "row" }}
        marginLeft={{ xs: 0, md: 2 }}
        gap={{ xs: 0, md: 2 }}
        maxWidth="100%"
        width={{ xs: "auto", md: "auto" }}
        height="100vh"
        alignItems="center"
      >
        {collections !== null &&
          <ui.Box marginTop={{ xs: 0, md: 5 }} justifyContent="stretch" alignSelf={{ xs: "stretch", md: "flex-start" }}>
            <ui.FormControl sx={{ display: "flex" }} >
              <ui.Select
                id="set-select"
                value={dropdownKey}
                onChange={(e, v) => setDropdownKey(e.target.value as string)}
              >
                {Object.entries(collections.entries).map(e => <ui.MenuItem key={e[0]} value={e[0]}>{e[0].toUpperCase()}</ui.MenuItem>)}
              </ui.Select>
            </ui.FormControl>
          </ui.Box>
        }
        {isDesktop && <ui.Divider orientation="vertical" flexItem />}
        <ui.Box flexGrow={1} display="flex" justifyContent="center" alignItems="flex-start">
          {(!raterLoading && collections !== null && collectionInfo !== null && ratings !== null) ?
            <Rater key={collectionInfo.metadata.id} collection={collectionInfo} ratings={ratings} language='en' backend={backend} formats={collections?.formats} /> :
            <ui.CircularProgress />
          }
        </ui.Box>
      </ui.Stack>
    </ThemeProvider >
  );
}

export default App;
