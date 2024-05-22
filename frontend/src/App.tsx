import React, { useEffect, useState } from 'react';

import './App.css';
import Rater from './rater/collectionRater';
import { resolveImage } from './util/scryfallUtil';

import * as ui from '@mui/material';
import * as icons from '@mui/icons-material';

import { ThemeProvider } from "@mui/material/styles"
import theme from './theme'
import { CssBaseline } from '@mui/material/';


import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';
import Backend, { Ratings, Collections, CollectionInfo } from './server/backend';
import CollectionExportButton from './rater/collectionExportButton';
import CollectionFilterToggles, { configToId, filterCollectionInfo, FilterConfig } from './collectionFilterToggles';

const backend = new Backend("/api");


function App() {
  const [collectionInfo, setCollectionInfo] = useState<CollectionInfo | null>(null);
  const [filteredCI, setFilteredCI] = useState<CollectionInfo | null>(null);
  const [dropdownKey, setDropdownKey] = useState<string | null>(null);
  const [collections, setCollections] = useState<Collections | null>(null);

  // common use pattern will see these default values replaced long before they need to be displayed
  const [ratings, setRatings] = useState<Ratings | null>(null);

  const [raterLoading, setRaterLoading] = useState(true);

  const [filterConfig, setFilterConfig] = useState<FilterConfig>({
    colors: { white: true, blue: true, black: true, red: true, green: true, colorless: true },
    rarities: { common: true, uncommon: true, rare: true, mythic: true }
  })

  const [showMobileFilter, setShowMobileFilter] = useState(false);


  useEffect(() => {
    (async () => {
      const collections = await backend.getCollectionMetadata();
      setCollections(collections);
      setDropdownKey(collections.latest);
    })();
  }, []);

  useEffect(() => {
    setRaterLoading(true);
    (async () => {
      if (collections === null) return;
      const new_collection_info = await backend.getCollectionInfo(collections.entries[dropdownKey + ""]);
      (new Image()).src = resolveImage(new_collection_info.list[0])[0];
      const ratings = await backend.getRatings(new_collection_info.metadata.id, new_collection_info, collections.formats);
      setRatings(ratings);
      setRaterLoading(false);
      setCollectionInfo(new_collection_info);
    })();
  }, [collections, dropdownKey, setRaterLoading]);

  useEffect(() => {
    if (collectionInfo !== null) {
      setFilteredCI(filterCollectionInfo(collectionInfo, filterConfig));
    }
  }, [collectionInfo, filterConfig])


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
          <ui.Stack marginTop={{ xs: 0, md: 5 }} marginBottom={{ xs: 0, md: 5 }} direction="column" justifyContent="space-between" alignSelf="stretch">
            <ui.FormControl sx={{ display: "flex" }} >
              <ui.Select
                id="set-select"
                value={dropdownKey}
                onChange={(e, v) => setDropdownKey(e.target.value as string)}
              >
                {Object.entries(collections.entries).map(e => <ui.MenuItem key={e[0]} value={e[0]}>{e[0].toUpperCase()}</ui.MenuItem>)}
              </ui.Select>
            </ui.FormControl>

            {isDesktop && <ui.Stack direction="column" spacing={3} >
              {<CollectionFilterToggles handleFilterUpdate={setFilterConfig} />}
              {filteredCI !== null && ratings !== null && <CollectionExportButton formats={collections.formats} collectionInfo={filteredCI} ratings={ratings} />}
            </ui.Stack>}

          </ui.Stack>
        }
        {isDesktop && <ui.Divider orientation="vertical" flexItem />}
        <ui.Box flexGrow={1} display="flex" justifyContent="center" alignItems="flex-start">
          {(!raterLoading && collections !== null && filteredCI !== null && ratings !== null && filteredCI.list.length > 0) ?
            <Rater key={filteredCI.metadata.id + configToId(filterConfig)} collection={filteredCI} ratings={ratings} language='en' backend={backend} formats={collections?.formats} /> :
            <ui.CircularProgress />
          }
        </ui.Box>
        {!isDesktop && <React.Fragment>
          <ui.IconButton color="primary" onClick={(e) => setShowMobileFilter(!showMobileFilter)}><icons.FilterAlt fontSize="large" /></ui.IconButton>
          <ui.Drawer
            anchor="right"
            open={showMobileFilter}
            onClose={() => setShowMobileFilter(!showMobileFilter)}
          >
            {/* <ui.Stack direction="column" width="250px"> */}
            <CollectionFilterToggles handleFilterUpdate={setFilterConfig} />
            {/* </ui.Stack> */}
          </ui.Drawer>
        </React.Fragment>
        }
      </ui.Stack>
    </ThemeProvider >
  );
}

export default App;
