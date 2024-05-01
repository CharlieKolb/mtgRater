import React, { useEffect, useState } from 'react';

import logo from './logo.svg';
import './App.css';
import Rater from './rater/formatRater';

import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';
import Backend, { Format } from './server/backend';

function App() {

  const format_id = "draft_otj";
  const backend = new Backend("/api"); // current setup has backend and frontend on same network
  const [format, setFormat] = useState<Format | null>(null);
  useEffect(() => {
    (async () => {
      const new_format = await backend.getRatings(format_id);
      console.log(`Updated format to ${JSON.stringify(new_format)}`);
      setFormat(new_format);
    })();
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        {format !== null && <Rater format={format} language='en' backend={backend} />}
      </header>
    </div>
  );
}

export default App;
