import React from 'react';
import logo from './logo.svg';
import './App.css';
import Card from './rater/card';

import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <Card setCode='otj' language='en' />
      </header>
    </div>
  );
}

export default App;
