import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  User,
  Bot,
  Copy,
  Check,
  Edit,
  Save,
  X,
  Trash,
  ThumbsUp,
  ThumbsDown
} from 'lucide-react';

const DeepSeekChatAI = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentResponse, setCurrentResponse] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState(null);
  const [copiedCodeBlockId, setCopiedCodeBlockId] = useState(null);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editText, setEditText] = useState('');
  const [thumbedUpMessages, setThumbedUpMessages] = useState([]);
  const [thumbedDownMessages, setThumbedDownMessages] = useState([]);
  const messagesEndRef = useRef(null);

  const GEMINI_API_KEY = 'AIzaSyA8sSYI-WumgSF49KdnbgH7E20sWZXd3o8';
  const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, currentResponse]);

  const typeResponse = async (response) => {
    setIsTyping(true);
    let typed = '';
    const lines = response.split('\n');

    for (let line of lines) {
      typed += line + '\n';
      setCurrentResponse(typed);
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    setIsTyping(false);
    setCurrentResponse('');
    setMessages(prev => [...prev, {
      id: Date.now(),
      role: 'ai',
      text: response
    }]);
  };

  const copyToClipboard = async (text, id, isCodeBlock = false) => {
    try {
      await navigator.clipboard.writeText(text);
      if (isCodeBlock) {
        setCopiedCodeBlockId(id);
        setTimeout(() => {
          setCopiedCodeBlockId(null);
        }, 2000);
      } else {
        setCopiedMessageId(id);
        setTimeout(() => {
          setCopiedMessageId(null);
        }, 2000);
      }
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  const startEditing = (message) => {
    setEditingMessageId(message.id);
    setEditText(message.text);
  };

  const cancelEditing = () => {
    setEditingMessageId(null);
    setEditText('');
  };

  const saveEditedMessage = async () => {
    const editedIndex = messages.findIndex(msg => msg.id === editingMessageId);
    const editedMessage = { ...messages[editedIndex], text: editText };
    const newMessages = [...messages.slice(0, editedIndex + 1)];
    newMessages[editedIndex] = editedMessage;

    setMessages(newMessages);
    setEditingMessageId(null);
    setEditText('');
    setIsLoading(true);

    try {
      const response = await axios.post(GEMINI_API_URL, {
        contents: [{
          parts: [{ text: editText }]
        }]
      });

      const aiResponse = response.data.candidates[0].content.parts[0].text;
      await typeResponse(aiResponse);
    } catch (error) {
      console.error('Error regenerating response:', error);
      await typeResponse('Sorry, there was an error processing your edited message.');
    } finally {
      setIsLoading(false);
    }
  };

  const formatCodeBlock = (text) => {
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    let lastIndex = 0;
    const parts = [];
    let match;

    while ((match = codeBlockRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push({
          type: 'text',
          content: text.slice(lastIndex, match.index)
        });
      }

      parts.push({
        type: 'code',
        language: match[1] || '',
        content: match[2],
        id: `codeblock-${Math.random().toString(36).substr(2, 9)}`
      });

      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
      parts.push({
        type: 'text',
        content: text.slice(lastIndex)
      });
    }

    return parts;
  };

  const renderMessage = (text) => {
    const parts = formatCodeBlock(text);
    return parts.map((part, index) => {
      if (part.type === 'code') {
        return (
          <div key={index} className="relative">
            <pre className="bg-gray-800 p-4 rounded-lg overflow-x-auto">
              <code className="text-sm font-mono">
                {part.content.split('\n').map((line, lineIndex) => (
                  <div key={lineIndex} className="grid">
                    <span className="text-[#ff6b6b]">{line.match(/^(const|let|var|function|class|import|export|return|if|for|while)\b/)?.[0]}</span>
                    <span className="text-[#4ecdc4]">{line.match(/('.*?'|".*?"|\`.*?\`)/g)?.join(' ')}</span>
                    <span className="text-[#ff9ff3]">{line.match(/\b(true|false|null|undefined)\b/g)?.join(' ')}</span>
                    <span className="text-[#6a89cc]">{line.match(/\/\/.*/g)?.join(' ')}</span>
                    {line}
                  </div>
                ))}
              </code>
            </pre>
            <button
              onClick={() => copyToClipboard(part.content, part.id, true)}
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            >
              {copiedCodeBlockId === part.id ? (
                <Check className="w-4 h-4 text-[#a5d6a7]" />
              ) : (
                <Copy className="w-4 h-4 text-[#81c784]" />
              )}
            </button>
          </div>
        );
      }
      return <span key={index}>{part.content}</span>;
    });
  };

  const sendMessage = async () => {
    if (!input.trim()) return;

    const newMessages = [...messages, {
      id: Date.now(),
      role: 'user',
      text: input
    }];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      const response = await axios.post(GEMINI_API_URL, {
        contents: [{
          parts: [{ text: input }]
        }]
      });

      const aiResponse = response.data.candidates[0].content.parts[0].text;
      await typeResponse(aiResponse);
    } catch (error) {
      console.error('Error sending message:', error);
      await typeResponse('Sorry, there was an error processing your message.');
    } finally {
      setIsLoading(false);
    }
  };

  const thumbUpMessage = (message) => {
    setThumbedUpMessages((prev) => [...prev, message.id]);
    setThumbedDownMessages((prev) => prev.filter((id) => id !== message.id));
  };

  const thumbDownMessage = (message) => {
    setThumbedDownMessages((prev) => [...prev, message.id]);
    setThumbedUpMessages((prev) => prev.filter((id) => id !== message.id));
  };

  const deleteMessage = (message) => {
    setMessages((prev) => prev.filter((msg) => msg.id !== message.id));
    setThumbedUpMessages((prev) => prev.filter((id) => id !== message.id));
    setThumbedDownMessages((prev) => prev.filter((id) => id !== message.id));
  };

  return (
    <div className="flex flex-col h-screen bg-[#121212]">
      <div className="flex-grow overflow-y-auto px-4 md:px-8 lg:px-16 space-y-6">
        {messages.map((msg, index) => (
          <div key={index} className="max-w-3xl mx-auto w-full group">
            <div className={`flex items-start space-x-4 ${msg.role === 'user' ? 'flex-row-reverse -4' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 
                ${msg.role === 'user' ? 'bg-[#5c5c5c] ' : 'bg-[#1db954]'}`}>
                {msg.role === 'user' ? (
                  <User className="w-5 h-5 text-white" />
                ) : (
                  <Bot className="w-5 h-5 text-white" />
                )}
              </div>
              <div className={`flex-grow relative mt-2 ${msg.role === 'user' ? 'text-right' : ''}`}>
                <div className="font-semibold text-sm mb-1 text-[#a5d6a7]  mr-2">
                  {msg.role === 'user' ? 'simo' : 'Gemini'}
                </div>
                {editingMessageId === msg.id && msg.role === 'user' ? (
                  <div className="flex items-center space-x-2">
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="w-full px-2 py-1 bg-[#333333] text-white rounded-lg focus:outline-none"
                      rows={3}
                    />
                    <div className="flex flex-col space-y-2">
                      <button
                        onClick={saveEditedMessage}
                        className="text-[#81c784] hover:bg-[#388e3c] rounded-full p-1"
                      >
                        <Save className="w-5 h-5" />
                      </button>
                      <button
                        onClick={cancelEditing}
                        className="text-[#ff6b6b] hover:bg-[#ff6b6b]/20 rounded-full p-1"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className={`prose prose-sm max-w-none whitespace-pre-wrap p-3 rounded-lg shadow-sm text-white
                    ${msg.role === 'user' ? 'bg-[#333333]' : 'bg-[#212121]'}`}>
                    {renderMessage(msg.text)}
                  </div>
                )}

                {msg.role === 'user' && editingMessageId !== msg.id && (
                  <button
                    onClick={() => startEditing(msg)}
                    className="absolute top-0 right-8 transition-opacity duration-300"
                  >
                    <Edit className="w-4 h-4 text-[#757575] hover:text-[#81c784] mr-4" />
                  </button>
                )}

                {msg.role === 'ai' && (
                  <button
                    onClick={() => copyToClipboard(msg.text, msg.id)}
                    className="absolute top-0 right-0  transition-opacity duration-300"
                  >
                    {copiedMessageId === msg.id ? (
                      <Check className="w-4 h-4 text-[#a5d6a7]" />
                    ) : (
                      <Copy className="w-4 h-4 text-[#81c784]" />
                    )}
                  </button>
                )}

                <div className="flex space-x-2 mt-2">
                  <button
                    onClick={() => thumbUpMessage(msg)}
                    className={`flex items-center space-x-1 text-sm rounded-full px-2 py-1 transition-colors
                      ${thumbedUpMessages.includes(msg.id)
                        ? 'bg-[#388e3c] text-[#a5d6a7] hover:bg-[#4caf50]'
                        : 'bg-[#333333] text-[#757575] hover:bg-[#424242]'}`}
                  >
                    <ThumbsUp className="w-4 h-4" />
                    <span>Like</span>
                  </button>
                  <button
                    onClick={() => thumbDownMessage(msg)}
                    className={`flex items-center space-x-1 text-sm rounded-full px-2 py-1 transition-colors
                      ${thumbedDownMessages.includes(msg.id)
                        ? 'bg-[#c62828] text-[#ef9a9a] hover:bg-[#e53935]'
                        : 'bg-[#333333] text-[#757575] hover:bg-[#424242]'}`}
                  >
                    <ThumbsDown className="w-4 h-4" />
                    <span>Dislike</span>
                  </button>
                  {msg.role === 'user' && (
                    <button
                      onClick={() => deleteMessage(msg)}
                      className="flex items-center space-x-1 text-sm rounded-full px-2 py-1 bg-[#333333] text-[#757575] hover:bg-[#424242] transition-colors"
                    >
                      <Trash className="w-4 h-4" />
                      <span>Delete</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}

        {(isLoading || isTyping) && (
          <div className="max-w-3xl mx-auto w-full">
            <div className="flex items-start space-x-4">
              <div className="w-8 h-8 bg-[#1db954] rounded-full flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div className="flex-grow">
                <div className="font-semibold text-sm mb-1 text-[#a5d6a7]">
                  Gemini
                </div>
                {currentResponse ? (
                  <div className="prose prose-sm max-w-none whitespace-pre-wrap bg-[#212121] p-3 rounded-lg shadow-sm text-white">
                    {renderMessage(currentResponse)}
                    <span className="inline-block w-1 h-4 bg-[#a5d6a7] animate-blink"></span>
                  </div>
                ) : (
                  <div className="prose prose-sm max-w-none whitespace-pre-wrap bg-[#212121] p-3 rounded-lg shadow-sm text-white">
                    <span className="inline-block w-1 h-4 bg-[#a5d6a7] animate-blink"></span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center px-4 md:px-8 lg:px-16 py-4 bg-[#1a1a1a] shadow-lg">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Type your message..."
          className="w-full px-4 py-2 bg-[#333333] text-white rounded-lg focus:outline-none"
        />
        <button onClick={sendMessage} className="ml-4 px-4 py-2 bg-[#1db954] text-white rounded-lg hover:bg-[#17a243] transition-colors">
          Send
        </button>
      </div>

      <div ref={messagesEndRef} />
    </div>
  );
};

export default DeepSeekChatAI;