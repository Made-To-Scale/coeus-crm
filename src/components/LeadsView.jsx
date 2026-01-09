import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { ExternalLink, Mail, Phone, MapPin, Star, TrendingUp, Activity, Plus, Save, Trash2, CheckCircle2, MessageSquare, Users, X, Send, Globe } from 'lucide-react'

// Exported for reuse (e.g. in PipelineView)
export function LeadDetailModal({ lead, onClose, onUpdate }) {
    const [extraContacts, setExtraContacts] = useState([])
    const [channels, setChannels] = useState([])
    const [loadingData, setLoadingData] = useState(false)
    const [verification, setVerification] = useState(null)
    const [pipelineStage, setPipelineStage] = useState(lead.pipeline_stage || 'new')
    const [internalNotes, setInternalNotes] = useState(lead.internal_notes || '')
    const [saving, setSaving] = useState(false)
    const [showContactForm, setShowContactForm] = useState(false)
    const [newContact, setNewContact] = useState({ name: '', role: '', email: '' })

    // Outreach State
    const [campaigns, setCampaigns] = useState([])
    const [enrollment, setEnrollment] = useState(null)
    const [selectedCampaign, setSelectedCampaign] = useState('')
    const [enrolling, setEnrolling] = useState(false)
    const [events, setEvents] = useState([])

    const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000'

    useEffect(() => {
        if (lead && lead.id) {
            fetchExtraData()
            fetchCampaigns()
            fetchEnrollment()
            fetchEvents()
        }
    }, [lead])

    async function fetchExtraData() {
        try {
            setLoadingData(true)
            const { data: contactsData } = await supabase.from('contacts').select('*').eq('lead_id', lead.id)
            const { data: channelsData } = await supabase.from('lead_channels').select('*').eq('lead_id', lead.id)

            if (lead.email) {
                const { data: verifData } = await supabase.from('email_verifications').select('*').eq('email', lead.email).single()
                setVerification(verifData)
            }

            setExtraContacts(contactsData || [])
            setChannels(channelsData || [])
        } catch (err) {
            console.error('Error fetching extra lead data:', err)
        } finally {
            setLoadingData(false)
        }
    }

    async function handleUpdateStage(newStage) {
        setPipelineStage(newStage)
        const { error } = await supabase.from('leads').update({ pipeline_stage: newStage }).eq('id', lead.id)
        if (!error) onUpdate({ id: lead.id, pipeline_stage: newStage })
    }

    async function handleSaveNotes() {
        setSaving(true)
        const { error } = await supabase.from('leads').update({ internal_notes: internalNotes }).eq('id', lead.id)
        if (!error) onUpdate({ id: lead.id, internal_notes: internalNotes })
        setSaving(false)
    }

    async function handleAddContact(e) {
        e.preventDefault()
        if (!newContact.name || !newContact.email) return
        const { data, error } = await supabase.from('contacts').insert([{ ...newContact, lead_id: lead.id, source: 'manual' }]).select()
        if (!error && data) {
            setExtraContacts([data[0], ...extraContacts])
            setNewContact({ name: '', role: '', email: '' })
            setShowContactForm(false)
        }
    }

    async function handleDeleteContact(id) {
        const { error } = await supabase.from('contacts').delete().eq('id', id)
        if (!error) setExtraContacts(extraContacts.filter(c => c.id !== id))
    }

    // Fetch Campaigns
    async function fetchCampaigns() {
        try {
            const res = await fetch(`${API_URL}/api/campaigns`)
            if (res.ok) {
                const data = await res.json()
                setCampaigns(data)
                if (data.length > 0 && !selectedCampaign) {
                    setSelectedCampaign(data[0].id)
                }
            }
        } catch (err) {
            console.error('Failed to fetch campaigns:', err)
        }
    }

    // Fetch Enrollment Status
    async function fetchEnrollment() {
        try {
            const res = await fetch(`${API_URL}/api/leads/${lead.id}/enrollment`)
            if (res.ok) {
                const data = await res.json()
                setEnrollment(data[0] || null)
            }
        } catch (err) {
            console.error('Failed to fetch enrollment:', err)
        }
    }

    // Fetch Events
    async function fetchEvents() {
        try {
            const { data } = await supabase
                .from('comm_events')
                .select('*')
                .eq('lead_id', lead.id)
                .order('occurred_at', { ascending: false })
            setEvents(data || [])
        } catch (err) {
            console.error('Failed to fetch events:', err)
        }
    }

    // Enroll Lead
    async function handleEnroll() {
        if (!selectedCampaign) return
        setEnrolling(true)
        try {
            const variables = {
                icebreaker: lead.meta?.personalization?.icebreaker || '',
                contexto_1_linea: lead.meta?.personalization?.contexto_1_linea || '',
                observacion_1linea: lead.meta?.personalization?.observacion_1linea || '',
                categoria: lead.meta?.personalization?.categoria || ''
            }

            const res = await fetch(`${API_URL}/api/campaigns/${selectedCampaign}/enroll`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ lead_id: lead.id, variables })
            })

            if (res.ok) {
                const data = await res.json()
                setEnrollment(data)
                fetchEvents() // Refresh events
            }
        } catch (err) {
            console.error('Failed to enroll:', err)
        } finally {
            setEnrolling(false)
        }
    }

    // Pause/Resume
    async function handlePause() {
        if (!enrollment) return
        try {
            await fetch(`${API_URL}/api/enrollments/${enrollment.id}/pause`, { method: 'POST' })
            fetchEnrollment()
        } catch (err) {
            console.error('Failed to pause:', err)
        }
    }

    async function handleResume() {
        if (!enrollment) return
        try {
            await fetch(`${API_URL}/api/enrollments/${enrollment.id}/resume`, { method: 'POST' })
            fetchEnrollment()
        } catch (err) {
            console.error('Failed to resume:', err)
        }
    }

    return (
        <div className="fixed inset-0 z-50 overflow-hidden" role="dialog" aria-modal="true">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={onClose}></div>

            {/* Slide-over Panel */}
            <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
                <div className="pointer-events-auto w-screen max-w-2xl transform transition ease-in-out duration-500 sm:duration-700 translate-x-0 bg-white shadow-2xl flex flex-col h-full animate-in slide-in-from-right">

                    {/* Header: Solid & Professional */}
                    <div className="px-6 py-6 bg-white border-b border-slate-100 flex items-start justify-between shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] z-10">
                        <div className="flex items-start gap-4">
                            <div className={`p-3 rounded-xl shadow-sm ${lead.lead_tier === 'GOLD' ? 'bg-amber-100 text-amber-600' :
                                lead.lead_tier === 'SILVER' ? 'bg-slate-100 text-slate-600' :
                                    lead.lead_tier === 'WHATSAPP' ? 'bg-emerald-100 text-emerald-600' :
                                        lead.lead_tier === 'COLDCALL' ? 'bg-blue-100 text-blue-600' : 'bg-slate-50 text-slate-400'}`}>
                                <Star size={24} fill={(lead.lead_tier === 'GOLD' || lead.lead_tier === 'SILVER') ? "currentColor" : "none"} />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-slate-900 leading-snug">{lead.business_name}</h2>
                                <span className="text-sm text-slate-500 flex items-center gap-1">
                                    <MapPin size={12} /> {lead.city || 'Unknown City'}
                                </span>
                                {(lead.search_query || lead.meta?.categoria || lead.business_type) && (
                                    <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-bold uppercase tracking-tight">
                                        {lead.search_query || lead.meta?.categoria || lead.business_type}
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            {/* Pipeline Stage Selector */}
                            <select
                                value={pipelineStage}
                                onChange={(e) => handleUpdateStage(e.target.value)}
                                className={`text-xs font-bold px-3 py-1.5 rounded-lg border outline-none cursor-pointer transition-colors uppercase tracking-tight appearance-none text-center
                                    ${pipelineStage === 'interested' ? 'bg-green-100 text-green-700 border-green-200' :
                                        pipelineStage === 'contacted' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                                            'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}
                            >
                                <option value="new">New</option>
                                <option value="enriching">Enriching</option>
                                <option value="ready">Ready</option>
                                <option value="contacted">Contacted</option>
                                <option value="interested">Interested</option>
                                <option value="rejected">Rejected</option>
                                <option value="discarded">Discarded</option>
                            </select>

                            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-colors">
                                <X size={24} />
                            </button>
                        </div>
                    </div>

                    {/* Scrollable Content */}
                    <div className="flex-1 overflow-y-auto bg-slate-50/50 p-6 space-y-6">

                        {/* Standalone Website Section */}
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="bg-slate-50 px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Official Website</span>
                                {lead.meta?.is_social_web && <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-black">SOCIAL LINK</span>}
                            </div>
                            <div className="p-4">
                                {lead.website ? (
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center"><Globe size={20} /></div>
                                            <div>
                                                <a href={lead.website} target="_blank" rel="noreferrer" className="text-sm font-bold text-indigo-600 hover:underline">
                                                    {lead.website.replace('https://', '').replace('www.', '').split('/')[0]}
                                                </a>
                                                <div className="text-[10px] text-slate-400 font-medium">{lead.website}</div>
                                            </div>
                                        </div>
                                        <a href={lead.website} target="_blank" rel="noreferrer" className="p-2 bg-slate-50 text-slate-500 rounded-lg hover:bg-slate-100">
                                            <ExternalLink size={16} />
                                        </a>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-3 opacity-60">
                                        <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center italic font-bold">?</div>
                                        <div className="text-sm font-bold text-slate-400 italic">No business website found for this lead.</div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Outreach Panel */}
                        {lead.email && (
                            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-4 py-3 flex items-center gap-2">
                                    <Send size={16} className="text-white" />
                                    <span className="text-sm font-bold text-white uppercase tracking-wider">Outreach Control</span>
                                </div>

                                <div className="p-5 space-y-4">
                                    {!enrollment ? (
                                        <>
                                            <div>
                                                <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Select Campaign</label>
                                                <select
                                                    value={selectedCampaign}
                                                    onChange={(e) => setSelectedCampaign(e.target.value)}
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                                                >
                                                    {campaigns.map(c => (
                                                        <option key={c.id} value={c.id}>{c.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <button
                                                onClick={handleEnroll}
                                                disabled={enrolling || !selectedCampaign}
                                                className="w-full bg-blue-600 text-white px-4 py-3 rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                            >
                                                <Send size={16} /> {enrolling ? 'Enrolling...' : 'Enroll in Campaign'}
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <div className="text-xs text-slate-400 font-bold uppercase">Campaign</div>
                                                    <div className="text-sm font-bold text-slate-900">{enrollment.instantly_campaigns?.name || 'Unknown'}</div>
                                                </div>
                                                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${enrollment.status === 'active' ? 'bg-green-100 text-green-700' :
                                                    enrollment.status === 'paused' ? 'bg-amber-100 text-amber-700' :
                                                        enrollment.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                                                            'bg-slate-100 text-slate-600'
                                                    }`}>
                                                    {enrollment.status}
                                                </span>
                                            </div>

                                            <div className="grid grid-cols-2 gap-2">
                                                <div className="bg-slate-50 p-3 rounded-lg">
                                                    <div className="text-[10px] text-slate-400 font-bold uppercase">Step</div>
                                                    <div className="text-lg font-black text-slate-900">{enrollment.current_step || 1}</div>
                                                </div>
                                                <div className="bg-slate-50 p-3 rounded-lg">
                                                    <div className="text-[10px] text-slate-400 font-bold uppercase">Last Event</div>
                                                    <div className="text-xs font-bold text-slate-700 capitalize">{enrollment.last_event_type || 'None'}</div>
                                                </div>
                                            </div>

                                            <div className="flex gap-2">
                                                {enrollment.status === 'active' ? (
                                                    <button onClick={handlePause} className="flex-1 bg-amber-100 text-amber-700 px-4 py-2 rounded-lg text-xs font-bold hover:bg-amber-200 transition-colors">Pause</button>
                                                ) : (
                                                    <button onClick={handleResume} className="flex-1 bg-green-100 text-green-700 px-4 py-2 rounded-lg text-xs font-bold hover:bg-green-200 transition-colors">Resume</button>
                                                )}
                                            </div>

                                            {/* Event Timeline */}
                                            {events.length > 0 && (
                                                <div className="border-t border-slate-100 pt-4 mt-4">
                                                    <div className="text-xs font-bold text-slate-400 uppercase mb-3">Event Timeline</div>
                                                    <div className="space-y-2 max-h-40 overflow-y-auto">
                                                        {events.slice(0, 5).map((event, idx) => (
                                                            <div key={idx} className="flex items-center gap-3 text-xs">
                                                                <div className={`w-2 h-2 rounded-full ${event.event_type === 'sent' ? 'bg-blue-500' :
                                                                    event.event_type === 'opened' ? 'bg-purple-500' :
                                                                        event.event_type === 'clicked' ? 'bg-cyan-500' :
                                                                            event.event_type === 'replied' ? 'bg-green-500' :
                                                                                'bg-slate-400'
                                                                    }`}></div>
                                                                <span className="font-bold text-slate-700 capitalize">{event.event_type}</span>
                                                                <span className="text-slate-400 ml-auto">{new Date(event.occurred_at).toLocaleDateString()}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Top Stats Row */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="bg-slate-50 p-2 rounded-lg text-slate-500"><TrendingUp size={18} /></div>
                                    <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">Scoring Breakdown</div>
                                </div>
                                <div className="space-y-1.5">
                                    {(lead.score_detail?.reasons || []).map((r, i) => (
                                        <div key={i} className="flex justify-between text-[11px]">
                                            <span className="text-slate-500">{r.reason}</span>
                                            <span className="font-bold text-slate-700">+{r.points}</span>
                                        </div>
                                    ))}
                                    <div className="border-t border-slate-50 pt-1.5 mt-1.5 flex justify-between">
                                        <span className="text-[11px] font-bold text-slate-900">TOTAL SCORE</span>
                                        <span className="text-sm font-black text-blue-600">{lead.lead_score || 0}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="bg-slate-50 p-2 rounded-lg text-slate-500"><Activity size={18} /></div>
                                    <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">Outreach Step</div>
                                </div>
                                <div>
                                    <div className="text-2xl font-black text-slate-900">{enrollment?.current_step || '0'}</div>
                                    <div className={`text-[10px] font-bold uppercase ${enrollment?.status === 'active' ? 'text-green-600' : 'text-slate-400'}`}>
                                        {enrollment?.status || 'NOT ENROLLED'}
                                    </div>
                                </div>
                                {lead.reviews_count > 0 && (
                                    <div className="mt-2 text-[10px] text-slate-400 flex items-center gap-1">
                                        <Star size={10} className="fill-amber-400 text-amber-400" />
                                        {lead.rating} ({lead.reviews_count} reseñas)
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* AI Intelligence Block */}
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="bg-slate-50/80 px-4 py-3 border-b border-slate-100 flex items-center gap-2">
                                <Star size={14} className="text-indigo-500 fill-indigo-500" />
                                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">AI Intelligence</span>
                            </div>
                            <div className="p-5">
                                <p className="text-slate-600 text-sm leading-relaxed mb-4">
                                    {lead.personalization_summary || lead.meta?.ai_summary_deep || "Currently analyzing business footprint..."}
                                </p>
                                {(lead.meta?.personalization || lead.meta?.contexto_personalizado) && (
                                    <div className="grid grid-cols-1 gap-2 text-xs">
                                        {(lead.meta.contexto_personalizado || lead.meta.personalization?.contexto_1_linea) && (
                                            <div className="bg-blue-50/50 p-2 rounded border border-blue-50">
                                                <strong className="text-blue-700 italic">Research:</strong> {lead.meta.contexto_personalizado || lead.meta.personalization.contexto_1_linea}
                                            </div>
                                        )}
                                        {(lead.meta.observacion_followup || lead.meta.personalization?.observacion_1linea) && (
                                            <div className="bg-indigo-50/50 p-2 rounded border border-indigo-50">
                                                <strong className="text-indigo-700 italic">Follow-up:</strong> {lead.meta.observacion_followup || lead.meta.personalization.observacion_1linea}
                                            </div>
                                        )}
                                        {(lead.icebreaker || lead.meta.personalization?.icebreaker) && (
                                            <div className="bg-emerald-50/50 p-2 rounded border border-emerald-50">
                                                <strong className="text-emerald-700 italic">Icebreaker:</strong> {lead.icebreaker || lead.meta.personalization.icebreaker}
                                            </div>
                                        )}
                                        {(lead.meta.categoria || lead.meta.personalization?.categoria) && (
                                            <div className="bg-slate-100 p-2 rounded border border-slate-200 w-fit">
                                                <strong className="text-slate-700 uppercase">Sector:</strong> {lead.meta.categoria || lead.meta.personalization.categoria}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Contacts Section */}
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <h3 className="text-sm font-bold text-slate-900">Decision Makers & Channels</h3>
                                <button onClick={() => setShowContactForm(!showContactForm)} className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1"><Plus size={12} /> Add</button>
                            </div>

                            {showContactForm && (
                                <form onSubmit={handleAddContact} className="bg-white p-4 rounded-xl border border-indigo-100 shadow-sm space-y-3">
                                    <input value={newContact.name} onChange={e => setNewContact({ ...newContact, name: e.target.value })} placeholder="Name" className="w-full text-sm border rounded p-2" />
                                    <input value={newContact.role} onChange={e => setNewContact({ ...newContact, role: e.target.value })} placeholder="Role" className="w-full text-sm border rounded p-2" />
                                    <input value={newContact.email} onChange={e => setNewContact({ ...newContact, email: e.target.value })} placeholder="Email" className="w-full text-sm border rounded p-2" />
                                    <div className="flex justify-end gap-2">
                                        <button type="button" onClick={() => setShowContactForm(false)} className="text-xs font-bold text-slate-400">Cancel</button>
                                        <button type="submit" className="text-xs font-bold bg-indigo-600 text-white px-3 py-1.5 rounded">Save</button>
                                    </div>
                                </form>
                            )}

                            <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-50">
                                {channels.map((ch, idx) => (
                                    <div key={idx} className="p-3 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${ch.type === 'email' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                                {ch.type === 'email' ? <Mail size={14} /> : <Phone size={14} />}
                                            </div>
                                            <div>
                                                <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                                    {ch.value}
                                                    {ch.is_primary && <span className="text-[8px] bg-slate-100 text-slate-500 px-1 py-0.5 rounded">PRIMARY</span>}
                                                </div>
                                                <div className="text-[10px] text-slate-500 uppercase font-medium">
                                                    {ch.meta?.phone_type || ch.type} {ch.meta?.whatsapp_likely ? '• WHATSAPP' : ''}
                                                </div>
                                            </div>
                                        </div>
                                        {ch.type === 'email' && verification && ch.value === lead.email && (
                                            <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase ${verification.status === 'deliverable' ? 'bg-green-100 text-green-700' : 'bg-red-50 text-red-500'}`}>
                                                {verification.status}
                                            </span>
                                        )}
                                    </div>
                                ))}

                                {extraContacts.length > 0 && (
                                    <div className="p-3 bg-slate-50/50 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Team Members</div>
                                )}

                                {extraContacts.map(c => (
                                    <div key={c.id} className="p-3 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs">{c.name.charAt(0)}</div>
                                            <div>
                                                <div className="text-sm font-bold text-slate-900">{c.name}</div>
                                                <div className="text-[10px] text-slate-500">{c.role} • {c.email}</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {c.verified && <CheckCircle2 size={12} className="text-green-500" />}
                                            <span className="text-[10px] bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded uppercase">{c.source}</span>
                                            <button onClick={() => handleDeleteContact(c.id)} className="text-slate-300 hover:text-red-500"><Trash2 size={12} /></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Internal Notes */}
                        <div className="space-y-2">
                            <h3 className="text-sm font-bold text-slate-900">Internal Notes</h3>
                            <textarea
                                value={internalNotes}
                                onChange={e => setInternalNotes(e.target.value)}
                                className="w-full h-24 text-sm p-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                placeholder="Add notes here..."
                            ></textarea>
                            <div className="flex justify-end">
                                <button onClick={handleSaveNotes} disabled={saving} className="text-xs font-bold bg-slate-900 text-white px-3 py-2 rounded-lg">{saving ? 'Saving...' : 'Save Note'}</button>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    )
}

export default function LeadsView({ filterTier: propTier }) {
    const [leads, setLeads] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [selectedLead, setSelectedLead] = useState(null)
    const [runs, setRuns] = useState([])

    // Filter states
    const [filterTier, setFilterTier] = useState(propTier || 'ALL')
    const [filterSearch, setFilterSearch] = useState('ALL')
    const [filterCity, setFilterCity] = useState('ALL')
    const [filterStage, setFilterStage] = useState('active')

    useEffect(() => {
        if (propTier) setFilterTier(propTier)
    }, [propTier])

    useEffect(() => {
        fetchLeads()
        fetchRuns()
    }, [])

    async function fetchLeads() {
        try {
            setLoading(true)
            const { data, error } = await supabase.from('leads').select('*').order('created_at', { ascending: false })
            if (error) throw error
            setLeads(data || [])
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    async function fetchRuns() {
        const { data } = await supabase.from('scrape_runs').select('*').order('created_at', { ascending: false })
        setRuns(data || [])
    }

    const uniqueSearches = ['ALL', ...new Set(leads.map(l => l.search_query).filter(Boolean))]
    const uniqueCities = ['ALL', ...new Set(leads.map(l => l.city).filter(Boolean))]

    // Filter Logic
    const filteredLeads = leads.filter(l => {
        const matchTier = filterTier === 'ALL' || l.lead_tier === filterTier
        const matchSearch = filterSearch === 'ALL' || l.search_query === filterSearch
        const matchCity = filterCity === 'ALL' || l.city === filterCity

        // Stage/Discard Logic
        let matchStage = true
        if (filterStage === 'discarded') {
            matchStage = l.pipeline_stage === 'discarded' || l.routing_status === 'DISCARDED'
        } else {
            matchStage = l.pipeline_stage !== 'discarded' && l.routing_status !== 'DISCARDED'
        }

        return matchTier && matchSearch && matchCity && matchStage
    })

    if (loading) return <div className="p-8 text-center text-slate-400">Loading leads database...</div>

    return (
        <div className="p-6 max-w-[1600px] mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">Leads Database</h1>
                    <div className="text-sm text-slate-500 font-medium mt-1">
                        Managing <span className="text-slate-900 font-bold">{filteredLeads.length}</span> businesses
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm">
                    {/* View Switcher (Active / Trash) */}
                    <div className="flex bg-slate-100 rounded-lg p-1 mr-2">
                        <button
                            onClick={() => setFilterStage('active')}
                            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${filterStage === 'active' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Active
                        </button>
                        <button
                            onClick={() => setFilterStage('discarded')}
                            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${filterStage === 'discarded' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Trash ({leads.filter(l => l.pipeline_stage === 'discarded' || l.routing_status === 'DISCARDED').length})
                        </button>
                    </div>

                    <div className="h-6 w-px bg-slate-200 mx-1"></div>

                    {/* Tier Filter */}
                    <select value={filterTier} onChange={(e) => setFilterTier(e.target.value)} className="bg-transparent text-sm font-bold text-slate-600 outline-none cursor-pointer hover:bg-slate-50 rounded px-2 py-1">
                        <option value="ALL">All Tiers</option>
                        <option value="GOLD">🏆 GOLD</option>
                        <option value="SILVER">🥈 SILVER</option>
                        <option value="WHATSAPP">🟢 WHATSAPP</option>
                        <option value="COLDCALL">📞 COLDCALL</option>
                        <option value="TRASH">🗑️ TRASH</option>
                    </select>

                    {/* City Filter */}
                    <select value={filterCity} onChange={(e) => setFilterCity(e.target.value)} className="bg-transparent text-sm font-bold text-slate-600 outline-none cursor-pointer hover:bg-slate-50 rounded px-2 py-1 max-w-[120px] truncate">
                        <option value="ALL">All Cities</option>
                        {uniqueCities.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>

                    <div className="h-6 w-px bg-slate-200 mx-1"></div>

                    {/* Search Filter */}
                    <select value={filterSearch} onChange={(e) => setFilterSearch(e.target.value)} className="bg-transparent text-sm font-bold text-slate-600 outline-none cursor-pointer hover:bg-slate-50 rounded px-2 py-1 max-w-[150px] truncate">
                        <option value="ALL">All Categories</option>
                        {uniqueSearches.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
            </div>

            <div className="bg-white shadow-sm rounded-2xl border border-slate-200 overflow-hidden">
                <table className="min-w-full divide-y divide-slate-100">
                    <thead className="bg-slate-50/50">
                        <tr>
                            <th className="px-6 py-4 text-left text-[11px] font-black text-slate-400 uppercase tracking-wider">Business</th>
                            <th className="px-6 py-4 text-left text-[11px] font-black text-slate-400 uppercase tracking-wider">Category / City</th>
                            <th className="px-6 py-4 text-center text-[11px] font-black text-slate-400 uppercase tracking-wider">Tier</th>
                            <th className="px-6 py-4 text-left text-[11px] font-black text-slate-400 uppercase tracking-wider">Email</th>
                            <th className="px-6 py-4 text-left text-[11px] font-black text-slate-400 uppercase tracking-wider">Phone</th>
                            <th className="px-6 py-4 text-right text-[11px] font-black text-slate-400 uppercase tracking-wider">Score</th>
                            <th className="px-6 py-4 text-center text-[11px] font-black text-slate-400 uppercase tracking-wider">Stage</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {filteredLeads.map(lead => (
                            <tr key={lead.id} onClick={() => setSelectedLead(lead)} className="hover:bg-slate-50/80 cursor-pointer group transition-colors">
                                <td className="px-6 py-4">
                                    <div className="font-bold text-slate-900 text-sm group-hover:text-blue-600 transition-colors">{lead.business_name}</div>
                                    <div className="text-[10px] text-slate-500 font-medium mt-0.5 flex items-center gap-1.5 uppercase truncate max-w-[200px]">
                                        {lead.website ? lead.website.replace('https://', '').replace('www.', '').split('/')[0] : 'No Website'}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="text-[10px] font-extrabold text-slate-600 uppercase truncate max-w-[150px]">{lead.search_query || '-'}</div>
                                    <div className="text-[9px] text-slate-400 font-bold uppercase truncate max-w-[150px]">{lead.city || '-'}</div>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    {lead.lead_tier ? (
                                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wide border ${lead.lead_tier === 'GOLD' ? 'bg-amber-100 text-amber-600 border-amber-200' :
                                            lead.lead_tier === 'SILVER' ? 'bg-slate-100 text-slate-600 border-slate-200' :
                                                lead.lead_tier === 'WHATSAPP' ? 'bg-emerald-100 text-emerald-600 border-emerald-200' :
                                                    lead.lead_tier === 'COLDCALL' ? 'bg-blue-100 text-blue-600 border-blue-200' :
                                                        'bg-slate-50 text-slate-400 border-slate-100'
                                            }`}>
                                            {(lead.lead_tier === 'GOLD' || lead.lead_tier === 'SILVER') && <Star size={10} fill="currentColor" />}
                                            {lead.lead_tier}
                                        </span>
                                    ) : <span className="text-slate-300">-</span>}
                                </td>
                                <td className="px-6 py-4">
                                    <div className="text-sm font-medium text-slate-600 truncate max-w-[150px]">{lead.email || '-'}</div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="text-sm font-medium text-slate-600">{lead.phone_number || '-'}</div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <span className="font-black text-slate-700">{lead.lead_score || 0}</span>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${lead.pipeline_stage === 'ready' ? 'bg-green-50 text-green-600 border-green-100' :
                                        lead.pipeline_stage === 'enriching' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                            lead.pipeline_stage === 'discarded' ? 'bg-red-50 text-red-600 border-red-100' :
                                                'bg-slate-50 text-slate-500 border-slate-100'
                                        }`}>
                                        {lead.pipeline_stage || 'NEW'}
                                    </span>
                                </td>
                            </tr>
                        ))}
                        {filteredLeads.length === 0 && (
                            <tr>
                                <td colSpan="7" className="px-6 py-12 text-center text-slate-400 text-sm font-medium">
                                    No leads found in this view.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {selectedLead && (
                <LeadDetailModal
                    lead={selectedLead}
                    onClose={() => setSelectedLead(null)}
                    onUpdate={(updated) => {
                        setLeads(prev => prev.map(l => l.id === updated.id ? { ...l, ...updated } : l))
                        setSelectedLead(curr => ({ ...curr, ...updated }))
                    }}
                />
            )}
        </div>
    )
}
