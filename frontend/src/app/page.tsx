'use client';

import { useEffect, useState } from 'react';
import './globals.css';

interface HealthResponse {
  status: string;
  database_connected: boolean;
  message: string;
}

type FetchState = 'loading' | 'error' | 'success';

export default function Home() {
  const [data, setData] = useState<HealthResponse | null>(null);
  const [fetchState, setFetchState] = useState<FetchState>('loading');

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;

    fetch(\/)
      .then((res) => {
        if (!res.ok) throw new Error(HTTP \);
        return res.json();
      })
      .then((json: HealthResponse) => {
        setData(json);
        setFetchState('success');
      })
      .catch(() => {
        setFetchState('error');
      });
  }, []);

  const now = new Date().toISOString();

  return (
    <main
      style={{ fontFamily: 'var(--font-mono)' }}
      className="min-h-screen bg-[#0a0a0a] text-[#e5e5e5] p-8 flex flex-col gap-6 max-w-2xl mx-auto"
    >
      <div className="border-b border-[#222] pb-4">
        <p className="text-[10px] tracking-[0.3em] text-[#555] uppercase mb-1">
          MigrantShield // Phase 1
        </p>
        <h1 className="text-xl font-medium tracking-tight text-white">
          System Handshake Diagnostic
        </h1>
        <p className="text-[11px] text-[#444] mt-1">{now}</p>
      </div>

      <div className="border border-[#1a1a1a] rounded p-5 flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] tracking-[0.25em] text-[#555] uppercase mb-2">
            01 / Client Engine
          </p>
          <p className="text-sm text-[#888] leading-relaxed">
            Next.js 14 App Router<br />localhost:3000
          </p>
        </div>
        <div className="flex items-center gap-2 mt-1 flex-shrink-0">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-medium text-emerald-400 tracking-widest">RUNNING</span>
        </div>
      </div>

      <div className="border border-[#1a1a1a] rounded p-5 flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] tracking-[0.25em] text-[#555] uppercase mb-2">
            02 / Backend Server Engine
          </p>
          <p className="text-sm text-[#888] leading-relaxed">
            FastAPI + Uvicorn<br />localhost:8000
          </p>
          {fetchState === 'success' && data && (
            <p className="text-[11px] text-[#444] mt-3 max-w-xs leading-relaxed">{data.message}</p>
          )}
          {fetchState === 'error' && (
            <p className="text-[11px] text-red-900 mt-3">Could not reach backend. Is Uvicorn running?</p>
          )}
        </div>
        <div className="flex items-center gap-2 mt-1 flex-shrink-0">
          {fetchState === 'loading' && (
            <><span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" /><span className="text-xs font-medium text-yellow-500 tracking-widest">CHECKING</span></>
          )}
          {fetchState === 'success' && (
            <><span className="w-2 h-2 rounded-full bg-emerald-400" /><span className="text-xs font-medium text-emerald-400 tracking-widest">CONNECTED</span></>
          )}
          {fetchState === 'error' && (
            <><span className="w-2 h-2 rounded-full bg-red-500" /><span className="text-xs font-medium text-red-500 tracking-widest">OFFLINE</span></>
          )}
        </div>
      </div>

      <div className="border border-[#1a1a1a] rounded p-5 flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] tracking-[0.25em] text-[#555] uppercase mb-2">
            03 / Railway Database Network
          </p>
          <p className="text-sm text-[#888] leading-relaxed">
            PostgreSQL<br />Railway cloud instance
          </p>
        </div>
        <div className="flex items-center gap-2 mt-1 flex-shrink-0">
          {fetchState === 'loading' && (
            <><span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" /><span className="text-xs font-medium text-yellow-500 tracking-widest">CHECKING</span></>
          )}
          {fetchState === 'success' && data?.database_connected && (
            <><span className="w-2 h-2 rounded-full bg-emerald-400" /><span className="text-xs font-medium text-emerald-400 tracking-widest">READY</span></>
          )}
          {(fetchState === 'error' || (fetchState === 'success' && !data?.database_connected)) && (
            <><span className="w-2 h-2 rounded-full bg-red-500" /><span className="text-xs font-medium text-red-500 tracking-widest">DISCONNECTED</span></>
          )}
        </div>
      </div>

      <p className="text-[10px] text-[#333] tracking-widest text-center pt-2">
        MIGRANTSHIELD — PHASE 1 SCAFFOLD — ALL SYSTEMS NOMINAL
      </p>
    </main>
  );
}
