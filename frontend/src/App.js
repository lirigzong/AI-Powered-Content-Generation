import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Link, useNavigate, Outlet } from "react-router-dom";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { FaVideo, FaCog, FaCalendarAlt, FaSignOutAlt, FaPlus, FaTrash, FaDownload, FaChevronRight } from "react-icons/fa";
import "./App.css";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Utility function to check authentication
const checkAuthenticated = async () => {
  const password = localStorage.getItem("authPassword");
  if (!password) return false;
  
  try {
    await axios.post(`${API}/auth`, { password });
    return true;
  } catch (error) {
    return false;
  }
};

// Login Page
const Login = () => {
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await axios.post(`${API}/auth`, { password });
      localStorage.setItem("authPassword", password);
      navigate("/");
      toast.success("Login successful!");
    } catch (error) {
      toast.error("Authentication failed!");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="bg-gray-800 p-8 rounded-lg shadow-lg w-full max-w-md">
        <h1 className="text-white text-2xl font-bold mb-6 text-center">AI Content Generation Platform</h1>
        <form onSubmit={handleLogin}>
          <div className="mb-4">
            <label className="block text-gray-300 text-sm font-bold mb-2" htmlFor="password">
              Password
            </label>
            <input 
              className="w-full px-3 py-2 bg-gray-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              type="password" 
              id="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              placeholder="Enter your password" 
              required 
            />
          </div>
          <button 
            className={`w-full py-2 px-4 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
            type="submit" 
            disabled={isLoading}
          >
            {isLoading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
};

// Layout component with sidebar
const Layout = () => {
  const [authenticated, setAuthenticated] = useState(false);
  const navigate = useNavigate();
  
  useEffect(() => {
    const checkAuth = async () => {
      const isAuthenticated = await checkAuthenticated();
      setAuthenticated(isAuthenticated);
      if (!isAuthenticated) {
        navigate("/login");
      }
    };
    
    checkAuth();
  }, [navigate]);
  
  const handleLogout = () => {
    localStorage.removeItem("authPassword");
    navigate("/login");
  };
  
  if (!authenticated) {
    return <div className="text-center p-8">Loading...</div>;
  }
  
  return (
    <div className="min-h-screen bg-gray-900 flex">
      {/* Sidebar */}
      <div className="w-64 bg-gray-800 text-white p-4">
        <h1 className="text-lg font-bold mb-6 pt-4">AI Content Platform</h1>
        <nav>
          <ul className="space-y-2">
            <li>
              <Link to="/" className="flex items-center p-2 rounded hover:bg-gray-700">
                <FaPlus className="mr-3" /> Create Content
              </Link>
            </li>
            <li>
              <Link to="/gallery" className="flex items-center p-2 rounded hover:bg-gray-700">
                <FaVideo className="mr-3" /> Gallery
              </Link>
            </li>
            <li>
              <Link to="/publish" className="flex items-center p-2 rounded hover:bg-gray-700">
                <FaCalendarAlt className="mr-3" /> Publish
              </Link>
            </li>
            <li>
              <Link to="/settings" className="flex items-center p-2 rounded hover:bg-gray-700">
                <FaCog className="mr-3" /> Settings
              </Link>
            </li>
            <li>
              <button 
                onClick={handleLogout} 
                className="flex items-center p-2 rounded hover:bg-gray-700 w-full text-left"
              >
                <FaSignOutAlt className="mr-3" /> Logout
              </button>
            </li>
          </ul>
        </nav>
      </div>
      
      {/* Main content */}
      <div className="flex-1 overflow-auto">
        <Outlet />
      </div>
    </div>
  );
};

// Step 1: Prompt and Story Generation
const StepOne = ({ onComplete }) => {
  const [prompt, setPrompt] = useState("");
  const [duration, setDuration] = useState("30-60");
  const [isGenerating, setIsGenerating] = useState(false);
  
  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error("Please enter a prompt");
      return;
    }
    
    setIsGenerating(true);
    
    try {
      const response = await axios.post(`${API}/generate-story`, {
        prompt: prompt,
        duration: duration
      });
      
      onComplete(response.data);
      toast.success("Story generated successfully!");
    } catch (error) {
      console.error("Error generating story:", error);
      toast.error(error.response?.data?.detail || "Failed to generate story");
    } finally {
      setIsGenerating(false);
    }
  };
  
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-4 text-white">Step 1: Story Generation</h2>
      
      <div className="mb-6">
        <label className="block text-gray-300 mb-2">Select video duration:</label>
        <div className="grid grid-cols-3 gap-4">
          <button 
            onClick={() => setDuration("30-60")}
            className={`p-3 rounded-lg border ${duration === "30-60" ? 'bg-blue-600 border-blue-500' : 'bg-gray-700 border-gray-600'}`}
          >
            30-60 seconds
          </button>
          <button 
            onClick={() => setDuration("60-90")}
            className={`p-3 rounded-lg border ${duration === "60-90" ? 'bg-blue-600 border-blue-500' : 'bg-gray-700 border-gray-600'}`}
          >
            60-90 seconds
          </button>
          <button 
            onClick={() => setDuration("90-120")}
            className={`p-3 rounded-lg border ${duration === "90-120" ? 'bg-blue-600 border-blue-500' : 'bg-gray-700 border-gray-600'}`}
          >
            90-120 seconds
          </button>
        </div>
      </div>
      
      <div className="mb-6">
        <label className="block text-gray-300 mb-2">Enter your prompt:</label>
        <textarea 
          className="w-full p-3 bg-gray-700 text-white rounded-lg border border-gray-600 focus:outline-none focus:border-blue-500"
          rows="4"
          placeholder="e.g., a story about a lost cat"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        ></textarea>
      </div>
      
      <button 
        className={`py-2 px-4 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 ${isGenerating ? 'opacity-70 cursor-not-allowed' : ''}`}
        onClick={handleGenerate}
        disabled={isGenerating || !prompt.trim()}
      >
        {isGenerating ? 'Generating...' : 'Generate Story'}
      </button>
    </div>
  );
};

// Step 2: Image Style and Generation
const StepTwo = ({ story, onComplete, onBack }) => {
  const [selectedStyle, setSelectedStyle] = useState("realistic");
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  
  const styles = [
    { id: "realistic", name: "Realistic", description: "Photo-realistic imagery" },
    { id: "cartoon", name: "Cartoon", description: "Colorful cartoon style" },
    { id: "lego", name: "Lego", description: "Built with Lego bricks" },
    { id: "fashion", name: "Fashion", description: "High-fashion editorial" },
    { id: "painting", name: "Painting", description: "Oil painting style" },
    { id: "neon", name: "Neon", description: "Cyberpunk neon-lit urban" }
  ];
  
  // Poll for image generation progress
  useEffect(() => {
    let interval;
    
    if (isGenerating) {
      interval = setInterval(async () => {
        try {
          const response = await axios.get(`${API}/story/${story.id}`);
          if (response.data.image_generation_progress) {
            setProgress(response.data.image_generation_progress);
          }
          
          if (response.data.image_generation_complete) {
            clearInterval(interval);
            setIsGenerating(false);
            if (response.data.images && response.data.images.length > 0) {
              onComplete({
                ...story,
                images: response.data.images,
                style: response.data.style
              });
              toast.success("Images generated successfully!");
            }
          }
        } catch (error) {
          console.error("Error checking image generation progress:", error);
        }
      }, 2000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isGenerating, story.id, onComplete, story]);
  
  const handleGenerate = async () => {
    setIsGenerating(true);
    setProgress(0);
    setError(null);
    
    try {
      // Start the image generation process
      await axios.post(`${API}/generate-images`, {
        story_id: story.id,
        style: selectedStyle
      });
      
      // Polling for progress is handled by the useEffect hook
      toast.info("Image generation started. This may take a few minutes...");
    } catch (error) {
      console.error("Error generating images:", error);
      setError(error.response?.data?.detail || "Failed to generate images");
      toast.error(error.response?.data?.detail || "Failed to generate images");
      setIsGenerating(false);
    }
  };
  
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-4 text-white">Step 2: Image Style Selection</h2>
      
      <div className="bg-gray-800 p-4 rounded-lg mb-6">
        <h3 className="text-lg font-semibold mb-2 text-white">Generated Story:</h3>
        <p className="text-gray-300 whitespace-pre-line">{story.story}</p>
      </div>
      
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-4 text-white">Choose Image Style:</h3>
        <div className="grid grid-cols-3 gap-4">
          {styles.map((style) => (
            <button
              key={style.id}
              onClick={() => setSelectedStyle(style.id)}
              className={`p-4 rounded-lg text-left ${selectedStyle === style.id ? 'bg-blue-600 border border-blue-500' : 'bg-gray-700 border border-gray-600'}`}
              disabled={isGenerating}
            >
              <div className="font-bold mb-1">{style.name}</div>
              <div className="text-sm text-gray-300">{style.description}</div>
            </button>
          ))}
        </div>
      </div>
      
      {isGenerating && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2 text-white">Generating Images...</h3>
          <div className="w-full bg-gray-700 rounded-full h-4">
            <div 
              className="bg-blue-600 h-4 rounded-full pulse"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <p className="text-gray-300 mt-2 text-center">
            {progress > 0 ? `${Math.round(progress)}% complete` : 'Starting image generation...'}
          </p>
          <p className="text-gray-300 mt-2 text-center text-sm">
            This may take several minutes. DALL-E is creating high-quality images for your story.
          </p>
        </div>
      )}
      
      {error && (
        <div className="mb-6 p-4 bg-red-900 text-white rounded-lg">
          <h3 className="font-semibold mb-2">Error</h3>
          <p>{error}</p>
          <p className="mt-2 text-sm">You can try again with a different style or fewer images.</p>
        </div>
      )}
      
      <div className="flex justify-between">
        <button 
          className="py-2 px-4 bg-gray-700 text-white font-semibold rounded-md hover:bg-gray-600"
          onClick={onBack}
          disabled={isGenerating}
        >
          Back
        </button>
        <button 
          className={`py-2 px-4 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 ${isGenerating ? 'opacity-70 cursor-not-allowed' : ''}`}
          onClick={handleGenerate}
          disabled={isGenerating}
        >
          {isGenerating ? 'Generating Images...' : 'Generate Images'}
        </button>
      </div>
    </div>
  );
};

// Step 3: Subtitle and Font Customization
const StepThree = ({ story, onComplete, onBack }) => {
  const [subtitleOptions, setSubtitleOptions] = useState({
    font: "Arial",
    color: "#FFFFFF",
    placement: "bottom",
    background: "solid"
  });
  
  const fonts = ["Arial", "Verdana", "Courier", "Times New Roman", "Impact"];
  const placements = ["top", "middle", "bottom"];
  const backgrounds = [
    { id: "none", name: "None" },
    { id: "solid", name: "Solid" },
    { id: "gradient", name: "Gradient" }
  ];
  
  const handleNext = () => {
    onComplete({
      ...story,
      subtitleOptions
    });
  };
  
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-4 text-white">Step 3: Subtitle Customization</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div>
          <h3 className="text-lg font-semibold mb-4 text-white">Font Options</h3>
          
          <div className="mb-4">
            <label className="block text-gray-300 mb-2">Font Style:</label>
            <select 
              className="w-full p-2 bg-gray-700 text-white rounded-lg border border-gray-600"
              value={subtitleOptions.font}
              onChange={(e) => setSubtitleOptions({...subtitleOptions, font: e.target.value})}
            >
              {fonts.map(font => (
                <option key={font} value={font}>{font}</option>
              ))}
            </select>
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-300 mb-2">Text Color:</label>
            <input 
              type="color" 
              className="w-full p-1 h-10 bg-gray-700 rounded-lg border border-gray-600"
              value={subtitleOptions.color}
              onChange={(e) => setSubtitleOptions({...subtitleOptions, color: e.target.value})}
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-300 mb-2">Text Placement:</label>
            <div className="grid grid-cols-3 gap-2">
              {placements.map(placement => (
                <button
                  key={placement}
                  className={`p-2 rounded-lg text-center ${subtitleOptions.placement === placement ? 'bg-blue-600 border-blue-500' : 'bg-gray-700 border-gray-600'}`}
                  onClick={() => setSubtitleOptions({...subtitleOptions, placement})}
                >
                  {placement.charAt(0).toUpperCase() + placement.slice(1)}
                </button>
              ))}
            </div>
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-300 mb-2">Background Style:</label>
            <div className="grid grid-cols-3 gap-2">
              {backgrounds.map(bg => (
                <button
                  key={bg.id}
                  className={`p-2 rounded-lg text-center ${subtitleOptions.background === bg.id ? 'bg-blue-600 border-blue-500' : 'bg-gray-700 border-gray-600'}`}
                  onClick={() => setSubtitleOptions({...subtitleOptions, background: bg.id})}
                >
                  {bg.name}
                </button>
              ))}
            </div>
          </div>
        </div>
        
        <div>
          <h3 className="text-lg font-semibold mb-4 text-white">Preview</h3>
          
          <div className="bg-gray-800 rounded-lg overflow-hidden">
            {story.images && story.images.length > 0 && (
              <div className="relative">
                <img 
                  src={`${BACKEND_URL}${story.images[0]}`} 
                  alt="Preview" 
                  className="w-full h-auto"
                />
                <div 
                  className={`absolute p-3 max-w-full ${getPlacementClass(subtitleOptions.placement)}`}
                  style={{
                    backgroundColor: getBackgroundStyle(subtitleOptions.background),
                    color: subtitleOptions.color,
                    fontFamily: subtitleOptions.font
                  }}
                >
                  {story.story.split('.')[0]}...
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="flex justify-between">
        <button 
          className="py-2 px-4 bg-gray-700 text-white font-semibold rounded-md hover:bg-gray-600"
          onClick={onBack}
        >
          Back
        </button>
        <button 
          className="py-2 px-4 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700"
          onClick={handleNext}
        >
          Next
        </button>
      </div>
    </div>
  );
};

// Helper functions for Step Three
const getPlacementClass = (placement) => {
  switch (placement) {
    case 'top': return 'top-0 left-0 right-0';
    case 'middle': return 'top-1/2 left-0 right-0 -translate-y-1/2';
    case 'bottom': return 'bottom-0 left-0 right-0';
    default: return 'bottom-0 left-0 right-0';
  }
};

const getBackgroundStyle = (type) => {
  switch (type) {
    case 'none': return 'transparent';
    case 'solid': return 'rgba(0, 0, 0, 0.7)';
    case 'gradient': return 'linear-gradient(to bottom, rgba(0, 0, 0, 0), rgba(0, 0, 0, 0.7))';
    default: return 'rgba(0, 0, 0, 0.7)';
  }
};

// Step 4: Voice Generation
const StepFour = ({ story, onComplete, onBack }) => {
  const [selectedVoice, setSelectedVoice] = useState("alloy");
  const [isGenerating, setIsGenerating] = useState(false);
  const [audioPreview, setAudioPreview] = useState(null);
  
  const voices = [
    { id: "alloy", name: "Alloy", description: "Versatile, neutral voice" },
    { id: "echo", name: "Echo", description: "Deeper, slower, more relaxed voice" },
    { id: "fable", name: "Fable", description: "Expressive, youthful, storytelling voice" },
    { id: "onyx", name: "Onyx", description: "Deep, authoritative, wise voice" },
    { id: "nova", name: "Nova", description: "Energetic, enthusiastic voice" },
    { id: "shimmer", name: "Shimmer", description: "Clear, professional, supportive voice" }
  ];
  
  const handleGenerate = async () => {
    setIsGenerating(true);
    
    try {
      const response = await axios.post(`${API}/generate-voice`, {
        story_id: story.id,
        voice: selectedVoice
      });
      
      setAudioPreview(`${BACKEND_URL}${response.data.audio_url}`);
      
      onComplete({
        ...story,
        audio_url: response.data.audio_url,
        voice: selectedVoice
      });
      
      toast.success("Voice generated successfully!");
    } catch (error) {
      console.error("Error generating voice:", error);
      toast.error(error.response?.data?.detail || "Failed to generate voice");
    } finally {
      setIsGenerating(false);
    }
  };
  
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-4 text-white">Step 4: Voice Selection</h2>
      
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-4 text-white">Choose a Voice:</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {voices.map((voice) => (
            <button
              key={voice.id}
              onClick={() => setSelectedVoice(voice.id)}
              className={`p-4 rounded-lg text-left ${selectedVoice === voice.id ? 'bg-blue-600 border border-blue-500' : 'bg-gray-700 border border-gray-600'}`}
            >
              <div className="font-bold mb-1">{voice.name}</div>
              <div className="text-sm text-gray-300">{voice.description}</div>
            </button>
          ))}
        </div>
      </div>
      
      {audioPreview && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-4 text-white">Preview:</h3>
          <audio controls className="w-full bg-gray-800 rounded-lg">
            <source src={audioPreview} type="audio/mpeg" />
            Your browser does not support the audio element.
          </audio>
        </div>
      )}
      
      <div className="flex justify-between">
        <button 
          className="py-2 px-4 bg-gray-700 text-white font-semibold rounded-md hover:bg-gray-600"
          onClick={onBack}
        >
          Back
        </button>
        <button 
          className={`py-2 px-4 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 ${isGenerating ? 'opacity-70 cursor-not-allowed' : ''}`}
          onClick={handleGenerate}
          disabled={isGenerating}
        >
          {isGenerating ? 'Generating Voice...' : 'Generate Voice'}
        </button>
      </div>
    </div>
  );
};

// Step 5: Final Video Generation
const StepFive = ({ story, onBack, onComplete }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [videoStatus, setVideoStatus] = useState(null);
  const [videoId, setVideoId] = useState(null);
  const [progress, setProgress] = useState(0);
  const navigate = useNavigate();
  
  useEffect(() => {
    // Poll for video status if we have a videoId
    if (videoId) {
      const interval = setInterval(async () => {
        try {
          const response = await axios.get(`${API}/video-status/${videoId}`);
          setVideoStatus(response.data.status);
          
          if (response.data.status === 'processing' && response.data.progress) {
            setProgress(response.data.progress);
          }
          
          if (response.data.status === 'completed') {
            clearInterval(interval);
            onComplete({
              ...story,
              video_url: response.data.video_url,
              video_id: videoId
            });
            toast.success("Video generated successfully!");
          }
        } catch (error) {
          console.error("Error checking video status:", error);
        }
      }, 2000);
      
      return () => clearInterval(interval);
    }
  }, [videoId, onComplete, story]);
  
  const handleGenerate = async () => {
    setIsGenerating(true);
    
    try {
      const response = await axios.post(`${API}/generate-video`, {
        story_id: story.id,
        subtitle_customization: {
          font: story.subtitleOptions.font,
          color: story.subtitleOptions.color,
          placement: story.subtitleOptions.placement,
          background: story.subtitleOptions.background
        },
        voice_id: story.voice
      });
      
      setVideoId(response.data.video_id);
      setVideoStatus('processing');
      toast.info("Video generation started, this may take a few minutes...");
    } catch (error) {
      console.error("Error generating video:", error);
      toast.error(error.response?.data?.detail || "Failed to generate video");
      setIsGenerating(false);
    }
  };
  
  const handleViewInGallery = () => {
    navigate('/gallery');
  };
  
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-4 text-white">Step 5: Final Video Generation</h2>
      
      <div className="bg-gray-800 p-6 rounded-lg mb-6">
        <h3 className="text-lg font-semibold mb-4 text-white">Summary</h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <p className="text-gray-300 mb-2"><span className="font-bold">Duration:</span> {story.duration} seconds</p>
            <p className="text-gray-300 mb-2"><span className="font-bold">Style:</span> {story.style || 'Not specified'}</p>
            <p className="text-gray-300 mb-2"><span className="font-bold">Voice:</span> {story.voice || 'Not specified'}</p>
            <p className="text-gray-300 mb-2"><span className="font-bold">Text placement:</span> {story.subtitleOptions?.placement || 'Bottom'}</p>
          </div>
          
          <div>
            <p className="text-gray-300 mb-2 whitespace-pre-line"><span className="font-bold">Story:</span> {story.story.substring(0, 100)}...</p>
            {story.images && story.images.length > 0 && (
              <p className="text-gray-300 mb-2"><span className="font-bold">Images:</span> {story.images.length} images</p>
            )}
          </div>
        </div>
      </div>
      
      {videoStatus === 'processing' && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2 text-white">Processing Video</h3>
          <div className="w-full bg-gray-700 rounded-full h-4">
            <div 
              className="bg-blue-600 h-4 rounded-full"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <p className="text-gray-300 mt-2 text-center">{progress}% complete</p>
        </div>
      )}
      
      {videoStatus === 'completed' && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-4 text-white">Video Ready!</h3>
          <div className="flex justify-center">
            <button 
              className="py-2 px-4 bg-green-600 text-white font-semibold rounded-md hover:bg-green-700"
              onClick={handleViewInGallery}
            >
              View in Gallery
            </button>
          </div>
        </div>
      )}
      
      <div className="flex justify-between">
        <button 
          className="py-2 px-4 bg-gray-700 text-white font-semibold rounded-md hover:bg-gray-600"
          onClick={onBack}
          disabled={isGenerating || videoStatus === 'processing' || videoStatus === 'completed'}
        >
          Back
        </button>
        
        {!videoStatus && (
          <button 
            className={`py-2 px-4 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 ${isGenerating ? 'opacity-70 cursor-not-allowed' : ''}`}
            onClick={handleGenerate}
            disabled={isGenerating}
          >
            Generate Final Video
          </button>
        )}
      </div>
    </div>
  );
};

// Creator Component
const Creator = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [storyData, setStoryData] = useState(null);
  const [imageData, setImageData] = useState(null);
  const [subtitleData, setSubtitleData] = useState(null);
  const [voiceData, setVoiceData] = useState(null);
  const [finalVideoData, setFinalVideoData] = useState(null);
  
  const handleStoryComplete = (data) => {
    setStoryData(data);
    setCurrentStep(2);
  };
  
  const handleImageComplete = (data) => {
    setImageData(data);
    setCurrentStep(3);
  };
  
  const handleSubtitleComplete = (data) => {
    setSubtitleData(data);
    setCurrentStep(4);
  };
  
  const handleVoiceComplete = (data) => {
    setVoiceData(data);
    setCurrentStep(5);
  };
  
  const handleVideoComplete = (data) => {
    setFinalVideoData(data);
  };
  
  const goBack = () => {
    setCurrentStep(currentStep - 1);
  };
  
  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <StepOne onComplete={handleStoryComplete} />;
      case 2:
        return <StepTwo story={storyData} onComplete={handleImageComplete} onBack={goBack} />;
      case 3:
        return <StepThree story={imageData} onComplete={handleSubtitleComplete} onBack={goBack} />;
      case 4:
        return <StepFour story={subtitleData} onComplete={handleVoiceComplete} onBack={goBack} />;
      case 5:
        return <StepFive story={voiceData} onComplete={handleVideoComplete} onBack={goBack} />;
      default:
        return <StepOne onComplete={handleStoryComplete} />;
    }
  };
  
  return (
    <div className="bg-gray-900 min-h-screen text-white">
      <div className="py-6">
        <div className="max-w-4xl mx-auto px-4">
          <div className="mb-8">
            <div className="flex items-center">
              {[1, 2, 3, 4, 5].map((step) => (
                <div key={step} className="flex items-center">
                  <div 
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${currentStep >= step ? 'bg-blue-600' : 'bg-gray-700'}`}
                  >
                    {step}
                  </div>
                  {step < 5 && (
                    <div 
                      className={`h-1 w-10 mx-1 ${currentStep > step ? 'bg-blue-600' : 'bg-gray-700'}`}
                    ></div>
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-2 text-xs text-gray-400">
              <div>Story</div>
              <div>Images</div>
              <div>Subtitles</div>
              <div>Voice</div>
              <div>Video</div>
            </div>
          </div>
          
          {renderStep()}
        </div>
      </div>
    </div>
  );
};

// Gallery Component
const Gallery = () => {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchVideos = async () => {
      try {
        const response = await axios.get(`${API}/videos`);
        setVideos(response.data);
      } catch (error) {
        console.error("Error fetching videos:", error);
        toast.error("Failed to fetch videos");
      } finally {
        setLoading(false);
      }
    };
    
    fetchVideos();
  }, []);
  
  const handleDelete = async (videoId) => {
    if (window.confirm("Are you sure you want to delete this video?")) {
      try {
        await axios.delete(`${API}/video/${videoId}`);
        toast.success("Video deleted successfully");
        // Update the list
        setVideos(videos.filter(video => video.id !== videoId));
      } catch (error) {
        console.error("Error deleting video:", error);
        toast.error("Failed to delete video");
      }
    }
  };
  
  if (loading) {
    return <div className="text-center p-8 text-white">Loading videos...</div>;
  }
  
  return (
    <div className="p-6 bg-gray-900 min-h-screen">
      <h2 className="text-2xl font-bold mb-6 text-white">Video Gallery</h2>
      
      {videos.length === 0 ? (
        <div className="text-center p-8 bg-gray-800 rounded-lg">
          <p className="text-gray-300">No videos yet. Create your first video!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {videos.map((video) => (
            <div key={video.id} className="bg-gray-800 rounded-lg overflow-hidden">
              <video 
                className="w-full h-auto"
                controls
                src={`${BACKEND_URL}${video.video_url}`}
                poster={video.thumbnail_url}
              ></video>
              <div className="p-4">
                <p className="text-white font-semibold mb-1">{video.title || `Video ${video.id.substring(0, 8)}...`}</p>
                <p className="text-gray-400 text-sm mb-3">Duration: {video.duration} seconds</p>
                <div className="flex justify-between">
                  <a 
                    href={`${BACKEND_URL}${video.video_url}`}
                    download
                    className="py-1 px-3 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 flex items-center"
                  >
                    <FaDownload className="mr-1" /> Download
                  </a>
                  <button
                    onClick={() => handleDelete(video.id)}
                    className="py-1 px-3 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 flex items-center"
                  >
                    <FaTrash className="mr-1" /> Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Publish Component
const Publish = () => {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchVideos = async () => {
      try {
        const response = await axios.get(`${API}/videos`);
        setVideos(response.data);
      } catch (error) {
        console.error("Error fetching videos:", error);
        toast.error("Failed to fetch videos");
      } finally {
        setLoading(false);
      }
    };
    
    fetchVideos();
  }, []);
  
  if (loading) {
    return <div className="text-center p-8 text-white">Loading videos...</div>;
  }
  
  return (
    <div className="p-6 bg-gray-900 min-h-screen">
      <h2 className="text-2xl font-bold mb-6 text-white">Publish Schedule</h2>
      
      <div className="bg-gray-800 rounded-lg p-6 mb-6">
        <p className="text-gray-300 mb-4">
          To enable publishing to TikTok and YouTube, please add your API credentials in the Settings page.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-7 gap-1 mb-4">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="bg-gray-700 p-2 text-center rounded-t-lg font-semibold">
              {day}
            </div>
          ))}
          
          {Array.from({ length: 35 }, (_, i) => (
            <div 
              key={i} 
              className="bg-gray-700 border border-gray-600 p-2 min-h-20 relative"
            >
              <div className="text-xs text-gray-400">{i + 1}</div>
              
              {/* Example scheduled item */}
              {i === 8 && (
                <div className="bg-blue-600 p-1 text-xs rounded mt-1">
                  <div className="font-semibold">Video Title</div>
                  <div>TikTok</div>
                </div>
              )}
              
              {i === 15 && (
                <div className="bg-red-600 p-1 text-xs rounded mt-1">
                  <div className="font-semibold">Story Video</div>
                  <div>YouTube</div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-xl font-semibold mb-4 text-white">Schedule New Publication</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-gray-300 mb-2">Select Video:</label>
            <select className="w-full p-2 bg-gray-700 text-white rounded-lg border border-gray-600">
              {videos.map(video => (
                <option key={video.id} value={video.id}>
                  {video.title || `Video ${video.id.substring(0, 8)}...`}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-gray-300 mb-2">Platform:</label>
            <div className="flex space-x-4">
              <button className="flex-1 p-2 bg-blue-600 rounded-lg">TikTok</button>
              <button className="flex-1 p-2 bg-gray-700 rounded-lg">YouTube</button>
            </div>
          </div>
          
          <div>
            <label className="block text-gray-300 mb-2">Title:</label>
            <input 
              type="text" 
              className="w-full p-2 bg-gray-700 text-white rounded-lg border border-gray-600"
              placeholder="Enter title for the video"
            />
          </div>
          
          <div>
            <label className="block text-gray-300 mb-2">Description:</label>
            <textarea 
              className="w-full p-2 bg-gray-700 text-white rounded-lg border border-gray-600"
              placeholder="Enter description"
              rows="3"
            ></textarea>
          </div>
          
          <div>
            <label className="block text-gray-300 mb-2">Publish Date:</label>
            <input 
              type="date" 
              className="w-full p-2 bg-gray-700 text-white rounded-lg border border-gray-600"
            />
          </div>
          
          <div>
            <label className="block text-gray-300 mb-2">Visibility:</label>
            <div className="flex space-x-4">
              <button className="flex-1 p-2 bg-blue-600 rounded-lg">Public</button>
              <button className="flex-1 p-2 bg-gray-700 rounded-lg">Private</button>
            </div>
          </div>
        </div>
        
        <div className="mt-6">
          <button className="py-2 px-4 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700">
            Schedule Publication
          </button>
        </div>
      </div>
    </div>
  );
};

// Settings Component
const Settings = () => {
  const [settings, setSettings] = useState({
    tiktok_api_key: "",
    youtube_api_key: ""
  });
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await axios.get(`${API}/settings`);
        setSettings({
          tiktok_api_key: response.data.tiktok_api_key || "",
          youtube_api_key: response.data.youtube_api_key || ""
        });
      } catch (error) {
        console.error("Error fetching settings:", error);
        toast.error("Failed to fetch settings");
      } finally {
        setLoading(false);
      }
    };
    
    fetchSettings();
  }, []);
  
  const handleApiChange = (e) => {
    setSettings({
      ...settings,
      [e.target.name]: e.target.value
    });
  };
  
  const saveSettings = async () => {
    setSaving(true);
    
    try {
      await axios.post(`${API}/settings`, settings);
      toast.success("Settings saved successfully");
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };
  
  const changePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.error("New passwords don't match");
      return;
    }
    
    if (!password || !newPassword) {
      toast.error("Please fill in all password fields");
      return;
    }
    
    setSaving(true);
    
    try {
      await axios.post(`${API}/change-password`, {
        old_password: password,
        new_password: newPassword
      });
      
      toast.success("Password changed successfully");
      
      // Clear fields
      setPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      console.error("Error changing password:", error);
      toast.error(error.response?.data?.detail || "Failed to change password");
    } finally {
      setSaving(false);
    }
  };
  
  if (loading) {
    return <div className="text-center p-8 text-white">Loading settings...</div>;
  }
  
  return (
    <div className="p-6 bg-gray-900 min-h-screen">
      <h2 className="text-2xl font-bold mb-6 text-white">Settings</h2>
      
      <div className="bg-gray-800 rounded-lg p-6 mb-6">
        <h3 className="text-xl font-semibold mb-4 text-white">API Credentials</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-gray-300 mb-2">TikTok API Key:</label>
            <input 
              type="password" 
              name="tiktok_api_key"
              className="w-full p-2 bg-gray-700 text-white rounded-lg border border-gray-600"
              value={settings.tiktok_api_key}
              onChange={handleApiChange}
              placeholder="Enter your TikTok API key"
            />
          </div>
          
          <div>
            <label className="block text-gray-300 mb-2">YouTube API Key:</label>
            <input 
              type="password" 
              name="youtube_api_key"
              className="w-full p-2 bg-gray-700 text-white rounded-lg border border-gray-600"
              value={settings.youtube_api_key}
              onChange={handleApiChange}
              placeholder="Enter your YouTube API key"
            />
          </div>
        </div>
        
        <button 
          className={`mt-4 py-2 px-4 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 ${saving ? 'opacity-70 cursor-not-allowed' : ''}`}
          onClick={saveSettings}
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save API Keys'}
        </button>
      </div>
      
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-xl font-semibold mb-4 text-white">Change Password</h3>
        
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-gray-300 mb-2">Current Password:</label>
            <input 
              type="password" 
              className="w-full p-2 bg-gray-700 text-white rounded-lg border border-gray-600"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your current password"
            />
          </div>
          
          <div>
            <label className="block text-gray-300 mb-2">New Password:</label>
            <input 
              type="password" 
              className="w-full p-2 bg-gray-700 text-white rounded-lg border border-gray-600"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter your new password"
            />
          </div>
          
          <div>
            <label className="block text-gray-300 mb-2">Confirm New Password:</label>
            <input 
              type="password" 
              className="w-full p-2 bg-gray-700 text-white rounded-lg border border-gray-600"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm your new password"
            />
          </div>
        </div>
        
        <button 
          className={`mt-4 py-2 px-4 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 ${saving ? 'opacity-70 cursor-not-allowed' : ''}`}
          onClick={changePassword}
          disabled={saving}
        >
          {saving ? 'Changing...' : 'Change Password'}
        </button>
      </div>
    </div>
  );
};

function App() {
  return (
    <div className="App bg-gray-900 min-h-screen">
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Layout />}>
            <Route index element={<Creator />} />
            <Route path="gallery" element={<Gallery />} />
            <Route path="publish" element={<Publish />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <ToastContainer theme="dark" position="bottom-right" />
    </div>
  );
}

export default App;
