import React, { useEffect, useState } from 'react';

import logo from './logo.svg';
import './App.css';
import Rater from './rater/collectionRater';

import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';
import Backend, { Collection } from './server/backend';

function App() {

  const collection_id = "neo";
  const backend = new Backend("/api"); // current setup has backend and frontend on same network
  const [collection, setCollection] = useState<Collection | null>(null);
  useEffect(() => {
    (async () => {
      const new_collection = await backend.getRatings(collection_id);
      console.log(`Updated collection to ${JSON.stringify(new_collection)}`);
      setCollection(new_collection);
    })();
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        {collection !== null && <Rater collection={collection} language='en' backend={backend} />}
      </header>
    </div>
  );
}

export default App;
