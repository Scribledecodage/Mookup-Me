'use client';

import { useEffect, useRef, useState } from 'react';
import { CheckCircle, CircleNotch, Info, Microphone, SpeakerHigh, VideoCamera, X } from '@phosphor-icons/react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '@/lib/firebase';

const fieldCls = 'w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-[14px] text-gray-800 outline-none transition-colors focus:border-blue-500 focus:bg-white';

function stopStream(stream) {
  stream?.getTracks().forEach((track) => track.stop());
}

export default function VoiceVideoPage() {
  const [user] = useAuthState(auth);
  const [devices, setDevices] = useState([]);
  const [audioInputId, setAudioInputId] = useState('');
  const [videoInputId, setVideoInputId] = useState('');
  const [quality, setQuality] = useState('auto');
  const [isLoadingDevices, setIsLoadingDevices] = useState(false);
  const [isTestingMic, setIsTestingMic] = useState(false);
  const [isTestingCamera, setIsTestingCamera] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');
  const videoRef = useRef(null);
  const micStreamRef = useRef(null);
  const cameraStreamRef = useRef(null);
  const audioContextRef = useRef(null);
  const meterFrameRef = useRef(null);

  const loadDevices = async () => {
    if (!navigator.mediaDevices?.enumerateDevices) {
      setError('Votre navigateur ne permet pas de sélectionner un appareil.');
      return;
    }
    setIsLoadingDevices(true);
    try {
      const listedDevices = await navigator.mediaDevices.enumerateDevices();
      setDevices(listedDevices);
      if (!audioInputId) setAudioInputId(listedDevices.find((device) => device.kind === 'audioinput')?.deviceId || '');
      if (!videoInputId) setVideoInputId(listedDevices.find((device) => device.kind === 'videoinput')?.deviceId || '');
    } catch {
      setError('Impossible de récupérer vos appareils.');
    } finally {
      setIsLoadingDevices(false);
    }
  };

  useEffect(() => {
    if (!user) return undefined;
    const unsubscribe = onSnapshot(doc(db, 'users', user.uid), (snapshot) => {
      const saved = snapshot.data()?.voiceVideoPreferences || {};
      if (saved.audioInputId) setAudioInputId(saved.audioInputId);
      if (saved.videoInputId) setVideoInputId(saved.videoInputId);
      if (saved.quality) setQuality(saved.quality);
    });
    return () => {
      unsubscribe();
      stopStream(micStreamRef.current);
      stopStream(cameraStreamRef.current);
      audioContextRef.current?.close().catch(() => {});
      if (meterFrameRef.current) cancelAnimationFrame(meterFrameRef.current);
    };
  }, [user]);

  const requestDeviceAccess = async () => {
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      stopStream(stream);
      await loadDevices();
    } catch {
      setError('Autorisez le microphone et la caméra dans votre navigateur.');
    }
  };

  const stopMicrophoneTest = () => {
    stopStream(micStreamRef.current);
    micStreamRef.current = null;
    audioContextRef.current?.close().catch(() => {});
    audioContextRef.current = null;
    if (meterFrameRef.current) cancelAnimationFrame(meterFrameRef.current);
    meterFrameRef.current = null;
    setMicLevel(0);
    setIsTestingMic(false);
  };

  const testMicrophone = async () => {
    if (isTestingMic) {
      stopMicrophoneTest();
      return;
    }
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: audioInputId ? { deviceId: { exact: audioInputId } } : true });
      micStreamRef.current = stream;
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      audioContext.createMediaStreamSource(stream).connect(analyser);
      const values = new Uint8Array(analyser.fftSize);
      const updateMeter = () => {
        analyser.getByteTimeDomainData(values);
        const volume = values.reduce((sum, value) => sum + Math.abs(value - 128), 0) / values.length;
        setMicLevel(Math.min(1, volume / 35));
        meterFrameRef.current = requestAnimationFrame(updateMeter);
      };
      audioContextRef.current = audioContext;
      setIsTestingMic(true);
      updateMeter();
      await loadDevices();
    } catch {
      setError('Impossible d’utiliser ce microphone.');
    }
  };

  const stopCameraTest = () => {
    stopStream(cameraStreamRef.current);
    cameraStreamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setIsTestingCamera(false);
  };

  const testCamera = async () => {
    if (isTestingCamera) {
      stopCameraTest();
      return;
    }
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: videoInputId ? { deviceId: { exact: videoInputId } } : true });
      cameraStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setIsTestingCamera(true);
      await loadDevices();
    } catch {
      setError('Impossible d’utiliser cette caméra.');
    }
  };

  const savePreferences = async (event) => {
    event.preventDefault();
    if (!user) return;
    setIsSaving(true);
    setIsSuccess(false);
    setError('');
    try {
      await setDoc(doc(db, 'users', user.uid), {
        voiceVideoPreferences: { audioInputId, videoInputId, quality },
        updatedAt: new Date(),
      }, { merge: true });
      setIsSuccess(true);
      setTimeout(() => setIsSuccess(false), 2500);
    } catch (saveError) {
      console.error('Erreur sauvegarde voix et vidéo:', saveError);
      setError('Impossible de sauvegarder ces préférences.');
    } finally {
      setIsSaving(false);
    }
  };

  const microphones = devices.filter((device) => device.kind === 'audioinput');
  const cameras = devices.filter((device) => device.kind === 'videoinput');

  return (
    <div className="p-6 pb-12 w-full max-w-lg">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-gray-900 mb-1">Voix & Vidéo</h2>
        <p className="text-gray-500 text-[15px]">Configurez vos appareils avant de rejoindre un appel.</p>
      </div>

      <div className="mb-4 flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4">
        <Info size={22} className="mt-0.5 flex-shrink-0 text-blue-500" />
        <p className="text-[13px] leading-5 text-blue-800">Autorisez vos appareils pour afficher leurs noms et tester le son ou la vidéo.</p>
      </div>

      <button type="button" onClick={requestDeviceAccess} className="mb-4 w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-[13px] font-semibold text-gray-700 transition-colors hover:bg-gray-50">
        {isLoadingDevices ? 'Recherche des appareils…' : 'Autoriser le microphone et la caméra'}
      </button>

      <form onSubmit={savePreferences} className="space-y-3">
        <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3"><Microphone size={24} className="flex-shrink-0 text-blue-500" /><div className="min-w-0 flex-1"><h3 className="text-[15px] font-semibold text-gray-900">Microphone</h3><p className="mt-1 text-[13px] text-gray-500">Choisissez le microphone utilisé pendant les appels.</p></div></div>
          <select value={audioInputId} onChange={(event) => setAudioInputId(event.target.value)} className={`${fieldCls} mt-3`}><option value="">Microphone par défaut</option>{microphones.map((device, index) => <option key={device.deviceId} value={device.deviceId}>{device.label || `Microphone ${index + 1}`}</option>)}</select>
          <button type="button" onClick={testMicrophone} className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-blue-200 px-3 py-2 text-[13px] font-medium text-blue-600 transition-colors hover:bg-blue-50">{isTestingMic ? 'Arrêter le test' : 'Tester le microphone'}</button>
          {isTestingMic && <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-200"><div className="h-full rounded-full bg-blue-500 transition-[width]" style={{ width: `${Math.max(4, micLevel * 100)}%` }} /></div>}
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3"><VideoCamera size={24} className="flex-shrink-0 text-blue-500" /><div className="min-w-0 flex-1"><h3 className="text-[15px] font-semibold text-gray-900">Caméra</h3><p className="mt-1 text-[13px] text-gray-500">Choisissez la caméra utilisée pendant les appels.</p></div></div>
          <select value={videoInputId} onChange={(event) => setVideoInputId(event.target.value)} className={`${fieldCls} mt-3`}><option value="">Caméra par défaut</option>{cameras.map((device, index) => <option key={device.deviceId} value={device.deviceId}>{device.label || `Caméra ${index + 1}`}</option>)}</select>
          <button type="button" onClick={testCamera} className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-blue-200 px-3 py-2 text-[13px] font-medium text-blue-600 transition-colors hover:bg-blue-50">{isTestingCamera ? <><X size={16} /> Arrêter la caméra</> : 'Tester la caméra'}</button>
          <video ref={videoRef} muted playsInline className={`mt-3 aspect-video w-full rounded-lg bg-gray-900 object-cover ${isTestingCamera ? 'block' : 'hidden'}`} />
        </section>

        <section className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm"><SpeakerHigh size={24} className="flex-shrink-0 text-blue-500" /><div className="min-w-0 flex-1"><h3 className="text-[15px] font-semibold text-gray-900">Qualité des appels</h3><p className="mt-1 text-[13px] text-gray-500">Adaptez la qualité à votre connexion.</p></div><select value={quality} onChange={(event) => setQuality(event.target.value)} className="rounded-lg border border-gray-200 bg-gray-50 px-2 py-2 text-[13px]"><option value="auto">Auto</option><option value="standard">Standard</option><option value="hd">HD</option></select></section>

        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-center text-[13px] text-red-600">{error}</p>}
        <button type="submit" disabled={isSaving || !user} className={`w-full rounded-lg py-2.5 font-bold transition-all flex items-center justify-center gap-2 ${isSuccess ? 'bg-green-500 text-white' : isSaving || !user ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600 text-white'}`}>{isSaving ? <CircleNotch size={20} className="animate-spin" /> : isSuccess ? <><CheckCircle size={20} /> Préférences enregistrées</> : 'Enregistrer les préférences'}</button>
      </form>
    </div>
  );
}
