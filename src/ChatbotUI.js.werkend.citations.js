import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';

const ChatbotUI = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const effectRan = useRef(false);

  const sendMessage = async (message) => {
    setIsLoading(true);
    setMessages(prevMessages => [...prevMessages, { text: message, sender: 'user' }]);
    setInput('');

    try {
      console.log('Sending message:', message);
      const response = await fetch('http://localhost:3001/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message }),
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      console.log('Response received');
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          console.log('Stream complete');
          break;
        }
        
        const chunk = decoder.decode(value);
        console.log('Received chunk:', chunk);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const eventData = JSON.parse(line.slice(6));
              console.log('Parsed event data:', eventData);
              if (eventData.fullResponse) {
                setMessages(prevMessages => [
                  ...prevMessages,
                  { 
                    text: eventData.fullResponse, 
                    sender: 'bot',
                    citations: eventData.citations
                  }
                ]);
              }
            } catch (error) {
              console.error('Error parsing event data:', error);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error:', error);
      setMessages(prevMessages => [
        ...prevMessages,
        { text: "Sorry, there was an error processing your request.", sender: 'bot' }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (effectRan.current === false) {
      sendMessage('Hello, AI Assistant!');
      return () => effectRan.current = true;
    }
  }, []);

  return (
    <div className="flex flex-col h-screen max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">AI Assistant</h1>
      <div className="flex-1 overflow-y-auto mb-4">
        {messages.map((message, index) => (
          <div key={index} className={`mb-2 ${message.sender === 'user' ? 'text-right' : 'text-left'}`}>
            <span className={`inline-block p-2 rounded-lg ${message.sender === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}>
              {message.sender === 'user' ? (
                message.text
              ) : (
                <>
                  <ReactMarkdown>{message.text}</ReactMarkdown>
                  {message.citations && message.citations.length > 0 && (
                    <div className="mt-2 text-sm text-gray-600">
                      <strong>Citations:</strong>
                      <ol>
                        {message.citations.map((citation, idx) => {
                          const displayUrl = citation.mappedUrl || citation.originalUrl;
                          return (
                            <li key={idx}>
                              [{citation.index}]{' '}
                              <a 
                                href={displayUrl}
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="text-blue-500 hover:underline"
                              >
                                {displayUrl}
                              </a>
                              {citation.error && ` (${citation.error})`}
                            </li>
                          );
                        })}
                      </ol>
                    </div>
                  )}
                </>
              )}
            </span>
          </div>
        ))}
      </div>
      <div className="flex">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && !isLoading && input.trim() && sendMessage(input)}
          placeholder="Type a message..."
          className="flex-1 p-2 border rounded-l-lg"
          disabled={isLoading}
        />
        <button
          onClick={() => !isLoading && input.trim() && sendMessage(input)}
          className="p-2 bg-blue-500 text-white rounded-r-lg"
          disabled={isLoading}
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default ChatbotUI;
