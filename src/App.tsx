/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  Search, 
  ShoppingBag, 
  ArrowRight, 
  Loader2, 
  Image as ImageIcon,
  RefreshCw,
  ExternalLink,
  MessageCircle,
  X,
  Send,
  Printer,
  Info,
  ChevronDown,
  Paperclip,
  Camera,
  Plus
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { generateFashionDesign, findSimilarProducts, analyzeDesignDetails, startFashionChat } from './services/geminiService';

interface ProductLink {
  title?: string;
  uri?: string;
}

interface GenerationResult {
  id: string;
  imageUrl: string;
  prompt: string;
  details: string;
  suggestions: {
    text: string;
    links: ProductLink[];
  };
}

const STYLE_ARCHETYPES = [
  { name: 'Minimalist', prompt: 'Clean lines, monochromatic, architectural, quiet luxury' },
  { name: 'Cyberpunk', prompt: 'Neon accents, technical fabrics, futuristic, dystopian street style' },
  { name: 'Victorian Gothic', prompt: 'Lace, corsetry, dark romanticism, velvet, dramatic silhouettes' },
  { name: 'Avant-Garde', prompt: 'Experimental shapes, sculptural, boundary-pushing, conceptual' },
  { name: 'Sustainable', prompt: 'Natural fibers, earthy tones, raw textures, eco-conscious' },
];

