import React from 'react';
import ChatbotUI from './ChatbotUI';

console.log('ChatbotUI:', ChatbotUI);

function App() {
  return (
    <div className="App">
      {ChatbotUI ? <ChatbotUI /> : <p>ChatbotUI not loaded</p>}
    </div>
  );
}

export default App;

