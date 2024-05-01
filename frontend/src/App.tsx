import React, { useEffect, useState } from 'react';

import logo from './logo.svg';
import './App.css';
import Rater from './rater/FormatRater';

import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';
import Backend, { Format } from './server/backend';

function App() {

  const format_id = "draft_otj";
  const backend = new Backend("/api");
  const [format, setFormat] = useState<Format | null>(null);
  (async () => {
    const format = await backend.getRatings(format_id);
    setFormat(format);
  })();

  return (
    <div className="App">
      <header className="App-header">
        {format !== null && <Rater format={format} language='en' backend={backend} />}
      </header>
    </div>
  );
}

export default App;
