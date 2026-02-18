
import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Fuel, MapPin, Loader2, Navigation, Search, Wrench, Hammer, AlertTriangle, Map as MapIcon, X, ExternalLink, ChevronRight, MapPinHouse, Radar, Truck, Utensils, Store, ShieldCheck, MapPinned } from 'lucide-react';
import { RoadService } from '../types';

interface StationLocatorProps {
  roadServices?: RoadService[];
}

export const StationLocator: React.FC<StationLocatorProps> = ({ roadServices = [] }) => {
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [services, setServices] = useState<any[]>([]);
  const [selectedType, setSelectedType] = useState<string>('Posto de Combustível');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [manualLocation, setManualLocation] = useState("");
  const [activeService, setActiveService] = useState<any | null>(null);

  const categories = Array.from(new Set([
    'Posto de Combustível', 'Restaurante', 'Oficina Diesel', 'Borracharia',
    ...roadServices.map(s => s.type)
  ]));

  const officialPartners = roadServices.filter(s => s.type === selectedType);

  const getGeolocation = (): Promise<{ lat: number; lng: number }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Seu navegador não suporta geolocalização."));
        return;
      }
      setStatusMessage("Obtendo sua localização...");
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => reject(err),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  };

  const findServices = async (isManual = false) => {
    setLoading(true);
    setErrorMessage(null);
    setServices([]);
    setActiveService(null);
    setStatusMessage("Preparando radar inteligente...");

    try {
      let latLng: { latitude: number; longitude: number } | null = null;
      let locationQuery = "";

      if (!isManual) {
        try {
          const coords = await getGeolocation();
          latLng = { latitude: coords.lat, longitude: coords.lng };
          locationQuery = "perto da minha localização atual";
        } catch (geoErr) {
          setErrorMessage("GPS inacessível. Digite um local manualmente.");
          setLoading(false);
          return;
        }
      } else {
        locationQuery = `em ${manualLocation}, Brasil`;
      }

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `Encontre ${selectedType} confiáveis com pátio para caminhões ${locationQuery}.`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          tools: [{ googleMaps: {} }, { googleSearch: {} }],
          toolConfig: { retrievalConfig: latLng ? { latLng } : undefined }
        },
      });

      const mapsResults = (response.candidates?.[0]?.groundingMetadata?.groundingChunks || [])
        .filter((chunk: any) => chunk.maps)
        .map((chunk: any) => ({
          title: chunk.maps.title,
          uri: chunk.maps.uri,
          isOfficial: false
        }));

      if (mapsResults.length > 0) {
        setServices(mapsResults);
      } else {
        setErrorMessage("Nenhum local adicional encontrado.");
      }
    } catch (err: any) {
      setErrorMessage("Erro ao buscar via radar IA.");
    } finally {
      setLoading(false);
      setStatusMessage("");
    }
  };

  const openRoute = (dest: string) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest)}`;
    window.open(url, '_blank');
  };

  const getIcon = (type: string) => {
    if (type.includes('Posto')) return <Fuel size={24}/>;
    if (type.includes('Restaurante')) return <Utensils size={24}/>;
    if (type.includes('Oficina')) return <Wrench size={24}/>;
    if (type.includes('Borracharia')) return <Hammer size={24}/>;
    return <Store size={24}/>;
  };

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 pb-20 animate-fade-in px-4">
      <div className="bg-slate-900 p-8 md:p-12 rounded-[3.5rem] text-white shadow-2xl border border-slate-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-12 opacity-5">
          <Radar size={180} className="animate-pulse" />
        </div>
        
        <div className="relative z-10 space-y-10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <h2 className="text-4xl font-black tracking-tighter uppercase flex items-center gap-3">
                <MapPinned className="text-primary-500" size={40} /> Radar da Estrada
              </h2>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-2">Localize Parceiros Oficiais e Serviços via IA</p>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {categories.slice(0, 5).map(cat => (
                <button 
                  key={cat}
                  onClick={() => setSelectedType(cat)}
                  className={`px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-wider transition-all ${selectedType === cat ? 'bg-primary-600 text-white shadow-lg scale-105' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <input 
                type="text" 
                placeholder="Ex: Rodovia Anhanguera, KM 100..." 
                className="w-full p-6 bg-slate-800 border border-slate-700 rounded-3xl font-bold text-white outline-none focus:ring-4 focus:ring-primary-500/30 placeholder:text-slate-600 transition-all text-lg"
                value={manualLocation}
                onChange={e => setManualLocation(e.target.value)}
              />
              <Search className="absolute right-6 top-6 text-slate-600" size={28} />
            </div>
            <button onClick={() => findServices(manualLocation !== "")} disabled={loading} className="bg-primary-600 text-white px-10 py-6 rounded-3xl font-black text-lg flex items-center justify-center gap-3 shadow-xl active:scale-95 transition-all">
              {loading ? <Loader2 className="animate-spin" /> : <Radar size={24} />} Escanear Área
            </button>
          </div>
          {statusMessage && <p className="text-primary-400 text-[10px] font-black uppercase tracking-[0.2em] animate-pulse">{statusMessage}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 space-y-6 max-h-[800px] overflow-y-auto pr-2 custom-scrollbar">
          {officialPartners.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-4 flex items-center gap-2">
                <ShieldCheck size={14} className="text-emerald-500" /> Parceiros Recomendados
              </h3>
              {officialPartners.map(s => (
                <div 
                  key={s.id} 
                  onClick={() => setActiveService({...s, title: s.name, uri: s.location_url, isOfficial: true})}
                  className={`p-6 rounded-[3rem] border-2 cursor-pointer transition-all flex flex-col gap-4 group relative overflow-hidden ${activeService?.id === s.id ? 'bg-emerald-600 border-emerald-600 text-white shadow-2xl scale-[1.02]' : 'bg-white border-emerald-100 hover:border-emerald-300'}`}
                >
                  <div className="flex gap-4 items-center">
                    <div className={`p-4 rounded-2xl shrink-0 ${activeService?.id === s.id ? 'bg-white/20' : 'bg-emerald-50 text-emerald-600'}`}>
                      {getIcon(s.type)}
                    </div>
                    <div className="overflow-hidden">
                      <h4 className="font-black text-lg truncate pr-2">{s.name}</h4>
                      <p className={`text-[10px] font-bold uppercase truncate ${activeService?.id === s.id ? 'text-white/70' : 'text-slate-400'}`}>{s.address}</p>
                    </div>
                  </div>
                  
                  <button 
                    onClick={(e) => { e.stopPropagation(); openRoute(s.address); }}
                    className={`w-full py-4 rounded-2xl font-black text-[10px] uppercase flex items-center justify-center gap-2 transition-all ${activeService?.id === s.id ? 'bg-white text-emerald-700' : 'bg-slate-900 text-white'}`}
                  >
                    <Navigation size={14} /> Traçar Rota GPS
                  </button>
                </div>
              ))}
            </div>
          )}

          {services.length > 0 && (
            <div className="space-y-4 pt-4">
               <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-4">Localizados via Radar IA</h3>
               {services.map((s, i) => (
                  <div 
                    key={i} 
                    onClick={() => setActiveService(s)}
                    className={`p-6 rounded-[2.5rem] border-2 cursor-pointer transition-all flex items-center justify-between group ${activeService?.uri === s.uri ? 'bg-primary-600 border-primary-600 text-white shadow-2xl scale-[1.02]' : 'bg-white border-slate-200 hover:border-primary-300'}`}
                  >
                    <div className="flex gap-4 items-center overflow-hidden">
                      <div className={`p-4 rounded-2xl shrink-0 ${activeService?.uri === s.uri ? 'bg-white/20' : 'bg-slate-100 text-slate-500'}`}>
                        {getIcon(selectedType)}
                      </div>
                      <div className="overflow-hidden">
                        <h4 className="font-black text-base truncate pr-2">{s.title}</h4>
                        <p className={`text-[10px] font-bold uppercase ${activeService?.uri === s.uri ? 'text-white/70' : 'text-slate-400'}`}>Localização Google</p>
                      </div>
                    </div>
                  </div>
               ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-8 h-[800px] bg-white rounded-[4rem] border-2 border-slate-100 overflow-hidden relative shadow-sm flex flex-col">
          {activeService ? (
            <>
              <div className="bg-white border-b p-8 flex items-center justify-between z-10">
                <div className="flex items-center gap-5 overflow-hidden">
                   <div className={`p-4 rounded-2xl shrink-0 ${activeService.isOfficial ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-400'}`}>
                     {activeService.isOfficial ? <ShieldCheck size={32} /> : <MapPin size={32} />}
                   </div>
                   <div className="overflow-hidden">
                     <h3 className="font-black text-slate-900 text-2xl truncate">{activeService.title}</h3>
                     <p className="text-slate-400 text-[10px] font-bold uppercase truncate">{activeService.address || 'Localização no Mapa'}</p>
                   </div>
                </div>
                <button onClick={() => window.open(activeService.uri, '_blank')} className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase flex items-center gap-2 shrink-0 ml-4">
                  <ExternalLink size={18}/> Maps
                </button>
              </div>
              <div className="flex-1 bg-slate-50">
                <iframe 
                  title="Mapa"
                  className="w-full h-full border-0"
                  src={`https://www.google.com/maps?q=${encodeURIComponent(activeService.address || activeService.title)}&output=embed`}
                  allowFullScreen
                ></iframe>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-20 text-center">
              <Radar size={120} className="text-slate-100 mb-8" />
              <h3 className="text-slate-400 font-black text-3xl uppercase tracking-tighter">Radar em Repouso</h3>
              <p className="text-slate-300 font-bold mt-4 max-w-sm text-lg">Selecione um parceiro ou use o radar para encontrar serviços.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
