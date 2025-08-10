import { useState, useRef, useEffect } from "react";
import "./App.css";
import axios from "axios";
import ReactMarkdown from "react-markdown";

function App() {
  const [chatHistory, setChatHistory] = useState([]);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [generatingAnswer, setGeneratingAnswer] = useState(false);

  const chatContainerRef = useRef(null);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatHistory, generatingAnswer]);

  async function generateAnswer(e) {
    e.preventDefault();
    if (!question.trim()) return;

    setGeneratingAnswer(true);
    const currentQuestion = question;
    setQuestion(""); // Clear input immediately after sending

    setChatHistory(prev => [...prev, { type: 'question', content: currentQuestion }]);

    try {
      const response = await axios({
        url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${
          import.meta.env.VITE_API_GENERATIVE_LANGUAGE_CLIENT}`,
        method: "post",
        headers: {
          "Content-Type": "application/json",
        },
        data: {
          contents: [{ parts: [{ text: `Please answer briefly: ${currentQuestion}` }] }],
          
        },
      });

      // Defensive check for response structure
      const aiResponse =
        response.data?.candidates?.[0]?.content?.parts?.[0]?.text ||
        "Sorry - No response from Gemini API.";

      setChatHistory(prev => [...prev, { type: 'answer', content: aiResponse }]);
      setAnswer(aiResponse);
    } catch (error) {
      console.error("Axios error:", error);
      if (error.response) {
        console.error("Response data:", error.response.data);
        setAnswer(`Error: ${error.response.data.error?.message || "Something went wrong."}`);
        setChatHistory(prev => [
          ...prev,
          { type: 'answer', content: `Error: ${error.response.data.error?.message || "Something went wrong."}` }
        ]);
      } else {
        setAnswer("Sorry - Something went wrong. Please try again!");
        setChatHistory(prev => [
          ...prev,
          { type: 'answer', content: "Sorry - Something went wrong. Please try again!" }
        ]);
      }
    }
    setGeneratingAnswer(false);
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-r from-gray-900 to-black text-white">
      <div className="h-full max-w-4xl mx-auto flex flex-col p-3">
        {/* Fixed Header */}
        <header className="text-center py-4">
          <a href=" "
            target="_blank"
            rel="noopener noreferrer"
            className="block">
            <h1 className="text-4xl font-bold text-blue-500 hover:text-blue-600 transition-colors">
              Prospera AI Chatbot
            
            </h1>
          </a>
        </header>

        {/* Scrollable Chat */}
        <div
          ref={chatContainerRef}
          className="flex-1 overflow-y-auto mb-4 rounded-lg bg-black shadow-lg p-4 hide-scrollbar"
        >
          {chatHistory.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6">
              <div className="bg-gray-500 rounded-xl p-8 max-w-2xl">
                <h2 className="text-2xl font-bold text-blue-900 mb-4">Welcome! 👋</h2>
                <p className="text-gray-900 mb-4">
                  I'm here to help you with anything:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                  <div className="bg-black p-2 rounded-lg shadow-sm">
                    <span className="text-black-500">💡</span> General knowledge
                  </div>
                  <div className="bg-black p-2 rounded-lg shadow-sm">
                    <span className="text-black-500">😹</span> Comical conversations
                  </div>
                  <div className="bg-black p-2 rounded-lg shadow-sm">
                    <span className="text-black-500">📝</span> Writing assistance
                  </div>
                  <div className="bg-black p-2 rounded-lg shadow-sm">
                    <span className="text-black-500">🤔</span> Problem solving
                  </div>
                </div>
                <p className="text-gray-900 mt-6 text-sm">
                  Just type your question below and press Enter or click Send!
                </p>
              </div>
            </div>
          ) : (
            <>
              {chatHistory.map((chat, index) => (
                <div key={index} className={`mb-4 ${chat.type === 'question' ? 'text-right' : 'text-left'}`}>
                  <div className={`inline-block max-w-[80%] p-3 rounded-lg overflow-auto hide-scrollbar ${
                    chat.type === 'question'
                      ? 'bg-blue-500 text-white rounded-br-none'
                      : 'bg-gray-800 text-white rounded-bl-none'
                  }`}>
                    <ReactMarkdown className="overflow-auto hide-scrollbar">{chat.content}</ReactMarkdown>
                  </div>
                </div>
              ))}
            </>
          )}
          {generatingAnswer && (
            <div className="text-left">
              <div className="inline-block bg-gray-100 p-3 rounded-lg animate-pulse">
                Thinking...
              </div>
            </div>
          )}
        </div>

        {/* Fixed Input Form */}
        <form onSubmit={generateAnswer} className="bg-black-400 rounded-lg shadow-lg p-4">
          <div className="flex gap-2">
            <textarea
              required
              className="flex-1 border border-gray-700 bg-gray-800 text-white rounded p-3 focus:border-black-400 focus:ring-1 focus:ring-black-400 resize-none"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask anything..."
              rows="2"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  generateAnswer(e);
                }
              }}
            ></textarea>
            <button
              type="submit"
              className={`px-6 py-2 bg-black-500 text-white rounded-md hover:bg-black-600 transition-colors ${
                generatingAnswer ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              disabled={generatingAnswer}
            >
              Send
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default App;