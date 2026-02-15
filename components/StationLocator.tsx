
import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Fuel, MapPin, Loader2, Navigation, Search, Wrench, Hammer, AlertTriangle, Map as MapIcon, X, ExternalLink, ChevronRight, MapPinHouse, Radar, Truck, Utensils, Store, ShieldCheck } from 'lucide-react';
import { RoadService } from '../types';

interface StationLocatorProps {
  roadServices?: RoadService[];
}

export const StationLocator: React.FC<StationLocatorProps> = ({ roadServices = [] }) => {
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [services, setServices] = useState<any[]>([]);
  const [selectedType, setSelectedType] = useState<'stations' | 'tire_repair' | 'mechanic' | 'restaurants'>('stations');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [manualLocation, setManualLocation] = useState("");
  const [activeService, setActiveService] = useState<any | null>(null);

  // Filtra os parceiros oficiais cadastrados pelo admin por categoria
  const officialPartners = roadServices.filter(s => {
    if (selectedType === 'stations') return s.type === 'stations';
    if (selectedType === 'restaurants') return s.type === 'restaurants';
    if (selectedType === 'mechanic') return s.type === 'mechanic' || s.type === 'store';
    if (selectedType === 'tire_repair') return s.type === 'tire_repair';
    return false;
  });

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
    if (isManual && !manualLocation.trim()) return;

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

      setStatusMessage("Consultando Google Maps e IA...");
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      let serviceLabel = "";
      switch(selectedType) {
        case 'stations': serviceLabel = "Postos de combustível"; break;
        case 'tire_repair': serviceLabel = "Borracharias pesadas"; break;
        case 'mechanic': serviceLabel = "Mecânicas diesel"; break;
        case 'restaurants': serviceLabel = "Restaurantes de beira de estrada"; break;
      }

      const prompt = `Encontre ${serviceLabel} confiáveis com pátio para caminhões ${locationQuery}.`;

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
        setErrorMessage("Nenhum local adicional encontrado nesta área.");
      }
    } catch (err: any) {
      setErrorMessage("Erro ao buscar serviços via IA.");
    } finally {
      setLoading(false);
      setStatusMessage("");
    }
  };

  const getIcon = (type: string) => {
    switch(type) {
      case 'stations': return <Fuel size={24}/>;
      case 'restaurants': return <Utensils size={24}/>;
      case 'mechanic': return <Wrench size={24}/>;
      case 'tire_repair': return <Hammer size={24}/>;
      default: return <Store size={24}/>;
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 pb-12 animate-fade-in">
      {/* Radar de Busca */}
      <div className="bg-slate-900 p-6 md:p-10 rounded-[3rem] text-white shadow-2xl mx-2 border border-slate-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <Radar size={120} className="animate-pulse" />
        </div>
        
        <div className="relative z-10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
            <div>
              <h2 className="text-3xl font-black tracking-tighter uppercase flex items-center gap-2">
                <Truck className="text-primary-500" /> Radar da Estrada
              </h2>
              <p className="text-slate-400 text-sm font-bold uppercase tracking-widest mt-1">Serviços e Parceiros Oficiais AuriLog</p>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <ServiceTab active={selectedType === 'stations'} icon={Fuel} label="Postos" onClick={() => setSelectedType('stations')} />
              <ServiceTab active={selectedType === 'restaurants'} icon={Utensils} label="Comida" onClick={() => setSelectedType('restaurants')} />
              <ServiceTab active={selectedType === 'mechanic'} icon={Wrench} label="Mecânica" onClick={() => setSelectedType('mechanic')} />
              <ServiceTab active={selectedType === 'tire_repair'} icon={Hammer} label="Pneus" onClick={() => setSelectedType('tire_repair')} />
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <input 
                type="text" 
                placeholder="Ex: Rodovia Fernão Dias, KM 40..." 
                className="w-full p-5 bg-slate-800 border border-slate-700 rounded-2xl font-bold text-white outline-none focus:ring-2 focus:ring-primary-500 placeholder:text-slate-600 transition-all"
                value={manualLocation}
                onChange={e => setManualLocation(e.target.value)}
              />
              <Search className="absolute right-5 top-5 text-slate-600" size={24} />
            </div>
            <button onClick={() => findServices(false)} disabled={loading} className="bg-primary-600 text-white px-8 py-5 rounded-2xl font-black text-lg flex items-center justify-center gap-3 shadow-xl active:scale-95 transition-all">
              {loading ? <Loader2 className="animate-spin" /> : <Radar size={24} />} Localizar Agora
            </button>
          </div>
          {statusMessage && <p className="mt-4 text-primary-400 text-[10px] font-black uppercase tracking-widest animate-pulse">{statusMessage}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 px-2">
        {/* Resultados */}
        <div className="lg:col-span-4 space-y-4 max-h-[700px] overflow-y-auto pr-2 custom-scrollbar">
          {/* Sessão Parceiros Oficiais (DB) */}
          {officialPartners.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 flex items-center gap-2">
                <ShieldCheck size={14} className="text-emerald-500" /> Parceiros AuriLog
              </h3>
              {officialPartners.map(s => (
                <div key={s.id} onClick={() => setActiveService({...s, title: s.name, uri: s.location_url, isOfficial: true})} className={`p-6 rounded-[2.5rem] border-2 cursor-pointer transition-all flex items-center justify-between group relative overflow-hidden ${activeService?.id === s.id ? 'bg-emerald-600 border-emerald-600 text-white shadow-2xl scale-[1.02]' : 'bg-white border-emerald-100 hover:border-emerald-300'}`}>
                  <div className="flex gap-4 items-center">
                    <div className={`p-4 rounded-2xl ${activeService?.id === s.id ? 'bg-white/20' : 'bg-emerald-50 text-emerald-600'}`}>
                      {getIcon(s.type)}
                    </div>
                    <div>
                      <h4 className="font-black text-base truncate pr-2">{s.name}</h4>
                      <p className={`text-[10px] font-bold ${activeService?.id === s.id ? 'text-white/70' : 'text-slate-400'}`}>{s.description || 'Parceiro Recomendado'}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Sessão Resultados IA/Maps */}
          <div className="space-y-3 pt-4">
             {services.length > 0 && (
               <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">Resultados Radar</h3>
             )}
             {services.map((s, i) => (
                <div key={i} onClick={() => setActiveService(s)} className={`p-6 rounded-[2.5rem] border cursor-pointer transition-all flex items-center justify-between group ${activeService?.uri === s.uri ? 'bg-primary-600 border-primary-600 text-white shadow-2xl scale-[1.02]' : 'bg-white border-slate-200 hover:border-primary-200'}`}>
                  <div className="flex gap-4 items-center">
                    <div className={`p-4 rounded-2xl ${activeService?.uri === s.uri ? 'bg-white/20' : 'bg-slate-100 text-slate-500'}`}>
                      {getIcon(selectedType)}
                    </div>
                    <div>
                      <h4 className="font-black text-base truncate pr-2">{s.title}</h4>
                      <p className={`text-[10px] font-bold ${activeService?.uri === s.uri ? 'text-white/70' : 'text-slate-400'}`}>Localização no Mapa</p>
                    </div>
                  </div>
                </div>
             ))}
          </div>
          
          {!loading && officialPartners.length === 0 && services.length === 0 && (
            <div className="text-center py-20 bg-white rounded-[3rem] border-2 border-dashed border-slate-100 opacity-60">
               <MapPinHouse size={48} className="mx-auto text-slate-200 mb-2" />
               <p className="text-[10px] font-black text-slate-400 uppercase">Use o radar para buscar locais</p>
            </div>
          )}
        </div>

        {/* Mapa Detalhado */}
        <div className="lg:col-span-8 h-[700px] bg-white rounded-[3rem] border border-slate-200 overflow-hidden relative shadow-sm flex flex-col">
          {activeService ? (
            <>
              <div className="bg-white border-b p-6 flex items-center justify-between z-10">
                <div className="flex items-center gap-4">
                   <div className={`p-3 rounded-xl ${activeService.isOfficial ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-400'}`}>
                     {activeService.isOfficial ? <ShieldCheck /> : <MapPin />}
                   </div>
                   <div>
                     <h3 className="font-black text-slate-900 text-xl">{activeService.title}</h3>
                     {activeService.isOfficial && <p className="text-emerald-600 text-[10px] font-black uppercase tracking-widest">Parceiro Oficial AuriLog</p>}
                   </div>
                </div>
                <button onClick={() => window.open(activeService.uri, '_blank')} className="px-6 py-3 bg-slate-900 text-white rounded-xl font-black text-xs uppercase flex items-center gap-2">
                  <ExternalLink size={16}/> Abrir Maps
                </button>
              </div>
              <div className="flex-1 bg-slate-100">
                <iframe 
                  title="Mapa"
                  className="w-full h-full border-0"
                  src={`https://www.google.com/maps?q=${encodeURIComponent(activeService.title)}&output=embed`}
                  allowFullScreen
                  loading="lazy"
                ></iframe>
              </div>
              <div className="p-8 absolute bottom-0 left-0 right-0 pointer-events-none">
                <button onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(activeService.title)}`, '_blank')} className="w-full md:w-auto md:px-12 py-5 bg-slate-900 text-white rounded-[2rem] font-black text-xl flex items-center justify-center gap-4 shadow-2xl pointer-events-auto mx-auto active:scale-95 transition-all">
                  <Navigation size={28} className="fill-white" /> INICIAR NAVEGAÇÃO GPS
                </button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
              <Radar size={100} className="text-slate-100 mb-6" />
              <h3 className="text-slate-400 font-black text-2xl uppercase tracking-tighter">Radar em Standby</h3>
              <p className="text-slate-300 font-bold mt-2 max-w-sm">Selecione um local na lista lateral ou inicie uma busca por radar.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const ServiceTab = ({ active, icon: Icon, label, onClick }: any) => (
  <button onClick={onClick} className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-black text-xs transition-all tracking-tighter uppercase ${active ? 'bg-primary-600 text-white shadow-lg scale-105' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>
    <Icon size={18} /> <span>{label}</span>
  </button>
);
