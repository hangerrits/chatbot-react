import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';

const ChatbotUI = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState('');
    const effectRan = useRef(false);

    const correctPassword = 'CheckItOut'; // Replace with your desired password

    const handleLogin = (e) => {
      e.preventDefault();
      if (password === correctPassword) {
        setIsAuthenticated(true);
      } else {
        alert('Incorrect password. Please try again.');
      }
    };
  const sendMessage = async (message) => {
    if (message.trim() === '') return;

    setIsLoading(true);
    setMessages(prevMessages => [...prevMessages, { text: message, sender: 'user' }]);
    setInput('');

    try {
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

  const handleInputChange = (e) => {
    setInput(e.target.value);
  };

  const handleSendMessage = () => {
    if (!isLoading && input.trim()) {
      sendMessage(input);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !isLoading && input.trim()) {
      sendMessage(input);
    }
  };

    useEffect(() => {
       if (isAuthenticated && effectRan.current === false) {
         sendMessage('Hallo, AI Aanbestedingsassistent!');
         return () => effectRan.current = true;
       }
     }, [isAuthenticated]);

     if (!isAuthenticated) {
       return (
         <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
           <form onSubmit={handleLogin} style={{ textAlign: 'center' }}>
             <h2 style={{ marginBottom: '20px' }}>Enter Password</h2>
             <input
               type="password"
               value={password}
               onChange={(e) => setPassword(e.target.value)}
               style={{ padding: '8px', marginRight: '10px' }}
             />
             <button type="submit" style={{
               padding: '8px 15px',
               backgroundColor: '#0066cc',
               color: 'white',
               border: 'none',
               borderRadius: '5px',
               cursor: 'pointer'
             }}>
               Login
             </button>
           </form>
         </div>
       );
     }

     return (
       <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
         <div style={{ marginBottom: '20px', textAlign: 'center' }}>
           <img src="./logo_AB.jpg" alt="Company Logo" style={{ maxWidth: '200px', height: 'auto' }} />
         </div>

         <div style={{ display: 'flex', marginBottom: '20px' }}>
           <div style={{ width: '5%', paddingRight: '10px' }}>
             <h2 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '10px' }}></h2>
             <p style={{ fontSize: '14px' }}></p>
           </div>

           <div style={{ width: '90%' }}>
             <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '15px', textAlign: 'center' }}>Aanbestedingsassistent</h2>
             <div style={{ border: '1px solid #ccc', borderRadius: '5px', height: '500px', overflowY: 'auto', marginBottom: '15px', padding: '10px' }}>
               {messages.map((message, index) => (
                 <div key={index} style={{ marginBottom: '10px', textAlign: message.sender === 'user' ? 'right' : 'left' }}>
                   <span style={{
                     display: 'inline-block',
                     padding: '8px 12px',
                     borderRadius: '15px',
                     backgroundColor: message.sender === 'user' ? '#e6f2ff' : '#f0f0f0',
                     maxWidth: '80%'
                   }}>
                     <ReactMarkdown>{message.text}</ReactMarkdown>
                   </span>
                   {message.citations && message.citations.length > 0 && (
                     <div className="mt-2 text-sm text-gray-600">
                       <strong>Bronnen:</strong>
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
                 </div>
               ))}
             </div>
             <div style={{ display: 'flex' }}>
               <input
                 type="text"
                 value={input}
                 onChange={handleInputChange}
                 onKeyPress={handleKeyPress}
                 placeholder="Stel een vraag..."
                 style={{ flexGrow: 1, padding: '8px', borderRadius: '5px 0 0 5px', border: '1px solid #ccc' }}
                 disabled={isLoading}
               />
               <button
                 onClick={handleSendMessage}
                 style={{
                   padding: '8px 15px',
                   backgroundColor: '#0066cc',
                   color: 'white',
                   border: 'none',
                   borderRadius: '0 5px 5px 0',
                   cursor: 'pointer'
                 }}
                 disabled={isLoading}
               >
                 Send
               </button>
             </div>
           </div>

           <div style={{ width: '5%', paddingLeft: '10px' }}>
             <h2 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '10px' }}></h2>
             <p style={{ fontSize: '14px' }}></p>
           </div>
         </div>

         <div style={{ textAlign: 'center' }}>
           <img src="./logo-vandoorne.jpg" alt="Company Logo" style={{ maxWidth: '200px', height: 'auto' }}/>
           <p>
             Dit is een automatisch gegenereerd advies. Om zeker te zijn, neem contact op met: {' '}
             <a href="mailto:Verberne@vandoorne.com" style={{ color: '#0066cc', textDecoration: 'none' }}>
               Gijs Verberne
             </a>
           </p>
         </div>
       </div>
     );
   };

   export default ChatbotUI;
