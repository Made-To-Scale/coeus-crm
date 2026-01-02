import { useState, useEffect } from 'react'
import { Search, History, Play, Trash2 } from 'lucide-react'

export default function SearchView() {
    const [businessType, setBusinessType] = useState('')
    const [city, setCity] = useState('')
    const [count, setCount] = useState(10)

    const [loading, setLoading] = useState(false)
    const [history, setHistory] = useState([])
    const [status, setStatus] = useState(null) // { type: 'success' | 'error', message: string }

    useEffect(() => {
        const savedHistory = localStorage.getItem('search_history')
        if (savedHistory) {
            try {
                setHistory(JSON.parse(savedHistory))
            } catch (e) {
                console.error('Failed to parse search history', e)
            }
        }
    }, [])

    const saveHistory = (newHistory) => {
        setHistory(newHistory)
        localStorage.setItem('search_history', JSON.stringify(newHistory))
    }

    const handleSearch = async (e) => {
        e.preventDefault()
        if (!businessType.trim() || !city.trim()) return

        setLoading(true)

        setStatus(null)

        try {
            // TODO: Replace with actual Webhook URL from env or user input
            const webhookUrl = import.meta.env.VITE_SEARCH_WEBHOOK_URL || 'https://n8n.webhook.placeholder/webhook/search'

            console.log('Triggering webhook:', webhookUrl, { businessType, city, count })


            // Mocking the call for now if no URL provided
            if (webhookUrl.includes('placeholder')) {
                await new Promise(resolve => setTimeout(resolve, 1000))
                // Simulate success
            } else {
                const response = await fetch(webhookUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        business_type: businessType,
                        city: city,
                        limit: parseInt(count, 10),
                        timestamp: new Date().toISOString()
                    }),

                })

                if (!response.ok) throw new Error('Failed to trigger workflow')
            }

            const newEntry = {
                id: Date.now(),
                businessType,
                city,
                count,

                date: new Date().toISOString(),
                status: 'Triggered'
            }

            saveHistory([newEntry, ...history])
            setStatus({ type: 'success', message: 'Search workflow triggered successfully!' })
            setBusinessType('')
            setCity('')
        } catch (err) {

            console.error(err)
            setStatus({ type: 'error', message: 'Failed to launch search: ' + err.message })
        } finally {
            setLoading(false)
        }
    }

    const clearHistory = () => {
        if (confirm('Are you sure you want to clear the history?')) {
            saveHistory([])
        }
    }

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-2">
                    <Search className="w-8 h-8 text-blue-600" />
                    New Search
                </h1>
                <p className="mt-2 text-slate-600">Launch a new scraping workflow by specifying the target business and quantity.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Search Form */}
                <div className="lg:col-span-2">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <h2 className="text-xl font-semibold text-slate-800 mb-6">Search Configuration</h2>

                        <form onSubmit={handleSearch} className="space-y-6">
                            <div>
                                <label htmlFor="businessType" className="block text-sm font-medium text-slate-700 mb-2">
                                    Business Type / Keyword
                                </label>
                                <input
                                    type="text"
                                    id="businessType"
                                    value={businessType}
                                    onChange={(e) => setBusinessType(e.target.value)}
                                    placeholder="e.g. Pizza Restaurants in New York"
                                    className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                                    required
                                />
                            </div>

                            <div>
                                <label htmlFor="city" className="block text-sm font-medium text-slate-700 mb-2">
                                    City
                                </label>
                                <input
                                    type="text"
                                    id="city"
                                    value={city}
                                    onChange={(e) => setCity(e.target.value)}
                                    placeholder="e.g. New York"
                                    className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                                    required
                                />
                            </div>

                            <div>

                                <label htmlFor="count" className="block text-sm font-medium text-slate-700 mb-2">
                                    Number of Results
                                </label>
                                <input
                                    type="number"
                                    id="count"
                                    value={count}
                                    onChange={(e) => setCount(e.target.value)}
                                    min="1"
                                    max="1000"
                                    className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                                    required
                                />
                                <p className="text-xs text-slate-500 mt-1">Recommended: 10-50 per run for testing.</p>
                            </div>

                            {status && (
                                <div className={`p-4 rounded-lg flex items-center gap-2 ${status.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                                    {status.message}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className={`w-full flex items-center justify-center gap-2 py-3 px-6 rounded-lg text-white font-medium transition-all ${loading
                                    ? 'bg-slate-400 cursor-not-allowed'
                                    : 'bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-lg'
                                    }`}
                            >
                                {loading ? (
                                    <>Processing...</>
                                ) : (
                                    <>
                                        <Play size={20} />
                                        Launch Search Workflow
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>

                {/* History Sidebar */}
                <div className="lg:col-span-1">
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-full max-h-[600px]">
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-xl">
                            <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                                <History size={18} />
                                Recent Searches
                            </h3>
                            {history.length > 0 && (
                                <button onClick={clearHistory} className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1">
                                    <Trash2 size={12} /> Clear
                                </button>
                            )}
                        </div>

                        <div className="overflow-y-auto flex-1 p-2 space-y-2">
                            {history.length === 0 ? (
                                <div className="text-center py-8 text-slate-400 text-sm">
                                    No recent searches.
                                </div>
                            ) : (
                                history.map((item) => (
                                    <div key={item.id} className="p-3 hover:bg-slate-50 rounded-lg border border-transparent hover:border-slate-100 transition-all group">
                                        <div className="flex justify-between items-start">
                                            <span className="font-medium text-slate-800 text-sm line-clamp-1" title={`${item.businessType} in ${item.city}`}>
                                                {item.businessType} <span className="text-slate-400">in</span> {item.city}
                                            </span>

                                            <span className="text-xs font-mono bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                                                {item.count}
                                            </span>
                                        </div>
                                        <div className="mt-1 flex justify-between items-center text-xs text-slate-500">
                                            <span>{new Date(item.date).toLocaleDateString()}</span>
                                            <span className={item.status === 'Triggered' ? 'text-green-600' : ''}>{item.status}</span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
