'use client'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

const GIORNI = ['Domenica','Lunedì','Martedì','Mercoledì','Giovedì','Venerdì','Sabato']
const MESI = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre']
const DOW = ['L','M','M','G','V','S','D']
const MAX = 20
const USER_ID = 'user_default' // senza login, ID fisso per ora

type Nota = { id: string; note_text: string; reminder: string | null; date_key: string }

function dateKey(d: Date) { return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}` }
function fmtDt(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('it-IT',{weekday:'short',day:'2-digit',month:'short'})+' · '+d.toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'})
}
function pad(n: number) { return String(n).padStart(2,'0') }

export default function Home() {
  const today = new Date(); today.setHours(0,0,0,0)
  const [current, setCurrent] = useState(new Date(today))
  const [calMonth, setCalMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1))
  const [notes, setNotes] = useState<{[k:string]: Nota[]}>({})
  const [showCal, setShowCal] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [nuovaNota, setNuovaNota] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [remNota, setRemNota] = useState<Nota|null>(null)
  const [remDatetime, setRemDatetime] = useState('')
  const [loading, setLoading] = useState(false)
  const [notif, setNotif] = useState('')

  const showNotif = (msg: string) => { setNotif(msg); setTimeout(()=>setNotif(''), 5000) }

  const loadNotes = useCallback(async () => {
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', USER_ID)
      .order('created_at', { ascending: true })
    if (error) { showNotif('Errore caricamento note'); return }
    const grouped: {[k:string]: Nota[]} = {}
    data?.forEach(n => {
      if (!grouped[n.date_key]) grouped[n.date_key] = []
      grouped[n.date_key].push(n)
    })
    setNotes(grouped)
  }, [])

  useEffect(() => { loadNotes() }, [loadNotes])

  // Controlla promemoria
  useEffect(() => {
    const check = setInterval(() => {
      const now = new Date()
      Object.values(notes).flat().forEach(n => {
        if (!n.reminder) return
        const t = new Date(n.reminder)
        if (Math.abs(t.getTime() - now.getTime()) < 30000) {
          showNotif('⏰ Promemoria: ' + n.note_text.slice(0,60))
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('📒 Agenda – Promemoria', { body: n.note_text })
          }
          if (navigator.vibrate) navigator.vibrate([200,100,200])
        }
      })
    }, 15000)
    return () => clearInterval(check)
  }, [notes])

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  async function aggiungiNota() {
    const k = dateKey(current)
    const lista = notes[k] || []
    if (lista.length >= MAX) return
    const testo = nuovaNota.trim()
    if (!testo) return
    setLoading(true)
    const { error } = await supabase.from('notes').insert({
      user_id: USER_ID, date_key: k, note_text: testo, reminder: null
    })
    if (error) { showNotif('Errore salvataggio'); setLoading(false); return }
    setNuovaNota('')
    await loadNotes()
    setLoading(false)
  }

  async function eliminaNota(id: string) {
    await supabase.from('notes').delete().eq('id', id)
    await loadNotes()
  }

  async function salvaPromemoria() {
    if (!remNota || !remDatetime) return
    const dataOra = new Date(remDatetime)
    if (dataOra <= new Date()) { showNotif('Scegli una data nel futuro'); return }
    const { error } = await supabase.from('notes').update({ reminder: dataOra.toISOString() }).eq('id', remNota.id)
    if (error) { showNotif('Errore salvataggio promemoria'); return }
    await loadNotes()
    setModalOpen(false)
    showNotif('✅ Promemoria impostato per ' + fmtDt(dataOra.toISOString()))
    if (navigator.vibrate) navigator.vibrate(100)
  }

  function apriPromemoria(nota: Nota) {
    setRemNota(nota)
    const d = nota.reminder ? new Date(nota.reminder) : new Date(Date.now() + 30*60000)
    setRemDatetime(`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`)
    setModalOpen(true)
  }

  function navigaGiorno(delta: number) {
    const d = new Date(current); d.setDate(d.getDate() + delta)
    setCurrent(d); setCalMonth(new Date(d.getFullYear(), d.getMonth(), 1))
    setShowCal(false); setShowMenu(false)
  }

  function goTo(y: number, m: number, d: number) {
    setCurrent(new Date(y,m,d)); setCalMonth(new Date(y,m,1))
    setShowCal(false); setShowMenu(false)
  }

  function renderCal() {
    const y = calMonth.getFullYear(), m = calMonth.getMonth()
    const first = new Date(y,m,1)
    let sd = first.getDay(); if (sd===0) sd=7
    const dim = new Date(y,m+1,0).getDate()
    const pd = new Date(y,m,0).getDate()
    const cells = []
    DOW.forEach((d,i) => cells.push(
      <div key={`dow${i}`} className="text-center text-xs text-[#888780] py-1">{d}</div>
    ))
    for (let i=sd-1;i>0;i--) cells.push(
      <div key={`p${i}`} className="text-center text-xs text-[#c8bfa0] py-1">{pd-i+1}</div>
    )
    for (let d=1;d<=dim;d++) {
      const k = dateKey(new Date(y,m,d))
      const isT = k===dateKey(today), isSel = k===dateKey(current), hn = !!(notes[k]?.length)
      cells.push(
        <div key={`d${d}`} className="flex flex-col items-center py-1 cursor-pointer" onClick={()=>goTo(y,m,d)}>
          <div className={`w-7 h-7 flex items-center justify-center rounded-full text-xs ${isSel?'bg-[#3a5490] text-white':isT?'bg-[#0d1b3e] text-white':'text-[#444441]'}`}>{d}</div>
          {hn && <div className="w-1 h-1 rounded-full bg-[#3a5490] mt-0.5"/>}
        </div>
      )
    }
    const rem = (sd-1+dim)%7; if(rem) for(let d=1;d<=7-rem;d++) cells.push(
      <div key={`n${d}`} className="text-center text-xs text-[#c8bfa0] py-1">{d}</div>
    )
    return cells
  }

  const k = dateKey(current)
  const lista = notes[k] || []
  const isToday = k === dateKey(today)

  return (
    <div className="w-full max-w-[430px] mx-auto h-dvh flex flex-col">

      {/* NOTIFICA */}
      {notif && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-[#faeeda] text-[#633806] text-sm px-4 py-3 flex items-center gap-2 border-b border-[#ef9f27]">
          {notif}
        </div>
      )}

      <div className="bg-[#f5eecc] flex-1 flex flex-col overflow-hidden">

        {/* HEADER */}
        <div className="bg-[#0d1b3e] px-4 py-3 flex items-center gap-2 flex-shrink-0">
          <button onClick={()=>navigaGiorno(-1)} className="p-2 text-white text-2xl leading-none">‹</button>
          <div className="flex-1 text-center">
            <div className="text-[#7a9ac4] text-[11px] uppercase tracking-widest">{GIORNI[current.getDay()]}</div>
            <div className="text-[#f0f4ff] text-4xl font-light leading-tight">{current.getDate()}</div>
            <div className="text-[#7a9ac4] text-xs">{MESI[current.getMonth()]} {current.getFullYear()}{isToday?' · oggi':''}</div>
          </div>
          <button onClick={()=>navigaGiorno(1)} className="p-2 text-white text-2xl leading-none">›</button>
          <div className="relative">
            <button onClick={()=>setShowMenu(!showMenu)} className="p-2 text-white text-xl font-bold leading-none">⋮</button>
            {showMenu && (
              <div className="absolute top-full right-0 mt-1 bg-[#fdfcf4] border border-[#c8b870] rounded-xl overflow-hidden z-20 min-w-[180px] shadow-lg">
                <div className="px-4 py-3 text-sm text-[#1a1a18] border-b border-[#eee8cc] cursor-pointer active:bg-[#ede5aa]" onClick={()=>{setShowCal(!showCal);setShowMenu(false)}}>📅 Vai a una data</div>
                <div className="px-4 py-3 text-sm text-[#1a1a18] cursor-pointer active:bg-[#ede5aa]" onClick={()=>{setCurrent(new Date(today));setCalMonth(new Date(today.getFullYear(),today.getMonth(),1));setShowMenu(false);setShowCal(false)}}>🕐 Torna ad oggi</div>
              </div>
            )}
          </div>
        </div>

        {/* CALENDARIO */}
        {showCal && (
          <div className="bg-[#fdfcf4] border-b border-[#c8b870] px-4 py-3 flex-shrink-0">
            <div className="flex items-center justify-between mb-2">
              <button className="bg-[#0d1b3e] text-white px-3 py-1 rounded-md text-sm" onClick={()=>setCalMonth(new Date(calMonth.getFullYear(),calMonth.getMonth()-1,1))}>‹</button>
              <span className="text-sm font-semibold text-[#1a1a18]">{MESI[calMonth.getMonth()]} {calMonth.getFullYear()}</span>
              <button className="bg-[#0d1b3e] text-white px-3 py-1 rounded-md text-sm" onClick={()=>setCalMonth(new Date(calMonth.getFullYear(),calMonth.getMonth()+1,1))}>›</button>
            </div>
            <div className="grid grid-cols-7 gap-0.5">{renderCal()}</div>
          </div>
        )}

        {/* AREA NOTE A RIGHE */}
        <div className="flex-1 overflow-y-auto lined-bg relative">
          <div className="absolute top-0 bottom-0 left-[46px] w-px bg-[#e8a0a0] opacity-50 pointer-events-none"/>
          <div className="pl-14 pr-3 pt-2 pb-4 min-h-full">
            {lista.length === 0 ? (
              <div className="text-center text-[#b4a96a] text-sm mt-16 leading-relaxed" style={{fontFamily:'Georgia,serif'}}>
                Nessuna nota per questa giornata.<br/>Inizia a scrivere qui sotto.
              </div>
            ) : lista.map((nota, i) => (
              <div key={nota.id} className="flex gap-2 py-2 border-b border-[#c8b870] min-h-[41px]">
                <span className="text-[#c8b870] text-xs min-w-[16px] text-right pt-0.5 flex-shrink-0">{i+1}</span>
                <div className="flex-1">
                  <div className="text-[15px] text-[#1a1a18] leading-snug" style={{fontFamily:'Georgia,serif'}}>{nota.note_text}</div>
                  {nota.reminder && (
                    <div className="inline-flex items-center gap-1 text-xs text-[#854f0b] bg-[#faeeda] px-2 py-0.5 rounded-full mt-1">
                      ⏰ {fmtDt(nota.reminder)}
                    </div>
                  )}
                  <div className="flex gap-1.5 mt-1.5">
                    <button className="bg-[#0d1b3e] text-white text-xs px-2.5 py-1 rounded-md" onClick={()=>apriPromemoria(nota)}>⏰ promemoria</button>
                    <button className="bg-[#7a2020] text-white text-xs px-2.5 py-1 rounded-md" onClick={()=>eliminaNota(nota.id)}>elimina</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* BARRA AGGIUNTA */}
        <div className="bg-[#e8dda0] border-t border-[#c8b870] px-3 py-2.5 flex gap-2 items-end flex-shrink-0">
          <textarea
            className="flex-1 bg-[#fffef5] border border-[#c8b870] rounded-xl px-3 py-2.5 text-sm text-[#1a1a18] resize-none min-h-[42px] max-h-28 outline-none focus:border-[#0d1b3e]"
            placeholder="Scrivi una nota..."
            value={nuovaNota}
            onChange={e=>setNuovaNota(e.target.value)}
            onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();aggiungiNota()}}}
            rows={1}
          />
          <button
            className="bg-[#0d1b3e] text-white rounded-xl px-4 h-[42px] text-sm font-medium flex-shrink-0 disabled:opacity-50"
            onClick={aggiungiNota}
            disabled={loading || lista.length>=MAX}
          >
            {loading ? '...' : 'Aggiungi'}
          </button>
        </div>
        {lista.length >= MAX && <div className="bg-[#e8dda0] text-center text-xs text-[#854f0b] pb-1">Limite di 20 note raggiunto</div>}

      </div>

      {/* MODAL PROMEMORIA */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/45 z-30 flex items-end justify-center">
          <div className="bg-[#fdfcf4] rounded-t-3xl p-6 w-full max-w-[430px] border-t border-[#c8b870]">
            <div className="w-10 h-1 bg-[#c8b870] rounded-full mx-auto mb-4"/>
            <h3 className="text-lg font-semibold text-[#1a1a18] mb-3">Imposta promemoria</h3>
            <div className="bg-[#f0e8b0] rounded-xl p-3 text-center text-[#0d1b3e] font-semibold mb-4">
              {remDatetime ? fmtDt(new Date(remDatetime).toISOString()) : '—'}
            </div>
            <input
              type="datetime-local"
              className="w-full border border-[#c8b870] rounded-xl p-3 text-sm text-[#1a1a18] bg-white mb-4 outline-none focus:border-[#0d1b3e]"
              value={remDatetime}
              onChange={e=>setRemDatetime(e.target.value)}
            />
            <div className="flex gap-2">
              <button className="flex-1 border border-[#c8b870] rounded-xl py-3 text-sm text-[#444441]" onClick={()=>setModalOpen(false)}>Annulla</button>
              <button className="flex-1 bg-[#0d1b3e] text-white rounded-xl py-3 text-sm font-medium" onClick={salvaPromemoria}>Salva</button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