export default function App() {
  const [prompt, setPrompt] = useState('');
  const [selectedArchetype, setSelectedArchetype] = useState<string | null>(null);
  const [userImage, setUserImage] = useState<{ data: string, mimeType: string } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [lookbook, setLookbook] = useState<GenerationResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'studio' | 'lookbook'>('studio');
  const [showGuide, setShowGuide] = useState(true);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'model', text: string }[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatRef = useRef<any>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isChatLoading) return;

    const userMessage = chatInput;
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsChatLoading(true);

    try {
      if (!chatRef.current) {
        chatRef.current = await startFashionChat();
      }
      const response = await chatRef.current.sendMessage({ message: userMessage });
      setChatMessages(prev => [...prev, { role: 'model', text: response.text }]);
    } catch (err) {
      console.error(err);
      setChatMessages(prev => [...prev, { role: 'model', text: "I'm sorry, I'm having trouble connecting to the fashion network. Please try again later." }]);
    } finally {
      setIsChatLoading(false);
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleGenerate = async (e?: React.FormEvent, customPrompt?: string) => {
    e?.preventDefault();
    const finalPrompt = customPrompt || prompt;
    if (!finalPrompt.trim() || isGenerating) return;

    setIsGenerating(true);
    setError(null);
    
    try {
      const enhancedPrompt = selectedArchetype 
        ? `${finalPrompt}. Style: ${STYLE_ARCHETYPES.find(a => a.name === selectedArchetype)?.prompt}`
        : finalPrompt;

      const [imageUrl, suggestions, details] = await Promise.all([
        generateFashionDesign(enhancedPrompt, userImage?.data, userImage?.mimeType),
        findSimilarProducts(enhancedPrompt),
        analyzeDesignDetails(enhancedPrompt)
      ]);
      
      const newResult: GenerationResult = {
        id: Math.random().toString(36).substr(2, 9),
        imageUrl,
        prompt: finalPrompt,
        details,
        suggestions
      };
      
      setResult(newResult);
      setActiveTab('studio');
      
      setTimeout(() => {
        scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to generate design. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const addToLookbook = () => {
    if (result && !lookbook.find(item => item.id === result.id)) {
      setLookbook(prev => [result, ...prev]);
    }
  };

  const refineDesign = (tweak: string) => {
    const newPrompt = `${prompt}, ${tweak}`;
    setPrompt(newPrompt);
    handleGenerate(undefined, newPrompt);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1];
        setUserImage({ data: base64, mimeType: file.type });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="min-h-screen selection:bg-white selection:text-black bg-black text-white font-sans">
      {/* Navigation Rail */}
      <nav className="fixed left-0 top-0 h-full w-16 border-r border-white/10 flex flex-col items-center py-8 z-50 bg-black/50 backdrop-blur-xl">
        <div className="font-serif text-xl italic mb-12">V</div>
        <div className="flex flex-col gap-8">
          <button 
            onClick={() => setActiveTab('studio')}
            className={`p-3 rounded-xl transition-all ${activeTab === 'studio' ? 'bg-white text-black' : 'text-white/40 hover:text-white'}`}
          >
            <Sparkles className="w-5 h-5" />
          </button>
          <button 
            onClick={() => setActiveTab('lookbook')}
            className={`p-3 rounded-xl transition-all ${activeTab === 'lookbook' ? 'bg-white text-black' : 'text-white/40 hover:text-white'}`}
          >
            <ShoppingBag className="w-5 h-5" />
          </button>
          <button 
            onClick={() => setIsChatOpen(!isChatOpen)}
            className={`p-3 rounded-xl transition-all ${isChatOpen ? 'bg-white text-black' : 'text-white/40 hover:text-white'}`}
          >
            <MessageCircle className="w-5 h-5" />
          </button>
        </div>
        <div className="mt-auto text-[10px] uppercase tracking-[0.3em] rotate-180 [writing-mode:vertical-lr] text-white/20">
          VogueAI Studio &copy; 2026
        </div>
      </nav>

      <div className="pl-16">
        {activeTab === 'studio' ? (
          <>
            {/* Hero Section */}
            <header className="relative min-h-[90vh] flex flex-col items-center justify-center overflow-hidden px-6 py-20">
              <div className="absolute inset-0 z-0">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/50 to-black z-10" />
                <img 
                  src="https://picsum.photos/seed/fashion-vogue/1920/1080?grayscale" 
                  className="w-full h-full object-cover opacity-20 scale-110"
                  alt="Background"
                  referrerPolicy="no-referrer"
                />
              </div>

              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative z-20 text-center max-w-4xl w-full"
              >
                <h1 className="font-serif text-8xl md:text-[10rem] font-light tracking-tighter mb-4 leading-none opacity-90">
                  Vogue<span className="italic">AI</span>
                </h1>
                <p className="text-xs uppercase tracking-[0.5em] text-white/40 mb-12">Generative Haute Couture</p>

                <form onSubmit={(e) => handleGenerate(e)} className="relative max-w-2xl mx-auto w-full">
                  <div className="relative flex items-center">
                    <div className="absolute left-4 flex items-center gap-2 z-30">
                      <label className="cursor-pointer p-2.5 bg-white text-black hover:bg-white/90 rounded-full transition-all border border-white/20 shadow-xl group relative">
                        <Plus className="w-5 h-5" />
                        <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                        <span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-white text-black text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none uppercase tracking-widest font-bold">
                          Upload Photo
                        </span>
                      </label>
                    </div>
                    <input
                      type="text"
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder={userImage ? "Image uploaded. Describe design..." : "Describe your vision..."}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-6 pl-20 pr-20 text-lg focus:outline-none focus:border-white/30 transition-all placeholder:text-white/20 backdrop-blur-md"
                    />
                    <div className="absolute right-3 flex items-center gap-2">
                      {userImage && (
                        <button 
                          type="button"
                          onClick={() => setUserImage(null)}
                          className="p-2 text-red-400 hover:text-red-300 transition-colors"
                          title="Remove image"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        type="submit"
                        disabled={isGenerating || (!prompt.trim() && !userImage)}
                        className="p-4 bg-white text-black rounded-xl hover:bg-white/90 disabled:opacity-50 transition-all"
                      >
                        {isGenerating ? <Loader2 className="w-6 h-6 animate-spin" /> : <ArrowRight className="w-6 h-6" />}
                      </button>
                    </div>
                  </div>
                  
                  {userImage && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="absolute -top-24 left-0 flex items-center gap-3 p-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl"
                    >
                      <img 
                        src={`data:${userImage.mimeType};base64,${userImage.data}`} 
                        className="w-16 h-16 object-cover rounded-lg" 
                        alt="User upload" 
                      />
                      <div className="text-left">
                        <p className="text-[10px] uppercase tracking-widest text-white/60">Reference Photo</p>
                        <p className="text-[8px] text-white/40">Design will be tailored to you</p>
                      </div>
                    </motion.div>
                  )}
                  
                  <div className="mt-8 flex flex-wrap justify-center gap-3">
                    {STYLE_ARCHETYPES.map((style) => (
                      <button
                        key={style.name}
                        type="button"
                        onClick={() => setSelectedArchetype(style.name === selectedArchetype ? null : style.name)}
                        className={`text-[10px] uppercase tracking-widest px-4 py-2 rounded-full border transition-all ${
                          selectedArchetype === style.name 
                            ? 'bg-white text-black border-white' 
                            : 'border-white/10 text-white/40 hover:border-white/30 hover:text-white'
                        }`}
                      >
                        {style.name}
                      </button>
                    ))}
                  </div>
                </form>
              </motion.div>

            </header>

            {/* User Guide Section */}
            <section className="max-w-7xl mx-auto px-6 relative z-30 -mt-10 mb-20">
              <AnimatePresence>
                {showGuide && (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="max-w-4xl mx-auto bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 shadow-2xl"
                  >
                    <div className="flex items-start justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/10 rounded-lg">
                          <Info className="w-5 h-5 text-white" />
                        </div>
                        <h2 className="font-serif text-2xl italic">How VogueAI Works</h2>
                      </div>
                      <button 
                        onClick={() => setShowGuide(false)}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors"
                      >
                        <X className="w-4 h-4 text-white/40" />
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
                      <div className="space-y-3">
                        <div className="text-[10px] uppercase tracking-widest text-white/40">Step 01</div>
                        <h3 className="text-sm font-medium">Describe & Generate</h3>
                        <p className="text-xs text-white/60 leading-relaxed">Enter any fashion vision or use our Style Archetypes. Our AI creates high-fidelity couture designs instantly.</p>
                      </div>
                      <div className="space-y-3">
                        <div className="text-[10px] uppercase tracking-widest text-white/40">Step 02</div>
                        <h3 className="text-sm font-medium">Indian Market Search</h3>
                        <p className="text-xs text-white/60 leading-relaxed">We search Amazon India, Flipkart, Myntra, and Ajio to find similar products with prices in ₹ (Rupees).</p>
                      </div>
                      <div className="space-y-3">
                        <div className="text-[10px] uppercase tracking-widest text-white/40">Step 03</div>
                        <h3 className="text-sm font-medium">Refine or Print</h3>
                        <p className="text-xs text-white/60 leading-relaxed">Refine your design with AI chat or use our Printify integration to bring your unique design to life.</p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              
              {!showGuide && (
                <div className="flex justify-center">
                  <button 
                    onClick={() => setShowGuide(true)}
                    className="flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-white/20 hover:text-white/60 transition-all bg-white/5 px-6 py-3 rounded-full border border-white/5"
                  >
                    <Info className="w-3 h-3" /> Show User Guide
                  </button>
                </div>
              )}
            </section>

            {/* Results Section */}
            <main className="max-w-7xl mx-auto px-6 py-24 min-h-screen">
              <AnimatePresence mode="wait">
                {error && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-center mb-12">
                    {error}
                  </motion.div>
                )}

                {result ? (
                  <div ref={scrollRef} className="space-y-24">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-start">
                      {/* Left: Image & Actions */}
                      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="lg:col-span-5 space-y-8">
                        <div className="relative aspect-[3/4] rounded-3xl overflow-hidden border border-white/10 group">
                          <img src={result.imageUrl} alt={result.prompt} className="w-full h-full object-cover" />
                          <div className="absolute top-6 right-6">
                            <button 
                              onClick={addToLookbook}
                              className="p-4 rounded-full bg-black/50 backdrop-blur-md border border-white/20 hover:bg-white hover:text-black transition-all"
                            >
                              <ShoppingBag className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <button 
                            onClick={() => refineDesign('more futuristic')}
                            className="p-4 rounded-2xl border border-white/5 bg-white/5 hover:bg-white/10 text-[10px] uppercase tracking-widest transition-all"
                          >
                            Refine: Futuristic
                          </button>
                          <button 
                            onClick={() => refineDesign('minimalist approach')}
                            className="p-4 rounded-2xl border border-white/5 bg-white/5 hover:bg-white/10 text-[10px] uppercase tracking-widest transition-all"
                          >
                            Refine: Minimal
                          </button>
                        </div>
                      </motion.div>

                      {/* Right: Analysis & Shopping */}
                      <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="lg:col-span-7 space-y-16">
                        <section>
                          <div className="flex items-center gap-3 mb-8">
                            <div className="w-8 h-px bg-white/20" />
                            <h2 className="font-serif text-4xl italic">Couture Analysis</h2>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="p-8 rounded-3xl bg-white/5 border border-white/10">
                              <h3 className="text-[10px] uppercase tracking-[0.2em] text-white/40 mb-4">Technical Details</h3>
                              <div className="prose prose-invert prose-sm max-w-none text-white/70 font-light">
                                <ReactMarkdown>{result.details}</ReactMarkdown>
                              </div>
                            </div>
                            <div className="p-8 rounded-3xl bg-white/5 border border-white/10">
                              <h3 className="text-[10px] uppercase tracking-[0.2em] text-white/40 mb-4">Shop Similar (Indian Market)</h3>
                              <div className="space-y-4">
                                {result.suggestions.links.length > 0 ? (
                                  result.suggestions.links.map((link, idx) => (
                                    <a key={idx} href={link.uri} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between group">
                                      <span className="text-sm text-white/60 group-hover:text-white transition-colors truncate pr-4">{link.title}</span>
                                      <ExternalLink className="w-4 h-4 text-white/20 group-hover:text-white" />
                                    </a>
                                  ))
                                ) : (
                                  <div className="text-xs text-white/40 italic">No direct matches found in Indian stores.</div>
                                )}
                              </div>
                            </div>
                          </div>
                        </section>

                        <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div className="p-8 rounded-3xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent">
                            <h3 className="text-[10px] uppercase tracking-[0.2em] text-white/40 mb-6">Style Context</h3>
                            <div className="text-white/80 font-serif text-xl italic leading-relaxed">
                              <ReactMarkdown>{result.suggestions.text}</ReactMarkdown>
                            </div>
                          </div>
                          
                          <div className="p-8 rounded-3xl border border-white/10 bg-white/5 flex flex-col justify-between">
                            <div>
                              <h3 className="text-[10px] uppercase tracking-[0.2em] text-white/40 mb-4">Custom Production</h3>
                              <p className="text-sm text-white/60 mb-6">Can't find it in stores? Print this unique design on high-quality apparel via Printify.</p>
                            </div>
                            <a 
                              href="https://printify.com/app/products" 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="w-full py-4 bg-white text-black rounded-2xl flex items-center justify-center gap-3 hover:bg-white/90 transition-all font-medium"
                            >
                              <Printer className="w-5 h-5" />
                              Print on Printify
                            </a>
                          </div>
                        </section>
                      </motion.div>
                    </div>
                  </div>
                ) : isGenerating ? (
                  <div className="flex flex-col items-center justify-center py-32 space-y-8">
                    <Loader2 className="w-12 h-12 animate-spin text-white/20" />
                    <p className="font-serif italic text-2xl animate-pulse">Designing your vision...</p>
                  </div>
                ) : (
                  <div className="text-center py-48 opacity-20">
                    <Sparkles className="w-12 h-12 mx-auto mb-6" />
                    <p className="font-serif italic text-xl">The studio is ready for your first prompt.</p>
                  </div>
                )}
              </AnimatePresence>
            </main>
          </>
        ) : (
          /* Lookbook View */
          <main className="max-w-7xl mx-auto px-6 py-24 min-h-screen">
            <div className="flex items-end justify-between mb-16">
              <div>
                <h1 className="font-serif text-6xl italic mb-4">The Lookbook</h1>
                <p className="text-white/40 text-xs uppercase tracking-[0.3em]">Your Curated Collection</p>
              </div>
              <div className="text-white/20 text-sm font-mono">{lookbook.length} DESIGNS</div>
            </div>

            {lookbook.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {lookbook.map((item) => (
                  <motion.div 
                    key={item.id}
                    layoutId={item.id}
                    className="group relative aspect-[3/4] rounded-2xl overflow-hidden border border-white/10 cursor-pointer"
                    onClick={() => {
                      setResult(item);
                      setActiveTab('studio');
                    }}
                  >
                    <img src={item.imageUrl} alt={item.prompt} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-8">
                      <p className="text-sm font-serif italic mb-2">"{item.prompt}"</p>
                      <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-white/60">
                        View Details <ArrowRight className="w-3 h-3" />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-48 opacity-20">
                <ShoppingBag className="w-12 h-12 mx-auto mb-6" />
                <p className="font-serif italic text-xl">Your lookbook is empty.</p>
              </div>
            )}
          </main>
        )}
      </div>

      {/* Chat Assistant Drawer */}
      <AnimatePresence>
        {isChatOpen && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-full md:w-96 bg-black/90 backdrop-blur-2xl border-l border-white/10 z-[60] flex flex-col shadow-2xl"
          >
            <div className="p-6 border-bottom border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-white/60" />
                </div>
                <div>
                  <h3 className="font-serif text-lg italic">Fashion Assistant</h3>
                  <p className="text-[10px] uppercase tracking-widest text-white/40">Always Trending</p>
                </div>
              </div>
              <button 
                onClick={() => setIsChatOpen(false)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-white/40" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
              {chatMessages.length === 0 && (
                <div className="text-center py-12 space-y-4 opacity-40">
                  <MessageCircle className="w-12 h-12 mx-auto" />
                  <p className="font-serif italic">Ask me anything about trends, fabrics, or design ideas.</p>
                </div>
              )}
              {chatMessages.map((msg, idx) => (
                <div 
                  key={idx} 
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div 
                    className={`max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed ${
                      msg.role === 'user' 
                        ? 'bg-white text-black' 
                        : 'bg-white/5 border border-white/10 text-white/80'
                    }`}
                  >
                    <ReactMarkdown>{msg.text}</ReactMarkdown>
                    {msg.role === 'model' && msg.text.includes('Prompt:') && (
                      <button
                        onClick={() => {
                          const match = msg.text.match(/Prompt:\s*(.*)/);
                          if (match) {
                            setPrompt(match[1]);
                            setIsChatOpen(false);
                            setActiveTab('studio');
                          }
                        }}
                        className="mt-3 w-full py-2 bg-white/10 hover:bg-white/20 rounded-lg text-[10px] uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
                      >
                        <ImageIcon className="w-3 h-3" />
                        Apply Prompt
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {isChatLoading && (
                <div className="flex justify-start">
                  <div className="bg-white/5 border border-white/10 p-4 rounded-2xl">
                    <Loader2 className="w-4 h-4 animate-spin text-white/20" />
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <form onSubmit={handleSendMessage} className="p-6 border-t border-white/10">
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ask for advice..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-4 px-5 pr-12 text-sm focus:outline-none focus:border-white/30 transition-all placeholder:text-white/20"
                />
                <button
                  type="submit"
                  disabled={!chatInput.trim() || isChatLoading}
                  className="absolute right-2 p-2 text-white/40 hover:text-white disabled:opacity-20 transition-colors"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

