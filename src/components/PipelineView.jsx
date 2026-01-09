import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { MoreHorizontal, Plus } from 'lucide-react'
import { LeadDetailModal } from './LeadsView'

// Since LeadDetailModal is not exported from LeadsView, I should probably move it to a separate file
// OR for now, to save refactoring time, I might duplicate the modal import or ask to move it.
// Actually, the cleanest way is to extract LeadDetailModal. 
// But first, let's assume I can duplicate the simple card view and maybe simple modal or just redirect to LeadsView.
// Better: Refactor LeadDetailModal to its own file. But that's extra steps.
// Quickest path: Create PipelineView and if click, open a simplified modal or duplicate code.
// Let's TRY to export LeadDetailModal from LeadsView first in a separate step or just duplicate the minimal part.
// Actually, I can just modify LeadsView to export it.

// Let's write the PipelineView assuming I will update LeadsView to export the Modal.

export default function PipelineView() {
    const [leads, setLeads] = useState([])
    const [loading, setLoading] = useState(true)
    const [draggedLead, setDraggedLead] = useState(null)
    const [selectedLead, setSelectedLead] = useState(null)

    const stages = [
        { id: 'new', label: 'New', color: 'bg-slate-100 border-slate-200' },
        { id: 'enriching', label: 'Enriching', color: 'bg-blue-50 border-blue-100' },
        { id: 'ready', label: 'Outreach Ready', color: 'bg-emerald-50 border-emerald-100' },
        { id: 'contacted', label: 'Contacted', color: 'bg-indigo-50 border-indigo-100' },
        { id: 'interested', label: 'Interested', color: 'bg-green-50 border-green-100' },
        { id: 'closed', label: 'Closed/Won', color: 'bg-slate-800 text-white border-slate-900', dark: true }
    ]

    useEffect(() => {
        fetchLeads()
    }, [])

    async function fetchLeads() {
        try {
            const { data, error } = await supabase
                .from('leads')
                .select('*')
                .neq('pipeline_stage', 'rejected') // Hide rejected from main pipeline
                .order('updated_at', { ascending: false })

            if (data) setLeads(data)
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    async function updateStage(leadId, newStage) {
        // Optimistic update
        setLeads(prev => prev.map(l => l.id === leadId ? { ...l, pipeline_stage: newStage } : l))

        await supabase.from('leads').update({ pipeline_stage: newStage }).eq('id', leadId)
    }

    const handleDrop = (e, stageId) => {
        e.preventDefault()
        const leadId = e.dataTransfer.getData('leadId')
        if (leadId) {
            updateStage(leadId, stageId)
        }
    }

    const handleDragStart = (e, lead) => {
        e.dataTransfer.setData('leadId', lead.id)
        setDraggedLead(lead)
    }

    if (loading) return <div className="p-6">Loading pipeline...</div>

    return (
        <div className="p-6 h-full flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-slate-800">Pipeline</h1>
                <div className="text-sm text-slate-500">Drag and drop to move leads</div>
            </div>

            <div className="flex-1 overflow-x-auto overflow-y-hidden pb-4">
                <div className="flex gap-4 h-full min-w-max">
                    {stages.map(stage => (
                        <div
                            key={stage.id}
                            className={`w-80 flex flex-col rounded-xl border-2 ${stage.id === 'closed' ? 'bg-slate-900 border-slate-900' : 'bg-slate-50 border-slate-100'}`}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => handleDrop(e, stage.id)}
                        >
                            {/* Header */}
                            <div className={`p-4 font-bold flex justify-between items-center ${stage.dark ? 'text-white' : 'text-slate-700'}`}>
                                <span>{stage.label}</span>
                                <span className={`text-xs px-2 py-1 rounded-full ${stage.dark ? 'bg-slate-700' : 'bg-white border border-slate-200'}`}>
                                    {leads.filter(l => (l.pipeline_stage || 'new') === stage.id).length}
                                </span>
                            </div>

                            {/* Cards */}
                            <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                                {leads.filter(l => (l.pipeline_stage || 'new') === stage.id).map(lead => (
                                    <div
                                        key={lead.id}
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, lead)}
                                        onClick={() => setSelectedLead(lead)} // This will need the modal passed or handle it
                                        className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 cursor-move hover:shadow-md transition-all active:cursor-grabbing group"
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="font-bold text-slate-800 text-sm line-clamp-1">{lead.business_name}</span>
                                            {lead.lead_score > 0 && (
                                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${lead.lead_tier === 'A' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                                                    }`}>
                                                    {lead.lead_score}
                                                </span>
                                            )}
                                        </div>

                                        <div className="text-xs text-slate-500 mb-3 line-clamp-1">{lead.city}</div>

                                        <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-50">
                                            <span className="text-slate-400 font-medium">
                                                {new Date(lead.updated_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                            </span>
                                            {lead.email ? (
                                                <div className="w-2 h-2 rounded-full bg-green-400" title="Has Email"></div>
                                            ) : (
                                                <div className="w-2 h-2 rounded-full bg-slate-200" title="No Email"></div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            {selectedLead && (
                <LeadDetailModal
                    lead={selectedLead}
                    onClose={() => setSelectedLead(null)}
                    onUpdate={(updatedLead) => {
                        setLeads(prev => prev.map(l => l.id === updatedLead.id ? { ...l, ...updatedLead } : l))
                        setSelectedLead(curr => curr ? { ...curr, ...updatedLead } : null)
                    }}
                />
            )}
        </div>
    )
}
