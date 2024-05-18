import React, { useEffect, useState } from 'react';

import './App.css';
import Rater from './rater/collectionRater';

import * as ui from '@mui/material';

import { ThemeProvider } from "@mui/material/styles"
import theme from './theme'
import { CssBaseline } from '@mui/material/';


import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';
import Backend, { Collection, Collections } from './server/backend';

const backend = new Backend("/api");

function App() {
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
  const [dropdownKey, setDropdownKey] = useState<string | null>(null);
  const [collections, setCollections] = useState<Collections | null>(null);
  useEffect(() => {
    (async () => {
      const collections = await backend.getCollections();
      console.log(`Fetched collections file: ${JSON.stringify(collections)}`);
      setCollections(collections);
      setDropdownKey(collections.latest);
    })();
  }, []);

  useEffect(() => {

    (async () => {
      if (collections === null) return;
      const new_collection = await backend.getRatings(dropdownKey || collections.latest);
      console.log(`Updated collection to ${JSON.stringify(new_collection)}`);
      setSelectedCollection(new_collection);
    })();
  }, [collections, dropdownKey]);



  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ui.Stack
        direction={{ xs: "column", md: "row" }}
        // marginTop={5}
        marginLeft={{ xs: 0, md: 2 }}
        gap={{ xs: 0, md: 2 }}
        maxWidth="100%"
        width={{ xs: "auto", md: "auto" }}
      >
        {collections !== null &&
          <ui.Box marginTop={{ xs: 0, md: 5 }} height="2" justifyContent="stretch" >
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
        <ui.Divider orientation="vertical" flexItem />
        <ui.Box flexGrow={1}>
          {collections !== null && selectedCollection !== null &&
            <Rater key={selectedCollection.collection_id} collection={selectedCollection} language='en' backend={backend} formats={collections?.formats} />
          }
        </ui.Box>
      </ui.Stack>
    </ThemeProvider >
  );
}

export default App;
