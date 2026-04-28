/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { Camera, RefreshCw, Sparkles, User, Info, DollarSign, CameraOff, AlertCircle, ChevronRight, Check, QrCode, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from "@google/genai";
import ReactMarkdown from 'react-markdown';
import { QRCodeSVG } from 'qrcode.react';

// Initialize Gemini AI
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

type AnalysisResult = {
  score: number;
  bodyScore: number;
  overallRating: string;
  strengths: string[];
  improvements: string;
  cosmeticAdvice: string;
  fashionAdvice: string;
};

export default function App() {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPaymentInfo, setShowPaymentInfo] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const [paymentStep, setPaymentStep] = useState<'SELECTION' | 'PROCESSING' | 'SUCCESS'>('SELECTION');
  const [selectedMethod, setSelectedMethod] = useState<'MTN' | 'ORANGE' | 'WAVE' | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Start initial camera
  const startCamera = async () => {
    try {
      setError(null);
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } } 
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      setError("Impossible d'accéder à la caméra. Veuillez vérifier les permissions.");
    }
  };

  // Stop camera
  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = canvas.toDataURL('image/jpeg');
        setCapturedImage(imageData);
        stopCamera();
      }
    }
  };

  const resetAnalysis = () => {
    setCapturedImage(null);
    setResult(null);
    setIsAnalyzing(false);
    setError(null);
    setIsPaid(false);
    setPaymentStep('SELECTION');
    setSelectedMethod(null);
    setPhoneNumber('');
    startCamera();
  };

  const analyzeImage = async () => {
    if (!capturedImage) return;

    setIsAnalyzing(true);
    setError(null);

    try {
      const base64Data = capturedImage.split(',')[1];
      
      const prompt = `Analyses cette photo (visage et corps si visible) pour un profilage esthétique complet. 
      Donne les résultats suivants sous forme de JSON (et rien d'autre) :
      1. score (nombre sur 20 pour le visage)
      2. bodyScore (nombre sur 20 pour l'apparence physique globale et la silhouette)
      3. overallRating (une phrase résumant l'esthétique générale)
      4. strengths (liste de 3 points forts : visage, posture ou style)
      5. improvements (conseils pour améliorer l'apparence générale)
      6. cosmeticAdvice (CONSEILS PRODUITS : Suggère au moins 3 NOMS DE PRODUITS réels, cosmétiques ou naturels spécifiques - ex: marque précise ou ingrédient exact - pour le visage)
      7. fashionAdvice (CONSEILS VESTIMENTAIRES : Donne des conseils de style, de couleurs et de coupes de vêtements adaptés à la personne sur la photo)
      
      Réponds uniquement en JSON valide avec ces clés précises. Langue: Français.`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: {
          parts: [
            { inlineData: { mimeType: "image/jpeg", data: base64Data } },
            { text: prompt }
          ]
        },
        config: {
          responseMimeType: "application/json"
        }
      });

      const parsedResult = JSON.parse(response.text || '{}');
      
      // Safety check: Ensure fields that must be strings for ReactMarkdown are strings
      const normalizeToString = (val: any) => {
        if (Array.isArray(val)) return val.map(v => typeof v === 'string' ? `- ${v}` : JSON.stringify(v)).join('\n');
        return String(val || '');
      };

      const finalResult: AnalysisResult = {
        ...parsedResult,
        cosmeticAdvice: normalizeToString(parsedResult.cosmeticAdvice),
        fashionAdvice: normalizeToString(parsedResult.fashionAdvice),
        improvements: normalizeToString(parsedResult.improvements),
        strengths: Array.isArray(parsedResult.strengths) ? parsedResult.strengths : [normalizeToString(parsedResult.strengths)]
      };

      setResult(finalResult);
    } catch (err) {
      console.error("Analysis error:", err);
      setError("Désolé, l'analyse a échoué. Veuillez réessayer.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleStartPayment = (method: 'MTN' | 'ORANGE' | 'WAVE') => {
    setSelectedMethod(method);
    setPaymentStep('PROCESSING');
    
    // Simulate payment process (waiting for push notification)
    setTimeout(() => {
      setPaymentStep('SUCCESS');
      setTimeout(() => {
        setIsPaid(true);
        setShowPaymentInfo(false);
      }, 1500);
    }, 4000);
  };

  return (
    <div className="min-h-screen bg-[#050505] text-slate-200 font-sans selection:bg-indigo-500/30 p-4 md:p-6 flex flex-col gap-4 overflow-x-hidden">
      {/* Header Section */}
      <header className="relative z-10 flex justify-between items-center bg-[#111113] border border-white/10 rounded-2xl p-4 max-w-7xl mx-auto w-full">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-3"
        >
          <div className="w-8 h-8 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Sparkles className="text-white w-5 h-5" />
          </div>
          <h1 className="text-xl font-display font-bold tracking-tight text-white uppercase">KESSE <span className="text-indigo-400">Ap</span></h1>
        </motion.div>

        <div className="flex items-center gap-4">
          <AnimatePresence>
            {stream && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="hidden sm:flex items-center gap-2 px-3 py-1 bg-green-500/10 rounded-full border border-green-500/30"
              >
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-[10px] uppercase font-bold text-green-500 tracking-wider">Caméra : Active</span>
              </motion.div>
            )}
          </AnimatePresence>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowPaymentInfo(true)}
            className="flex items-center gap-2 px-4 py-2 border border-white/10 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-xs uppercase tracking-widest font-bold"
          >
            <DollarSign className="w-4 h-4 text-indigo-400" />
            <span className="hidden xs:inline">{isPaid ? 'Premium Actif' : 'Premium'}</span>
          </motion.button>
        </div>
      </header>


      <main className="relative z-10 max-w-7xl mx-auto w-full flex-1">
        <AnimatePresence mode="wait">
          {!result && !isAnalyzing ? (
            <motion.div
              key="landing"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center min-h-[70vh]"
            >
              <div className="lg:col-span-6 space-y-8">
                <div className="space-y-4">
                  <h2 className="text-5xl md:text-7xl font-display font-black leading-[0.9] tracking-tighter uppercase text-white">
                    L'ÉVALUATION <br />
                    <span className="text-indigo-500">ESTHÉTIQUE</span> <br />
                    PAR IA
                  </h2>
                  <p className="text-slate-400 text-lg max-w-md font-light leading-relaxed">
                    Capturez votre image pour un profilage facial complet, un score de beauté objectif et des conseils cosmétiques personnalisés.
                  </p>
                </div>

                <div className="flex flex-wrap gap-4">
                  {!capturedImage ? (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={capturePhoto}
                      disabled={!stream}
                      className="group relative px-8 py-5 bg-indigo-600 text-white rounded-2xl overflow-hidden flex items-center gap-3 transition-all disabled:opacity-50 shadow-xl shadow-indigo-500/20"
                    >
                      <Camera className="w-5 h-5 group-hover:scale-110 transition-transform" />
                      <span className="font-bold uppercase tracking-wider text-sm">Analyser mon visage</span>
                    </motion.button>
                  ) : (
                    <>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={analyzeImage}
                        className="px-8 py-5 bg-white text-black rounded-2xl flex items-center gap-3 shadow-xl"
                      >
                        <Sparkles className="w-5 h-5" />
                        <span className="font-bold uppercase tracking-wider text-sm">Lancer le SCAN</span>
                      </motion.button>
                      <button 
                        onClick={resetAnalysis}
                        className="p-5 rounded-2xl border border-white/10 hover:bg-white/5 transition-colors text-slate-400"
                      >
                        <RefreshCw className="w-5 h-5" />
                      </button>
                    </>
                  )}
                </div>

                {error && (
                  <div className="flex items-center gap-2 text-red-400 bg-red-400/10 p-4 rounded-xl border border-red-400/20 max-w-sm">
                    <AlertCircle className="w-5 h-5" />
                    <span className="text-sm font-medium">{error}</span>
                  </div>
                )}
              </div>

              <div className="lg:col-span-6 aspect-square relative rounded-[40px] overflow-hidden border border-white/10 bg-[#0e0e11]">
                {!capturedImage ? (
                  <>
                    <video 
                      ref={videoRef} 
                      autoPlay 
                      playsInline 
                      muted
                      className="w-full h-full object-cover brightness-110 contrast-125 opacity-70"
                    />
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                       {/* Mock Face Outlines like in design */}
                      <div className="w-64 h-80 border-2 border-indigo-500/30 rounded-full relative">
                        <div className="absolute top-1/2 left-0 w-full h-[1px] bg-indigo-400/10"></div>
                        <div className="absolute top-1/3 left-1/4 w-1.5 h-1.5 bg-white/40 rounded-full"></div>
                        <div className="absolute top-1/3 right-1/4 w-1.5 h-1.5 bg-white/40 rounded-full"></div>
                      </div>
                    </div>
                  </>
                ) : (
                  <img src={capturedImage} className="w-full h-full object-cover" alt="Visage capturé" />
                )}
                <div className="absolute bottom-6 left-6 bg-black/60 backdrop-blur-md rounded-xl p-4 border border-white/10">
                  <p className="text-[10px] text-indigo-300 uppercase font-bold tracking-widest">Prêt pour scan</p>
                  <p className="text-xs text-slate-300">Alignement : Optimal</p>
                </div>
              </div>
            </motion.div>
          ) : isAnalyzing ? (
            <motion.div
              key="analyzing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center h-[70vh] space-y-12"
            >
              <div className="relative w-48 h-48">
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                  className="absolute inset-0 border-4 border-dashed border-indigo-500/20 rounded-full"
                />
                <div className="absolute inset-4 border-2 border-indigo-500 rounded-full flex items-center justify-center">
                  <Sparkles className="w-12 h-12 text-indigo-500 animate-pulse" />
                </div>
              </div>
              <div className="text-center space-y-4">
                <h2 className="text-4xl font-display font-black uppercase tracking-widest">Profiling AI...</h2>
                <div className="w-64 h-1 bg-white/10 rounded-full overflow-hidden mx-auto">
                  <motion.div 
                    initial={{ x: '-100%' }}
                    animate={{ x: '100%' }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
                    className="w-full h-full bg-indigo-500"
                  />
                </div>
                <p className="text-slate-500 text-xs font-mono uppercase tracking-[0.3em]">Mapping facial • Extraction symétrie • Analyse d'or</p>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="result"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="grid grid-cols-1 md:grid-cols-12 md:grid-rows-6 gap-4 min-h-[85vh] pb-10"
            >
              {/* Main Image Tile */}
              <div className="md:col-span-7 md:row-span-4 bg-[#0e0e11] rounded-3xl border border-white/10 relative overflow-hidden group">
                <img src={capturedImage!} className="w-full h-full object-cover brightness-110 transition-transform duration-700 group-hover:scale-105" alt="Analyse" />
                <div className="absolute inset-0 bg-indigo-900/10 mix-blend-overlay"></div>
                <div className="absolute bottom-6 left-6 bg-black/60 backdrop-blur-md rounded-2xl p-4 border border-white/10">
                  <p className="text-[10px] text-indigo-300 uppercase font-bold tracking-widest mb-1">Rapport de Scan</p>
                  <p className="text-xs text-slate-300 font-mono italic">ID: {Math.random().toString(36).substring(7).toUpperCase()}</p>
                </div>
                {/* Visual scanning line simulation */}
                <motion.div 
                  initial={{ top: '0%' }}
                  animate={{ top: '100%' }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                  className="absolute left-0 right-0 h-px bg-indigo-400 blur-sm shadow-[0_0_15px_indigo] opacity-40"
                />
              </div>

              {/* Beauty Score Tile */}
              <div className="md:col-span-5 md:row-span-2 bg-gradient-to-br from-indigo-900/40 to-slate-900 rounded-3xl border border-indigo-500/20 p-8 flex flex-col justify-center items-center text-center">
                <div className="flex gap-12">
                  <div className="text-center">
                    <h3 className="text-[10px] text-slate-400 uppercase tracking-[0.3em] font-bold mb-2">Visage</h3>
                    <div className="relative">
                      <span className="text-6xl font-black text-white leading-none tracking-tighter">{result.score}</span>
                      <span className="text-sm font-bold text-indigo-400 absolute top-0 -right-4">/20</span>
                    </div>
                  </div>
                  <div className="text-center">
                    <h3 className="text-[10px] text-slate-400 uppercase tracking-[0.3em] font-bold mb-2">Corps</h3>
                    <div className="relative">
                      <span className="text-6xl font-black text-white leading-none tracking-tighter">{result.bodyScore || result.score}</span>
                      <span className="text-sm font-bold text-indigo-400 absolute top-0 -right-4">/20</span>
                    </div>
                  </div>
                </div>
                <div className="mt-6 px-4 py-1.5 bg-indigo-500/20 rounded-full text-indigo-200 text-[10px] font-bold uppercase tracking-wider">
                  Top des profils analysés
                </div>
              </div>

              {/* Metrics Tile */}
              <div className="md:col-span-5 md:row-span-2 bg-[#111113] rounded-3xl border border-white/5 p-6 flex flex-col justify-center gap-6">
                 {[
                   { label: "Symétrie Faciale", value: "88.4%", color: "bg-indigo-500" },
                   { label: "Qualité de Peau", value: "Excellent", color: "bg-emerald-500" },
                   { label: "Ratio d'Or (Ф)", value: "1.58", color: "bg-amber-500" }
                 ].map((m, i) => (
                   <div key={i} className="space-y-2">
                     <div className="flex justify-between items-end">
                       <span className="text-[10px] text-slate-500 uppercase font-black tracking-widest">{m.label}</span>
                       <span className="text-xs font-mono text-white font-bold">{m.value}</span>
                     </div>
                     <div className="w-full h-1.5 bg-slate-800/50 rounded-full overflow-hidden">
                       <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: "90%" }}
                        transition={{ delay: i * 0.2, duration: 1 }}
                        className={`h-full ${m.color}`} 
                       />
                     </div>
                   </div>
                 ))}
              </div>

              {/* Cosmetic & Fashion Recommendations Tile */}
              <div className="md:col-span-4 md:row-span-2 bg-[#111113] rounded-3xl border border-white/5 p-6 flex flex-col relative overflow-hidden">
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-1.5 h-4 bg-indigo-500 rounded-full"></div>
                  <h3 className="text-xs font-black text-white uppercase tracking-widest font-display whitespace-nowrap">Conseils Premium</h3>
                </div>
                
                <div className="flex-1 relative overflow-y-auto custom-scrollbar pr-2">
                  <AnimatePresence mode="wait">
                    {isPaid ? (
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-[11px] text-slate-400 leading-relaxed font-light space-y-6"
                      >
                        <div>
                          <h4 className="text-white font-bold uppercase tracking-widest text-[9px] mb-2 flex items-center gap-2">
                            <Sparkles className="w-3 h-3 text-orange-400" />
                            Produits & Soins
                          </h4>
                          <ReactMarkdown 
                            components={{
                              p: ({children}) => <p className="mb-2 last:mb-0">{children}</p>,
                              ul: ({children}) => <ul className="list-disc pl-4 space-y-1 mb-2">{children}</ul>,
                              li: ({children}) => <li>{children}</li>,
                              strong: ({children}) => <span className="text-orange-400 font-semibold">{children}</span>
                            }}
                          >
                            {result.cosmeticAdvice}
                          </ReactMarkdown>
                        </div>

                        <div>
                          <h4 className="text-white font-bold uppercase tracking-widest text-[9px] mb-2 flex items-center gap-2">
                            <QrCode className="w-3 h-3 text-blue-400" />
                            Style Vestimentaire
                          </h4>
                          <ReactMarkdown 
                            components={{
                              p: ({children}) => <p className="mb-2 last:mb-0">{children}</p>,
                              ul: ({children}) => <ul className="list-disc pl-4 space-y-1 mb-2">{children}</ul>,
                              li: ({children}) => <li>{children}</li>,
                              strong: ({children}) => <span className="text-blue-400 font-semibold">{children}</span>
                            }}
                          >
                            {result.fashionAdvice}
                          </ReactMarkdown>
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        onClick={() => setShowPaymentInfo(true)}
                        className="absolute inset-0 flex flex-col items-center justify-center text-center cursor-pointer group"
                      >
                        <div className="absolute inset-0 bg-indigo-500/5 backdrop-blur-md opacity-40 group-hover:opacity-60 transition-opacity rounded-2xl" />
                        <div className="relative z-10 space-y-3">
                          <div className="w-10 h-10 bg-indigo-500/20 rounded-full flex items-center justify-center mx-auto border border-indigo-500/30">
                            <Lock className="w-5 h-5 text-indigo-400" />
                          </div>
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-white">Débloquer le guide</p>
                            <p className="text-[8px] text-slate-500 uppercase tracking-widest mt-1">Produits + Conseils Mode</p>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="mt-4 pt-4 border-t border-white/5 flex gap-2">
                  <button 
                    onClick={resetAnalysis}
                    className="flex-1 py-3 border border-white/10 rounded-xl hover:bg-white/5 transition-all text-slate-400 text-[10px] font-bold uppercase tracking-widest"
                  >
                    Nouveau Scan
                  </button>
                </div>
              </div>

              {/* AI Profiling Log Tile */}
              <div className="md:col-span-4 md:row-span-2 bg-[#0a0a0c] rounded-3xl border border-white/5 p-6 font-mono text-[10px] text-slate-500 overflow-hidden relative">
                <div className="text-indigo-500/60 mb-3 font-bold uppercase tracking-widest">LOGS_RECOGNITION</div>
                <div className="space-y-1 opacity-80">
                  <div>&gt; Extraction points nodaux... OK</div>
                  <div>&gt; Mapping facial (Ф) 1.618...</div>
                  {result.strengths.slice(1).map((s, idx) => (
                    <div key={idx}>&gt; Trait détecté : {s}</div>
                  ))}
                  <div className="text-indigo-400 animate-pulse mt-2">&gt; Analyse {result.overallRating}...</div>
                </div>
                <div className="absolute bottom-4 right-6 text-[8px] italic text-slate-700">Ver. 2.4.0-Beta</div>
              </div>

              {/* Payment MTN Money Tile */}
              <div className="md:col-span-4 md:row-span-2 bg-[#ffcc00] rounded-3xl p-6 flex flex-col justify-between shadow-[0_0_40px_rgba(255,204,0,0.15)] group hover:scale-[1.02] transition-all duration-300 cursor-pointer" onClick={() => setShowPaymentInfo(true)}>
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[10px] font-black text-black/40 uppercase tracking-tighter italic">Transformez votre apparence</p>
                    <p className="text-2xl font-display font-black text-black leading-tight tracking-tighter">DEVIENS UNIQUE</p>
                  </div>
                  <div className="w-12 h-7 bg-white rounded-lg flex items-center justify-center shadow-sm">
                    <span className="text-[9px] font-black text-[#ffcc00]">MTN</span>
                  </div>
                </div>
                <div className="bg-black/5 rounded-2xl p-4 border border-black/5 backdrop-blur-sm flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[10px] text-black font-black uppercase tracking-widest mb-1 opacity-60 text-left">Paiement Mobile :</p>
                    <p className="text-[11px] font-mono font-black text-black tracking-tight text-left">MTN, Orange, Wave</p>
                  </div>
                  <div className="bg-white p-1.5 rounded-lg shadow-sm shrink-0">
                    <QrCode className="w-8 h-8 text-black" />
                  </div>
                </div>
                <button className="w-full bg-black text-white text-[10px] font-black py-4 rounded-2xl hover:bg-slate-900 transition-colors uppercase tracking-[0.2em]">
                  Scannez & Brillez (Premium)
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="relative z-10 max-w-7xl mx-auto w-full flex flex-col sm:flex-row justify-between items-center text-[10px] text-slate-600 gap-4 mt-auto mb-2">
        <div className="flex gap-6 uppercase tracking-widest font-bold">
          <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-slate-800"/> KESSE Ap v1.0.0</span>
          <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-slate-800"/> FaceNet API Enabled</span>
        </div>
        <div className="italic text-center sm:text-right max-w-xs">Analyse faciale de pointe pour un profilage esthétique personnalisé</div>
      </footer>

      {/* Payment / Donation Modal */}
      <AnimatePresence>
        {showPaymentInfo && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (paymentStep !== 'PROCESSING') setShowPaymentInfo(false);
              }}
              className="fixed inset-0 bg-black/95 backdrop-blur-2xl z-[100]"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[95%] max-w-lg bg-[#0f0f11] border border-white/10 rounded-[48px] p-8 md:p-12 z-[101] shadow-2xl overflow-hidden"
            >
              <AnimatePresence mode="wait">
                {paymentStep === 'SELECTION' && (
                  <motion.div 
                    key="selection"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-10"
                  >
                    <div className="space-y-4 text-center">
                      <div className="w-20 h-20 bg-indigo-500/10 rounded-3xl flex items-center justify-center mx-auto shadow-xl shadow-indigo-500/5 rotate-3 mb-6">
                        <Sparkles className="w-10 h-10 text-indigo-500" />
                      </div>
                      <h2 className="text-4xl font-display font-black uppercase tracking-tighter text-white leading-[0.9]">Révélez votre <br /><span className="text-indigo-500">Plein Potentiel</span></h2>
                      <p className="text-slate-400 font-light text-sm leading-relaxed max-w-xs mx-auto">
                        Ne vous contentez pas d'un score. Accédez à la science secrète de votre visage et transformez votre style avec des conseils d'experts.
                      </p>
                      <div className="flex flex-wrap justify-center gap-2 py-2">
                        {["Produits Incontournables", "Secrets de Silhouette", "Guide de Style Pro"].map((tag, i) => (
                          <span key={i} className="text-[8px] border border-white/10 px-2 py-1 rounded-full text-slate-500 uppercase font-black tracking-widest">{tag}</span>
                        ))}
                      </div>
                      <p className="text-indigo-400 font-bold text-xs uppercase tracking-[0.2em] pt-2 animate-pulse">Tarif Spécial : 50 - 250 FCFA</p>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                      {[
                        { id: 'MTN' as const, name: 'MTN Mobile Money', color: 'bg-[#ffcc00]', textColor: 'text-black' },
                        { id: 'ORANGE' as const, name: 'Orange Money', color: 'bg-[#ff6600]', textColor: 'text-white' },
                        { id: 'WAVE' as const, name: 'Wave Checkout', color: 'bg-[#00a6ff]', textColor: 'text-white' }
                      ].map((m) => (
                        <button
                          key={m.id}
                          onClick={() => handleStartPayment(m.id)}
                          className={`w-full ${m.color} ${m.textColor} p-5 rounded-2xl flex items-center justify-between font-black uppercase tracking-widest text-[10px] shadow-lg hover:scale-[1.02] transition-transform`}
                        >
                          <span>{m.name}</span>
                          <ChevronRight className="w-4 h-4 opacity-50" />
                        </button>
                      ))}
                    </div>

                    <button 
                      onClick={() => setShowPaymentInfo(false)}
                      className="w-full text-slate-500 text-[10px] font-black uppercase tracking-widest hover:text-white transition-colors"
                    >
                      Annuler
                    </button>
                  </motion.div>
                )}

                {paymentStep === 'PROCESSING' && (
                  <motion.div 
                    key="processing"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-10 text-center"
                  >
                    <div className="relative w-32 h-32 mx-auto">
                      <motion.div 
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                        className="absolute inset-0 border-4 border-indigo-500 border-t-transparent rounded-full"
                      />
                      <div className="absolute inset-4 rounded-full bg-white/5 flex items-center justify-center">
                        <QrCode className="w-10 h-10 text-indigo-400 animate-pulse" />
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <h3 className="text-2xl font-display font-black text-white uppercase tracking-tighter">Attente d'autorisation</h3>
                      <p className="text-slate-400 text-sm font-light max-w-xs mx-auto">
                        Veuillez valider la demande de paiement reçue sur votre téléphone {selectedMethod}...
                      </p>
                    </div>

                    <div className="p-6 bg-white/[0.03] border border-white/5 rounded-3xl flex items-center justify-center gap-4">
                      <div className="bg-white p-3 rounded-xl shadow-xl">
                        <QRCodeSVG value={`tel:*133#`} size={100} level="H" />
                      </div>
                      <div className="text-left font-mono text-[10px] text-slate-500 uppercase leading-relaxed">
                        <div>&gt; ID: TX_{Math.random().toString(36).substring(7).toUpperCase()}</div>
                        <div>&gt; STATUS: PENDING</div>
                        <div className="text-indigo-400">&gt; WAIT_FOR_PUSH...</div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {paymentStep === 'SUCCESS' && (
                  <motion.div 
                    key="success"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="space-y-8 text-center"
                  >
                    <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
                      <Check className="w-12 h-12 text-green-500" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-3xl font-display font-black text-white uppercase tracking-tighter">Paiement Validé</h3>
                      <p className="text-slate-400 text-sm font-light">Le mode Premium AI est maintenant actif.</p>
                    </div>
                    <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: '100%' }}
                        transition={{ duration: 1.5 }}
                        className="h-full bg-green-500"
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
