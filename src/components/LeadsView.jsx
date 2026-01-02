import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { ExternalLink, Mail, Phone, MapPin, Star, TrendingUp } from 'lucide-react'

export default function LeadsView() {
    const [leads, setLeads] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [selectedLead, setSelectedLead] = useState(null)

    useEffect(() => {
        fetchLeads()
    }, [])

    async function fetchLeads() {
        try {
            setLoading(true)
            const { data, error } = await supabase
                .from('leads')
                .select('*')
                .order('created_at', { ascending: false })

            if (error) throw error
            setLeads(data || [])
        } catch (err) {
            console.error('Error fetching leads:', err)
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    if (loading) return <div className="p-6">Loading leads...</div>
    if (error) return <div className="p-6 text-red-600">Error: {error}</div>

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-slate-800">Leads</h1>
                <div className="text-sm text-slate-600">
                    Total: <span className="font-semibold">{leads.length}</span>
                </div>
            </div>

            <div className="bg-white shadow rounded-lg overflow-hidden border border-slate-200">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Business</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Location</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Score/Tier</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Contact</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Rating</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-200">
                            {leads.length === 0 ? (
                                <tr><td colSpan="7" className="px-6 py-4 text-center text-slate-500">No leads found.</td></tr>
                            ) : (
                                leads.map(lead => (
                                    <tr key={lead.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => setSelectedLead(lead)}>
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-medium text-slate-900">{lead.business_name || 'N/A'}</div>
                                            {lead.domain && (
                                                <div className="text-xs text-slate-500">{lead.domain}</div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-slate-900">{lead.city || 'N/A'}</div>
                                            {lead.country && (
                                                <div className="text-xs text-slate-500">{lead.country}</div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                {lead.lead_score && (
                                                    <span className="text-sm font-semibold text-slate-900">{lead.lead_score}</span>
                                                )}
                                                {lead.lead_tier && (
                                                    <span className={`px-2 py-1 text-xs font-medium rounded ${lead.lead_tier === 'A' ? 'bg-green-100 text-green-800' :
                                                        lead.lead_tier === 'B' ? 'bg-blue-100 text-blue-800' :
                                                            'bg-slate-100 text-slate-800'
                                                        }`}>
                                                        Tier {lead.lead_tier}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1">
                                                {lead.email && (
                                                    <div className="flex items-center gap-1 text-xs text-slate-600">
                                                        <Mail size={12} />
                                                        <span className="truncate max-w-[150px]">{lead.email}</span>
                                                    </div>
                                                )}
                                                {lead.phone_number && (
                                                    <div className="flex items-center gap-1 text-xs text-slate-600">
                                                        <Phone size={12} />
                                                        <span>{lead.phone_number}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {lead.routing_status && (
                                                <span className={`px-2 py-1 text-xs font-medium rounded ${lead.routing_status === 'OUTREACH_READY' ? 'bg-green-100 text-green-800' :
                                                    lead.routing_status === 'ENRICH' ? 'bg-yellow-100 text-yellow-800' :
                                                        'bg-slate-100 text-slate-800'
                                                    }`}>
                                                    {lead.routing_status}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            {lead.rating && (
                                                <div className="flex items-center gap-1">
                                                    <Star size={14} className="text-yellow-500 fill-yellow-500" />
                                                    <span className="text-sm font-medium">{lead.rating}</span>
                                                    {lead.reviews_count && (
                                                        <span className="text-xs text-slate-500">({lead.reviews_count})</span>
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    setSelectedLead(lead)
                                                }}
                                                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                                            >
                                                View
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Lead Detail Modal */}
            {selectedLead && (
                <LeadDetailModal lead={selectedLead} onClose={() => setSelectedLead(null)} />
            )}
        </div>
    )
}

function LeadDetailModal({ lead, onClose }) {
    const [channels, setChannels] = useState([])
    const [loadingChannels, setLoadingChannels] = useState(false)

    useEffect(() => {
        if (lead && lead.id) {
            fetchChannels()
        }
    }, [lead])

    async function fetchChannels() {
        try {
            setLoadingChannels(true)
            const { data, error } = await supabase
                .from('lead_channels')
                .select('*')
                .eq('lead_id', lead.id)
                .order('is_primary', { ascending: false })

            if (error) throw error
            setChannels(data || [])
        } catch (err) {
            console.error('Error fetching channels:', err)
        } finally {
            setLoadingChannels(false)
        }
    }

    const renderScoreItem = (label, value) => {
        const isPositive = value.toString().startsWith('+')
        return (
            <div className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0 text-sm">
                <span className="text-slate-600 capitalize">{label.replace('_', ' ')}</span>
                <span className={`font-medium ${isPositive ? 'text-green-600' : 'text-slate-700'}`}>
                    {value}
                </span>
            </div>
        )
    }

    const renderEnrichmentItem = (label, isMissing) => {
        return (
            <div className={`px-3 py-2 rounded-lg border flex items-center gap-2 text-sm ${isMissing
                ? 'bg-red-50 border-red-100 text-red-700'
                : 'bg-green-50 border-green-100 text-green-700'
                }`}>
                <div className={`w-2 h-2 rounded-full ${isMissing ? 'bg-red-400' : 'bg-green-400'}`}></div>
                <span className="capitalize">{label.replace('missing_', '').replace('_', ' ')}</span>
                <span className="ml-auto font-medium">{isMissing ? 'Missing' : 'Found'}</span>
            </div>
        )
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-slate-800">{lead.business_name}</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-6 space-y-8">
                    {/* Score & Status */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Lead Score</div>
                            <div className="text-3xl font-bold text-blue-600">{lead.lead_score || 'N/A'}</div>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Company Tier</div>
                            <div className="flex items-center gap-2">
                                <TrendingUp className="text-slate-400" size={18} />
                                <div className="text-3xl font-bold text-slate-900">Tier {lead.lead_tier || 'N/A'}</div>
                            </div>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Routing Status</div>
                            <div className="inline-flex mt-1">
                                <span className={`px-3 py-1 text-sm font-semibold rounded-full ${lead.routing_status === 'OUTREACH_READY' ? 'bg-green-100 text-green-800' :
                                    lead.routing_status === 'ENRICH' ? 'bg-yellow-100 text-yellow-800' :
                                        'bg-slate-100 text-slate-800'
                                    }`}>
                                    {lead.routing_status || 'N/A'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Contacts Section */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <Phone size={20} className="text-blue-500" />
                                Channels & Contacts
                            </h3>

                            <div className="space-y-3">
                                {/* Primary Contacts from Lead Table */}
                                <div className="p-4 rounded-xl border border-blue-100 bg-blue-50/30 space-y-3">
                                    <div className="text-xs font-bold text-blue-600 uppercase tracking-tight">Primary Contacts</div>
                                    {lead.email && (
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-white rounded-lg shadow-sm">
                                                    <Mail size={16} className="text-blue-500" />
                                                </div>
                                                <a href={`mailto:${lead.email}`} className="text-sm font-medium text-slate-700 hover:text-blue-600">{lead.email}</a>
                                            </div>
                                            <span className="text-[10px] font-bold bg-blue-600 text-white px-1.5 py-0.5 rounded">MAIN</span>
                                        </div>
                                    )}
                                    {lead.phone_number && (
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-white rounded-lg shadow-sm">
                                                    <Phone size={16} className="text-blue-500" />
                                                </div>
                                                <span className="text-sm font-medium text-slate-700">{lead.phone_number}</span>
                                            </div>
                                            <span className="text-[10px] font-bold bg-blue-600 text-white px-1.5 py-0.5 rounded text-center">MAIN {lead.phone_type && `(${lead.phone_type})`}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Additional Contacts from Lead Channels */}
                                {channels.length > 0 && (
                                    <div className="space-y-2">
                                        <div className="text-xs font-bold text-slate-500 uppercase tracking-tight ml-1">Additional Channels</div>
                                        {channels.filter(c => !c.is_primary).map(channel => (
                                            <div key={channel.id} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl hover:border-slate-200 transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-1.5 bg-slate-50 rounded-lg">
                                                        {channel.type === 'email' ? <Mail size={14} className="text-slate-500" /> : <Phone size={14} className="text-slate-500" />}
                                                    </div>
                                                    <span className="text-sm text-slate-600">{channel.value}</span>
                                                </div>
                                                <span className="text-[10px] font-medium text-slate-400 capitalize">{channel.status}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {loadingChannels && <div className="text-center py-4 text-slate-400 text-sm italic">Loading more contacts...</div>}
                            </div>
                        </div>

                        {/* Location and Info */}
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                    <MapPin size={20} className="text-red-500" />
                                    Location
                                </h3>
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                    <div className="text-slate-700 font-medium mb-1">{lead.address || 'No address provided'}</div>
                                    <div className="text-sm text-slate-500">{lead.city}{lead.city && lead.country ? ', ' : ''}{lead.country}</div>
                                    {lead.website && (
                                        <div className="mt-3 pt-3 border-t border-slate-200">
                                            <a href={lead.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-blue-600 font-medium hover:underline">
                                                <ExternalLink size={14} />
                                                {lead.domain || 'Visit Website'}
                                            </a>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Rating */}
                            {lead.rating && (
                                <div>
                                    <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                        <Star size={20} className="text-yellow-500" />
                                        Public Rating
                                    </h3>
                                    <div className="flex items-center gap-3">
                                        <div className="text-4xl font-black text-slate-900">{lead.rating}</div>
                                        <div>
                                            <div className="flex text-yellow-500">
                                                {[...Array(5)].map((_, i) => (
                                                    <Star key={i} size={16} fill={i < Math.floor(lead.rating) ? "currentColor" : "none"} />
                                                ))}
                                            </div>
                                            <div className="text-xs font-medium text-slate-500">Based on {lead.reviews_count || 0} reviews</div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Formatted JSON Sections */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-slate-100">
                        {/* Score Breakdown */}
                        <div>
                            <h3 className="text-lg font-bold text-slate-800 mb-4">Score Breakdown</h3>
                            <div className="bg-white border border-slate-100 rounded-xl overflow-hidden">
                                {lead.score_detail && lead.score_detail.reasons ? (
                                    <div className="p-1">
                                        {Array.isArray(lead.score_detail.reasons)
                                            ? lead.score_detail.reasons.map((reason, idx) => {
                                                const [label, val] = reason.includes(':') ? reason.split(':') : [reason, '']
                                                return renderScoreItem(label, val, idx)
                                            })
                                            : Object.entries(lead.score_detail.reasons).map(([key, val], idx) => renderScoreItem(key, val, idx))
                                        }
                                    </div>
                                ) : (
                                    <div className="p-4 text-sm text-slate-500 italic text-center">No details available</div>
                                )}
                            </div>
                        </div>

                        {/* Enrichment Status */}
                        <div>
                            <h3 className="text-lg font-bold text-slate-800 mb-4">Enrichment Status</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {lead.enrichment_needed ? (
                                    Object.entries(lead.enrichment_needed).map(([key, val]) => renderEnrichmentItem(key, val))
                                ) : (
                                    <div className="col-span-2 p-4 text-sm text-slate-500 italic text-center">Status unknown</div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Developer Info */}
                    <details className="group border border-slate-200 rounded-xl bg-slate-50 overflow-hidden">
                        <summary className="px-5 py-3 cursor-pointer text-sm font-semibold text-slate-600 hover:bg-slate-100 flex justify-between items-center transition-colors">
                            Technical Lead Data
                            <div className="text-xs group-open:rotate-180 transition-transform">▼</div>
                        </summary>
                        <div className="p-5 bg-white border-t border-slate-200">
                            <pre className="text-[11px] font-mono text-slate-700 whitespace-pre-wrap overflow-x-auto leading-relaxed">
                                {JSON.stringify(lead, null, 2)}
                            </pre>
                        </div>
                    </details>
                </div>
            </div>
        </div>
    )
}
