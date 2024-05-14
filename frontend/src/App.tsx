import { useEffect, useState } from 'react';

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

function App() {

  const backend = new Backend("/api"); // current setup has backend and frontend on same network
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
        direction="row"
        // marginTop={5}
        marginLeft={2}
        gap={2}
      >
        {collections !== null &&
          <ui.Box marginTop={5}>
            <ui.FormControl>
              <ui.InputLabel id="set-select-label">Set</ui.InputLabel>
              <ui.Select
                labelId="set-select-label"
                id="set-select"
                value={dropdownKey}
                label="Set"
                onChange={(e, v) => setDropdownKey(e.target.value as string)}
              >
                {Object.keys(collections.entries).map(k => <ui.MenuItem key={k} value={k}>{k.toUpperCase()}</ui.MenuItem>)}
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
    </ThemeProvider>
  );
}

export default App;
